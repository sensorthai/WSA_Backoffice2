import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { isWeekend, addDays, parseISO } from 'date-fns'
import { sendLeaveSubmitted } from "@/lib/gmail"

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

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const year = searchParams.get('year')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10

  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('leave_requests')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (year) {
    query = query.gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, count, error } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { leave_type, start_date, end_date, reason, attachment_url } = await req.json()

    // 1. Validations
    const start = parseISO(start_date)
    const end = parseISO(end_date)
    
    if (start > end) {
      return NextResponse.json({ error: "วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด" }, { status: 400 })
    }

    if (leave_type === 'sick' && !attachment_url) {
      return NextResponse.json({ error: "การลาป่วยจำเป็นต้องแนบใบรับรองแพทย์" }, { status: 400 })
    }

    const daysCount = calculateWorkingDays(start, end)
    if (daysCount === 0) {
      return NextResponse.json({ error: "กรุณาเลือกช่วงเวลาที่มีวันทำการ" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // 2. Get User Info (Supervisor)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('supervisor_id, full_name')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 500 })
    }

    // 3. Create Leave Request
    const { data: leave, error: leaveError } = await supabase
      .from('leave_requests')
      .insert({
        user_id: session.user.id,
        leave_type,
        start_date,
        end_date,
        days_count: daysCount,
        reason,
        attachment_url,
        supervisor_id: user.supervisor_id,
        status: 'pending'
      })
      .select()
      .single()

    if (leaveError) return NextResponse.json({ error: leaveError.message }, { status: 500 })

    // 4. Notification to Supervisor
    if (user.supervisor_id) {
      // 4.1 Internal Notif
      await supabase.from('notifications').insert({
        user_id: user.supervisor_id,
        type: 'leave_request',
        title: 'คำขอลาใหม่',
        message: `${user.full_name} ได้ส่งคำขอลาประเภท ${leave_type} (${daysCount} วัน)`,
        reference_id: leave.id,
        reference_type: 'leave_requests'
      })

      // 4.2 Email Notif
      const { data: supervisor } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.supervisor_id)
        .single()

      if (supervisor?.email) {
        sendLeaveSubmitted(supervisor.email, {
          name: "Supervisor", // Optional: fetch supervisor name
          leaveType: leave_type,
          startDate: start_date,
          endDate: end_date,
          days: daysCount,
          requesterName: user.full_name
        })
      }
    }

    return NextResponse.json(leave, { status: 201 })
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}
