import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const posSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อตำแหน่ง"),
  org_id: z.string().regex(UUID_REGEX, "กรุณาระบุ Organization ID"),
  approval_limit: z.number().min(0).default(0),
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
    .from('positions')
    .select('*')
    .order('approval_limit', { ascending: false })

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
    console.log("POST /api/admin/positions - Body received:", body)
    const validatedData = posSchema.parse(body)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('positions')
      .insert(validatedData)
      .select()

    if (error) {
      console.error("Supabase Insert Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const inserted = data && data.length > 0 ? data[0] : null
    if (!inserted) {
      return NextResponse.json({ error: "Failed to create position record" }, { status: 500 })
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (error: any) {
    console.error("API Error adding position:", error)
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
