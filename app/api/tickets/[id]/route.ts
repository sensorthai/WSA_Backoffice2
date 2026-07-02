import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data: ticket, error } = await supabase
    .from('work_tickets')
    .select(`
      *,
      ticket_type:ticket_types(*),
      creator:users!created_by(id, full_name, email, role),
      assigned_employee:users!assigned_to(id, full_name, email, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If delegated workers exist, fetch their profiles
  let delegatedWorkers: any[] = []
  if (ticket.delegated_to && ticket.delegated_to.length > 0) {
    const { data: workers } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', ticket.delegated_to)
    delegatedWorkers = workers || []
  }

  return NextResponse.json({ ...ticket, delegated_workers: delegatedWorkers })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { 
      status, 
      assigned_to, 
      delegated_to, 
      resolution_notes, 
      obstacles, 
      recommendations, 
      photo_url 
    } = body

    const supabase = createSupabaseServerClient()

    // 1. Fetch current ticket to verify roles & status
    const { data: currentTicket, error: fetchError } = await supabase
      .from('work_tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json({ error: "ไม่พบตั๋วดังกล่าว" }, { status: 404 })
    }

    const role = (session.user as any).role
    const userId = session.user.id

    // Authorization checks
    const isOwner = currentTicket.created_by === userId
    const isAssigned = currentTicket.assigned_to === userId
    const isWorker = currentTicket.delegated_to?.includes(userId)
    const isManagement = ['admin', 'supervisor', 'ceo'].includes(role)

    if (!isOwner && !isAssigned && !isWorker && !isManagement) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขตั๋วนี้" }, { status: 403 })
    }

    // Prepare update object
    const updateData: Record<string, any> = {}

    // Management roles can assign tickets
    if (assigned_to !== undefined && isManagement) {
      updateData.assigned_to = assigned_to
      if (assigned_to && currentTicket.status === 'pending') {
        updateData.status = 'assigned'
      }
    }

    // Management or Assigned employee can delegate tickets
    if (delegated_to !== undefined && (isManagement || isAssigned)) {
      updateData.delegated_to = delegated_to
    }

    // Anyone authorized can update status and notes
    if (status !== undefined) {
      updateData.status = status
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolved_by = userId
      }
    }

    if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes
    if (obstacles !== undefined) updateData.obstacles = obstacles
    if (recommendations !== undefined) updateData.recommendations = recommendations
    if (photo_url !== undefined) updateData.photo_url = photo_url

    const { data: updatedTicket, error: updateError } = await supabase
      .from('work_tickets')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send relevant notifications
    const notifications: any[] = []

    // A. Notification to newly assigned employee
    if (assigned_to && assigned_to !== currentTicket.assigned_to) {
      notifications.push({
        user_id: assigned_to,
        type: 'ticket_assigned',
        title: 'คุณได้รับมอบหมายงานใหม่',
        message: `คุณได้รับมอบหมายให้จัดการตั๋วงาน "${updatedTicket.title}"`,
        reference_id: params.id,
        reference_type: 'work_tickets'
      })
    }

    // B. Notification to delegated workers
    if (delegated_to && JSON.stringify(delegated_to) !== JSON.stringify(currentTicket.delegated_to)) {
      const newWorkers = delegated_to.filter((w: string) => !currentTicket.delegated_to?.includes(w))
      newWorkers.forEach((w: string) => {
        notifications.push({
          user_id: w,
          type: 'ticket_delegated',
          title: 'ได้รับมอบหมายงานลงพื้นที่',
          message: `คุณถูกมอบหมายให้ร่วมปฏิบัติงานสำหรับตั๋ว "${updatedTicket.title}"`,
          reference_id: params.id,
          reference_type: 'work_tickets'
        })
      })
    }

    // C. Notification to ticket creator when resolved/closed
    if ((status === 'resolved' || status === 'closed') && currentTicket.created_by) {
      notifications.push({
        user_id: currentTicket.created_by,
        type: 'ticket_completed',
        title: 'ตั๋วงานของคุณได้รับการแก้ไขแล้ว',
        message: `ตั๋วงาน "${updatedTicket.title}" ได้รับการแก้ไขและบันทึกผลงานเรียบร้อยแล้ว`,
        reference_id: params.id,
        reference_type: 'work_tickets'
      })
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json(updatedTicket)
  } catch (err: any) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผลคำขอ" }, { status: 500 })
  }
}
