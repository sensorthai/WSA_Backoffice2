import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const subjectSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อวิชา"),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  academic_year: z.string().optional().nullable(),
  semester: z.string().optional().nullable(),
  class_level: z.string().optional().nullable(),
  periods_per_day: z.number().int().min(1).default(1),
  time_start: z.string().optional().nullable(),
  time_end: z.string().optional().nullable(),
  teaching_fee: z.number().min(0).default(0),
  material_code: z.string().optional().nullable(),
  org_id: z.string().regex(UUID_REGEX, "กรุณาระบุ Organization ID"),
})

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  if (!['admin', 'employee'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validatedData = subjectSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('subjects')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error("Supabase Insert Error (Subject):", error)
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
