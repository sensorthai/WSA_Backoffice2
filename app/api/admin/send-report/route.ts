import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sendDailySummary } from "@/lib/gmail"
import { format } from "date-fns"
import { th } from "date-fns/locale"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()

  // 1. Fetch Stats for Today
  const today = new Date().toISOString().split('T')[0]

  const [checkins, , purchases] = await Promise.all([
    supabase.from('wfh_checkins').select('status').eq('check_date', today),
    supabase.from('notifications').select('id', { count: 'exact' }).eq('is_read', false), // Just a proxy for activity
    supabase.from('purchase_requests').select('total_amount').gte('created_at', today)
  ])

  // Real pending approvals count
  const { count: realPending } = await supabase
    .from('purchase_requests')
    .select('id', { count: 'exact' })
    .eq('status', 'pending')

  const wfhSummary = {
    office: checkins.data?.filter(c => c.status === 'office').length || 0,
    home: checkins.data?.filter(c => c.status === 'home').length || 0
  }

  const totalPurchaseToday = purchases.data?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0

  // 2. Fetch CEO/Admin recipients
  const { data: recipients } = await supabase
    .from('users')
    .select('email')
    .or('role.eq.ceo,role.eq.admin')

  const emails = recipients?.map(r => r.email).filter(Boolean) as string[]

  if (emails.length > 0) {
    const reportData = {
      date: format(new Date(), "d MMMM yyyy", { locale: th }),
      wfhSummary,
      pendingApprovals: realPending || 0,
      totalPurchaseToday
    }

    // Send to all
    await Promise.all(emails.map(email => sendDailySummary(email, reportData)))
  }

  return NextResponse.json({ success: true, recipientsCount: emails.length })
}
