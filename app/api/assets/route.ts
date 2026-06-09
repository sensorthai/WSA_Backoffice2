import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("assets")
    .select("id,name,asset_tag,category,status,purchase_date,notes,created_at")
    .order("created_at", { ascending: false })

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

  const role = (session.user as any)?.role
  if (!role || !["admin", "ceo"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch((): null => null)
  const name = body?.name?.trim()
  const asset_tag = body?.asset_tag?.trim()
  const category = body?.category?.trim()
  const status = body?.status
  const purchase_date = body?.purchase_date || null
  const notes = body?.notes?.trim() || null

  if (!name || !asset_tag || !category || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const validStatuses = ["available", "in_use", "maintenance", "retired"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("assets")
    .insert({
      name,
      asset_tag,
      category,
      status,
      purchase_date,
      notes,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
