import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

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
