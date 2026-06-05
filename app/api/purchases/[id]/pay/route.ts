import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  const { note } = await req.json()

  const supabase = createSupabaseServerClient()

  // 1. Fetch current actor's user details (to check department & position)
  const { data: actorUser } = await supabase
    .from('users')
    .select('role, department:departments(name), position:positions(name)')
    .eq('id', session.user.id)
    .single()

  const actorDept = (actorUser?.department as any)?.name || ""
  const actorPos = (actorUser?.position as any)?.name || ""

  const isFinanceManager = actorDept === 'ฝ่ายบัญชีและการเงิน' && actorPos === 'ผู้จัดการ'
  const isCEOOrAdmin = userRole === 'ceo' || userRole === 'admin'

  if (!isFinanceManager && !isCEOOrAdmin) {
    return NextResponse.json({ error: "คุณไม่มีสิทธิ์ดำเนินการชำระเงินในหน้านี้ (ต้องเป็นผู้จัดการฝ่ายบัญชีและการเงิน หรือ CEO หรือ Admin)" }, { status: 403 })
  }

  try {
    // 2. Fetch current purchase request status
    const { data: purchase, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !purchase) {
      return NextResponse.json({ error: "ไม่พบรายการใบเบิกเงินที่ระบุ" }, { status: 404 })
    }

    if (purchase.status !== 'approved') {
      return NextResponse.json({ error: `รายการนี้ต้องได้รับการอนุมัติแล้วเท่านั้น (สถานะปัจจุบัน: ${purchase.status})` }, { status: 400 })
    }

    // 3. Update status to 'paid'
    const updateData: any = {
      status: 'paid',
      updated_at: new Date().toISOString()
    }
    
    if (note) {
      // Append or set to CEO note or update updated_at note
      updateData.ceo_note = purchase.ceo_note ? `${purchase.ceo_note} | Note: ${note}` : note
    }

    const { data: updated, error: updateError } = await supabase
      .from('purchase_requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    // 4. Send notification to requester
    await supabase.from('notifications').insert({
      user_id: purchase.user_id,
      type: 'purchase_update',
      title: 'ใบเบิกเงินของคุณได้รับการจ่ายเงินแล้ว',
      message: `รายการ "${purchase.title}" ยอดเงิน ${Number(purchase.total_amount).toLocaleString('th-TH')} บาท ได้รับการโอนจ่ายเรียบร้อยแล้ว`,
      reference_id: params.id,
      reference_type: 'purchase_requests'
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Purchase pay error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 })
  }
}
