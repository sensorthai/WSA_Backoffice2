import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || !['admin', 'ceo'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description, custom_fields } = body

    if (!name) {
      return NextResponse.json({ error: "กรุณาระบุชื่อประเภทตั๋ว" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('ticket_types')
      .insert({
        name,
        description: description || null,
        custom_fields: custom_fields || []
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างประเภทตั๋ว" }, { status: 500 })
  }
}
