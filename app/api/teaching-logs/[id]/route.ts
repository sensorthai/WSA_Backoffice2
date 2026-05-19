import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const logUpdateSchema = z.object({
  check_in_time: z.string().optional().nullable(),
  check_out_time: z.string().optional().nullable(),
  check_in_lat: z.number().optional().nullable(),
  check_in_lng: z.number().optional().nullable(),
  topics_covered: z.string().optional().nullable(),
  student_count: z.number().optional().nullable(),
  class_level: z.string().optional().nullable(),
  report_notes: z.string().optional().nullable(),
  homework_assigned: z.string().optional().nullable(),
  student_behavior: z.string().optional().nullable(),
  teaching_method: z.string().optional().nullable(),
  status: z.string().optional(),
  reviewed_by: z.string().optional().nullable(),
  reviewed_at: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = logUpdateSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('teaching_logs')
      .update(validatedData)
      .eq('id', params.id)
      .select(`
        *,
        assignment:assignment_id (id, subject:subject_id (id, name)),
        school:school_id (id, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('teaching_logs')
    .select(`
      *,
      assignment:assignment_id (
        id,
        schedule_time_start,
        schedule_time_end,
        subject:subject_id (id, name, code)
      ),
      teacher:teacher_id (id, full_name, email),
      school:school_id (id, name, district),
      reviewer:reviewed_by (id, full_name)
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // Fetch the log first to check permissions
  const { data: log, error: fetchError } = await supabase
    .from('teaching_logs')
    .select('teacher_id, status')
    .eq('id', params.id)
    .single()

  if (fetchError || !log) {
    return NextResponse.json({ error: "ไม่พบข้อมูลรายงานการสอน" }, { status: 404 })
  }

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const isOwner = log.teacher_id === userId
  const isStaff = ['admin', 'ceo', 'employee', 'supervisor'].includes(role)

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบรายงานการสอนนี้" }, { status: 403 })
  }

  // 1. Delete attendance records first
  const { error: attError } = await supabase
    .from('attendance_records')
    .delete()
    .eq('teaching_log_id', params.id)

  if (attError) {
    return NextResponse.json({ error: `ลบข้อมูลการเช็คชื่อไม่สำเร็จ: ${attError.message}` }, { status: 500 })
  }

  // 2. Delete the teaching log itself
  const { error: deleteError } = await supabase
    .from('teaching_logs')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: `ลบรายงานการสอนไม่สำเร็จ: ${deleteError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
