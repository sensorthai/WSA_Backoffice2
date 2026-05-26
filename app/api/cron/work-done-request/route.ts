import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import nodemailer from 'nodemailer'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'Asia/Bangkok'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function GET(req: Request) {
  // 1. Security Check
  const authHeader = req.headers.get('authorization')
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const now = new Date()
  const today = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd')

  // 2. Fetch all users who checked in today as 'office', 'home', or 'onsite'
  const { data: checkins, error: checkinError } = await supabase
    .from('wfh_checkins')
    .select('*, user:users!user_id(id, email, full_name, role, is_teacher)')
    .eq('check_date', today)
    .in('status', ['office', 'home', 'onsite'])

  if (checkinError) {
    return NextResponse.json({ error: checkinError.message }, { status: 500 })
  }

  // Filter out checkins that already have work_done logged
  const missingLogs = checkins?.filter((c: any) => {
    // Exclude outsource and teachers
    if (c.user?.role === 'outsource' || c.user?.is_teacher === true) return false
    
    // Check if they already wrote work done (either in work_done field or fallback prefix in note)
    const hasWorkDone = c.work_done || (c.note && c.note.includes('[บันทึกงานประจำวัน]:'))
    return !hasWorkDone
  }) || []

  if (missingLogs.length === 0) {
    return NextResponse.json({ success: true, message: "No employees need work-done reminders today." })
  }

  const COMPANY_NAME = 'Wireless Solution Asia'
  const statusLabelMap: Record<string, string> = {
    office: '🏢 Office (เข้าออฟฟิศ)',
    home: '🏠 WFH (ทำงานที่บ้าน)',
    onsite: '📍 Onsite (ปฏิบัติงานภายนอก)'
  }

  // 3. Send Reminders
  await Promise.all(missingLogs.map((c: any) => {
    const user = c.user
    if (!user || !user.email) return Promise.resolve()
    
    const statusText = statusLabelMap[c.status] || c.status

    return transporter.sendMail({
      from: `"${COMPANY_NAME}" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: `[WSA] ขอความร่วมมือบันทึกเนื้องานประจำวันของคุณสำหรับวันนี้ 📝`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 40px;">📝</span>
            <h2 style="color: #1e3a8a; margin-top: 10px; margin-bottom: 5px;">หมดเวลาเข้างานแล้ว! ได้เวลาส่งบันทึกงานประจำวัน</h2>
            <p style="font-size: 14px; color: #64748b; margin: 0;">ระบบขอรับข้อมูลสรุปผลงานรายวันเพื่อจัดทำรายงานรายสัปดาห์</p>
          </div>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 0 12px 12px 0;">
            <p style="font-size: 15px; color: #1e293b; margin: 0 0 8px 0; font-weight: bold;">สวัสดีคุณ ${user.full_name} 👋</p>
            <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6;">
              ระบบพบว่าคุณได้ลงทะเบียนเข้างานในวันนี้ในสถานะ <b>${statusText}</b> เรียบร้อยแล้วครับ 
              รบกวนคุณสละเวลาสักครู่เพื่อเข้าไปพิมพ์<strong>ระบุเนื้องานหรือผลงานที่คุณทำสำเร็จในวันนี้</strong> 
              โดยระบบจะนำเนื้อหานี้ไป<strong>เชื่อมโยงเข้าสู่รายงานประจำสัปดาห์ (Weekly Report) ของคุณโดยอัตโนมัติ</strong> 
              เพื่อช่วยลดเวลาในการกรอกข้อมูลในวันศุกร์ครับ!
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/checkin" style="background-color: #2563eb; color: white; padding: 15px 35px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(37,99,235,0.2);">กรอกบันทึกเนื้องานวันนี้</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          
          <div style="text-align: center; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">นี่คือการแจ้งเตือนอัตโนมัติจากฝ่ายบริหารงานบุคคลระบบ WSA Backoffice</p>
            <p style="margin: 5px 0 0 0;">หากมีข้อสงสัยประการใด กรุณาติดต่อทีมสนับสนุนระบบไอที</p>
          </div>
        </div>
      `
    }).catch(err => console.error(`Failed to send work-done reminder email to ${user.email}:`, err))
  }))

  return NextResponse.json({ success: true, emailsSent: missingLogs.length })
}
