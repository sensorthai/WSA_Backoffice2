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

  const pageParam = req.nextUrl.searchParams.get('page')
  const isPaginated = !!pageParam
  const page = parseInt(pageParam || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

  let query = supabase
    .from('teaching_logs')
    .select(`
      *,
      assignment:assignment_id!inner (
        id,
        schedule_time_start,
        schedule_time_end,
        class_level,
        subject:subject_id!inner (id, name, code)
      ),
      teacher:teacher_id (id, full_name, email),
      school:school_id (id, name, district),
      reviewer:reviewed_by (id, full_name)
    `, isPaginated ? { count: 'exact' } : undefined)
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

  const schoolId = req.nextUrl.searchParams.get('school_id')
  if (schoolId) query = query.eq('school_id', schoolId)

  const subjectId = req.nextUrl.searchParams.get('subject_id')
  if (subjectId) query = query.eq('assignment.subject_id', subjectId)

  const classLevel = req.nextUrl.searchParams.get('class_level')
  if (classLevel) query = query.eq('class_level', classLevel)

  if (isPaginated) {
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
  } else {
    query = query.limit(limit)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("Fetch teaching_logs error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (isPaginated) {
    const totalPages = count ? Math.ceil(count / limit) : 0
    return NextResponse.json({
      data,
      count,
      totalPages,
      page
    })
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

    // Auto-sync student count with actual students in the classroom
    if (validatedData.school_id && validatedData.class_level) {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', validatedData.school_id)
        .eq('class_level', validatedData.class_level)
        .eq('is_active', true)
      
      if (count !== null) {
        validatedData.student_count = count
      }
    }

    // Check if a record already exists for the same assignment, date, and teacher
    const { data: existingLog } = await supabase
      .from('teaching_logs')
      .select('id')
      .eq('assignment_id', validatedData.assignment_id)
      .eq('teach_date', validatedData.teach_date)
      .eq('teacher_id', validatedData.teacher_id)
      .maybeSingle()

    let query
    if (existingLog) {
      query = supabase
        .from('teaching_logs')
        .update(validatedData)
        .eq('id', existingLog.id)
    } else {
      query = supabase
        .from('teaching_logs')
        .insert(validatedData)
    }

    const { data, error } = await query
      .select(`
        *,
        assignment:assignment_id (id, subject:subject_id (id, name)),
        school:school_id (id, name)
      `)
      .single()

    if (error) {
      console.error("Supabase Save Error (Teaching Log):", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: existingLog ? 200 : 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
