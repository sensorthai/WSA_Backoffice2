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

  // 1. Active assignments with fee info
  let assignQuery = supabase
    .from("teaching_assignments")
    .select(`
      id, school_id, teacher_id, subject_id, class_level,
      periods_per_day, teaching_fee, status,
      school:school_id (id, name),
      subject:subject_id (id, name),
      teacher:teacher_id (id, full_name)
    `)
    .eq("status", "active")
  if (filterTeacher) assignQuery = assignQuery.eq("teacher_id", filterTeacher)
  if (filterSchool) assignQuery = assignQuery.eq("school_id", filterSchool)

  const { data: assignments } = await assignQuery

  // 2. Teaching logs (submitted/reviewed) for this month
  let logQuery = supabase
    .from("teaching_logs")
    .select("id, teacher_id, school_id, assignment_id, teach_date, status")
    .gte("teach_date", startStr)
    .lte("teach_date", endStr)
    .in("status", ["submitted", "reviewed"])
  if (filterTeacher) logQuery = logQuery.eq("teacher_id", filterTeacher)
  if (filterSchool) logQuery = logQuery.eq("school_id", filterSchool)

  const { data: logs } = await logQuery

  // 3. Teachers list for filter dropdown
  const { data: teachers } = await supabase
    .from("users")
    .select("id, full_name")
    .in("role", ["outsource", "employee"])
    .eq("is_active", true)
    .order("full_name")

  // 4. Schools list for filter dropdown
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .order("name")

  // Build per-assignment income rows
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
  }

  const rows: IncomeRow[] = []
  const assignMap = new Map<string, any>()
  for (const a of (assignments || [])) {
    assignMap.set(a.id, a)
  }

  // Count teach days per assignment
  const daysByAssignment: Record<string, Set<string>> = {}
  for (const log of (logs || [])) {
    const aid = log.assignment_id
    if (!aid) continue
    if (!daysByAssignment[aid]) daysByAssignment[aid] = new Set()
    daysByAssignment[aid].add(log.teach_date)
  }

  for (const a of (assignments || [])) {
    const teachDays = daysByAssignment[a.id]?.size || 0
    const fee = a.teaching_fee || 0
    const ppd = a.periods_per_day || 1
    const totalPeriods = ppd * teachDays
    const income = fee * totalPeriods

    rows.push({
      teacher_id: a.teacher_id,
      teacher_name: (a as any).teacher?.full_name || "?",
      school_name: (a as any).school?.name || "?",
      subject_name: (a as any).subject?.name || "?",
      class_level: a.class_level || "-",
      teaching_fee: fee,
      periods_per_day: ppd,
      teach_days: teachDays,
      total_periods: totalPeriods,
      income,
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
