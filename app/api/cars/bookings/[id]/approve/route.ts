import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { processApproval } from "@/lib/approval-engine"
import { createSupabaseServerClient } from "@/lib/supabase"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  const { action, note } = await req.json()

  try {
    // Car booking specific: Check conflicts again before final approval
    if (action === 'approve') {
      const supabase = createSupabaseServerClient()
      const { data: booking } = await supabase.from('car_bookings').select('*').eq('id', params.id).single()
      if (booking) {
        const { data: overlap } = await supabase
          .from('car_bookings')
          .select('id')
          .eq('car_id', booking.car_id)
          .eq('status', 'approved')
          .lt('start_datetime', booking.end_datetime)
          .gt('end_datetime', booking.start_datetime)

        if (overlap && overlap.length > 0) {
          return NextResponse.json({ error: "รถคันนี้ถูกจองไปแล้วในช่วงเวลาดังกล่าว" }, { status: 400 })
        }
      }
    }

    const updated = await processApproval({
      entityType: 'car_booking',
      entityId: params.id,
      actorUserId: session.user.id,
      actorRole: userRole,
      action,
      stage: 'supervisor', // Car booking only has one stage
      note
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Car approval error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 })
  }
}
