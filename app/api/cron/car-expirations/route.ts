import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { addDays, format } from "date-fns"

export async function GET(req: Request) {
  // Security Check
  const authHeader = req.headers.get('authorization')
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  
  // Calculate target dates
  const date14 = format(addDays(new Date(), 14), 'yyyy-MM-dd')
  const date7 = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  // 1. Find cars expiring on either date
  const { data: cars, error: carError } = await supabase
    .from('company_cars')
    .select('*, caretaker:users!caretaker_id(id, full_name, email)')
    .or(`tax_renewal_date.eq.${date14},insurance_expiry_date.eq.${date14},ctp_expiry_date.eq.${date14},tax_renewal_date.eq.${date7},insurance_expiry_date.eq.${date7},ctp_expiry_date.eq.${date7}`)

  if (carError) {
    console.error('Error fetching cars:', carError)
    return NextResponse.json({ error: carError.message }, { status: 500 })
  }

  if (!cars || cars.length === 0) {
    return NextResponse.json({ message: `No cars expiring on ${date14} or ${date7}` })
  }

  // 2. Fetch all admins
  const { data: admins, error: adminError } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'admin')

  if (adminError) {
    console.error('Error fetching admins:', adminError)
    return NextResponse.json({ error: adminError.message }, { status: 500 })
  }

  const adminEmails = admins.map(admin => admin.email)
  const adminIds = admins.map(admin => admin.id)

  // 3. Process each car
  const emailPromises = []
  const notificationRecords: any[] = []

  for (const car of cars) {
    const is7Day = car.tax_renewal_date === date7 || car.insurance_expiry_date === date7 || car.ctp_expiry_date === date7
    const targetDate = is7Day ? date7 : date14
    const daysLeft = is7Day ? 7 : 14

    const expiringItems = []
    if (car.tax_renewal_date === targetDate) expiringItems.push("ภาษีรถยนต์")
    if (car.insurance_expiry_date === targetDate) expiringItems.push("ประกันภัยรถยนต์")
    if (car.ctp_expiry_date === targetDate) expiringItems.push("พรบ. รถยนต์")

    if (expiringItems.length === 0) continue

    // Prepare email recipients
    const recipients = [...adminEmails]
    if (car.caretaker?.email) {
      recipients.push(car.caretaker.email)
    }
    const uniqueRecipients = Array.from(new Set(recipients))

    // Prepare HTML content
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: ${is7Day ? '#e11d48' : '#2563eb'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">แจ้งเตือนรายการหมดอายุ (${daysLeft} วัน)</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">เรียน ผู้เกี่ยวข้อง,</p>
          <p style="font-size: 16px;">ขอแจ้งเตือนว่ารถยนต์ในระบบมีรายการที่จะหมดอายุในอีก <b>${daysLeft} วัน</b> (${format(new Date(targetDate), 'dd/MM/yyyy')}):</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${is7Day ? '#e11d48' : '#2563eb'}; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>ทะเบียน:</b> ${car.license_plate}</p>
            <p style="margin: 5px 0;"><b>รุ่น:</b> ${car.model}</p>
            <p style="margin: 5px 0;"><b>ผู้ดูแล:</b> ${car.caretaker?.full_name || 'ไม่ได้ระบุ'}</p>
          </div>

          <p style="font-size: 16px;"><b>รายการที่จะหมดอายุ:</b></p>
          <ul style="font-size: 16px; color: #e11d48;">
            ${expiringItems.map(item => `<li>${item}</li>`).join('')}
          </ul>

          <p style="font-size: 16px; margin-top: 30px;">กรุณาดำเนินการต่ออายุให้เรียบร้อยก่อนถึงวันดังกล่าว</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #94a3b8; text-align: center;">
            <p>อีเมลแจ้งเตือนอัตโนมัติจากระบบ SME Backoffice</p>
          </div>
        </div>
      </div>
    `

    for (const email of uniqueRecipients) {
      emailPromises.push(
        sendEmail({
          to: email,
          subject: `[แจ้งเตือน ${daysLeft} วัน] รถยนต์ ${car.license_plate} มีรายการหมดอายุ`,
          html: htmlContent
        })
      )
    }

    // 4. If 7 days left, create system notifications for Admins and Caretaker
    if (is7Day) {
      const targetUserIds = Array.from(new Set([...adminIds, car.caretaker_id].filter(id => !!id)))
      for (const uid of targetUserIds) {
        notificationRecords.push({
          user_id: uid,
          type: 'car_expiration',
          title: `รถยนต์ ${car.license_plate} จะหมดอายุใน 1 สัปดาห์`,
          message: `รายการหมดอายุ: ${expiringItems.join(', ')} ในวันที่ ${format(new Date(targetDate), 'dd/MM/yyyy')}`,
          reference_id: car.id,
          reference_type: 'company_cars'
        })
      }
    }
  }

  // Execute all promises
  await Promise.allSettled([
    ...emailPromises,
    ...(notificationRecords.length > 0 ? [supabase.from('notifications').insert(notificationRecords)] : [])
  ])

  return NextResponse.json({ 
    message: `Processed ${cars.length} cars. Emails: ${emailPromises.length}, Notifications: ${notificationRecords.length}`,
    date14,
    date7
  })
}
