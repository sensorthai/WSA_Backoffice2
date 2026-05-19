import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const role = (session.user as any)?.role || ''
  if (role !== 'admin' && role !== 'employee' && role !== 'supervisor') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const supabase = createSupabaseServerClient()

    // Only allow known fields
    const updatePayload: Record<string, any> = {}
    const allowedFields = [
      'teacher_id', 'school_id', 'subject_id', 'start_date', 'end_date',
      'schedule_days', 'schedule_dates', 'schedule_time_start', 'schedule_time_end',
      'status', 'class_level', 'academic_year', 'notes', 'teaching_fee', 'periods_per_day'
    ]
    for (const key of allowedFields) {
      if (key in body) updatePayload[key] = body[key]
    }
    updatePayload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('teaching_assignments')
      .update(updatePayload)
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
    return NextResponse.json({ error: error?.message || "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const role = (session.user as any)?.role || ''
  if (role !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('teaching_assignments').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
