import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()

  // Fetch the CEO user's name to display when the CEO has approved a request
  const { data: ceoUser } = await supabase
    .from('users')
    .select('full_name')
    .eq('role', 'ceo')
    .maybeSingle()
  const ceoName = ceoUser?.full_name || "CEO"

  const [leaves, purchases, cars, reimbursements] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*, user:users!user_id!inner(full_name), supervisor:users!supervisor_id(full_name)')
      .or(`supervisor_id.eq.${session.user.id},status.neq.pending`),
    supabase
      .from('purchase_requests')
      .select('*, user:users!user_id!inner(full_name), supervisor:users!supervisor_id(full_name)')
      .or(`supervisor_id.eq.${session.user.id},status.neq.pending`),
    supabase
      .from('car_bookings')
      .select('*, user:users!user_id!inner(full_name), company_cars(license_plate), supervisor:users!supervisor_id(full_name)')
      .or(`supervisor_id.eq.${session.user.id},status.neq.pending`),
    supabase
      .from('reimbursements')
      .select('*, user:users!user_id!inner(full_name), approved_by_user:users!approved_by(full_name)')
      .or('status.eq.approved,status.eq.rejected')
  ])

  const unified = [
    ...(leaves.data || []).filter(l => l.status !== 'pending' && l.status !== 'supervisor_approved').map(l => {
      let approverName = l.supervisor?.full_name || "—"
      if (l.status === 'approved') {
        if (l.ceo_approved_at) {
          approverName = `${l.supervisor?.full_name || "หัวหน้า"} และ ${ceoName}`
        }
      } else if (l.status === 'rejected') {
        if (l.ceo_note && !l.supervisor_note) {
          approverName = ceoName
        } else if (l.ceo_note && l.supervisor_note) {
          approverName = `${l.supervisor?.full_name || "หัวหน้า"} และ ${ceoName}`
        }
      }
      return { ...l, type: 'leave', label: 'ใบลา', approver_name: approverName }
    }),
    ...(purchases.data || []).filter(p => p.status !== 'pending' && p.status !== 'supervisor_approved').map(p => {
      let approverName = p.supervisor?.full_name || "—"
      if (p.status === 'approved' || p.status === 'paid') {
        if (p.ceo_approved_at) {
          approverName = `${p.supervisor?.full_name || "หัวหน้า"} และ ${ceoName}`
        }
      } else if (p.status === 'rejected') {
        if (p.ceo_note && !p.supervisor_note) {
          approverName = ceoName
        } else if (p.ceo_note && p.supervisor_note) {
          approverName = `${p.supervisor?.full_name || "หัวหน้า"} และ ${ceoName}`
        }
      }
      return { ...p, type: 'purchase', label: 'ใบเบิกเงิน', approver_name: approverName }
    }),
    ...(cars.data || []).filter(c => c.status !== 'pending').map(c => ({
      ...c,
      type: 'car_booking',
      label: 'จองรถ',
      approver_name: c.supervisor?.full_name || "—"
    })),
    ...(reimbursements.data || []).filter(r => r.status !== 'pending').map(r => ({
      ...r,
      type: 'reimbursement',
      label: 'เบิกค่าใช้จ่าย',
      approver_name: r.approved_by_user?.full_name || "—"
    }))
  ]

  unified.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())

  return NextResponse.json(unified)
}

