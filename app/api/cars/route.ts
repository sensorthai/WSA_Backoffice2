import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start_datetime')
  const end = searchParams.get('end_datetime')

  const supabase = createSupabaseServerClient()

  // 1. Get all cars
  const { data: cars, error: carsError } = await supabase
    .from('company_cars')
    .select('*')
    .eq('is_available', true)

  if (carsError) return NextResponse.json({ error: carsError.message }, { status: 500 })

  if (!start || !end) {
    return NextResponse.json(cars)
  }

  // 2. Check overlap for the given range
  // A booking overlaps if: (booking.start < requested.end) AND (booking.end > requested.start)
  const { data: bookings, error: bookingsError } = await supabase
    .from('car_bookings')
    .select('car_id')
    .eq('status', 'approved')
    .lt('start_datetime', end)
    .gt('end_datetime', start)

  if (bookingsError) return NextResponse.json({ error: bookingsError.message }, { status: 500 })

  const bookedCarIds = new Set(bookings.map(b => b.car_id))

  // 3. Mark availability
  const carsWithStatus = cars.map(car => ({
    ...car,
    is_booked: bookedCarIds.has(car.id)
  }))

  return NextResponse.json(carsWithStatus)
}
