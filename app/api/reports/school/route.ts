import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const schoolId = req.nextUrl.searchParams.get("school_id")
  const startDate = req.nextUrl.searchParams.get("start_date")
  const endDate = req.nextUrl.searchParams.get("end_date")

  if (!schoolId || !startDate || !endDate) {
    return NextResponse.json({ error: "school_id, start_date, end_date required" }, { status: 400 })
  }

  // 1. School info
  const { data: school } = await supabase.from('schools').select('*').eq('id', schoolId).single()

  // 2. Assignments for this school
  const { data: assignments } = await supabase
    .from('teaching_assignments')
    .select(`*, teacher:teacher_id(id, full_name), subject:subject_id(id, name)`)
    .eq('school_id', schoolId)
    .eq('status', 'active')

  // 3. Teaching logs in date range
  const { data: logs } = await supabase
    .from('teaching_logs')
    .select(`*, teacher:teacher_id(id, full_name), assignment:assignment_id(id, subject:subject_id(id, name))`)
    .eq('school_id', schoolId)
    .gte('teach_date', startDate)
    .lte('teach_date', endDate)
    .order('teach_date')

  // 4. Attendance for those logs
  const logIds = (logs || []).map((l: any) => l.id)
  let attendance: any[] = []
  if (logIds.length > 0) {
    const { data: att } = await supabase
      .from('attendance_records')
      .select('*, student:student_id(id, student_number, prefix, first_name, last_name)')
      .in('teaching_log_id', logIds)
    attendance = att || []
  }

  // 5. Students in this school
  const { data: students } = await supabase
    .from('students')
    .select('id, student_number, prefix, first_name, last_name, class_level')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('class_level')
    .order('student_number')

  // Compute summaries
  const allLogs = logs || []
  const totalDays = new Set(allLogs.map((l: any) => l.teach_date)).size
  const totalPeriods = allLogs.length

  // Group logs by subject
  const subjectMap: Record<string, { name: string; logs: any[] }> = {}
  for (const l of allLogs) {
    const subName = l.assignment?.subject?.name || '?'
    const subId = l.assignment?.subject?.id || 'unknown'
    if (!subjectMap[subId]) subjectMap[subId] = { name: subName, logs: [] }
    subjectMap[subId].logs.push(l)
  }

  const subjectSummaries = Object.values(subjectMap).map((s: any) => ({
    name: s.name,
    total_periods: s.logs.length,
    topics: s.logs.filter((l: any) => l.topics_covered).map((l: any) => ({
      date: l.teach_date,
      topics: l.topics_covered,
      homework: l.homework_assigned,
      behavior: l.student_behavior,
      method: l.teaching_method,
      notes: l.report_notes,
    })),
  }))

  // Attendance stats per student
  const studentAttMap: Record<string, { present: number; absent: number; late: number; leave: number }> = {}
  for (const a of attendance) {
    const sid = a.student_id
    if (!studentAttMap[sid]) studentAttMap[sid] = { present: 0, absent: 0, late: 0, leave: 0 }
    if (a.status === 'present') studentAttMap[sid].present++
    else if (a.status === 'absent') studentAttMap[sid].absent++
    else if (a.status === 'late') studentAttMap[sid].late++
    else if (a.status === 'leave') studentAttMap[sid].leave++
  }

  // Students with issues (absent >= 2 or late >= 2)
  const concernStudents = (students || [])
    .filter((s: any) => {
      const att = studentAttMap[s.id]
      return att && (att.absent >= 2 || att.late >= 2)
    })
    .map((s: any) => ({
      ...s,
      attendance: studentAttMap[s.id],
    }))

  // Overall attendance stats
  const totalPresent = attendance.filter(a => a.status === 'present').length
  const totalAbsent = attendance.filter(a => a.status === 'absent').length
  const totalLate = attendance.filter(a => a.status === 'late').length
  const totalLeave = attendance.filter(a => a.status === 'leave').length
  const totalAtt = attendance.length

  // Teachers summary
  const teacherMap: Record<string, string> = {}
  for (const a of (assignments || [])) {
    if ((a as any).teacher?.id) teacherMap[(a as any).teacher.id] = (a as any).teacher.full_name
  }

  // Group attendance by log for PDF
  const attendanceByLog: Record<string, any[]> = {}
  for (const a of attendance) {
    if (!attendanceByLog[a.teaching_log_id]) attendanceByLog[a.teaching_log_id] = []
    attendanceByLog[a.teaching_log_id].push({
      student_number: a.student?.student_number,
      name: `${a.student?.prefix || ''}${a.student?.first_name || ''} ${a.student?.last_name || ''}`,
      status: a.status,
    })
  }

  // Attendance by classroom
  const classAttMap: Record<string, { present: number; absent: number; late: number; leave: number }> = {}
  for (const log of allLogs) {
    const cls = log.class_level || 'ไม่ระบุ'
    if (!classAttMap[cls]) classAttMap[cls] = { present: 0, absent: 0, late: 0, leave: 0 }
    const logAtt = attendanceByLog[log.id] || []
    for (const a of logAtt) {
      if (a.status === 'present') classAttMap[cls].present++
      else if (a.status === 'absent') classAttMap[cls].absent++
      else if (a.status === 'late') classAttMap[cls].late++
      else if (a.status === 'leave') classAttMap[cls].leave++
    }
  }
  const attendanceByClassroom = Object.entries(classAttMap).map(([cls, att]) => {
    const total = att.present + att.absent + att.late + att.leave
    return {
      class_level: cls,
      ...att,
      total,
      rate: total > 0 ? Math.round(att.present / total * 100) : 0,
    }
  }).sort((a, b) => a.class_level.localeCompare(b.class_level))

  // Week number
  const sd = new Date(startDate)
  const startOfYear = new Date(sd.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((sd.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)

  // Teacher remarks (notes from logs)
  const teacherRemarks = allLogs
    .filter((l: any) => l.report_notes)
    .map((l: any) => ({
      date: l.teach_date,
      teacher: l.teacher?.full_name || '-',
      subject: l.assignment?.subject?.name || '-',
      notes: l.report_notes,
    }))

  return NextResponse.json({
    school,
    period: { start_date: startDate, end_date: endDate },
    week_number: weekNumber,
    summary: {
      total_days: totalDays,
      total_periods: totalPeriods,
      teachers: Object.values(teacherMap),
      submitted_reports: allLogs.filter((l: any) => l.status === 'submitted' || l.status === 'reviewed').length,
    },
    subjects: subjectSummaries,
    attendance: {
      total: totalAtt,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      leave: totalLeave,
      rate: totalAtt > 0 ? Math.round(totalPresent / totalAtt * 100) : 0,
    },
    attendance_by_classroom: attendanceByClassroom,
    attendance_by_log: attendanceByLog,
    concern_students: concernStudents,
    teacher_remarks: teacherRemarks,
    students: students || [],
    logs: allLogs,
  })
}
