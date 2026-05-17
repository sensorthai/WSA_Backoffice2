import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const assignmentSchema = z.object({
  teacher_id: z.string().regex(UUID_REGEX, "กรุณาเลือกครูผู้สอน"),
  school_id: z.string().regex(UUID_REGEX, "กรุณาเลือกโรงเรียน"),
  subject_id: z.string().regex(UUID_REGEX, "กรุณาเลือกวิชา"),
  start_date: z.string().min(1, "กรุณาระบุวันเริ่มสอน"),
  end_date: z.string().optional().nullable(),
  schedule_days: z.array(z.string()).default([]),
  schedule_dates: z.array(z.string()).default([]),
  schedule_time_start: z.string().optional().nullable(),
  schedule_time_end: z.string().optional().nullable(),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
  class_level: z.string().optional().nullable(),
  academic_year: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  teaching_fee: z.number().optional().nullable().default(0),
  periods_per_day: z.number().optional().nullable().default(1),
  org_id: z.string().regex(UUID_REGEX, "กรุณาระบุ Organization ID"),
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
    .from('teaching_assignments')
    .select(`
      *,
      teacher:teacher_id (id, full_name, email),
      school:school_id (id, name, district, province, holidays),
      subject:subject_id (id, name, code),
      assigner:assigned_by (id, full_name)
    `)
    .order('created_at', { ascending: false })

  // Outsource teachers can only see their own assignments
  if (role === 'outsource') {
    query = query.eq('teacher_id', userId)
  }

  // Filter by status if provided
  const status = req.nextUrl.searchParams.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Fetch assignments error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (!['admin', 'employee', 'supervisor'].includes(role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validatedData = assignmentSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('teaching_assignments')
      .insert({
        ...validatedData,
        assigned_by: (session.user as any).id,
      })
      .select(`
        *,
        teacher:teacher_id (id, full_name, email),
        school:school_id (id, name),
        subject:subject_id (id, name, code),
        assigner:assigned_by (id, full_name)
      `)
      .single()

    if (error) {
      console.error("Supabase Insert Error (Assignment):", error)
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
