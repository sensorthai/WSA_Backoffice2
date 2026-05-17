import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not set. Skipping email.')
    return
  }

  try {
    const info = await transporter.sendMail({
      from: `"SME Backoffice" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log('Email sent: %s', info.messageId)
    return info
  } catch (error) {
    console.error('Email sending failed:', error)
    throw error
  }
}
