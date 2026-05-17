import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const materialSchema = z.object({
  material_code: z.string().min(1, "กรุณาระบุรหัสสื่อ"),
  title: z.string().min(1, "กรุณากรอกชื่อสื่อ"),
  type: z.string().min(1, "กรุณาเลือกประเภท"),
  description: z.string().optional().nullable(),
  file_url: z.string().optional().nullable(),
  youtube_url: z.string().optional().nullable(),
  file_name: z.string().optional().nullable(),
  file_size: z.number().int().optional().nullable(),
  sort_order: z.number().int().default(0),
  org_id: z.string().regex(UUID_REGEX),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(req.url)
  const materialCode = searchParams.get("material_code")

  let query = supabase
    .from('subject_materials')
    .select('*, uploader:users!uploaded_by(id, full_name)')
    .order('material_code')
    .order('sort_order')
    .order('created_at', { ascending: false })

  if (materialCode) query = query.eq('material_code', materialCode)

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
    const validatedData = materialSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('subject_materials')
      .insert({ ...validatedData, uploaded_by: (session.user as any).id })
      .select()
      .single()

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
