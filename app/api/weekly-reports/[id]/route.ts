import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

// PATCH: Update a weekly report (items, status, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const supabase = createSupabaseServerClient()

  try {
    const body = await req.json()
    const { action, items, reviewer_comment } = body

    // Verify ownership or permission
    const { data: report } = await supabase
      .from('weekly_reports')
      .select('*, user:users(supervisor_id)')
      .eq('id', id)
      .single()

    if (!report) return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 })

    const userRole = (session.user as any).role
    const isOwner = report.user_id === session.user.id
    const isSupervisor = report.user?.supervisor_id === session.user.id
    const isAdmin = userRole === 'admin' || userRole === 'ceo'

    if (!isOwner && !isSupervisor && !isAdmin) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
    }

    // Action: submit
    if (action === 'submit') {
      const { error } = await supabase
        .from('weekly_reports')
        .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Notify supervisor
      const { data: user } = await supabase
        .from('users')
        .select('full_name, supervisor_id')
        .eq('id', report.user_id)
        .single()

      if (user?.supervisor_id) {
        await supabase.from('notifications').insert({
          user_id: user.supervisor_id,
          type: 'weekly_report',
          title: 'รายงานรายสัปดาห์ใหม่',
          message: `${user.full_name} ส่งรายงานประจำสัปดาห์ ${report.week_label}`,
          reference_id: id,
          reference_type: 'weekly_reports'
        })
      }

      return NextResponse.json({ success: true })
    }

    // Action: review (supervisor/admin)
    if (action === 'review') {
      if (!isSupervisor && !isAdmin) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์รีวิว" }, { status: 403 })
      }
      const { error } = await supabase
        .from('weekly_reports')
        .update({
          status: 'reviewed',
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_comment: reviewer_comment || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Notify owner
      await supabase.from('notifications').insert({
        user_id: report.user_id,
        type: 'weekly_report_reviewed',
        title: 'รายงานสัปดาห์ได้รับการตรวจ',
        message: `หัวหน้างานตรวจรายงานสัปดาห์ ${report.week_label} แล้ว`,
        reference_id: id,
        reference_type: 'weekly_reports'
      })

      return NextResponse.json({ success: true })
    }

    // Action: update items
    if (items && Array.isArray(items)) {
      // Delete existing items and re-insert
      await supabase.from('weekly_report_items').delete().eq('report_id', id)

      const itemsToInsert = items.map((item: any, idx: number) => ({
        report_id: id,
        plan: item.plan,
        progress: item.progress || 'not_started',
        problems: item.problems || null,
        suggestions: item.suggestions || null,
        file_url: item.file_url || null,
        file_name: item.file_name || null,
        is_completed: item.is_completed || false,
        sort_order: idx
      }))

      const { error: insertError } = await supabase
        .from('weekly_report_items')
        .insert(itemsToInsert)

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

      await supabase
        .from('weekly_reports')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}

// DELETE: Delete a weekly report
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: report } = await supabase
    .from('weekly_reports')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 })

  const userRole = (session.user as any).role
  if (report.user_id !== session.user.id && userRole !== 'admin') {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  // Delete items first (cascade should handle, but explicit)
  await supabase.from('weekly_report_items').delete().eq('report_id', id)
  const { error } = await supabase.from('weekly_reports').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
