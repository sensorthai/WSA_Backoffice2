import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || !['admin', 'ceo'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description, custom_fields } = body

    const supabase = createSupabaseServerClient()

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (custom_fields !== undefined) updateData.custom_fields = custom_fields

    const { data, error } = await supabase
      .from('ticket_types')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไขประเภทตั๋ว" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || !['admin', 'ceo'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('ticket_types')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: "ไม่สามารถลบประเภทตั๋วนี้ได้ เนื่องจากมีตั๋วที่ใช้งานอยู่หรือฐานข้อมูลปฏิเสธ" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
