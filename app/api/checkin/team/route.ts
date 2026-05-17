import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'Asia/Bangkok'

export async function GET(req: Request) {
  const session = await auth()
  const userRole = (session?.user as any)?.role

  // Only Supervisor/CEO/Admin
  if (!session || !['supervisor', 'ceo', 'admin'].includes(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd')

  const supabase = createSupabaseServerClient()

  // Fetch all active users with their department
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      avatar_url,
      departments (
        name
      )
    `)
    .eq('is_active', true)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // Fetch check-ins for the given date
  const { data: checkins, error: checkinsError } = await supabase
    .from('wfh_checkins')
    .select('user_id, status, note')
    .eq('check_date', date)

  if (checkinsError) {
    return NextResponse.json({ error: checkinsError.message }, { status: 500 })
  }

  // Map check-ins to users
  const checkinMap = new Map(checkins.map(c => [c.user_id, c]))

  const teamStatus = users.map(user => {
    const checkin = checkinMap.get(user.id)
    
    return {
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      department: (user.departments as any)?.name || 'N/A',
      checkin: {
        status: checkin?.status || 'not_checked',
        note: checkin?.note || null
      }
    }
  })

  return NextResponse.json(teamStatus)
}
