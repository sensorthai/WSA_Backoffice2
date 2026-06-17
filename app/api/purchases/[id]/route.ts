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

    // 3. Recalculate Total if items changed and total_amount was not explicitly passed
    if (body.items && body.total_amount === undefined) {
      const itemsTotal = body.items.reduce((acc: number, item: any) => {
        return acc + (Number(item.quantity) * Number(item.unit_price))
      }, 0)
      const vat = Number(body.vat_amount !== undefined ? body.vat_amount : (purchase.vat_amount || 0))
      body.total_amount = itemsTotal + vat
    }

    // 4. Update
    const { data: updated, error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
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
