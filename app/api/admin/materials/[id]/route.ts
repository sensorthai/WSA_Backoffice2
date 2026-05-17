import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const materialUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  description: z.string().optional().nullable(),
  file_url: z.string().optional().nullable(),
  youtube_url: z.string().optional().nullable(),
  file_name: z.string().optional().nullable(),
  file_size: z.number().int().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  if (!['admin', 'employee'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validatedData = materialUpdateSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('subject_materials')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  if (!['admin', 'employee'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('subject_materials').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
