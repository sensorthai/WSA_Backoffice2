import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const studentSchema = z.object({
  student_number: z.number().int().min(1, "กรุณากรอกเลขที่"),
  prefix: z.string().optional().nullable(),
  first_name: z.string().min(1, "กรุณากรอกชื่อ"),
  last_name: z.string().min(1, "กรุณากรอกนามสกุล"),
  nickname: z.string().optional().nullable(),
  class_level: z.string().min(1, "กรุณากรอกระดับชั้น"),
  school_id: z.string().regex(UUID_REGEX, "กรุณาเลือกโรงเรียน"),
  academic_year: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  org_id: z.string().regex(UUID_REGEX),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("school_id")
  const classLevel = searchParams.get("class_level")
  const academicYear = searchParams.get("academic_year")

  let query = supabase.from('students').select('*, school:schools(id, name)').order('student_number')

  if (schoolId) query = query.eq('school_id', schoolId)
  if (classLevel) query = query.eq('class_level', classLevel)
  if (academicYear) query = query.eq('academic_year', academicYear)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  if (!['admin', 'employee'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Handle batch insert (array of students)
    if (Array.isArray(body)) {
      const validated = body.map(s => studentSchema.parse(s))
      const supabase = createSupabaseServerClient()
      const { data, error } = await supabase.from('students').insert(validated).select()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data, { status: 201 })
    }

    // Single insert
    const validatedData = studentSchema.parse(body)
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.from('students').insert(validatedData).select('*, school:schools(id, name)').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
