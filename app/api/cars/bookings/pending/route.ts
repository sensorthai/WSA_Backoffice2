import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole === 'employee') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()

  let query = supabase
    .from('car_bookings')
    .select('*, company_cars(*), user:users!car_bookings_user_id_fkey(full_name, email, department)')
    .eq('status', 'pending')

  // If supervisor, only show their subordinates
  if (userRole === 'supervisor') {
    query = query.eq('supervisor_id', session.user.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
