import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

const VALID_TYPES = ["news", "holiday", "policy"]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // Fetch user role to determine visibility
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single()

  const isAdmin = user?.role === "admin" || user?.role === "ceo"

  let query = supabase
    .from("announcements")
    .select("id, title, content, type, start_date, end_date, is_active, created_at, created_by (full_name)")
    .order("created_at", { ascending: false })

  // Non-admins only see active announcements
  if (!isAdmin) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // Only admins/ceo can create
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (user?.role !== "admin" && user?.role !== "ceo") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch((): null => null)
  const title = body?.title?.trim()
  const content = body?.content?.trim()
  const type = body?.type
  const startDate = body?.start_date || null
  const endDate = body?.end_date || null
  const isActive = body?.is_active !== undefined ? body?.is_active : true

  if (!title || !content || !type) {
    return NextResponse.json({ error: "Missing required data" }, { status: 400 })
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      content,
      type,
      start_date: startDate,
      end_date: endDate,
      is_active: isActive,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (user?.role !== "admin" && user?.role !== "ceo") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch((): null => null)
  const id = body?.id

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title?.trim()
  if (body.content !== undefined) updates.content = body.content?.trim()
  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
    updates.type = body.type
  }
  if (body.start_date !== undefined) updates.start_date = body.start_date
  if (body.end_date !== undefined) updates.end_date = body.end_date
  if (body.is_active !== undefined) updates.is_active = body.is_active
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("announcements")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (user?.role !== "admin" && user?.role !== "ceo") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
