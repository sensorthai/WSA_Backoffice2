import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sendDailySummary } from "@/lib/gmail"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export async function GET(req: Request) {
  // 1. Security Check
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const today = new Date().toISOString().split('T')[0]

  // 2. Data Aggregation
  const [
    { data: checkins },
    { count: pendingLeaves },
    { count: pendingPurchases },
    { count: pendingCars },
    { data: todayPurchases },
    { data: todayCars }
  ] = await Promise.all([
    supabase.from('wfh_checkins').select('status').eq('check_date', today),
    supabase.from('leave_requests').select('id', { count: 'exact' }).or('status.eq.pending,status.eq.supervisor_approved'),
    supabase.from('purchase_requests').select('id', { count: 'exact' }).or('status.eq.pending,status.eq.supervisor_approved'),
    supabase.from('car_bookings').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabase.from('purchase_requests').select('total_amount').gte('created_at', today),
    supabase.from('car_bookings').select('*, company_cars(license_plate), user:users(full_name)').gte('start_datetime', today).lte('start_datetime', today + 'T23:59:59')
  ])

  const wfhSummary = {
    office: checkins?.filter(c => c.status === 'office').length || 0,
    home: checkins?.filter(c => c.status === 'home').length || 0
  }

  const pendingTotal = (pendingLeaves || 0) + (pendingPurchases || 0) + (pendingCars || 0)
  const totalPurchaseToday = todayPurchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0

  // 3. Get Recipients (CEO/Admin)
  const { data: recipients } = await supabase
    .from('users')
    .select('email')
    .or('role.eq.ceo,role.eq.admin')

  const emails = recipients?.map(r => r.email).filter(Boolean) as string[]

  if (emails.length > 0) {
    const reportData = {
      date: format(new Date(), "d MMMM yyyy", { locale: th }),
      wfhSummary,
      pendingApprovals: pendingTotal,
      totalPurchaseToday
    }

    await Promise.all(emails.map(email => sendDailySummary(email, reportData)))
  }

  return NextResponse.json({ success: true, processed: emails.length })
}
