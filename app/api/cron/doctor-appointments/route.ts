import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { format } from "date-fns"

function getDaysDiff(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  
  const diffTime = target.getTime() - today.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export async function GET(req: Request) {
  // Security Check
  const authHeader = req.headers.get('authorization')
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // 1. Fetch all doctor appointments with user info
  const { data: appointments, error: fetchError } = await supabase
    .from('doctor_appointments')
    .select('*, user:users!user_id(id, full_name, email)')

  if (fetchError) {
    console.error('Error fetching doctor appointments:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const emailPromises = []
  const notificationRecords: any[] = []
  let processedCount = 0

  // 2. Process each appointment
  for (const appointment of appointments) {
    if (!appointment.user?.email) continue

    const daysDiff = getDaysDiff(appointment.appointment_date)
    let alertLabel = ""
    let alertSubject = ""

    if (daysDiff === 7) {
      alertLabel = "จะถึงกำหนดในอีก 1 สัปดาห์ (7 วัน)"
      alertSubject = `[แจ้งเตือนนัดหมายแพทย์ล่วงหน้า 1 สัปดาห์] ${appointment.title}`
    } else if (daysDiff === 1) {
      alertLabel = "จะถึงกำหนดในอีก 1 วัน (พรุ่งนี้)"
      alertSubject = `[แจ้งเตือนด่วน: นัดหมายแพทย์วันพรุ่งนี้] ${appointment.title}`
    } else {
      // Not 7 or 1 day away, skip
      continue
    }

    processedCount++

    // Build Time string
    const timeStr = appointment.appointment_time 
      ? appointment.appointment_time.substring(0, 5) + " น."
      : "ไม่ได้ระบุเวลา"

    // HTML Content for Premium Email
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #2563eb; color: white; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">แจ้งเตือนการนัดหมายแพทย์</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">WSA Health Support System</p>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">เรียนคุณ <b>${appointment.user.full_name}</b>,</p>
          <p style="font-size: 16px; line-height: 1.6;">ระบบขอแจ้งเตือนนัดหมายพบแพทย์ของคุณที่กำลังจะมาถึง ซึ่ง <b>${alertLabel}</b> โดยมีรายละเอียดดังต่อไปนี้:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 5px 0; font-size: 15px;"><b>หัวข้อนัดหมาย:</b> ${appointment.title}</p>
            <p style="margin: 5px 0; font-size: 15px;"><b>แพทย์ผู้รักษา:</b> ${appointment.doctor_name || 'ไม่ได้ระบุ'}</p>
            <p style="margin: 5px 0; font-size: 15px;"><b>โรงพยาบาล/คลินิก:</b> ${appointment.hospital_name || 'ไม่ได้ระบุ'}</p>
            <p style="margin: 5px 0; font-size: 15px; color: #2563eb; font-weight: bold;"><b>วันนัดหมาย:</b> ${format(new Date(appointment.appointment_date), 'dd/MM/yyyy')}</p>
            <p style="margin: 5px 0; font-size: 15px;"><b>เวลานัดหมาย:</b> ${timeStr}</p>
            ${appointment.note ? `<p style="margin: 5px 0; font-size: 15px; color: #666;"><b>หมายเหตุเพิ่มเติม:</b> ${appointment.note}</p>` : ''}
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            กรุณาเตรียมเอกสาร บัตรประจำตัวประชาชน บัตรผู้ป่วย หรือประวัติการแพ้ยา เพื่อความปลอดภัยและรวดเร็วในการเข้ารับบริการ<br/>
            <i>* อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</i>
          </p>
        </div>
        <div style="background-color: #f8fafc; text-align: center; padding: 15px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          © ${new Date().getFullYear()} WSA Backoffice. All rights reserved.
        </div>
      </div>
    `

    // Push email promise
    emailPromises.push(
      sendEmail({
        to: appointment.user.email,
        subject: alertSubject,
        html: htmlContent
      })
    )

    // Log to system notifications table
    notificationRecords.push({
      user_id: appointment.user.id,
      type: "doctor_appointment",
      title: "แจ้งเตือนการนัดพบแพทย์",
      message: `คุณมีนัดหมาย "${appointment.title}" ณ ${appointment.hospital_name || 'โรงพยาบาล'} วันที่ ${format(new Date(appointment.appointment_date), 'dd/MM/yyyy')} เวลา ${timeStr} (${alertLabel})`,
      reference_id: appointment.id,
      reference_type: "doctor_appointments"
    })
  }

  // 3. Batch execute all email sends
  if (emailPromises.length > 0) {
    try {
      await Promise.all(emailPromises)
    } catch (emailErr) {
      console.error('Error sending doctor appointment emails:', emailErr)
    }
  }

  // 4. Batch insert all in-app notifications
  if (notificationRecords.length > 0) {
    const { error: notifErr } = await supabase
      .from('notifications')
      .insert(notificationRecords)

    if (notifErr) {
      console.error('Error creating doctor appointment notifications:', notifErr)
    }
  }

  return NextResponse.json({
    message: `Processed doctor appointments successfully.`,
    totalProcessed: processedCount,
    emailsSent: emailPromises.length,
    notificationsLogged: notificationRecords.length
  })
}
