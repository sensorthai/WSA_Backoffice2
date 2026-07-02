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

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fmtDateTh = (s: string) => {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export async function GET(req: Request) {
  // 1. Security Check
  const authHeader = req.headers.get('authorization')
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const todayStr = formatLocalDate(new Date())
  const todayDate = new Date(todayStr)
  const ninetyDaysAgo = formatLocalDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))

  // 2. Fetch all active teaching assignments
  const { data: assignments, error: assError } = await supabase
    .from('teaching_assignments')
    .select(`
      id,
      teacher_id,
      school_id,
      subject_id,
      schedule_dates,
      status,
      teacher:teacher_id(id, email, full_name, is_active),
      school:school_id(id, name),
      subject:subject_id(id, name)
    `)
    .eq('status', 'active') as any

  if (assError) {
    console.error('Fetch assignments error:', assError.message)
    return NextResponse.json({ error: assError.message }, { status: 500 })
  }

  // Filter only assignments with active teachers who have email
  const activeAssignments = (assignments || []).filter((a: any) => 
    a.teacher?.is_active === true && a.teacher?.email
  )

  if (activeAssignments.length === 0) {
    return NextResponse.json({ success: true, message: "No active assignments with active teachers" })
  }

  // 3. Fetch all submitted or reviewed teaching logs from the last 90 days
  const { data: logs, error: logsError } = await supabase
    .from('teaching_logs')
    .select('id, assignment_id, teach_date, status')
    .gte('teach_date', ninetyDaysAgo)
    .in('status', ['submitted', 'reviewed'])

  if (logsError) {
    console.error('Fetch logs error:', logsError.message)
    return NextResponse.json({ error: logsError.message }, { status: 500 })
  }

  const submittedKeys = new Set(
    (logs || []).map((l: any) => `${l.assignment_id}_${l.teach_date}`)
  )

  // 4. Identify overdue unsubmitted reports grouped by teacher
  const reminders: Record<string, {
    email: string
    name: string
    missingClasses: { school: string; subject: string; date: string; delay: number }[]
  }> = {}

  for (const ass of activeAssignments) {
    const dates = Array.isArray(ass.schedule_dates) ? ass.schedule_dates : []
    
    for (const dateStr of dates) {
      // Check if within 90 days limit and is in the past
      if (dateStr < ninetyDaysAgo || dateStr > todayStr) continue
      
      const schDate = new Date(dateStr)
      const diffTime = todayDate.getTime() - schDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // If class was 5 or more days ago and hasn't been submitted/reviewed
      if (diffDays >= 5) {
        const key = `${ass.id}_${dateStr}`
        if (!submittedKeys.has(key)) {
          const teacherId = ass.teacher_id
          if (!reminders[teacherId]) {
            reminders[teacherId] = {
              email: ass.teacher.email,
              name: ass.teacher.full_name,
              missingClasses: []
            }
          }
          reminders[teacherId].missingClasses.push({
            school: ass.school?.name || '-',
            subject: ass.subject?.name || '-',
            date: fmtDateTh(dateStr),
            delay: diffDays
          })
        }
      }
    }
  }

  // 5. Send consolidated email reminders to teachers
  const COMPANY_NAME = 'Wireless Solution Asia'
  const emailPromises = Object.values(reminders).map((rem: any) => {
    // Sort missing classes by date ascending (oldest first)
    const sortedClasses = [...rem.missingClasses].sort((a, b) => {
      const partsA = a.date.split('/')
      const partsB = b.date.split('/')
      return `${partsA[2]}-${partsA[1]}-${partsA[0]}`.localeCompare(`${partsB[2]}-${partsB[1]}-${partsB[0]}`)
    })

    return transporter.sendMail({
      from: `"${COMPANY_NAME}" <${process.env.GMAIL_USER}>`,
      to: rem.email,
      subject: `[WSA Backoffice] กรุณาส่งรายงานการสอนล่าช้า (${rem.missingClasses.length} คาบ)`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 15px;">
          <h2 style="color: #ea580c; text-align: center; margin-bottom: 20px;">⏰ แจ้งเตือน: ส่งรายงานการสอนล่าช้า</h2>
          <p style="font-size: 16px; color: #334155;">สวัสดีครับคุณ <b>${rem.name}</b>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            ระบบตรวจพบว่าคุณมีคาบเรียนที่สอนเสร็จสิ้นเกิน 5 วันแล้ว แต่ยังไม่ได้ส่งรายงานการสอนทั้งหมด <b style="color: #dc2626; font-size: 16px;">${rem.missingClasses.length} คาบ</b> ดังรายละเอียดด้านล่าง:
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px; text-align: left; color: #475569; border-bottom: 2px solid #cbd5e1;">วันที่สอน</th>
                <th style="padding: 10px; text-align: left; color: #475569; border-bottom: 2px solid #cbd5e1;">โรงเรียน</th>
                <th style="padding: 10px; text-align: left; color: #475569; border-bottom: 2px solid #cbd5e1;">วิชา</th>
                <th style="padding: 10px; text-align: center; color: #475569; border-bottom: 2px solid #cbd5e1;">ค้างส่ง (วัน)</th>
              </tr>
            </thead>
            <tbody>
              ${sortedClasses.map(c => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: bold; color: #0f172a; white-space: nowrap;">${c.date}</td>
                  <td style="padding: 10px; color: #334155;">${c.school}</td>
                  <td style="padding: 10px; color: #334155;">${c.subject}</td>
                  <td style="padding: 10px; text-align: center; color: #dc2626; font-weight: bold; white-space: nowrap;">${c.delay} วัน</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: center; margin-bottom: 20px; margin-top: 25px;">
            <a href="${process.env.NEXTAUTH_URL}/teaching/logbook" style="background-color: #ea580c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">กรอกรายงานการสอนเลย</a>
          </div>
          
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            *ตามระเบียบกรุณากรอกรายงานการสอนภายใน 5 วันหลังสอนเสร็จ หากดำเนินการกรอกข้อมูลเรียบร้อยแล้ว ระบบจะหยุดส่งอีเมลแจ้งเตือนโดยอัตโนมัติ
          </p>
        </div>
      `
    }).catch(err => console.error(`Failed to remind teacher ${rem.email}:`, err))
  })

  await Promise.all(emailPromises)

  return NextResponse.json({ success: true, remindersSent: Object.keys(reminders).length })
}
