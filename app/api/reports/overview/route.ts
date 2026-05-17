import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const academicYear = req.nextUrl.searchParams.get("academic_year") || ""

  // 1. Schools
  const { data: schools } = await supabase.from('schools').select('id, name')

  // 2. Active assignments — use FK shorthand matching working API
  let assignmentQuery = supabase
    .from('teaching_assignments')
    .select(`
      id, school_id, teacher_id, subject_id, class_level, academic_year,
      periods_per_day, teaching_fee, schedule_days, status,
      school:school_id (id, name),
      subject:subject_id (id, name),
      teacher:teacher_id (id, full_name)
    `)
    .eq('status', 'active')
  if (academicYear && academicYear !== 'all') {
    assignmentQuery = assignmentQuery.eq('academic_year', academicYear)
  }
  const { data: assignments, error: assignErr } = await assignmentQuery
  if (assignErr) console.error("Assignments error:", assignErr)

  // 3. Students
  let studentQuery = supabase.from('students').select('id, school_id, class_level, academic_year')
  if (academicYear && academicYear !== 'all') {
    studentQuery = studentQuery.eq('academic_year', academicYear)
  }
  const { data: students, error: stuErr } = await studentQuery
  if (stuErr) console.error("Students error:", stuErr)

  // 4. Teaching logs this month
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`
  const { data: monthLogs } = await supabase
    .from('teaching_logs')
    .select('id, school_id, teacher_id, assignment_id, teach_date, status')
    .gte('teach_date', monthStart)
    .lte('teach_date', monthEnd)

  // 5. Distinct academic years for filter
  const { data: yearOptions } = await supabase
    .from('teaching_assignments')
    .select('academic_year')
    .not('academic_year', 'is', null)
    .order('academic_year', { ascending: false })
  const uniqueYears = [...new Set((yearOptions || []).map((y: any) => y.academic_year).filter(Boolean))]

  // Compute
  const asgn = assignments || []
  const studs = students || []
  const logs = monthLogs || []

  const activeSchoolIds = [...new Set(asgn.map(a => a.school_id))]
  const activeTeacherIds = [...new Set(asgn.map(a => a.teacher_id))]
  const uniqueClassrooms = [...new Set(asgn.map(a => `${a.school_id}_${a.class_level}`).filter(v => !v.endsWith('_null') && !v.endsWith('_')))]

  // Per-school breakdown
  const schoolMap: Record<string, any> = {}
  for (const a of asgn) {
    const sid = a.school_id
    if (!schoolMap[sid]) {
      schoolMap[sid] = {
        school_id: sid,
        school_name: (a as any).school?.name || '?',
        subjects: new Set(),
        classrooms: new Set(),
        teachers: new Set(),
        periods_per_week: 0,
        student_count: 0,
        log_count: 0,
      }
    }
    const s = schoolMap[sid]
    if (a.subject_id) s.subjects.add(a.subject_id)
    if (a.class_level) s.classrooms.add(a.class_level)
    if (a.teacher_id) s.teachers.add(a.teacher_id)
    s.periods_per_week += (a.periods_per_day || 1) * ((a as any).schedule_days?.length || 0)
  }

  // Also add schools that have students but no assignments
  for (const st of studs) {
    if (!schoolMap[st.school_id]) {
      const sch = (schools || []).find((s: any) => s.id === st.school_id)
      schoolMap[st.school_id] = {
        school_id: st.school_id,
        school_name: sch?.name || '?',
        subjects: new Set(),
        classrooms: new Set(),
        teachers: new Set(),
        periods_per_week: 0,
        student_count: 0,
        log_count: 0,
      }
    }
    schoolMap[st.school_id].student_count++
    if (st.class_level) schoolMap[st.school_id].classrooms.add(st.class_level)
  }

  for (const l of logs) {
    if (l.school_id && schoolMap[l.school_id]) schoolMap[l.school_id].log_count++
  }

  const schoolBreakdown = Object.values(schoolMap).map((s: any) => ({
    school_id: s.school_id,
    school_name: s.school_name,
    subjects: s.subjects.size,
    classrooms: s.classrooms.size,
    teachers: s.teachers.size,
    student_count: s.student_count,
    periods_per_week: s.periods_per_week,
    log_count: s.log_count,
  }))

  return NextResponse.json({
    summary: {
      total_schools: new Set([...activeSchoolIds, ...studs.map(s => s.school_id)]).size,
      total_subjects: new Set(asgn.map(a => a.subject_id)).size,
      total_classrooms: new Set([...uniqueClassrooms, ...studs.filter(s => s.class_level).map(s => `${s.school_id}_${s.class_level}`)]).size,
      total_students: studs.length,
      total_teachers: activeTeacherIds.length,
      total_logs_this_month: logs.length,
      submitted_logs: logs.filter(l => l.status === 'submitted' || l.status === 'reviewed').length,
    },
    school_breakdown: schoolBreakdown.sort((a, b) => a.school_name.localeCompare(b.school_name)),
    academic_years: uniqueYears,
  })
}
