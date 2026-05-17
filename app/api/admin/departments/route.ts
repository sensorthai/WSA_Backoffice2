import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const deptSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อแผนก"),
  org_id: z.string().regex(UUID_REGEX, "กรุณาระบุ Organization ID"),
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
    .from('departments')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  console.log("POST /api/admin/departments - Session:", !!session, "User:", (session?.user as any)?.email, "Role:", (session?.user as any)?.role)

  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    console.log("POST /api/admin/departments - Body received:", body)
    const validatedData = deptSchema.parse(body)
    console.log("POST /api/admin/departments - Validated Data:", validatedData)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('departments')
      .insert(validatedData)
      .select()

    if (error) {
      console.error("Supabase Insert Error (Dept):", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("POST /api/admin/departments - Supabase Response Data:", data)

    const inserted = data && data.length > 0 ? data[0] : null
    if (!inserted) {
      return NextResponse.json({ error: "Failed to create department record" }, { status: 500 })
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
