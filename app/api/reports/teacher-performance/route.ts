import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, format } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole !== "ceo" && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month") || format(new Date(), "yyyy-MM")

  const start = startOfMonth(new Date(`${month}-01`))
  const end = endOfMonth(start)
  const startStr = format(start, "yyyy-MM-dd")
  const endStr = format(end, "yyyy-MM-dd")
  const weekdays = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d))
  const dayKeyMap: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" }

  // 1. Active assignments with schedule info
  const { data: assignments } = await supabase
    .from("teaching_assignments")
    .select(`
      id, school_id, teacher_id, subject_id, class_level,
      schedule_days, schedule_dates, schedule_time_start,
      periods_per_day, teaching_fee, status,
      school:school_id (id, name),
      subject:subject_id (id, name),
      teacher:teacher_id (id, full_name, email, avatar_url)
    `)
    .eq("status", "active")

  // 2. Teaching logs for this month
  const { data: logs } = await supabase
    .from("teaching_logs")
    .select(`
      id, teacher_id, school_id, assignment_id, teach_date,
      check_in_time, status, student_behavior,
      assignment:assignment_id (id, schedule_time_start)
    `)
    .gte("teach_date", startStr)
    .lte("teach_date", endStr)

  // Group by teacher
  const teacherMap: Record<string, {
    id: string; name: string; email: string; avatar_url: string;
    schools: Set<string>; subjects: Set<string>;
    expectedDays: number; actualDays: number;
    onTime: number; late: number; absent: number;
    submitted: number; totalLogs: number;
    behaviors: Record<string, number>;
    dailyStatus: Record<string, "ontime" | "late" | "absent">;
  }> = {}

  // Initialize from assignments
  for (const a of (assignments || [])) {
    const tid = a.teacher_id
    const teacher = (a as any).teacher
    if (!teacher) continue

    if (!teacherMap[tid]) {
      teacherMap[tid] = {
        id: tid,
        name: teacher.full_name || "?",
        email: teacher.email || "",
        avatar_url: teacher.avatar_url || "",
        schools: new Set(),
        subjects: new Set(),
        expectedDays: 0,
        actualDays: 0,
        onTime: 0,
        late: 0,
        absent: 0,
        submitted: 0,
        totalLogs: 0,
        behaviors: {},
        dailyStatus: {},
      }
    }
    const t = teacherMap[tid]
    if ((a as any).school?.name) t.schools.add((a as any).school.name)
    if ((a as any).subject?.name) t.subjects.add((a as any).subject.name)

    // Count expected days from schedule
    for (const day of weekdays) {
      const dayKey = dayKeyMap[day.getDay()]
      const dateStr = format(day, "yyyy-MM-dd")
      const hasSchedule =
        (a.schedule_days || []).includes(dayKey) ||
        (a.schedule_dates || []).includes(dateStr)
      if (hasSchedule) {
        // Use a set to avoid double-counting same date across assignments
        if (!t.dailyStatus[dateStr]) {
          t.expectedDays++
          t.dailyStatus[dateStr] = "absent" // default absent, will update below
        }
      }
    }
  }

  // Process logs
  for (const log of (logs || [])) {
    const tid = log.teacher_id
    if (!teacherMap[tid]) continue
    const t = teacherMap[tid]
    const dateStr = log.teach_date

    t.totalLogs++

    // Status submitted/reviewed counts
    if (log.status === "submitted" || log.status === "reviewed") {
      t.submitted++
    }

    // Student behavior
    if (log.student_behavior) {
      t.behaviors[log.student_behavior] = (t.behaviors[log.student_behavior] || 0) + 1
    }

    // Check punctuality: on-time if check_in <= schedule_time_start + 15 min
    const scheduleStart = (log as any).assignment?.schedule_time_start
    if (log.check_in_time && scheduleStart) {
      const checkinDate = new Date(log.check_in_time)
      const checkinMinutes = checkinDate.getHours() * 60 + checkinDate.getMinutes()

      const [sh, sm] = scheduleStart.split(":").map(Number)
      const scheduleMinutes = sh * 60 + sm + 15 // 15 min grace

      if (checkinMinutes <= scheduleMinutes) {
        t.dailyStatus[dateStr] = "ontime"
        t.onTime++
      } else {
        t.dailyStatus[dateStr] = "late"
        t.late++
      }
    } else if (log.check_in_time) {
      // Has check-in but no schedule time to compare -> count as on-time
      t.dailyStatus[dateStr] = "ontime"
      t.onTime++
    } else {
      // Has log but no check-in
      t.dailyStatus[dateStr] = "late"
      t.late++
    }
  }

  // Calculate final stats
  const result = Object.values(teacherMap).map(t => {
    // Count actual teach days (non-absent)
    t.actualDays = Object.values(t.dailyStatus).filter(s => s !== "absent").length
    t.absent = Object.values(t.dailyStatus).filter(s => s === "absent").length

    // Score: (on-time/expected × 40%) + ((expected-absent)/expected × 30%) + (submitted/totalLogs × 30%)
    const onTimeRate = t.expectedDays > 0 ? t.onTime / t.expectedDays : 0
    const attendRate = t.expectedDays > 0 ? (t.expectedDays - t.absent) / t.expectedDays : 0
    const reportRate = t.totalLogs > 0 ? t.submitted / t.totalLogs : 0
    const score = Math.round((onTimeRate * 40 + attendRate * 30 + reportRate * 30))

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      avatar_url: t.avatar_url,
      schools: [...t.schools],
      subjects: [...t.subjects],
      school_count: t.schools.size,
      subject_count: t.subjects.size,
      expected_days: t.expectedDays,
      actual_days: t.actualDays,
      on_time: t.onTime,
      late: t.late,
      absent: t.absent,
      submitted: t.submitted,
      total_logs: t.totalLogs,
      report_rate: t.totalLogs > 0 ? Math.round((t.submitted / t.totalLogs) * 100) : 0,
      score,
      behaviors: t.behaviors,
      daily_status: t.dailyStatus,
    }
  }).sort((a, b) => b.score - a.score)

  return NextResponse.json({
    month,
    month_label: start.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
    teachers: result,
  })
}
