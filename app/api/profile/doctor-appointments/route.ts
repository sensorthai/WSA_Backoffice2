import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { format } from "date-fns"
import { z } from "zod"

const doctorAppointmentSchema = z.object({
  title: z.string().min(1, "กรุณากรอกหัวข้อนัดหมาย"),
  doctor_name: z.string().optional().nullable(),
  hospital_name: z.string().optional().nullable(),
  appointment_date: z.string().min(1, "กรุณาเลือกวันนัดหมาย"),
  appointment_time: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('doctor_appointments')
    .select('*')
    .eq('user_id', session.user.id)
    .order('appointment_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Normalize empty strings to null
    const normalizedBody = { ...body }
    const nullableFields = ['doctor_name', 'hospital_name', 'appointment_time', 'note']
    nullableFields.forEach(field => {
      if (normalizedBody[field] === "") {
        normalizedBody[field] = null
      }
    })

    const validatedData = doctorAppointmentSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('doctor_appointments')
      .insert({
        ...validatedData,
        user_id: session.user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send confirmation email after successful creation
    try {
      const timeStr = data.appointment_time
        ? data.appointment_time.substring(0, 5) + " น."
        : "ไม่ได้ระบุเวลา"

      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #2563eb; color: white; padding: 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">ยืนยันการนัดหมายแพทย์</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">WSA Health Support System</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">เรียนคุณ <b>${session.user.name}</b>,</p>
            <p style="font-size: 16px; line-height: 1.6;">ระบบได้รับข้อมูลการนัดหมายแพทย์ของท่านเรียบร้อยแล้ว โดยมีรายละเอียดดังนี้:</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 5px 0; font-size: 15px;"><b>หัวข้อนัดหมาย:</b> ${data.title}</p>
              <p style="margin: 5px 0; font-size: 15px;"><b>แพทย์ผู้รักษา:</b> ${data.doctor_name || 'ไม่ได้ระบุ'}</p>
              <p style="margin: 5px 0; font-size: 15px;"><b>โรงพยาบาล/คลินิก:</b> ${data.hospital_name || 'ไม่ได้ระบุ'}</p>
              <p style="margin: 5px 0; font-size: 15px; color: #2563eb; font-weight: bold;"><b>วันนัดหมาย:</b> ${format(new Date(data.appointment_date), 'dd/MM/yyyy')}</p>
              <p style="margin: 5px 0; font-size: 15px;"><b>เวลานัดหมาย:</b> ${timeStr}</p>
              ${data.note ? `<p style="margin: 5px 0; font-size: 15px; color: #666;"><b>หมายเหตุเพิ่มเติม:</b> ${data.note}</p>` : ''}
            </div>

            <p style="font-size: 14px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              ระบบจะแจ้งเตือนท่านล่วงหน้า 1 สัปดาห์ และ 1 วันก่อนถึงวันนัดหมาย<br/>
              <i>* อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</i>
            </p>
          </div>
          <div style="background-color: #f8fafc; text-align: center; padding: 15px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
            &copy; ${new Date().getFullYear()} WSA Backoffice. All rights reserved.
          </div>
        </div>
      `

      await sendEmail({
        to: session.user.email!,
        subject: `[ยืนยันนัดหมายแพทย์] ${data.title}`,
        html: htmlContent,
      })
    } catch (emailErr) {
      // Don't fail the request if email fails — just log it
      console.error('Failed to send appointment confirmation email:', emailErr)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
