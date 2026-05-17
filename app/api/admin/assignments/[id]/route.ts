import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const assignmentUpdateSchema = z.object({
  teacher_id: z.string().optional(),
  school_id: z.string().optional(),
  subject_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  schedule_days: z.array(z.string()).optional(),
  schedule_dates: z.array(z.string()).optional(),
  schedule_time_start: z.string().optional().nullable(),
  schedule_time_end: z.string().optional().nullable(),
  status: z.string().optional(),
  class_level: z.string().optional().nullable(),
  academic_year: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  teaching_fee: z.number().optional().nullable(),
  periods_per_day: z.number().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const validatedData = assignmentUpdateSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('teaching_assignments')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select(`
        *,
        teacher:teacher_id (id, full_name, email),
        school:school_id (id, name),
        subject:subject_id (id, name, code),
        assigner:assigned_by (id, full_name)
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (!['admin'].includes(role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('teaching_assignments').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
