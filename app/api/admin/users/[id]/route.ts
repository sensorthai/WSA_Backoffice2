import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const emptyToNull = (v: string | null | undefined) => v === "" ? null : v;

const updateUserSchema = z.object({
  full_name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล").optional(),
  email: z.string().email("อีเมลไม่ถูกต้อง").optional(),
  role: z.string().optional(),
  department_id: z.string().nullable().optional().transform(emptyToNull),
  position_id: z.string().nullable().optional().transform(emptyToNull),
  supervisor_id: z.string().nullable().optional().transform(emptyToNull),
  is_active: z.boolean().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validatedData = updateUserSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('users')
      .update(validatedData)
      .eq('id', params.id)
      .select()
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  
  // 1. Clear supervisor references in other tables to avoid FK violations
  await Promise.all([
    supabase.from('users').update({ supervisor_id: null }).eq('supervisor_id', params.id),
    supabase.from('purchase_requests').update({ supervisor_id: null }).eq('supervisor_id', params.id),
    supabase.from('car_bookings').update({ supervisor_id: null }).eq('supervisor_id', params.id),
    supabase.from('leave_requests').update({ supervisor_id: null }).eq('supervisor_id', params.id),
  ])

  // 2. Perform the actual deletion
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: "ลบพนักงานเรียบร้อยแล้ว" })
}
