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
    // Grand total: use total_amount if passed, otherwise items total + vat_amount
    const grandTotal = total_amount !== undefined ? Number(total_amount) : (itemsTotal + Number(vat_amount || 0))

    const supabase = createSupabaseServerClient()

    // 2. Get User Info (Supervisor)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('supervisor_id, full_name')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 500 })
    }

    // 3. Create Purchase Request
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_requests')
      .insert({
        user_id: session.user.id,
        title,
        category: category || 'อื่นๆ',
        items,
        total_amount: grandTotal,
        purpose,
        receipt_url,
        payment_method: payment_method || 'petty_cash',
        supervisor_id: user.supervisor_id,
        status: 'pending',
        document_type: document_type || null,
        manifest_text: manifest_text || null,
        document_number: document_number || null,
        document_date: document_date || null,
        amount_before_vat: subtotal || 0,
        vat_amount: vat_amount || 0,
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

    // 4. Notification to Supervisor
    if (user.supervisor_id) {
      // 4.1 Internal Notif
      await supabase.from('notifications').insert({
        user_id: user.supervisor_id,
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
        .eq('id', user.supervisor_id)
        .single()

      if (supervisor?.email) {
        sendPurchaseSubmitted(supervisor.email, {
          requesterName: user.full_name,
          title,
          totalAmount: grandTotal
        })
      }
    }

    return NextResponse.json(purchase, { status: 201 })
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}
