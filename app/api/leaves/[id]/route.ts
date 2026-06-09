import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { isWeekend, addDays, parseISO } from 'date-fns'

// Helper to calculate working days excluding weekends
function calculateWorkingDays(start: Date, end: Date) {
  let count = 0
  let current = start
  while (current <= end) {
    if (!isWeekend(current)) {
      count++
    }
    current = addDays(current, 1)
  }
  return count
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, users!leave_requests_user_id_fkey(full_name, email), supervisor:supervisor_id(full_name)')
    .eq('id', params.id)
    .single()

  if (error) {
    console.error('Leave Detail Query Error:', error)
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  
  // Check ownership or role
  const userRole = (session.user as any).role
  console.log('--- Leave Detail Access Check ---')
  console.log('Session User ID:', session.user.id)
  console.log('Record User ID:', data.user_id)
  console.log('User Role:', userRole)

  if (data.user_id !== session.user.id && !['admin', 'ceo', 'supervisor'].includes(userRole)) {
    console.log('Access Denied: Forbidden')
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  console.log('Access Granted')

  return NextResponse.json(data)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  
  // 1. Fetch existing request
  const { data: existing, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // 2. Permissions & Status check
  const userRole = (session.user as any).role
  const isAdminOrCeo = ['admin', 'ceo'].includes(userRole)

  if (existing.user_id !== session.user.id && !isAdminOrCeo) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (existing.status !== 'pending' && !isAdminOrCeo) {
    return NextResponse.json({ error: "สามารถแก้ไขได้เฉพาะคำขอที่รอดำเนินการเท่านั้น" }, { status: 400 })
  }

  try {
    const { leave_type, start_date, end_date, reason, status, supervisor_note, ceo_note } = await req.json()
    const start = parseISO(start_date)
    const end = parseISO(end_date)
    
    if (start > end) {
      return NextResponse.json({ error: "วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด" }, { status: 400 })
    }

    const daysCount = calculateWorkingDays(start, end)

    // Quota validation check (excluding current request's original days)
    const quotaKeyMap: Record<string, string> = {
      sick: 'sick_quota',
      personal: 'personal_quota',
      vacation: 'vacation_quota'
    }

    const quotaKey = quotaKeyMap[leave_type]
    if (quotaKey) {
      // Fetch user quota
      const { data: user } = await supabase
        .from('users')
        .select('sick_quota, personal_quota, vacation_quota')
        .eq('id', existing.user_id)
        .single()

      if (user) {
        const quotaValue = (user as any)[quotaKey] ?? 0
        const requestYear = start.getFullYear()

        // Fetch all other approved/pending leave requests of this type in the requested year (excluding this request)
        const { data: existingLeaves } = await supabase
          .from('leave_requests')
          .select('days_count')
          .eq('user_id', existing.user_id)
          .eq('leave_type', leave_type)
          .neq('status', 'rejected')
          .neq('id', params.id)
          .gte('start_date', `${requestYear}-01-01`)
          .lte('start_date', `${requestYear}-12-31`)

        const totalUsed = (existingLeaves || []).reduce((sum, l) => sum + Number(l.days_count), 0)

        if (totalUsed + daysCount > quotaValue) {
          const remaining = Math.max(0, quotaValue - totalUsed)
          return NextResponse.json({
            error: `จำนวนวันลาเต็มโควตาสำหรับปี ${requestYear} (โควตาปีนี้: ${quotaValue} วัน, ใช้ไปแล้ว: ${totalUsed} วัน, คงเหลือสิทธิ์ลา: ${remaining} วัน, ต้องการลาเพิ่ม: ${daysCount} วัน)`
          }, { status: 400 })
        }
      }
    }

    const updatePayload: any = {
      leave_type,
      start_date,
      end_date,
      days_count: daysCount,
      reason,
      updated_at: new Date().toISOString()
    }

    if (isAdminOrCeo) {
      if (status) {
        updatePayload.status = status
        if (status === 'approved') {
          updatePayload.supervisor_approved_at = existing.supervisor_approved_at || new Date().toISOString()
          updatePayload.ceo_approved_at = existing.ceo_approved_at || new Date().toISOString()
        } else if (status === 'pending') {
          updatePayload.supervisor_approved_at = null
          updatePayload.ceo_approved_at = null
        } else if (status === 'supervisor_approved') {
          updatePayload.supervisor_approved_at = existing.supervisor_approved_at || new Date().toISOString()
          updatePayload.ceo_approved_at = null
        } else if (status === 'rejected') {
          updatePayload.supervisor_approved_at = existing.supervisor_approved_at || new Date().toISOString()
          updatePayload.ceo_approved_at = existing.ceo_approved_at || new Date().toISOString()
        }
      }
      if (supervisor_note !== undefined) updatePayload.supervisor_note = supervisor_note
      if (ceo_note !== undefined) updatePayload.ceo_note = ceo_note
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  
  const { data: existing, error: fetchError } = await supabase
    .from('leave_requests')
    .select('user_id, status')
    .eq('id', params.id)
    .single()

  if (fetchError || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const userRole = (session.user as any).role
  const isAdminOrCeo = ['admin', 'ceo'].includes(userRole)

  if (existing.user_id !== session.user.id && !isAdminOrCeo) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (existing.status !== 'pending' && !isAdminOrCeo) {
    return NextResponse.json({ error: "สามารถยกเลิกได้เฉพาะคำขอที่รอดำเนินการเท่านั้น" }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', params.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
