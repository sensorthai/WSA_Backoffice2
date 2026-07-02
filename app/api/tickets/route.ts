import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const role = (session.user as any).role
  const statusFilter = req.nextUrl.searchParams.get("status")

  const supabase = createSupabaseServerClient()

  if (statusFilter === 'staff') {
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email, role, avatar_url')
      .eq('is_active', true)
      .in('role', ['admin', 'employee', 'supervisor', 'ceo', 'outsource'])
      .order('full_name')

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }
    return NextResponse.json(staff)
  }

  let query = supabase
    .from('work_tickets')
    .select(`
      *,
      ticket_type:ticket_types(id, name, custom_fields),
      assigned_employee:users!assigned_to(id, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })

  // Role-based filtering
  if (role === 'partner' || role === 'customer') {
    query = query.eq('created_by', userId)
  } else if (role === 'employee' || role === 'outsource') {
    // Show tickets assigned to them or delegated to them
    query = query.or(`assigned_to.eq.${userId},delegated_to.cs.{${userId}}`)
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { 
      ticket_type_id, 
      title, 
      description, 
      customer_name, 
      customer_contact, 
      priority, 
      custom_answers 
    } = body

    if (!ticket_type_id || !title || !description || !customer_name) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data: ticket, error } = await supabase
      .from('work_tickets')
      .insert({
        ticket_type_id,
        title,
        description,
        customer_name,
        customer_contact: customer_contact || null,
        priority: priority || 'medium',
        custom_answers: custom_answers || {},
        created_by: session.user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create a notification for admins/supervisors
    const { data: supervisors } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'supervisor', 'ceo'])

    if (supervisors && supervisors.length > 0) {
      const notifications = supervisors.map(s => ({
        user_id: s.id,
        type: 'ticket_new',
        title: 'มีตั๋วส่งงานใหม่',
        message: `ตั๋ว "${title}" ถูกเปิดขึ้นใหม่โดย ${session.user.name || session.user.email}`,
        reference_id: ticket.id,
        reference_type: 'work_tickets'
      }))
      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json(ticket, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผลคำขอ" }, { status: 500 })
  }
}
