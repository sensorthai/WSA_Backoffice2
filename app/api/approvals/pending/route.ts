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
    .select('id, user_id, leave_type, start_date, end_date, days_count, status, created_at, user:users!user_id!inner(full_name, avatar_url)')
  
  if (userRole === 'supervisor') {
    leaveQuery = leaveQuery.eq('supervisor_id', session.user.id).eq('status', 'pending')
  } else if (userRole === 'ceo') {
    leaveQuery = leaveQuery.eq('status', 'supervisor_approved')
  } else if (userRole === 'admin') {
    leaveQuery = leaveQuery.or('status.eq.pending,status.eq.supervisor_approved')
  }

  const { data: leaves } = await leaveQuery

  // 2. Fetch Purchases
  let rawPurchases: any[] = []
  if (userRole === 'supervisor') {
    const { data } = await supabase
      .from('purchase_requests')
      .select('id, user_id, supervisor_id, title, total_amount, status, created_at, category, payment_method, purpose, receipt_url, document_type, manifest_text, items, amount_before_vat, vat_amount, user:users!user_id!inner(role, full_name, avatar_url)')
      .eq('supervisor_id', session.user.id)
      .neq('user_id', session.user.id)
      .eq('status', 'pending')
    rawPurchases = data || []
  } else if (userRole === 'ceo') {
    const { data } = await supabase
      .from('purchase_requests')
      .select('id, user_id, supervisor_id, title, total_amount, status, created_at, category, payment_method, purpose, receipt_url, document_type, manifest_text, items, amount_before_vat, vat_amount, user:users!user_id!inner(role, full_name, avatar_url)')
      .in('status', ['pending', 'supervisor_approved'])

    rawPurchases = (data || []).filter((item: any) => {
      if (item.user_id === session.user.id) return false
      if (item.status === 'supervisor_approved') return true
      if (item.status === 'pending') {
        const isSupervisorRequester = item.user?.role === 'supervisor' || !item.supervisor_id || item.supervisor_id === item.user_id
        return isSupervisorRequester
      }
      return false
    })
  } else if (userRole === 'admin') {
    const { data } = await supabase
      .from('purchase_requests')
      .select('id, user_id, supervisor_id, title, total_amount, status, created_at, category, payment_method, purpose, receipt_url, document_type, manifest_text, items, amount_before_vat, vat_amount, user:users!user_id!inner(role, full_name, avatar_url)')
      .in('status', ['pending', 'supervisor_approved'])
    rawPurchases = data || []
  }

  const purchases = rawPurchases

  // 3. Fetch Car Bookings
  let carQuery = supabase
    .from('car_bookings')
    .select('id, user_id, destination, start_datetime, end_datetime, status, created_at, user:users!user_id!inner(full_name, avatar_url)')
  
  if (userRole === 'supervisor') {
    carQuery = carQuery.eq('supervisor_id', session.user.id).eq('status', 'pending')
  } else if (userRole === 'ceo' || userRole === 'admin') {
    carQuery = carQuery.eq('status', 'pending')
  }

  const { data: cars } = await carQuery

  // Fetch current user's department and position to filter reimbursements
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, department:departments(name), position:positions(name)')
    .eq('id', session.user.id)
    .maybeSingle()

  const currentDept = (currentUser?.department as any)?.name || ""
  const currentPos = (currentUser?.position as any)?.name || ""

  // 4. Fetch Reimbursements
  let reimbQuery = supabase
    .from('reimbursements')
    .select('id, user_id, amount, description, expense_date, status, receipt_url, created_at, user:users!user_id!inner(full_name, avatar_url)')

  const isTrainingManager = currentDept === 'ฝ่ายอบรม' && currentPos === 'ผู้จัดการ'
  const isFinanceManager = currentDept === 'ฝ่ายบัญชีและการเงิน' && currentPos === 'ผู้จัดการ'
  const isCEOOrAdmin = userRole === 'ceo' || userRole === 'admin'

  if (isCEOOrAdmin) {
    // CEOs and Admins can see pending (awaiting Training Manager) and approved (awaiting Finance Manager payment)
    reimbQuery = reimbQuery.or('status.eq.pending,status.eq.approved')
  } else if (isTrainingManager) {
    // Training Manager only sees pending (awaiting supervisor stage)
    reimbQuery = reimbQuery.eq('status', 'pending')
  } else if (isFinanceManager) {
    // Finance Manager only sees approved (awaiting payment stage)
    reimbQuery = reimbQuery.eq('status', 'approved')
  } else {
    // Others shouldn't see any pending approvals for reimbursements
    reimbQuery = reimbQuery.eq('id', '00000000-0000-0000-0000-000000000000') // empty result
  }

  const { data: reimbursements } = await reimbQuery

  // 5. Combine and Format
  const unified = [
    ...(leaves || []).map(l => ({ ...l, type: 'leave', label: 'ใบลา', color: 'bg-emerald-50 text-emerald-600' })),
    ...(purchases || []).map(p => ({ ...p, type: 'purchase', label: 'ใบเบิกเงิน', color: 'bg-blue-50 text-blue-600' })),
    ...(cars || []).map(c => ({ ...c, type: 'car_booking', label: 'จองรถ', color: 'bg-indigo-50 text-indigo-600' })),
    ...(reimbursements || []).map(r => ({ ...r, type: 'reimbursement', label: 'เบิกค่าใช้จ่าย', color: 'bg-amber-50 text-amber-600' }))
  ]

  // Sort by created_at (oldest first)
  unified.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return NextResponse.json(unified)
}
