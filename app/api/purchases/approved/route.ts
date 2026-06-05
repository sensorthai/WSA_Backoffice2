import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') || 'approved' // 'approved' or 'paid' or 'all'

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
    return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลชุดนี้" }, { status: 403 })
  }

  // 2. Build query
  let query = supabase
    .from('purchase_requests')
    .select('*, users!purchase_requests_user_id_fkey(full_name, avatar_url, departments(name))')
    .order('updated_at', { ascending: false })

  if (statusFilter === 'all') {
    query = query.in('status', ['approved', 'paid'])
  } else {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 3. Transform data
  const transformed = data.map((item: any) => ({
    ...item,
    user: {
      full_name: item.users?.full_name,
      avatar_url: item.users?.avatar_url,
      department: (item.users?.departments as any)?.name
    }
  }))

  return NextResponse.json(transformed)
}
