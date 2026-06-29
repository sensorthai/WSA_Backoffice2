import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { startOfMonth, endOfMonth, format } from "date-fns"

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
  const filterTeacher = searchParams.get("teacher_id")
  const filterSchool = searchParams.get("school_id")

  const start = startOfMonth(new Date(`${month}-01`))
  const end = endOfMonth(start)
  const startStr = format(start, "yyyy-MM-dd")
  const endStr = format(end, "yyyy-MM-dd")

  // 1. Teaching logs (reviewed only) for this month with teacher, school, and assignment details
  let logQuery = supabase
    .from("teaching_logs")
    .select(`
      id,
      teacher_id,
      school_id,
      assignment_id,
      teach_date,
      status,
      teacher:teacher_id (id, full_name),
      school:school_id (id, name),
      assignment:assignment_id (
        id,
        class_level,
        periods_per_day,
        teaching_fee,
        subject:subject_id (id, name)
      )
    `)
    .gte("teach_date", startStr)
    .lte("teach_date", endStr)
    .eq("status", "reviewed")
  if (filterTeacher) logQuery = logQuery.eq("teacher_id", filterTeacher)
  if (filterSchool) logQuery = logQuery.eq("school_id", filterSchool)

  const { data: logs } = await logQuery

  // 2. Teachers list for filter dropdown (outsource + employees with is_teacher=true)
  const { data: teachers } = await supabase
    .from("users")
    .select("id, full_name, role, is_teacher")
    .or("role.eq.outsource,is_teacher.eq.true")
    .eq("is_active", true)
    .order("full_name")

  // 3. Schools list for filter dropdown
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .order("name")

  // Build per-teacher/assignment income rows
  type IncomeRow = {
    teacher_id: string
    teacher_name: string
    school_name: string
    subject_name: string
    class_level: string
    teaching_fee: number
    periods_per_day: number
    teach_days: number
    total_periods: number
    income: number
    teach_dates_str: string
  }

  const rowsMap = new Map<string, {
    teacher_id: string
    teacher_name: string
    school_name: string
    subject_name: string
    class_level: string
    teaching_fee: number
    periods_per_day: number
    dates: Set<string>
  }>()

  for (const log of (logs || [])) {
    const teacherId = log.teacher_id
    const assignmentId = log.assignment_id
    if (!teacherId || !assignmentId) continue

    const key = `${teacherId}-${assignmentId}`
    if (!rowsMap.has(key)) {
      const teacherName = (log as any).teacher?.full_name || "?"
      const schoolName = (log as any).school?.name || "?"
      const subjectName = (log as any).assignment?.subject?.name || "?"
      const classLevel = (log as any).assignment?.class_level || "-"
      const fee = (log as any).assignment?.teaching_fee || 0
      const ppd = (log as any).assignment?.periods_per_day || 1

      rowsMap.set(key, {
        teacher_id: teacherId,
        teacher_name: teacherName,
        school_name: schoolName,
        subject_name: subjectName,
        class_level: classLevel,
        teaching_fee: fee,
        periods_per_day: ppd,
        dates: new Set<string>()
      })
    }

    rowsMap.get(key)!.dates.add(log.teach_date)
  }

  const rows: IncomeRow[] = []
  for (const [key, val] of rowsMap.entries()) {
    const teachDays = val.dates.size
    const sortedDates = Array.from(val.dates).sort()
    const teach_dates_str = sortedDates.map(d => {
      const [, mm, dd] = d.split("-")
      return `${dd}/${mm}`
    }).join(", ")

    const totalPeriods = val.periods_per_day * teachDays
    const income = val.teaching_fee * totalPeriods

    rows.push({
      teacher_id: val.teacher_id,
      teacher_name: val.teacher_name,
      school_name: val.school_name,
      subject_name: val.subject_name,
      class_level: val.class_level,
      teaching_fee: val.teaching_fee,
      periods_per_day: val.periods_per_day,
      teach_days: teachDays,
      total_periods: totalPeriods,
      income,
      teach_dates_str,
    })
  }

  // Group by teacher for subtotals
  const teacherTotals: Record<string, {
    teacher_id: string; teacher_name: string;
    total_periods: number; total_days: number; total_income: number; assignments: number
  }> = {}

  for (const r of rows) {
    if (!teacherTotals[r.teacher_id]) {
      teacherTotals[r.teacher_id] = {
        teacher_id: r.teacher_id,
        teacher_name: r.teacher_name,
        total_periods: 0,
        total_days: 0,
        total_income: 0,
        assignments: 0,
      }
    }
    const t = teacherTotals[r.teacher_id]
    t.total_periods += r.total_periods
    t.total_days += r.teach_days
    t.total_income += r.income
    t.assignments++
  }

  // Grand totals
  const grandTotal = {
    teachers: Object.keys(teacherTotals).length,
    total_periods: rows.reduce((s, r) => s + r.total_periods, 0),
    total_income: rows.reduce((s, r) => s + r.income, 0),
    avg_per_teacher: Object.keys(teacherTotals).length > 0
      ? Math.round(rows.reduce((s, r) => s + r.income, 0) / Object.keys(teacherTotals).length)
      : 0,
  }

  return NextResponse.json({
    month,
    month_label: start.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
    rows: rows.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name) || a.school_name.localeCompare(b.school_name)),
    teacher_totals: Object.values(teacherTotals).sort((a, b) => b.total_income - a.total_income),
    grand_total: grandTotal,
    teachers: teachers || [],
    schools: schools || [],
  })
}
