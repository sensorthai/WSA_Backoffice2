import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"

/**
 * GET /api/teaching/assignment/[id]
 * Enriched assignment detail for teacher view
 * Returns: assignment + school + subject + materials + students + summary
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })

  const supabase = createSupabaseServerClient()

  // 1. Fetch assignment with joins
  const { data: assignment, error: aErr } = await supabase
    .from('teaching_assignments')
    .select(`
      *,
      teacher:teacher_id (id, full_name, email, phone),
      school:school_id (id, name, address, district, province, contact_name, contact_phone, contact_email, finance_contact_name, finance_contact_phone, finance_contact_email, holidays),
      subject:subject_id (id, name, code, description, periods_per_day, time_start, time_end, teaching_fee, material_code),
      assigner:assigned_by (id, full_name)
    `)
    .eq('id', params.id)
    .single()

  if (aErr || !assignment) {
    return NextResponse.json({ error: aErr?.message || "ไม่พบงานมอบหมาย" }, { status: 404 })
  }

  // 2. Fetch students for this school + class + year
  let studentsQuery = supabase
    .from('students')
    .select('id, student_number, prefix, first_name, last_name, nickname, class_level, academic_year, is_active')
    .eq('school_id', assignment.school_id)
    .eq('is_active', true)
    .order('student_number')

  if (assignment.class_level) studentsQuery = studentsQuery.eq('class_level', assignment.class_level)
  if (assignment.academic_year) studentsQuery = studentsQuery.eq('academic_year', assignment.academic_year)

  const { data: students } = await studentsQuery

  // 3. Fetch teaching materials via subject's material_code
  let materials: any[] = []
  const materialCode = assignment.subject?.material_code
  if (materialCode) {
    const { data: mats } = await supabase
      .from('subject_materials')
      .select('id, title, type, description, file_url, youtube_url, sort_order')
      .eq('material_code', materialCode)
      .eq('is_active', true)
      .order('sort_order')
    materials = mats || []
  }

  // 4. Fetch completed teaching logs for this assignment
  const { data: logs } = await supabase
    .from('teaching_logs')
    .select('id, check_in_date, status, topics_covered, homework_assigned, student_behavior, teaching_method')
    .eq('assignment_id', assignment.id)
    .order('check_in_date', { ascending: false })

  // 5. Calculate summary
  const scheduleDates = assignment.schedule_dates || []
  const today = new Date().toISOString().split('T')[0]
  const completedSessions = (logs || []).filter((l: any) => l.status === 'approved' || l.status === 'completed').length
  const totalSessions = scheduleDates.length
  const periodsPerDay = assignment.periods_per_day || assignment.subject?.periods_per_day || 1
  const feePerPeriod = parseFloat(assignment.teaching_fee || assignment.subject?.teaching_fee || '0')
  const upcomingDates = scheduleDates.filter((d: string) => d >= today)
  const pastDates = scheduleDates.filter((d: string) => d < today)

  // Holiday conflicts
  const schoolHolidays = assignment.school?.holidays || []
  const holidayConflicts = scheduleDates.filter((d: string) =>
    schoolHolidays.includes(d)
  )

  const summary = {
    total_students: (students || []).length,
    total_sessions: totalSessions,
    completed_sessions: completedSessions,
    remaining_sessions: totalSessions - pastDates.length,
    total_periods: totalSessions * periodsPerDay,
    periods_per_day: periodsPerDay,
    fee_per_period: feePerPeriod,
    fee_per_day: feePerPeriod * periodsPerDay,
    total_income: feePerPeriod * periodsPerDay * totalSessions,
    earned_income: feePerPeriod * periodsPerDay * pastDates.length,
    upcoming_dates: upcomingDates.slice(0, 5),
    past_dates_count: pastDates.length,
    holiday_conflicts: holidayConflicts,
    total_logs: (logs || []).length,
  }

  return NextResponse.json({
    assignment,
    students: students || [],
    materials,
    logs: logs || [],
    summary,
  })
}
