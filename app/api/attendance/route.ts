import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const attendanceItemSchema = z.object({
  student_id: z.string().regex(UUID_REGEX),
  status: z.string(),
  reason: z.string().optional().nullable(),
})

const batchAttendanceSchema = z.object({
  teaching_log_id: z.string().regex(UUID_REGEX, "กรุณาระบุ Teaching Log"),
  records: z.array(attendanceItemSchema).min(1, "กรุณาเช็คชื่ออย่างน้อย 1 คน"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const logId = req.nextUrl.searchParams.get("teaching_log_id")

  if (!logId) return NextResponse.json({ error: "กรุณาระบุ teaching_log_id" }, { status: 400 })

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*, student:students(id, student_number, prefix, first_name, last_name, nickname)')
    .eq('teaching_log_id', logId)
    .order('student(student_number)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })

  try {
    const body = await req.json()
    const { teaching_log_id, records } = batchAttendanceSchema.parse(body)
    const supabase = createSupabaseServerClient()

    // Delete existing records for this log (upsert pattern)
    await supabase.from('attendance_records').delete().eq('teaching_log_id', teaching_log_id)

    // Insert new records
    const rows = records.map(r => ({
      teaching_log_id,
      student_id: r.student_id,
      status: r.status,
      reason: r.reason || null,
    }))

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(rows)
      .select('*, student:students(id, student_number, prefix, first_name, last_name)')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
