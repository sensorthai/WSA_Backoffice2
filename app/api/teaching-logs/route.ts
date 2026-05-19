import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const teachingLogSchema = z.object({
  assignment_id: z.string().regex(UUID_REGEX, "กรุณาระบุ Assignment"),
  teacher_id: z.string().regex(UUID_REGEX),
  school_id: z.string().regex(UUID_REGEX),
  teach_date: z.string().min(1, "กรุณาระบุวันที่สอน"),
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
  status: z.string().default("pending"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const supabase = createSupabaseServerClient()

  let query = supabase
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
    .order('teach_date', { ascending: false })

  // Outsource teachers & employee-teachers only see own logs
  if (role === 'outsource') {
    query = query.eq('teacher_id', userId)
  } else if (role !== 'admin' && role !== 'ceo' && role !== 'supervisor') {
    // Regular employees: check if they have assignments (is_teacher handled via assignments)
    query = query.eq('teacher_id', userId)
  }

  // Optional filters
  const assignmentId = req.nextUrl.searchParams.get('assignment_id')
  if (assignmentId) query = query.eq('assignment_id', assignmentId)

  const teachDate = req.nextUrl.searchParams.get('date')
  if (teachDate) query = query.eq('teach_date', teachDate)

  const status = req.nextUrl.searchParams.get('status')
  if (status) query = query.eq('status', status)

  const teacherId = req.nextUrl.searchParams.get('teacher_id')
  if (teacherId) query = query.eq('teacher_id', teacherId)

  // Limit results
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    console.error("Fetch teaching_logs error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = teachingLogSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('teaching_logs')
      .insert(validatedData)
      .select(`
        *,
        assignment:assignment_id (id, subject:subject_id (id, name)),
        school:school_id (id, name)
      `)
      .single()

    if (error) {
      console.error("Supabase Insert Error (Teaching Log):", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
