import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start_date = searchParams.get('start_date')
  const end_date = searchParams.get('end_date')

  if (!start_date || !end_date) {
    return NextResponse.json({ error: "กรุณาระบุ start_date และ end_date" }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // Fetch all wfh_checkins for this user in that date range
  const { data, error } = await supabase
    .from('wfh_checkins')
    .select('check_date, status, note')
    .eq('user_id', session.user.id)
    .gte('check_date', start_date)
    .lte('check_date', end_date)
    .order('check_date', { ascending: true })

  if (error) {
    console.error("Weekly summary query error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter logs that have work_done
  const summaries = data?.map(c => {
    let text = ""
    if (c.note && c.note.includes('[บันทึกงานประจำวัน]:')) {
      text = c.note.split('[บันทึกงานประจำวัน]:')[1]?.trim() || ""
    } else if (c.note && c.note.trim().length > 0) {
      // Fallback: If there's a note but no tag, just use the note
      text = c.note.trim()
    }
    return {
      date: c.check_date,
      status: c.status,
      work: text
    }
  }).filter(c => c.work.trim().length > 0) || []

  return NextResponse.json(summaries)
}
