import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole === 'employee') return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = createSupabaseServerClient()

  // 1. Fetch Leaves
  let leaveQuery = supabase
    .from('leave_requests')
    .select('id, user_id, leave_type, start_date, end_date, days_count, status, created_at, user:users!inner(full_name, avatar_url)')
  
  if (userRole === 'supervisor') {
    leaveQuery = leaveQuery.eq('supervisor_id', session.user.id).eq('status', 'pending')
  } else if (userRole === 'ceo') {
    leaveQuery = leaveQuery.eq('status', 'supervisor_approved')
  } else if (userRole === 'admin') {
    leaveQuery = leaveQuery.or('status.eq.pending,status.eq.supervisor_approved')
  }

  const { data: leaves } = await leaveQuery

  // 2. Fetch Purchases
  let purchaseQuery = supabase
    .from('purchase_requests')
    .select('id, user_id, title, total_amount, status, created_at, user:users!inner(full_name, avatar_url)')
  
  if (userRole === 'supervisor') {
    purchaseQuery = purchaseQuery.eq('supervisor_id', session.user.id).eq('status', 'pending')
  } else if (userRole === 'ceo') {
    purchaseQuery = purchaseQuery.eq('status', 'supervisor_approved')
  } else if (userRole === 'admin') {
    purchaseQuery = purchaseQuery.or('status.eq.pending,status.eq.supervisor_approved')
  }

  const { data: purchases } = await purchaseQuery

  // 3. Fetch Car Bookings
  let carQuery = supabase
    .from('car_bookings')
    .select('id, user_id, destination, start_datetime, end_datetime, status, created_at, user:users!inner(full_name, avatar_url)')
  
  if (userRole === 'supervisor') {
    carQuery = carQuery.eq('supervisor_id', session.user.id).eq('status', 'pending')
  } else if (userRole === 'ceo' || userRole === 'admin') {
    carQuery = carQuery.eq('status', 'pending')
  }

  const { data: cars } = await carQuery

  // 4. Combine and Format
  const unified = [
    ...(leaves || []).map(l => ({ ...l, type: 'leave', label: 'ใบลา', color: 'bg-emerald-50 text-emerald-600' })),
    ...(purchases || []).map(p => ({ ...p, type: 'purchase', label: 'ใบเบิกเงิน', color: 'bg-blue-50 text-blue-600' })),
    ...(cars || []).map(c => ({ ...c, type: 'car_booking', label: 'จองรถ', color: 'bg-indigo-50 text-indigo-600' }))
  ]

  // Sort by created_at (oldest first)
  unified.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return NextResponse.json(unified)
}
