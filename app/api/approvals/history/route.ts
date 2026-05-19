import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()

  // Items where actorUserId matches supervisor_id or were approved by CEO
  // For simplicity, we check items where status is NOT pending/supervisor_approved 
  // AND the current user was the supervisor or it's a final state.
  
  // Actually, a better way is to query items where supervisor_id = me OR it's a final approved state and I am CEO.
  
  const [leaves, purchases, cars] = await Promise.all([
    supabase.from('leave_requests').select('*, user:users!inner(full_name)').or(`supervisor_id.eq.${session.user.id},status.neq.pending`),
    supabase.from('purchase_requests').select('*, user:users!inner(full_name)').or(`supervisor_id.eq.${session.user.id},status.neq.pending`),
    supabase.from('car_bookings').select('*, user:users!inner(full_name), company_cars(license_plate)').or(`supervisor_id.eq.${session.user.id},status.neq.pending`)
  ])

  const unified = [
    ...(leaves.data || []).filter(l => l.status !== 'pending' && l.status !== 'supervisor_approved').map(l => ({ ...l, type: 'leave', label: 'ใบลา' })),
    ...(purchases.data || []).filter(p => p.status !== 'pending' && p.status !== 'supervisor_approved').map(p => ({ ...p, type: 'purchase', label: 'ใบเบิกเงิน' })),
    ...(cars.data || []).filter(c => c.status !== 'pending').map(c => ({ ...c, type: 'car_booking', label: 'จองรถ' }))
  ]

  unified.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())

  return NextResponse.json(unified)
}
