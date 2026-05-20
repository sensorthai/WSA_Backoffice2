import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export const revalidate = 300 // 5 minutes

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole !== 'ceo' && userRole !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const today = new Date().toISOString().split('T')[0]

  // --- 1. Fetch All Necessary Data in Parallel ---
  const [
    { data: activeUsers },
    { data: checkins },
    { data: pendingLeaves },
    { data: pendingPurchases },
    { data: pendingCars },
    { data: todayPurchases },
    { data: todayCars },
    { data: cars }
  ] = await Promise.all([
    supabase.from('users').select('id, full_name, avatar_url, role, is_active, department:departments(name)').eq('is_active', true),
    supabase.from('wfh_checkins').select('*, user:users(full_name, avatar_url, department:departments(name))').eq('check_date', today),
    supabase.from('leave_requests').select('*, user:users!user_id(full_name, avatar_url)').or('status.eq.pending,status.eq.supervisor_approved'),
    supabase.from('purchase_requests').select('*, user:users!user_id(full_name, avatar_url)').or('status.eq.pending,status.eq.supervisor_approved'),
    supabase.from('car_bookings').select('*, user:users!user_id(full_name, avatar_url), company_cars(license_plate)').eq('status', 'pending'),
    supabase.from('purchase_requests').select('*, user:users!user_id(full_name, avatar_url)').gte('created_at', today),
    supabase.from('car_bookings').select('*, company_cars(*), user:users!user_id(full_name, avatar_url)').gte('start_datetime', today).lte('start_datetime', today + 'T23:59:59'),
    supabase.from('company_cars').select('*').eq('is_available', true)
  ])

  // --- 2. Process WFH Status ---
  const checkedInUserIds = new Set(checkins?.map(c => c.user_id) || [])
  const wfh = {
    office: checkins?.filter(c => c.status === 'office').map(c => ({ ...c.user, checkin: c })) || [],
    home: checkins?.filter(c => c.status === 'home').map(c => ({ ...c.user, checkin: c })) || [],
    onsite: checkins?.filter(c => c.status === 'onsite').map(c => ({ ...c.user, checkin: c })) || [],
    leave: checkins?.filter(c => c.status === 'leave').map(c => ({ ...c.user, checkin: c })) || [],
    holiday: checkins?.filter(c => c.status === 'holiday').map(c => ({ ...c.user, checkin: c })) || [],
    not_checked: activeUsers?.filter(u => !checkedInUserIds.has(u.id)).map(u => ({ ...u, checkin: { status: 'not_checked' } })) || []
  }

  // --- 3. Process Pending Approvals ---
  const combinedPending = [
    ...(pendingLeaves || []).map(l => ({ ...l, type: 'leave', label: 'ใบลา', color: 'bg-emerald-50 text-emerald-600' })),
    ...(pendingPurchases || []).map(p => ({ ...p, type: 'purchase', label: 'ใบเบิกเงิน', color: 'bg-blue-50 text-blue-600' })),
    ...(pendingCars || []).map(c => ({ ...c, type: 'car_booking', label: 'จองรถ', color: 'bg-indigo-50 text-indigo-600' }))
  ]
  combinedPending.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const pending_approvals = {
    leaves: pendingLeaves?.length || 0,
    purchases: pendingPurchases?.length || 0,
    car_bookings: pendingCars?.length || 0,
    total: combinedPending.length,
    items: combinedPending.slice(0, 10) // Latest 10
  }

  // --- 4. Process Today's Stats ---
  const purchases_today = {
    total_amount: todayPurchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
    count: todayPurchases?.length || 0,
    items: todayPurchases || []
  }

  const car_bookings_today = {
    bookings: todayCars || [],
    available_cars: cars || []
  }

  return NextResponse.json({
    date: today,
    wfh,
    pending_approvals,
    purchases_today,
    car_bookings_today
  })
}
