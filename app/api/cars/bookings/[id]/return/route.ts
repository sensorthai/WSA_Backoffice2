import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole !== 'supervisor' && userRole !== 'admin' && userRole !== 'ceo') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { odometer_start, odometer_end } = await req.json()

    if (odometer_end < odometer_start) {
      return NextResponse.json({ error: "เลขไมล์ขาเข้าต้องไม่น้อยกว่าขาออก" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const { data: updated, error: updateError } = await supabase
      .from('car_bookings')
      .update({
        status: 'returned',
        odometer_start,
        odometer_end,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }
}
