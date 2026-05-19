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
    .from('car_bookings')
    .select('*, company_cars(*), users!car_bookings_user_id_fkey(full_name, email)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

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

    // 1. Fetch current booking
    const { data: booking } = await supabase
      .from('car_bookings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // 2. Only pending can be updated
    if (booking.status !== 'pending') {
      return NextResponse.json({ error: "ไม่สามารถแก้ไขรายการที่อนุมัติหรือยกเลิกไปแล้วได้" }, { status: 400 })
    }

    // 3. Only owner can update
    if (booking.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 4. Update
    const { data: updated, error: updateError } = await supabase
      .from('car_bookings')
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
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { data: booking } = await supabase
    .from('car_bookings')
    .select('user_id, status')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (booking.user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (booking.status !== 'pending') return NextResponse.json({ error: "Only pending bookings can be cancelled" }, { status: 400 })

  const { error } = await supabase
    .from('car_bookings')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
