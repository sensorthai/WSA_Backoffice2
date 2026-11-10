import { createSupabaseServerClient } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const getBangkokTomorrowStr = () => {
  const now = new Date()
  // Shift to UTC+7 (Bangkok time) + 1 day (24 hours)
  const bkkTomorrow = new Date(now.getTime() + (7 + 24) * 60 * 60 * 1000)
  const y = bkkTomorrow.getUTCFullYear()
  const m = String(bkkTomorrow.getUTCMonth() + 1).padStart(2, "0")
  const d = String(bkkTomorrow.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const fmtDateTh = (s: string) => {
  if (!s || !s.includes("-")) return s
  const [y, m, d] = s.split("-")
  const thaiMonths = [
    "",
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ]
  const monthIdx = parseInt(m, 10)
  const buddhistYear = parseInt(y, 10) + 543
  return `${parseInt(d, 10)} ${thaiMonths[monthIdx] || m} ${buddhistYear} (${d}/${m}/${y})`
}

async function processSchoolHolidayReminders(options: {
  targetDate?: string
  schoolId?: string
}) {
  const supabase = createSupabaseServerClient()
  const targetDateStr = options.targetDate || getBangkokTomorrowStr()

  // 1. Fetch active teaching assignments (filtered by schoolId if provided)
  let query = supabase
    .from("teaching_assignments")
    .select(`
      id,
      teacher_id,
      school_id,
      subject_id,
      class_level,
      schedule_days,
      schedule_dates,
      schedule_time_start,
      schedule_time_end,
      status,
      teacher:teacher_id(id, email, full_name, is_active),
      school:school_id(id, name, district, province, holidays, is_active),
      subject:subject_id(id, name, code)
    `)
    .eq("status", "active")

  if (options.schoolId) {
    query = query.eq("school_id", options.schoolId)
  }

  const { data: assignments, error: assError } = (await query) as any

  if (assError) {
    throw new Error(assError.message)
  }

  // Filter assignments where school is active, teacher is active & has email, and school has holidays matching targetDateStr
  const remindersByTeacher: Record<
    string,
    {
      email: string
      name: string
      holidayItems: {
        schoolName: string
        holidayDate: string
        subjectName: string
        classLevel: string
        timeRange: string
      }[]
    }
  > = {}

  for (const ass of assignments || []) {
    const teacher = ass.teacher
    const school = ass.school
    if (!teacher?.is_active || !teacher?.email || !school?.is_active) continue

    const schoolHolidays: string[] = Array.isArray(school.holidays) ? school.holidays : []
    if (!schoolHolidays.includes(targetDateStr)) continue

    const teacherId = ass.teacher_id
    if (!remindersByTeacher[teacherId]) {
      remindersByTeacher[teacherId] = {
        email: teacher.email,
        name: teacher.full_name || "ครูผู้สอน",
        holidayItems: [],
      }
    }

    const timeRange =
      ass.schedule_time_start && ass.schedule_time_end
        ? `${ass.schedule_time_start.slice(0, 5)} - ${ass.schedule_time_end.slice(0, 5)} น.`
        : "-"

    remindersByTeacher[teacherId].holidayItems.push({
      schoolName: school.name || "-",
      holidayDate: targetDateStr,
      subjectName: ass.subject?.name || "-",
      classLevel: ass.class_level || "-",
      timeRange,
    })
  }

  const teacherList = Object.values(remindersByTeacher)
  const sentRecipients: { name: string; email: string; schools: string[] }[] = []

  if (teacherList.length === 0) {
    return {
      success: true,
      targetDate: targetDateStr,
      emailsSent: 0,
      recipients: sentRecipients,
      message: `ไม่มีโรงเรียนที่มีวันหยุดตรงกับวันที่ ${targetDateStr} หรือไม่มีครูผู้สอนที่ได้รับมอบหมาย`,
    }
  }

  const COMPANY_NAME = "Wireless Solution Asia"

  const emailPromises = teacherList.map(async (rem) => {
    const uniqueSchools = Array.from(new Set(rem.holidayItems.map((i) => i.schoolName)))

    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${process.env.GMAIL_USER}>`,
      to: rem.email,
      subject: `[WSA Backoffice] แจ้งเตือนวันหยุดโรงเรียนล่วงหน้า (${fmtDateTh(targetDateStr)}) - ${uniqueSchools.join(", ")}`,
      html: `
        <div style="font-family: 'Sarabun', sans-serif; max-width: 620px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: bold;">
              📅 แจ้งเตือนวันหยุดโรงเรียนล่วงหน้า 1 วัน
            </span>
            <h2 style="color: #0f172a; margin-top: 12px; margin-bottom: 4px;">แจ้งวันหยุดโรงเรียนในวันพรุ่งนี้</h2>
            <p style="color: #dc2626; font-size: 16px; font-weight: bold; margin: 0;">
              วันที่ ${fmtDateTh(targetDateStr)}
            </p>
          </div>

          <p style="font-size: 15px; color: #334155;">เรียน คุณ<b>${rem.name}</b>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            ระบบขอแจ้งเตือนให้ทราบว่าโรงเรียนที่คุณได้รับมอบหมายให้ทำการสอน มีกำหนดการ<b>วันหยุดโรงเรียน</b>ในวันพรุ่งนี้ (<b>${fmtDateTh(targetDateStr)}</b>) ดังรายละเอียดต่อไปนี้:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; font-size: 13px;">
            <thead>
              <tr style="background-color: #fef2f2; border-bottom: 2px solid #fecaca;">
                <th style="padding: 10px; text-align: left; color: #991b1b;">โรงเรียน</th>
                <th style="padding: 10px; text-align: left; color: #991b1b;">วิชาที่รับผิดชอบ</th>
                <th style="padding: 10px; text-align: center; color: #991b1b;">ระดับชั้น</th>
                <th style="padding: 10px; text-align: center; color: #991b1b;">เวลาเรียนปกติ</th>
              </tr>
            </thead>
            <tbody>
              ${rem.holidayItems
                .map(
                  (item) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: bold; color: #0f172a;">${item.schoolName}</td>
                  <td style="padding: 10px; color: #334155;">${item.subjectName}</td>
                  <td style="padding: 10px; text-align: center; color: #475569;">${item.classLevel}</td>
                  <td style="padding: 10px; text-align: center; color: #64748b;">${item.timeRange}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569; margin-bottom: 22px;">
            💡 <b>หมายเหตุ:</b> กรุณาตรวจสอบตารางการสอนและงดการเดินทางไปสอนในวันหยุดดังกล่าว หากมีการนัดสอนชดเชยเพิ่มเติมสามารถตรวจสอบได้ที่หน้าตารางสอนในระบบ
          </div>

          <div style="text-align: center; margin-top: 24px; margin-bottom: 16px;">
            <a href="${process.env.NEXTAUTH_URL || "http://localhost:3001"}/teaching/timetable" style="background-color: #4f46e5; color: #ffffff; padding: 11px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              ตรวจสอบตารางสอนในระบบ
            </a>
          </div>

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบบริหารจัดการงานสอน WSA Backoffice
          </p>
        </div>
      `,
    })

    sentRecipients.push({
      name: rem.name,
      email: rem.email,
      schools: uniqueSchools,
    })
  })

  await Promise.all(emailPromises)

  return {
    success: true,
    targetDate: targetDateStr,
    emailsSent: sentRecipients.length,
    recipients: sentRecipients,
  }
}

// GET handler for Automated Daily Cron Job
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")
  const customDate = searchParams.get("date") || undefined
  const schoolId = searchParams.get("schoolId") || undefined

  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    key !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processSchoolHolidayReminders({
      targetDate: customDate,
      schoolId,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("School holiday reminder cron error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST handler for Admin Manual Trigger from UI (SchoolsTable modal)
export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (!["admin", "employee", "supervisor"].includes(role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { schoolId, targetDate } = body || {}

    const result = await processSchoolHolidayReminders({
      schoolId,
      targetDate,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Manual school holiday email error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
