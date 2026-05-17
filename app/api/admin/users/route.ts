import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const emptyToNull = (v: string | null | undefined) => v === "" ? null : v;

const userSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  full_name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  google_id: z.string().optional().nullable(),
  role: z.string().default("employee"),
  department_id: z.string().nullable().optional().transform(emptyToNull),
  position_id: z.string().nullable().optional().transform(emptyToNull),
  supervisor_id: z.string().nullable().optional().transform(emptyToNull),
})

export async function GET() {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      departments:department_id (id, name),
      positions:position_id (id, name, approval_limit),
      supervisor:supervisor_id (id, full_name)
    `)
    .order('created_at', { ascending: false })

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

  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validatedData = userSchema.parse(body)
    const supabase = createSupabaseServerClient()

    // ให้ค่า dummy google_id เพื่อไม่ให้ติด Error NOT NULL จากฐานข้อมูลเดิม
    if (!validatedData.google_id) {
      validatedData.google_id = `invite-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    }

    const { data, error } = await supabase
      .from('users')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error("Supabase Insert Error:", error);
      if (error.code === '23505') {
        return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("API Catch Error:", error);
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
