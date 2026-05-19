import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

// GET: Fetch weekly reports for current user (or subordinates for supervisor/admin)
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const view = searchParams.get('view') // 'my' | 'team'

  const supabase = createSupabaseServerClient()
  const userRole = (session.user as any).role

  let query = supabase
    .from('weekly_reports')
    .select(`
      *,
      user:users!user_id(id, full_name, avatar_url, department:departments(name)),
      reviewer:users!reviewed_by(full_name),
      items:weekly_report_items(*)
    `)
    .order('week_start', { ascending: false })

  if (view === 'team' && (userRole === 'supervisor' || userRole === 'admin' || userRole === 'ceo')) {
    // Supervisor sees team reports
    if (userRole === 'supervisor') {
      const { data: subordinates } = await supabase
        .from('users')
        .select('id')
        .eq('supervisor_id', session.user.id)

      const ids = subordinates?.map(s => s.id) || []
      ids.push(session.user.id)
      query = query.in('user_id', ids)
    }
    // Admin/CEO see all
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('user_id', session.user.id)
  }

  query = query.limit(20)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort items by sort_order
  const sorted = data?.map(report => ({
    ...report,
    items: (report.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
  }))

  return NextResponse.json(sorted)
}

// POST: Create a new weekly report
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { week_start, week_end, week_label, items } = await req.json()

    if (!week_start || !week_end || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลให้ครบ" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Check duplicate
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('week_start', week_start)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "มีรายงานสำหรับสัปดาห์นี้แล้ว" }, { status: 409 })
    }

    // Create report
    const { data: report, error: reportError } = await supabase
      .from('weekly_reports')
      .insert({
        user_id: session.user.id,
        week_start,
        week_end,
        week_label,
        status: 'draft'
      })
      .select()
      .single()

    if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 })

    // Create items
    const itemsToInsert = items.map((item: any, idx: number) => ({
      report_id: report.id,
      plan: item.plan,
      progress: item.progress || 'not_started',
      problems: item.problems || null,
      suggestions: item.suggestions || null,
      file_url: item.file_url || null,
      file_name: item.file_name || null,
      is_completed: item.is_completed || false,
      sort_order: idx
    }))

    const { error: itemsError } = await supabase
      .from('weekly_report_items')
      .insert(itemsToInsert)

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

    return NextResponse.json(report, { status: 201 })
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }
}
