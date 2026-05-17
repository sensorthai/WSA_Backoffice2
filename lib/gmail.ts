import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const BRAND_COLOR = '#2563eb'
const COMPANY_NAME = 'Wireless Solution Asia'

const emailTemplate = (content: string) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
    <div style="background-color: ${BRAND_COLOR}; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">${COMPANY_NAME}</h1>
      <p style="color: rgba(255,255,255,0.8); margin-top: 5px; font-size: 14px;">Backoffice Notification System</p>
    </div>
    <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
      ${content}
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">นี่คืออีเมลแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้</p>
      <p style="color: #94a3b8; font-size: 11px; margin-top: 5px;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
    </div>
  </div>
`

async function send(to: string, subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Gmail] Credentials not set. Skipping.')
    return
  }
  try {
    const info = await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `[${COMPANY_NAME}] ${subject}`,
      html: emailTemplate(html),
    })
    console.log('[Gmail] Email sent: %s', info.messageId)
    return info
  } catch (error) {
    console.error('[Gmail] Failed to send email:', error)
  }
}

// 1. Leave Submitted
export const sendLeaveSubmitted = (to: string, data: any) => {
  const html = `
    <h2 style="color: #334155; margin-bottom: 20px;">มีคำขอลาใหม่รอดำเนินการ</h2>
    <p>สวัสดีคุณ <strong>${data.name}</strong>,</p>
    <p>พนักงาน <strong>${data.requesterName}</strong> ได้ส่งคำขอลาเพื่อรอการพิจารณา:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 120px;">ประเภทการลา:</td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${data.leaveType}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">วันที่:</td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${data.startDate} ถึง ${data.endDate}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">จำนวนวัน:</td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${data.days} วัน</td></tr>
    </table>
    <div style="margin-top: 30px;"><a href="${process.env.NEXTAUTH_URL}/approvals" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ไปที่หน้ารายการอนุมัติ</a></div>
  `
  return send(to, 'คำขอลาใหม่รอดำเนินการ', html)
}

// 2. Leave Approved
export const sendLeaveApproved = (to: string, data: any) => {
  const html = `
    <h2 style="color: #10b981; margin-bottom: 20px;">ใบลาของคุณได้รับการอนุมัติ</h2>
    <p>สวัสดีคุณ <strong>${data.name}</strong>,</p>
    <p>ใบลาประเภท <strong>${data.leaveType}</strong> สำหรับวันที่ <strong>${data.startDate} ถึง ${data.endDate}</strong> ได้รับการอนุมัติแล้ว</p>
    <p>โดย: <strong>${data.approverName}</strong></p>
    ${data.note ? `<p style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 20px;"><strong>หมายเหตุ:</strong> ${data.note}</p>` : ''}
  `
  return send(to, 'ใบลาได้รับการอนุมัติ', html)
}

// 3. Leave Rejected
export const sendLeaveRejected = (to: string, data: any) => {
  const html = `
    <h2 style="color: #ef4444; margin-bottom: 20px;">ใบลาของคุณถูกปฏิเสธ</h2>
    <p>สวัสดีคุณ <strong>${data.name}</strong>,</p>
    <p>ใบลาประเภท <strong>${data.leaveType}</strong> สำหรับวันที่ <strong>${data.startDate} ถึง ${data.endDate}</strong> ไม่ผ่านการอนุมัติ</p>
    <p>โดย: <strong>${data.approverName}</strong></p>
    ${data.note ? `<p style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 20px;"><strong>เหตุผล:</strong> ${data.note}</p>` : ''}
  `
  return send(to, 'ใบลาไม่ผ่านการอนุมัติ', html)
}

// 4. Purchase Submitted
export const sendPurchaseSubmitted = (to: string, data: any) => {
  const html = `
    <h2 style="color: #334155; margin-bottom: 20px;">มีคำขอเบิกเงินใหม่รอดำเนินการ</h2>
    <p>พนักงาน <strong>${data.requesterName}</strong> ได้ส่งคำขอเบิกเงิน:</p>
    <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">รายการ</p>
      <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold;">${data.title}</p>
      <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">ยอดเงินรวม</p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 800; color: ${BRAND_COLOR};">${Number(data.totalAmount).toLocaleString()} ฿</p>
    </div>
    <div style="margin-top: 30px;"><a href="${process.env.NEXTAUTH_URL}/approvals" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ตรวจสอบและอนุมัติ</a></div>
  `
  return send(to, 'คำขอเบิกเงินใหม่', html)
}

// 5. Purchase Approved
export const sendPurchaseApproved = (to: string, data: any) => {
  const html = `
    <h2 style="color: #10b981; margin-bottom: 20px;">คำขอเบิกเงินได้รับอนุมัติ</h2>
    <p>รายการ <strong>${data.title}</strong> ยอดเงิน <strong>${Number(data.totalAmount).toLocaleString()} ฿</strong> ได้รับการอนุมัติแล้ว</p>
    <p>โดย: <strong>${data.approverName}</strong></p>
    <p>ฝ่ายบัญชีจะดำเนินการในลำดับถัดไป</p>
  `
  return send(to, 'คำขอเบิกเงินได้รับอนุมัติ', html)
}

// 6. Purchase Rejected
export const sendPurchaseRejected = (to: string, data: any) => {
  const html = `
    <h2 style="color: #ef4444; margin-bottom: 20px;">คำขอเบิกเงินไม่ผ่านการอนุมัติ</h2>
    <p>รายการ <strong>${data.title}</strong> ยอดเงิน <strong>${Number(data.totalAmount).toLocaleString()} ฿</strong> ถูกปฏิเสธ</p>
    ${data.note ? `<p style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 20px;"><strong>เหตุผล:</strong> ${data.note}</p>` : ''}
  `
  return send(to, 'คำขอเบิกเงินไม่ผ่านการอนุมัติ', html)
}

// 7. Car Booking Approved
export const sendCarBookingApproved = (to: string, data: any) => {
  const html = `
    <h2 style="color: #10b981; margin-bottom: 20px;">การจองรถได้รับการอนุมัติ</h2>
    <p>คำขอจองรถไปที่ <strong>${data.destination}</strong> ได้รับการอนุมัติแล้ว</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 12px;">
      <tr><td style="padding: 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;">รถที่จัดสรร:</td><td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${data.carModel} (${data.licensePlate})</td></tr>
      <tr><td style="padding: 15px; color: #64748b;">เริ่มใช้งาน:</td><td style="padding: 15px; font-weight: bold;">${data.startDatetime}</td></tr>
    </table>
    <p>กรุณาตรวจสอบเลขไมล์ก่อนและหลังการใช้งานผ่านระบบ</p>
  `
  return send(to, 'การจองรถได้รับการอนุมัติ', html)
}

// 8. Daily Summary
export const sendDailySummary = (to: string, data: any) => {
  const html = `
    <h2 style="color: #334155; margin-bottom: 20px;">สรุปภาพรวมประจำวันที่ ${data.date}</h2>
    <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
      <div style="background: #f1f5f9; padding: 20px; border-radius: 12px;">
        <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase;">พนักงานเข้าออฟฟิศ</p>
        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 800;">${data.wfhSummary.office} ท่าน</p>
      </div>
      <div style="background: #f1f5f9; padding: 20px; border-radius: 12px;">
        <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase;">พนักงาน WFH</p>
        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 800;">${data.wfhSummary.home} ท่าน</p>
      </div>
    </div>
    <div style="margin-top: 25px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <p style="margin: 0 0 10px 0; font-weight: bold;">คำขอรออนุมัติค้างสะสม: <span style="color: #ef4444;">${data.pendingApprovals} รายการ</span></p>
      <p style="margin: 0; font-weight: bold;">ยอดการเบิกจ่ายวันนี้: <span style="color: ${BRAND_COLOR};">${Number(data.totalPurchaseToday).toLocaleString()} ฿</span></p>
    </div>
  `
  return send(to, `Daily Summary - ${data.date}`, html)
}

// 9. Car Booking Submitted
export const sendCarBookingSubmitted = (to: string, data: any) => {
  const html = `
    <h2 style="color: #334155; margin-bottom: 20px;">มีคำขอจองรถใหม่รอดำเนินการ</h2>
    <p>พนักงาน <strong>${data.requesterName}</strong> ได้ส่งคำขอจองรถ:</p>
    <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">จุดหมายปลายทาง</p>
      <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold;">${data.destination}</p>
      <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">วันเวลา</p>
      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">${data.startDatetime} เป็นต้นไป</p>
    </div>
    <div style="margin-top: 30px;"><a href="${process.env.NEXTAUTH_URL}/approvals" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ตรวจสอบรายการ</a></div>
  `
  return send(to, 'คำขอจองรถใหม่', html)
}
