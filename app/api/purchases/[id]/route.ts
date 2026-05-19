import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, users!purchase_requests_user_id_fkey(full_name, email, departments(name))')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Security: Only owner or admin/ceo/supervisor can view
  const userRole = (session.user as any).role
  const isOwner = data.user_id === session.user.id
  const isSupervisor = data.supervisor_id === session.user.id
  const isAdmin = ['admin', 'ceo'].includes(userRole)

  if (!isOwner && !isSupervisor && !isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const supabase = createSupabaseServerClient()

    // 1. Fetch current record
    const { data: purchase, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !purchase) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // 2. Security: Only owner can update and only if pending
    if (purchase.user_id !== session.user.id) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" }, { status: 403 })
    }
    if (purchase.status !== 'pending') {
      return NextResponse.json({ error: "ไม่สามารถแก้ไขรายการที่ถูกดำเนินการไปแล้วได้" }, { status: 400 })
    }

    // 3. Recalculate Total if items changed
    if (body.items) {
      body.total_amount = body.items.reduce((acc: number, item: any) => {
        return acc + (Number(item.quantity) * Number(item.unit_price))
      }, 0)
    }

    // 4. Update
    const { data: updated, error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}
