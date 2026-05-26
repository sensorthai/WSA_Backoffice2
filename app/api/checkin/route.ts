import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

const TIMEZONE = 'Asia/Bangkok'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const today = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd')

  const { data: checkin, error } = await supabase
    .from('wfh_checkins')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('check_date', today)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'checkin_window')
    .single()

  const windowDefaults = { start: 6, end: 11, edit_end: 12 }
  const window = { ...windowDefaults, ...(settings?.value as any || {}) }

  return NextResponse.json({
    ...(checkin || { status: null }),
    window
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // 1. Check Time Window from settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'checkin_window')
    .single()

  const windowDefaults = { start: 6, end: 11, edit_end: 12 }
  const window = { ...windowDefaults, ...(settings?.value as any || {}) }

  const now = new Date()
  const zonedNow = toZonedTime(now, TIMEZONE)
  const currentHour = zonedNow.getHours()

  if (currentHour < window.start || currentHour >= window.end) {
    return NextResponse.json({ 
      error: `Check-in is only allowed between ${String(window.start).padStart(2, '0')}:00 and ${String(window.end).padStart(2, '0')}:00 (Bangkok Time)` 
    }, { status: 403 })
  }

  const { status, note, location_lat, location_lng } = await req.json()
  const today = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd')

  // 2. Upsert Check-in Record
  const { data: checkin, error: upsertError } = await supabase
    .from('wfh_checkins')
    .upsert({
      user_id: session.user.id,
      check_date: today,
      status,
      note,
      location_lat,
      location_lng
    }, {
      onConflict: 'user_id, check_date'
    })
    .select()
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // 3. Create Notification
  await supabase
    .from('notifications')
    .insert({
      user_id: session.user.id,
      type: 'checkin',
      title: 'เช็คอินสำเร็จ',
      message: `คุณได้ลงทะเบียนเข้างานแบบ ${status} เรียบร้อยแล้ว`,
      reference_id: checkin.id,
      reference_type: 'wfh_checkins'
    })

  return NextResponse.json(checkin)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const now = new Date()
  const today = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd')

  const { work_done } = await req.json()

  if (work_done === undefined || work_done === null) {
    return NextResponse.json({ error: "กรุณาระบุเนื้องานที่ทำ" }, { status: 400 })
  }

  // Find today's check-in
  const { data: existing, error: findError } = await supabase
    .from('wfh_checkins')
    .select('id, note')
    .eq('user_id', session.user.id)
    .eq('check_date', today)
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: "คุณยังไม่ได้เช็คอินเข้างานในวันนี้ ไม่สามารถบันทึกเนื้องานได้" }, { status: 400 })
  }

  // Update check-in record with work_done
  // Fallback: try to write to 'work_done', if column missing, write to 'note' with prefix
  const { data: updated, error: updateError } = await supabase
    .from('wfh_checkins')
    .update({ work_done })
    .eq('id', existing.id)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === '42703' || updateError.message.includes('work_done')) {
      const fallbackNote = existing.note 
        ? `${existing.note}\n\n[บันทึกงานประจำวัน]: ${work_done}`
        : `[บันทึกงานประจำวัน]: ${work_done}`

      const { data: fallbackUpdated, error: fallbackError } = await supabase
        .from('wfh_checkins')
        .update({ note: fallbackNote })
        .eq('id', existing.id)
        .select()
        .single()

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      await syncCheckinToWeeklyReport(supabase, session.user.id, today, work_done)

      return NextResponse.json({ ...fallbackUpdated, work_done })
    }

    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await syncCheckinToWeeklyReport(supabase, session.user.id, today, work_done)

  return NextResponse.json(updated)
}

async function syncCheckinToWeeklyReport(supabase: any, userId: string, today: string, work_done: string) {
  try {
    const dateObj = parseISO(today)
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
    const weekLabel = `${format(weekStart, 'd')}-${format(weekEnd, 'd MMM', { locale: th })}`

    // 1. Check if weekly report already exists for this user and this week
    const { data: existingReport, error: reportError } = await supabase
      .from('weekly_reports')
      .select('id, status')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (reportError) {
      console.error("Error finding weekly report:", reportError)
      return
    }

    let reportId = existingReport?.id

    if (!existingReport) {
      // 2. If it doesn't exist, create a new draft weekly report
      const { data: newReport, error: createReportError } = await supabase
        .from('weekly_reports')
        .insert({
          user_id: userId,
          week_start: weekStartStr,
          week_end: weekEndStr,
          week_label: weekLabel,
          status: 'draft'
        })
        .select()
        .single()

      if (createReportError) {
        console.error("Error creating weekly report:", createReportError)
        return
      }

      reportId = newReport.id
    } else if (existingReport.status !== 'draft') {
      // If report already submitted/reviewed, skip auto-update
      return
    }

    // 3. Fetch current items in this weekly report
    const { data: items, error: itemsError } = await supabase
      .from('weekly_report_items')
      .select('id, plan, sort_order')
      .eq('report_id', reportId)

    if (itemsError) {
      console.error("Error fetching weekly report items:", itemsError)
      return
    }

    const datePrefix = `[บันทึกรายวัน ${format(parseISO(today), 'dd/MM/yyyy')}]:`
    const existingItem = items?.find((item: any) => item.plan.startsWith(datePrefix))

    if (existingItem) {
      // 4. Update the existing item
      const { error: updateItemError } = await supabase
        .from('weekly_report_items')
        .update({
          plan: `${datePrefix} ${work_done}`
        })
        .eq('id', existingItem.id)

      if (updateItemError) {
        console.error("Error updating weekly report item:", updateItemError)
      }
    } else {
      // 5. Insert new item
      const maxSortOrder = items && items.length > 0
        ? Math.max(...items.map((i: any) => i.sort_order))
        : -1

      const { error: insertItemError } = await supabase
        .from('weekly_report_items')
        .insert({
          report_id: reportId,
          plan: `${datePrefix} ${work_done}`,
          progress: 'completed',
          is_completed: true,
          sort_order: maxSortOrder + 1
        })

      if (insertItemError) {
        console.error("Error inserting weekly report item:", insertItemError)
      }
    }
  } catch (err) {
    console.error("Error in syncCheckinToWeeklyReport:", err)
  }
}
