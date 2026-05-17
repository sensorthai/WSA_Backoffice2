import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const currentYear = new Date().getFullYear()
  
  // Fetch all approved leaves for the current year
  const { data, error } = await supabase
    .from('leave_requests')
    .select('leave_type, days_count')
    .eq('user_id', session.user.id)
    .eq('status', 'approved')
    .gte('start_date', `${currentYear}-01-01`)
    .lte('start_date', `${currentYear}-12-31`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch user's quota
  const { data: user } = await supabase
    .from('users')
    .select('sick_quota, personal_quota, vacation_quota')
    .eq('id', session.user.id)
    .single()

  const stats = {
    sick: 0,
    personal: 0,
    vacation: 0,
    other: 0,
    total: 0,
    quotas: user || { sick_quota: 30, personal_quota: 6, vacation_quota: 6 }
  }

  data?.forEach((leave: any) => {
    const type = leave.leave_type as keyof Omit<typeof stats, 'total' | 'quotas'>
    if (stats[type] !== undefined) {
      stats[type] += Number(leave.days_count)
    } else {
      stats.other += Number(leave.days_count)
    }
    stats.total += Number(leave.days_count)
  })

  return NextResponse.json(stats)
}
