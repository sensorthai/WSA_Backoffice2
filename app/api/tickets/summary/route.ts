import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"
import { startOfMonth, endOfMonth, format } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (!['admin', 'supervisor', 'ceo'].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const monthParam = req.nextUrl.searchParams.get("month") || format(new Date(), "yyyy-MM")
  const start = startOfMonth(new Date(`${monthParam}-01`))
  const end = endOfMonth(start)
  const startStr = format(start, "yyyy-MM-dd") + "T00:00:00.000Z"
  const endStr = format(end, "yyyy-MM-dd") + "T23:59:59.999Z"

  const supabase = createSupabaseServerClient()

  // Fetch all tickets created or resolved in this month
  const { data: tickets, error } = await supabase
    .from('work_tickets')
    .select(`
      *,
      ticket_type:ticket_types(id, name),
      assigned_employee:users!assigned_to(id, full_name, avatar_url)
    `)
    .gte('created_at', startStr)
    .lte('created_at', endStr)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch all active users to match delegated worker IDs to names
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, role, avatar_url')

  const userMap = new Map<string, any>()
  for (const u of (users || [])) {
    userMap.set(u.id, u)
  }

  // Aggregate Metrics
  const typeCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = { pending: 0, assigned: 0, in_progress: 0, resolved: 0, closed: 0 }
  const workerStats: Record<string, { name: string, avatar: string, total: number, resolved: number }> = {}
  const obstaclesList: any[] = []
  const recommendationsList: any[] = []
  const resolvedTicketsList: any[] = []

  for (const ticket of (tickets || [])) {
    // 1. Ticket Type Count
    const typeName = ticket.ticket_type?.name || 'Other'
    typeCounts[typeName] = (typeCounts[typeName] || 0) + 1

    // 2. Status Count
    if (ticket.status in statusCounts) {
      statusCounts[ticket.status]++
    }

    // 3. Extract Obstacles & Recommendations
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      resolvedTicketsList.push(ticket)
      if (ticket.obstacles) {
        obstaclesList.push({
          ticket_id: ticket.id,
          title: ticket.title,
          text: ticket.obstacles,
          worker: userMap.get(ticket.resolved_by)?.full_name || 'ไม่ระบุ'
        })
      }
      if (ticket.recommendations) {
        recommendationsList.push({
          ticket_id: ticket.id,
          title: ticket.title,
          text: ticket.recommendations,
          worker: userMap.get(ticket.resolved_by)?.full_name || 'ไม่ระบุ'
        })
      }
    }

    // 4. Worker Stats
    const workerIds = new Set<string>()
    if (ticket.assigned_to) workerIds.add(ticket.assigned_to)
    if (ticket.delegated_to && ticket.delegated_to.length > 0) {
      ticket.delegated_to.forEach((id: string) => workerIds.add(id))
    }

    for (const wId of workerIds) {
      const worker = userMap.get(wId)
      if (!worker) continue
      if (!workerStats[wId]) {
        workerStats[wId] = {
          name: worker.full_name,
          avatar: worker.avatar_url || '',
          total: 0,
          resolved: 0
        }
      }
      workerStats[wId].total++
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        workerStats[wId].resolved++
      }
    }
  }

  return NextResponse.json({
    month: monthParam,
    total_tickets: tickets?.length || 0,
    status_distribution: statusCounts,
    type_distribution: typeCounts,
    worker_performance: Object.values(workerStats).sort((a, b) => b.resolved - a.resolved),
    obstacles: obstaclesList,
    recommendations: recommendationsList,
    resolved_tickets: resolvedTicketsList
  })
}
