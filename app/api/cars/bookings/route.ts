import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sendCarBookingSubmitted } from "@/lib/gmail"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('car_bookings')
    .select('*, company_cars(license_plate, model)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { car_id, start_datetime, end_datetime, destination, purpose } = await req.json()

    // 1. Validations
    if (new Date(start_datetime) < new Date()) {
      return NextResponse.json({ error: "วันเวลาเริ่มต้นต้องเป็นอนาคต" }, { status: 400 })
    }
    if (new Date(start_datetime) >= new Date(end_datetime)) {
      return NextResponse.json({ error: "วันเวลาเริ่มต้นต้องก่อนวันเวลาสิ้นสุด" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // 2. Check Overlap
    const { data: overlap } = await supabase
      .from('car_bookings')
      .select('id')
      .eq('car_id', car_id)
      .eq('status', 'approved')
      .lt('start_datetime', end_datetime)
      .gt('end_datetime', start_datetime)

    if (overlap && overlap.length > 0) {
      return NextResponse.json({ error: "รถคันนี้ถูกจองไปแล้วในช่วงเวลาดังกล่าว" }, { status: 400 })
    }

    // 3. Get Requester's Supervisor
    const { data: user } = await supabase
      .from('users')
      .select('supervisor_id, full_name')
      .eq('id', session.user.id)
      .single()

    // 4. Create Booking
    const { data: booking, error: bookingError } = await supabase
      .from('car_bookings')
      .insert({
        user_id: session.user.id,
        car_id,
        start_datetime,
        end_datetime,
        destination,
        purpose,
        supervisor_id: user?.supervisor_id,
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })

    // 5. Notify Supervisor
    if (user?.supervisor_id) {
      // Internal Notif
      await supabase.from('notifications').insert({
        user_id: user.supervisor_id,
        type: 'car_booking',
        title: 'คำขอจองรถใหม่',
        message: `${user.full_name} ขอจองรถไปที่ ${destination}`,
        reference_id: booking.id,
        reference_type: 'car_bookings'
      })

      // Email Notif
      const { data: supervisor } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.supervisor_id)
        .single()

      if (supervisor?.email) {
        sendCarBookingSubmitted(supervisor.email, {
          requesterName: user.full_name,
          destination,
          startDatetime: new Date(start_datetime).toLocaleString('th-TH')
        })
      } else {
        console.log(`[Car Booking] No supervisor email found or supervisor_id is null for user: ${session.user.id}`)
      }
    }

    return NextResponse.json(booking, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }
}
