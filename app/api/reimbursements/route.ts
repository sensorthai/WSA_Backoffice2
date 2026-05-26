import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  
  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('reimbursements')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { amount, description, expense_date, receipt_url } = await req.json()

    if (!amount || !description || !expense_date) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลให้ครบถ้วน" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // 1. Get User Info (Supervisor)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('supervisor_id, full_name')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 500 })
    }

    // 2. Create Reimbursement Request
    const { data: reimbursement, error: reimbError } = await supabase
      .from('reimbursements')
      .insert({
        user_id: session.user.id,
        amount,
        description,
        expense_date,
        receipt_url,
        status: 'pending'
      })
      .select()
      .single()

    if (reimbError) return NextResponse.json({ error: reimbError.message }, { status: 500 })

    // 3. Notification to Supervisor
    if (user.supervisor_id) {
      await supabase.from('notifications').insert({
        user_id: user.supervisor_id,
        type: 'reimbursement',
        title: 'คำขอเบิกค่าใช้จ่ายใหม่',
        message: `${user.full_name} ได้ส่งคำขอเบิกค่าใช้จ่าย ${Number(amount).toLocaleString()} บาท`,
        reference_id: reimbursement.id,
        reference_type: 'reimbursements'
      })
    }

    return NextResponse.json(reimbursement, { status: 201 })
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}
