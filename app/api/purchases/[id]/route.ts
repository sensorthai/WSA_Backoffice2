import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, users!purchase_requests_user_id_fkey(full_name, email, departments(name), positions(name))')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Security: Only owner, admin/ceo/supervisor, or Finance Manager can view
  const userRole = (session.user as any).role
  const isOwner = data.user_id === session.user.id
  const isSupervisor = data.supervisor_id === session.user.id
  const isAdmin = ['admin', 'ceo'].includes(userRole)

  // Fetch actor profile for finance manager check
  const { data: actorUser } = await supabase
    .from('users')
    .select('role, department:departments(name), position:positions(name)')
    .eq('id', session.user.id)
    .single()

  const actorDept = (actorUser?.department as any)?.name || ""
  const actorPos = (actorUser?.position as any)?.name || ""
  const isFinanceManager = actorDept === 'ฝ่ายบัญชีและการเงิน' && actorPos === 'ผู้จัดการ'

  if (!isOwner && !isSupervisor && !isAdmin && !isFinanceManager) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const transformed = {
    ...data,
    user: {
      full_name: data.users?.full_name,
      avatar_url: data.users?.avatar_url,
      email: data.users?.email,
      department: (data.users?.departments as any)?.name,
      position: (data.users?.positions as any)?.name
    }
  }

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

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const supabase = createSupabaseServerClient()

    // 1. Fetch current record
    const { data: purchase, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !purchase) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // 2. Security:
    //    - admin/ceo สามารถแก้ไขได้ทุกรายการ ทุกสถานะ
    //    - ผู้จัดการบัญชี สามารถแก้ไขได้ถ้าสถานะไม่ใช่ paid
    //    - เจ้าของแก้ไขได้เฉพาะรายการที่ยังเป็น pending เท่านั้น
    const userRole = (session.user as any).role
    const isCEOOrAdmin = ['admin', 'ceo'].includes(userRole)
    const isOwner = purchase.user_id === session.user.id

    // Fetch actor profile for finance manager check
    const { data: actorUser } = await supabase
      .from('users')
      .select('role, department:departments(name), position:positions(name)')
      .eq('id', session.user.id)
      .single()

    const actorDept = (actorUser?.department as any)?.name || ""
    const actorPos = (actorUser?.position as any)?.name || ""
    const isFinanceManager = actorDept === 'ฝ่ายบัญชีและการเงิน' && actorPos === 'ผู้จัดการ'

    let canEdit = false
    if (isCEOOrAdmin) {
      canEdit = true
    } else if (isFinanceManager && purchase.status !== 'paid') {
      canEdit = true
    } else if (isOwner && purchase.status === 'pending') {
      canEdit = true
    }

    if (!canEdit) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" }, { status: 403 })
    }

    const {
      title,
      category,
      items,
      purpose,
      receipt_url,
      payment_method,
      document_type,
      manifest_text,
      document_number,
      document_date,
      subtotal,
      vat_amount,
      vendor_name,
      vendor_address,
      vendor_tax_id,
      customer_name,
      customer_tax_id,
      customer_address,
      project_name,
      total_amount,
      vat_enabled,
      vat_type
    } = body

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    }
    if (title !== undefined) updatePayload.title = title
    if (category !== undefined) updatePayload.category = category
    if (items !== undefined) updatePayload.items = items
    if (purpose !== undefined) updatePayload.purpose = purpose
    if (receipt_url !== undefined) updatePayload.receipt_url = receipt_url
    if (payment_method !== undefined) updatePayload.payment_method = payment_method
    if (document_type !== undefined) updatePayload.document_type = document_type
    if (manifest_text !== undefined) updatePayload.manifest_text = manifest_text
    if (document_number !== undefined) updatePayload.document_number = document_number
    if (document_date !== undefined) updatePayload.document_date = parseCleanDate(document_date)
    if (vendor_name !== undefined) updatePayload.vendor_name = vendor_name
    if (vendor_address !== undefined) updatePayload.vendor_address = vendor_address
    if (vendor_tax_id !== undefined) updatePayload.vendor_tax_id = vendor_tax_id
    if (customer_name !== undefined) updatePayload.customer_name = customer_name
    if (customer_tax_id !== undefined) updatePayload.customer_tax_id = customer_tax_id
    if (customer_address !== undefined) updatePayload.customer_address = customer_address
    if (project_name !== undefined) updatePayload.project_name = project_name

    // Recalculate totals on backend to avoid any async state lag issues from frontend
    const itemsTotal = items ? items.reduce((acc: number, item: any) => {
      return acc + (Number(item.quantity) * Number(item.unit_price))
    }, 0) : null

    if (items !== undefined) {
      const vat = vat_amount !== undefined ? Number(vat_amount) : (purchase.vat_amount || 0)
      const isVatEnabled = vat_enabled !== undefined ? vat_enabled : (vat > 0)
      const isVatType = vat_type !== undefined ? vat_type : (purchase.amount_before_vat && Math.abs(Number(purchase.amount_before_vat) - itemsTotal) > 5 ? "inclusive" : "exclusive")

      const beforeVat = isVatEnabled && isVatType === "inclusive" ? itemsTotal - vat : itemsTotal
      const grandTotal = total_amount !== undefined ? Number(total_amount) : (isVatEnabled && isVatType === "exclusive" ? itemsTotal + vat : itemsTotal)

      updatePayload.amount_before_vat = beforeVat
      updatePayload.vat_amount = vat
      updatePayload.total_amount = grandTotal
      updatePayload.total_after_vat = grandTotal
    } else {
      if (subtotal !== undefined) {
        updatePayload.amount_before_vat = subtotal
      }
      if (vat_amount !== undefined) {
        updatePayload.vat_amount = Number(vat_amount)
      }
      if (total_amount !== undefined) {
        updatePayload.total_amount = Number(total_amount)
        updatePayload.total_after_vat = Number(total_amount)
      }
    }

    // 4. Update
    const { data: updated, error: updateError } = await supabase
      .from('purchase_requests')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()

  // 1. Fetch current record
  const { data: purchase, error: fetchError } = await supabase
    .from('purchase_requests')
    .select('id, user_id, status')
    .eq('id', params.id)
    .single()

  if (fetchError || !purchase) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // 2. Security:
  //    - admin/ceo สามารถลบได้ทุกรายการ
  //    - ผู้จัดการบัญชี สามารถลบได้ถ้าสถานะไม่ใช่ paid
  //    - เจ้าของลบได้เฉพาะรายการที่ยังเป็น pending เท่านั้น
  const userRole = (session.user as any).role
  const isCEOOrAdmin = ['admin', 'ceo'].includes(userRole)
  const isOwner = purchase.user_id === session.user.id

  // Fetch actor profile for finance manager check
  const { data: actorUser } = await supabase
    .from('users')
    .select('role, department:departments(name), position:positions(name)')
    .eq('id', session.user.id)
    .single()

  const actorDept = (actorUser?.department as any)?.name || ""
  const actorPos = (actorUser?.position as any)?.name || ""
  const isFinanceManager = actorDept === 'ฝ่ายบัญชีและการเงิน' && actorPos === 'ผู้จัดการ'

  let canDelete = false
  if (isCEOOrAdmin) {
    canDelete = true
  } else if (isFinanceManager && purchase.status !== 'paid') {
    canDelete = true
  } else if (isOwner && purchase.status === 'pending') {
    canDelete = true
  }

  if (!canDelete) {
    return NextResponse.json({ error: "คุณไม่มีสิทธิ์ลบรายการนี้" }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('purchase_requests')
    .delete()
    .eq('id', params.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
