import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  const supabase = createSupabaseServerClient()

  let data, error

  if (userRole === 'supervisor') {
    // Supervisor sees pending leaves where they are the assigned supervisor
    ({ data, error } = await supabase
      .from('leave_requests')
      .select('*, users!leave_requests_user_id_fkey(full_name, avatar_url, departments(name))')
      .eq('supervisor_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }))
  } 
  else if (userRole === 'admin') {
    // Admin sees EVERYTHING that is pending at any stage
    ({ data, error } = await supabase
      .from('leave_requests')
      .select('*, users!leave_requests_user_id_fkey(full_name, avatar_url, departments(name))')
      .in('status', ['pending', 'supervisor_approved'])
      .order('created_at', { ascending: false }))
  }
  else if (userRole === 'ceo') {
    // CEO sees all supervisor_approved leaves
    ({ data, error } = await supabase
      .from('leave_requests')
      .select('*, users!leave_requests_user_id_fkey(full_name, avatar_url, departments(name))')
      .eq('status', 'supervisor_approved')
      .order('created_at', { ascending: false }))
  } 
  else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Transform data for easier consumption if needed
  const transformed = data.map((item: any) => ({
    ...item,
    user: {
      full_name: item.users?.full_name,
      avatar_url: item.users?.avatar_url,
      department: (item.users?.departments as any)?.name
    }
  }))

  return NextResponse.json(transformed)
}
