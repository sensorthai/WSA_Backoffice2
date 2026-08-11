import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sendPurchaseSubmitted } from "@/lib/gmail"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  
  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('purchase_requests')
    .select('*, users!purchase_requests_user_id_fkey(full_name, avatar_url, departments(name), positions(name))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const transformed = data.map((item: any) => ({
    ...item,
    user: {
      full_name: item.users?.full_name,
      avatar_url: item.users?.avatar_url,
      department: (item.users?.departments as any)?.name,
      position: (item.users?.positions as any)?.name
    }
  }))

  return NextResponse.json(transformed)
}

function parseCleanDate(dateStr: any): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()
  if (!trimmed || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'unknown' || trimmed.toLowerCase() === 'ไม่ระบุ') {
    return null
  }
  
  const parsedTimestamp = Date.parse(trimmed)
  if (!isNaN(parsedTimestamp)) {
    const dateObj = new Date(parsedTimestamp)
    const yyyy = dateObj.getFullYear()
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(dateObj.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  const match = trimmed.match(dmyRegex)
  if (match) {
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    const year = parseInt(match[3], 10)
    const dateObj = new Date(year, month, day)
    if (!isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear()
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      const dd = String(dateObj.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
  }

  return null
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { title, category, items, purpose, receipt_url, payment_method, document_type, manifest_text, document_number, document_date, subtotal, vat_amount, vendor_address, vendor_tax_id, customer_name, customer_tax_id, customer_address, project_name, total_amount } = body
    const vendor_name = body.vendor_name || body.vendor || null

    if (!title || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "กรุณาระบุชื่อเรื่องและรายการสินค้า" }, { status: 400 })
    }

    // 1. Calculate Total
    const itemsTotal = items.reduce((acc: number, item: any) => {
      return acc + (Number(item.quantity) * Number(item.unit_price))
    }, 0)
    
    // Server-side recalculation of subtotal/VAT/total to avoid client-side race condition bugs
    const vat = Number(vat_amount || 0)
    const isVatEnabled = body.vat_enabled !== undefined ? body.vat_enabled : (vat > 0)
    const isVatType = body.vat_type || "exclusive"

    const beforeVat = isVatEnabled && isVatType === "inclusive" ? itemsTotal - vat : itemsTotal
    const grandTotal = total_amount !== undefined ? Number(total_amount) : (isVatEnabled && isVatType === "exclusive" ? itemsTotal + vat : itemsTotal)

    const supabase = createSupabaseServerClient()

    // 2. Get User Info (Supervisor & Role)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('supervisor_id, full_name, role')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 500 })
    }

    const assignedSupervisorId = (user.supervisor_id && user.supervisor_id !== session.user.id) ? user.supervisor_id : null

    // 3. Create Purchase Request
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_requests')
      .insert({
        user_id: session.user.id,
        title,
        category: category || 'อื่นๆ',
        items,
        total_amount: grandTotal,
        total_after_vat: grandTotal,
        purpose,
        receipt_url,
        payment_method: payment_method || 'petty_cash',
        supervisor_id: assignedSupervisorId,
        status: 'pending',
        document_type: document_type || null,
        manifest_text: manifest_text || null,
        document_number: document_number || null,
        document_date: parseCleanDate(document_date),
        amount_before_vat: beforeVat,
        vat_amount: vat,
        vendor_name: vendor_name || null,
        vendor_address: vendor_address || null,
        vendor_tax_id: vendor_tax_id || null,
        customer_name: customer_name || null,
        customer_tax_id: customer_tax_id || null,
        customer_address: customer_address || null,
        project_name: project_name || null
      })
      .select()
      .single()

    if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })

    // 4. Notification to Supervisor or CEO
    if (assignedSupervisorId) {
      // 4.1 Internal Notif to assigned supervisor
      await supabase.from('notifications').insert({
        user_id: assignedSupervisorId,
        type: 'purchase_request',
        title: 'คำขอเบิกเงินใหม่',
        message: `${user.full_name} ได้ส่งคำขอเบิก "${title}" ยอดรวม ${grandTotal.toLocaleString()} บาท`,
        reference_id: purchase.id,
        reference_type: 'purchase_requests'
      })

      // 4.2 Email Notif
      const { data: supervisor } = await supabase
        .from('users')
        .select('email')
        .eq('id', assignedSupervisorId)
        .single()

      if (supervisor?.email) {
        sendPurchaseSubmitted(supervisor.email, {
          requesterName: user.full_name,
          title,
          totalAmount: grandTotal
        })
      }
    } else {
      // If requester is a supervisor or has no higher supervisor, notify CEO
      const { data: ceo } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'ceo')
        .maybeSingle()

      if (ceo && ceo.id !== session.user.id) {
        await supabase.from('notifications').insert({
          user_id: ceo.id,
          type: 'purchase_request',
          title: 'คำขอเบิกเงินใหม่จากหัวหน้างาน',
          message: `${user.full_name} ได้ส่งคำขอเบิก "${title}" ยอดรวม ${grandTotal.toLocaleString()} บาท`,
          reference_id: purchase.id,
          reference_type: 'purchase_requests'
        })

        if (ceo.email) {
          sendPurchaseSubmitted(ceo.email, {
            requesterName: user.full_name,
            title,
            totalAmount: grandTotal
          })
        }
      }
    }

    return NextResponse.json(purchase, { status: 201 })
  } catch (error: any) {
    console.error("CREATE PURCHASE ERROR:", error)
    return NextResponse.json({ error: error.message || "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}
