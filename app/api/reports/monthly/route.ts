import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, format } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(req.url)

  const month = searchParams.get("month") || format(new Date(), "yyyy-MM")
  const schoolId = searchParams.get("school_id")
  const classLevel = searchParams.get("class_level")
  const teacherId = searchParams.get("teacher_id")

  const start = startOfMonth(new Date(`${month}-01`))
  const end = endOfMonth(start)
  const startDateStr = format(start, "yyyy-MM-dd")
  const endDateStr = format(end, "yyyy-MM-dd")

  // Weekdays in this month (expected teaching days)
  const allDays = eachDayOfInterval({ start, end })
  const weekdays = allDays.filter(d => !isWeekend(d))
  const totalExpectedDays = weekdays.length

  // 1. Get assignments active in this school
  let assignQuery = supabase
    .from("teaching_assignments")
    .select(`
      id, school_id, teacher_id, subject_id, class_level, academic_year,
      schedule_days, schedule_dates, status,
      school:school_id (id, name),
      subject:subject_id (id, name),
      teacher:teacher_id (id, full_name)
    `)
    .eq("status", "active")
  if (schoolId) assignQuery = assignQuery.eq("school_id", schoolId)
  if (teacherId) assignQuery = assignQuery.eq("teacher_id", teacherId)
  if (classLevel) assignQuery = assignQuery.eq("class_level", classLevel)

  const { data: assignments } = await assignQuery

  // 2. Teaching logs for this month
  let logQuery = supabase
    .from("teaching_logs")
    .select(`
      *,
      assignment:assignment_id (
        id, class_level,
        subject:subject_id (id, name)
      ),
      teacher:teacher_id (id, full_name),
      school:school_id (id, name)
    `)
    .gte("teach_date", startDateStr)
    .lte("teach_date", endDateStr)
    .order("teach_date")

  if (schoolId) logQuery = logQuery.eq("school_id", schoolId)
  if (teacherId) logQuery = logQuery.eq("teacher_id", teacherId)

  const { data: logs } = await logQuery

  // Filter by class_level if provided (from assignment)
  let filteredLogs = logs || []
  if (classLevel) {
    filteredLogs = filteredLogs.filter(
      (l: any) => l.assignment?.class_level === classLevel || l.class_level === classLevel
    )
  }

  // 3. Attendance records for these logs
  const logIds = filteredLogs.map((l: any) => l.id)
  let attendance: any[] = []
  if (logIds.length > 0) {
    // Fetch in batches of 50 to avoid URL length issues
    for (let i = 0; i < logIds.length; i += 50) {
      const batch = logIds.slice(i, i + 50)
      const { data: att } = await supabase
        .from("attendance_records")
        .select("*, student:student_id(id, student_number, prefix, first_name, last_name)")
        .in("teaching_log_id", batch)
      if (att) attendance = [...attendance, ...att]
    }
  }

  // 4. Students in this school/class
  let studentQuery = supabase
    .from("students")
    .select("id, student_number, prefix, first_name, last_name, class_level, nickname")
    .eq("is_active", true)
    .order("student_number")
  if (schoolId) studentQuery = studentQuery.eq("school_id", schoolId)
  if (classLevel) studentQuery = studentQuery.eq("class_level", classLevel)
  const { data: students } = await studentQuery

  // 5. Schools for dropdown
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .order("name")

  // ============= COMPUTE STATISTICS =============

  // Teaching session summary
  const uniqueTeachDates = new Set(filteredLogs.map((l: any) => l.teach_date))
  const actualTeachDays = uniqueTeachDates.size

  // Determine expected days from assignments schedule
  let expectedDaysFromSchedule = 0
  if (assignments && assignments.length > 0) {
    const dayKeyMap: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" }
    for (const day of weekdays) {
      const dayKey = dayKeyMap[day.getDay()]
      const dateStr = format(day, "yyyy-MM-dd")
      const hasSchedule = (assignments || []).some((a: any) =>
        (a.schedule_days || []).includes(dayKey) ||
        (a.schedule_dates || []).includes(dateStr)
      )
      if (hasSchedule) expectedDaysFromSchedule++
    }
  }

  const expectedDays = expectedDaysFromSchedule > 0 ? expectedDaysFromSchedule : totalExpectedDays
  const completionRate = expectedDays > 0 ? Math.round((actualTeachDays / expectedDays) * 100) : 0

  // Attendance statistics
  const totalAttRecords = attendance.length
  const totalPresent = attendance.filter((a: any) => a.status === "present").length
  const totalAbsent = attendance.filter((a: any) => a.status === "absent").length
  const totalLate = attendance.filter((a: any) => a.status === "late").length
  const totalLeave = attendance.filter((a: any) => a.status === "leave").length
  const averageAttendanceRate = totalAttRecords > 0
    ? Math.round(((totalPresent + totalLate) / totalAttRecords) * 100)
    : 0

  // Topics covered (progress summary from logs)
  const topicsList = filteredLogs
    .filter((l: any) => l.topics_covered)
    .map((l: any) => ({
      date: l.teach_date,
      subject: l.assignment?.subject?.name || "-",
      topics: l.topics_covered,
      class_level: l.assignment?.class_level || l.class_level || "-",
    }))

  // Daily attendance trend (for line chart)
  const dailyTrend: { date: string; rate: number; present: number; total: number }[] = []
  const attByDate: Record<string, { present: number; total: number }> = {}
  for (const log of filteredLogs) {
    const date = (log as any).teach_date
    if (!attByDate[date]) attByDate[date] = { present: 0, total: 0 }
    const logAtt = attendance.filter((a: any) => a.teaching_log_id === (log as any).id)
    attByDate[date].total += logAtt.length
    attByDate[date].present += logAtt.filter((a: any) => a.status === "present" || a.status === "late").length
  }
  const sortedDates = Object.keys(attByDate).sort()
  for (const date of sortedDates) {
    const { present, total } = attByDate[date]
    dailyTrend.push({
      date,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      present,
      total,
    })
  }

  // Top 5 most absent students
  const studentAbsentMap: Record<string, { count: number; student: any }> = {}
  for (const a of attendance) {
    if (a.status === "absent") {
      const sid = a.student_id
      if (!studentAbsentMap[sid]) {
        studentAbsentMap[sid] = {
          count: 0,
          student: a.student || { id: sid, first_name: "?", last_name: "?" },
        }
      }
      studentAbsentMap[sid].count++
    }
  }
  const topAbsentStudents = Object.values(studentAbsentMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(item => ({
      student_id: item.student.id,
      student_number: item.student.student_number,
      name: `${item.student.prefix || ""}${item.student.first_name} ${item.student.last_name}`,
      absent_count: item.count,
    }))

  // Per-student attendance summary
  const studentAttMap: Record<string, { present: number; absent: number; late: number; leave: number }> = {}
  for (const a of attendance) {
    const sid = a.student_id
    if (!studentAttMap[sid]) studentAttMap[sid] = { present: 0, absent: 0, late: 0, leave: 0 }
    if (a.status === "present") studentAttMap[sid].present++
    else if (a.status === "absent") studentAttMap[sid].absent++
    else if (a.status === "late") studentAttMap[sid].late++
    else if (a.status === "leave") studentAttMap[sid].leave++
  }

  // Unique subjects taught
  const subjectsSet = new Set<string>()
  filteredLogs.forEach((l: any) => {
    const name = l.assignment?.subject?.name
    if (name) subjectsSet.add(name)
  })

  // ============= RESPONSE =============
  return NextResponse.json({
    period: {
      month,
      start_date: startDateStr,
      end_date: endDateStr,
      month_label: start.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
    },
    teaching_summary: {
      actual_days: actualTeachDays,
      expected_days: expectedDays,
      completion_rate: completionRate,
      total_periods: filteredLogs.length,
      subjects: [...subjectsSet],
    },
    attendance: {
      total_records: totalAttRecords,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      leave: totalLeave,
      average_rate: averageAttendanceRate,
    },
    topics: topicsList,
    daily_trend: dailyTrend,
    top_absent_students: topAbsentStudents,
    student_attendance: (students || []).map((s: any) => ({
      ...s,
      name: `${s.prefix || ""}${s.first_name} ${s.last_name}`,
      ...(studentAttMap[s.id] || { present: 0, absent: 0, late: 0, leave: 0 }),
    })),
    schools: schools || [],
    assignments: (assignments || []).map((a: any) => ({
      id: a.id,
      school_id: a.school_id,
      school_name: (a as any).school?.name,
      subject_name: (a as any).subject?.name,
      teacher_name: (a as any).teacher?.full_name,
      class_level: a.class_level,
    })),
  })
}
