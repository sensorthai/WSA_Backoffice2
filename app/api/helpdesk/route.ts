import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

const VALID_CATEGORIES = ["it", "facility", "hr", "other"]
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("helpdesk_tickets")
    .select("id,title,category,status,priority,created_at")
    .eq("reported_by", session.user.id)
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

  const body = await req.json().catch((): null => null)
  const title = body?.title?.trim()
  const description = body?.description?.trim()
  const category = body?.category
  const priority = body?.priority

  if (!title || !description || !category || !priority) {
    return NextResponse.json({ error: "Missing required data" }, { status: 400 })
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("helpdesk_tickets")
    .insert({
      title,
      description,
      category,
      priority,
      reported_by: session.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
