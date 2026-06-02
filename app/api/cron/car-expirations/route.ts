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

  // 1. Fetch all company cars
  const { data: companyCars, error: ccError } = await supabase
    .from('company_cars')
    .select('*, caretaker:users!caretaker_id(id, full_name, email)')

  if (ccError) {
    console.error('Error fetching company cars:', ccError)
    return NextResponse.json({ error: ccError.message }, { status: 500 })
  }

  // 2. Fetch all private vehicles
  const { data: privateVehicles, error: pvError } = await supabase
    .from('private_vehicles')
    .select('*, user:users!user_id(id, full_name, email)')

  if (pvError) {
    console.error('Error fetching private vehicles:', pvError)
    return NextResponse.json({ error: pvError.message }, { status: 500 })
  }

  // 3. Fetch all admins for company car alerts
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

  const emailPromises = []
  const notificationRecords: any[] = []
  let processedCompanyCount = 0
  let processedPrivateCount = 0

  // 4. Process Company Cars
  for (const car of companyCars) {
    const checkFields = [
      { key: 'tax_renewal_date', label: 'ภาษีรถยนต์' },
      { key: 'insurance_expiry_date', label: 'ประกันภัยรถยนต์' },
      { key: 'ctp_expiry_date', label: 'พรบ. รถยนต์' },
      { key: 'oil_change_date', label: 'กำหนดเปลี่ยนน้ำมันเครื่อง' }
    ]

    const alerts = []
    for (const field of checkFields) {
      const dateVal = car[field.key]
      if (!dateVal) continue

      const daysDiff = getDaysDiff(dateVal)
      
      // Determine if we need to alert
      let alertType: '1week' | '1day' | 'overdue' | null = null
      let alertLabel = ""

      if (daysDiff === 7) {
        alertType = '1week'
        alertLabel = 'จะหมดอายุ/ถึงกำหนดในอีก 1 สัปดาห์'
      } else if (daysDiff === 1) {
        alertType = '1day'
        alertLabel = 'จะหมดอายุ/ถึงกำหนดในอีก 1 วัน'
      } else if (daysDiff < 0 && (-daysDiff) % 7 === 0) {
        alertType = 'overdue'
        alertLabel = `เลยกำหนดแล้ว ${Math.abs(Math.round(daysDiff / 7))} สัปดาห์ ⚠️`
      }

      if (alertType) {
        alerts.push({
          field: field.label,
          date: dateVal,
          type: alertType,
          label: alertLabel,
          daysDiff
        })
      }
    }

    if (alerts.length === 0) continue
    processedCompanyCount++

    // Separate alerts by type for styling
    const hasOverdue = alerts.some(a => a.type === 'overdue')
    const headerColor = hasOverdue ? '#e11d48' : '#2563eb'
    const subjectPrefix = hasOverdue ? '[แจ้งเตือนเลยกำหนด ⚠️]' : '[แจ้งเตือนวันหมดอายุ]'

    // Prepare recipients
    const recipients = [...adminEmails]
    if (car.caretaker?.email) {
      recipients.push(car.caretaker.email)
    }
    const uniqueRecipients = Array.from(new Set(recipients))

    // HTML Content
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: ${headerColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">แจ้งเตือนรายการเกี่ยวกับรถยนต์บริษัท</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">เรียน ผู้เกี่ยวข้อง,</p>
          <p style="font-size: 16px;">ขอแจ้งเตือนรายการสำคัญของรถยนต์บริษัท ดังนี้:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>ทะเบียน:</b> ${car.license_plate}</p>
            <p style="margin: 5px 0;"><b>รุ่น:</b> ${car.model} (${car.color})</p>
            <p style="margin: 5px 0;"><b>ผู้ดูแล:</b> ${car.caretaker?.full_name || 'ไม่ได้ระบุ'}</p>
          </div>

          <p style="font-size: 16px;"><b>รายการแจ้งเตือน:</b></p>
          <ul style="font-size: 16px; color: ${hasOverdue ? '#e11d48' : '#333'};">
            ${alerts.map(a => `
              <li style="margin-bottom: 8px;">
                <b>${a.field}:</b> กำหนดวันที่ ${format(new Date(a.date), 'dd/MM/yyyy')} 
                <span style="color: ${a.type === 'overdue' ? '#e11d48' : '#2563eb'}; font-weight: bold;">(${a.label})</span>
              </li>
            `).join('')}
          </ul>

          <p style="font-size: 16px; margin-top: 30px;">กรุณาดำเนินการเข้าอัปเดตข้อมูลหรือต่ออายุเอกสารในระบบให้เรียบร้อย</p>
          
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
          subject: `${subjectPrefix} รถยนต์บริษัท ${car.license_plate} มีรายการต้องจัดการ`,
          html: htmlContent
        })
      )
    }

    // Add system notifications for 7-day or overdue cases
    const targetUserIds = Array.from(new Set([...adminIds, car.caretaker_id].filter(id => !!id)))
    for (const uid of targetUserIds) {
      notificationRecords.push({
        user_id: uid,
        type: 'car_expiration',
        title: `รถยนต์บริษัท ${car.license_plate} มีรายการต้องจัดการ`,
        message: alerts.map(a => `${a.field} (${a.label})`).join(', '),
        reference_id: car.id,
        reference_type: 'company_cars'
      })
    }
  }

  // 5. Process Private Vehicles
  for (const vehicle of privateVehicles) {
    if (!vehicle.user?.email) continue

    const checkFields = [
      { key: 'tax_renewal_date', label: 'ภาษีรถส่วนตัว' },
      { key: 'insurance_expiry_date', label: 'ประกันภัยรถส่วนตัว' },
      { key: 'ctp_expiry_date', label: 'พรบ. รถส่วนตัว' },
      { key: 'oil_change_date', label: 'กำหนดเปลี่ยนน้ำมันเครื่อง' }
    ]

    const alerts = []
    for (const field of checkFields) {
      const dateVal = vehicle[field.key]
      if (!dateVal) continue

      const daysDiff = getDaysDiff(dateVal)
      
      let alertType: '1week' | '1day' | 'overdue' | null = null
      let alertLabel = ""

      if (daysDiff === 7) {
        alertType = '1week'
        alertLabel = 'จะหมดอายุ/ถึงกำหนดในอีก 1 สัปดาห์'
      } else if (daysDiff === 1) {
        alertType = '1day'
        alertLabel = 'จะหมดอายุ/ถึงกำหนดในอีก 1 วัน'
      } else if (daysDiff < 0 && (-daysDiff) % 7 === 0) {
        alertType = 'overdue'
        alertLabel = `เลยกำหนดแล้ว ${Math.abs(Math.round(daysDiff / 7))} สัปดาห์ ⚠️`
      }

      if (alertType) {
        alerts.push({
          field: field.label,
          date: dateVal,
          type: alertType,
          label: alertLabel,
          daysDiff
        })
      }
    }

    if (alerts.length === 0) continue
    processedPrivateCount++

    const hasOverdue = alerts.some(a => a.type === 'overdue')
    const headerColor = hasOverdue ? '#e11d48' : '#4f46e5'
    const subjectPrefix = hasOverdue ? '[แจ้งเตือนเลยกำหนด ⚠️]' : '[แจ้งเตือนวันหมดอายุ]'

    // HTML Content for Private Vehicles
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: ${headerColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">แจ้งเตือนรายการเกี่ยวกับรถยนต์ส่วนตัว</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">เรียน คุณ ${vehicle.user.full_name},</p>
          <p style="font-size: 16px;">ขอแจ้งเตือนรายการสำคัญของรถยนต์ส่วนตัวที่คุณลงทะเบียนไว้ ดังนี้:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>ทะเบียน:</b> ${vehicle.license_plate}</p>
            <p style="margin: 5px 0;"><b>รุ่น:</b> ${vehicle.model} (${vehicle.color})</p>
            <p style="margin: 5px 0;"><b>ประเภท:</b> ${vehicle.type === 'motorcycle' ? 'รถจักรยานยนต์ส่วนตัว' : 'รถยนต์ส่วนตัว'}</p>
          </div>

          <p style="font-size: 16px;"><b>รายการแจ้งเตือน:</b></p>
          <ul style="font-size: 16px; color: ${hasOverdue ? '#e11d48' : '#333'};">
            ${alerts.map(a => `
              <li style="margin-bottom: 8px;">
                <b>${a.field}:</b> กำหนดวันที่ ${format(new Date(a.date), 'dd/MM/yyyy')} 
                <span style="color: ${a.type === 'overdue' ? '#e11d48' : '#4f46e5'}; font-weight: bold;">(${a.label})</span>
              </li>
            `).join('')}
          </ul>

          <p style="font-size: 16px; margin-top: 30px;">กรุณาดำเนินการต่ออายุเอกสารหรือดูแลเช็คสภาพรถ และเข้าไปอัปเดตข้อมูลวันที่ใหม่ในระบบ</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #94a3b8; text-align: center;">
            <p>อีเมลแจ้งเตือนอัตโนมัติจากระบบ SME Backoffice</p>
          </div>
        </div>
      </div>
    `

    emailPromises.push(
      sendEmail({
        to: vehicle.user.email,
        subject: `${subjectPrefix} รถส่วนตัวของคุณ ${vehicle.license_plate} มีรายการต้องจัดการ`,
        html: htmlContent
      })
    )

    // Add system notification for the user
    notificationRecords.push({
      user_id: vehicle.user_id,
      type: 'car_expiration',
      title: `รถส่วนตัว ${vehicle.license_plate} มีรายการต้องจัดการ`,
      message: alerts.map(a => `${a.field} (${a.label})`).join(', '),
      reference_id: vehicle.id,
      reference_type: 'private_vehicles'
    })
  }

  // Execute all promises asynchronously
  await Promise.allSettled([
    ...emailPromises,
    ...(notificationRecords.length > 0 ? [supabase.from('notifications').insert(notificationRecords)] : [])
  ])

  return NextResponse.json({ 
    message: `Cron completed successfully.`,
    processedCompanyCars: processedCompanyCount,
    processedPrivateVehicles: processedPrivateCount,
    emailsSent: emailPromises.length,
    notificationsCreated: notificationRecords.length
  })
}
