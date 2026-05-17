import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import nodemailer from 'nodemailer'

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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const today = new Date().toISOString().split('T')[0]

  // 2. Find users who have NOT checked in today
  // Get all active users
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('is_active', true)

  // Get today's checkins
  const { data: checkins } = await supabase
    .from('wfh_checkins')
    .select('user_id')
    .eq('check_date', today)

  const checkedInUserIds = new Set(checkins?.map(c => c.user_id) || [])
  const missingUsers = users?.filter(u => !checkedInUserIds.has(u.id)) || []

  // 3. Send Reminders
  if (missingUsers.length > 0) {
    const COMPANY_NAME = 'Wireless Solution Asia'
    
    await Promise.all(missingUsers.map(user => {
      if (!user.email) return Promise.resolve()
      
      return transporter.sendMail({
        from: `"${COMPANY_NAME}" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `[Reminder] อย่าลืมเช็คอินวันนี้แจ้!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 15px; text-align: center;">
            <h2 style="color: #2563eb;">สวัสดีคุณ ${user.full_name} 👋</h2>
            <p style="font-size: 16px; color: #334155;">ระบบยังไม่พบข้อมูลการเข้างานของคุณสำหรับวันนี้</p>
            <p style="font-size: 14px; color: #64748b; margin-bottom: 30px;">รบกวนสละเวลาสักครู่เพื่อเช็คอินผ่านระบบ WSA Backoffice นะครับ</p>
            <a href="${process.env.NEXTAUTH_URL}/checkin" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">เช็คอินเลย</a>
            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">นี่คือการแจ้งเตือนอัตโนมัติจากฝ่ายบุคคล</p>
          </div>
        `
      }).catch(err => console.error(`Failed to remind ${user.email}:`, err))
    }))
  }

  return NextResponse.json({ success: true, remindersSent: missingUsers.length })
}
