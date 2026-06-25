import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = params.id
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  const supabase = createSupabaseServerClient()
  
  // Verify ownership and status
  const { data: reimb } = await supabase
    .from('reimbursements')
    .select('user_id, status')
    .eq('id', id)
    .single()

  if (!reimb) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 })
  if (reimb.user_id !== session.user.id) return NextResponse.json({ error: "ไม่มีสิทธิ์ลบ" }, { status: 403 })
  if (reimb.status !== 'pending') return NextResponse.json({ error: "ไม่สามารถลบรายการที่กำลังดำเนินการหรืออนุมัติแล้วได้" }, { status: 400 })

  const { error } = await supabase.from('reimbursements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = params.id
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  try {
    const { receipt_url } = await req.json()

    const supabase = createSupabaseServerClient()

    // 1. Fetch current reimbursement request to check permissions
    const { data: reimb, error: fetchError } = await supabase
      .from('reimbursements')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !reimb) {
      return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 })
    }

    // 2. Check permissions
    const userRole = (session.user as any).role
    const isCEOOrAdmin = ['admin', 'ceo'].includes(userRole)
    const isOwner = reimb.user_id === session.user.id

    // Fetch actor profile for finance manager check
    const { data: actorUser } = await supabase
      .from('users')
      .select('role, department:departments(name), position:positions(name)')
      .eq('id', session.user.id)
      .single()

    const actorDept = (actorUser?.department as any)?.name || ""
    const actorPos = (actorUser?.position as any)?.name || ""
    const isFinanceManager = actorDept === 'ฝ่ายบัญชีและการเงิน' && actorPos === 'ผู้จัดการ'

    let canModify = false
    if (isCEOOrAdmin) {
      canModify = true
    } else if (isFinanceManager && reimb.status !== 'paid' && reimb.status !== 'rejected') {
      canModify = true
    } else if (isOwner && (reimb.status === 'pending' || reimb.status === 'approved')) {
      canModify = true
    }

    if (!canModify) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" }, { status: 403 })
    }

    // 3. Update the reimbursement
    const { data: updatedReimb, error: updateError } = await supabase
      .from('reimbursements')
      .update({ receipt_url })
      .eq('id', id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json(updatedReimb)
  } catch (err: any) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด: " + err.message }, { status: 500 })
  }
}

