const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 1. Load env variables from .env.local manually for the script
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key) env[key.trim()] = value.join('=').trim();
});

const GMAIL_USER = env.GMAIL_USER;
const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

console.log('Testing with User:', GMAIL_USER);
console.log('App Password provided:', GMAIL_APP_PASSWORD ? 'Yes (hidden)' : 'No');

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('Error: GMAIL_USER or GMAIL_APP_PASSWORD is missing in .env.local');
  process.exit(1);
}

// 2. Create Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// 3. Send Test Email
async function main() {
  try {
    console.log('Sending test email to:', GMAIL_USER, '...');
    const info = await transporter.sendMail({
      from: `"Gmail Test" <${GMAIL_USER}>`,
      to: GMAIL_USER, // Send to self
      subject: "Test Connection from SME Backoffice",
      text: "If you receive this, your Gmail SMTP configuration is WORKING!",
      html: "<b>If you receive this, your Gmail SMTP configuration is WORKING!</b>",
    });

    console.log('✅ Success! Message ID:', info.messageId);
    console.log('Please check your inbox (and spam folder) for the test email.');
  } catch (error) {
    console.error('❌ Failed to send email:');
    console.error(error);
    
    if (error.code === 'EAUTH') {
      console.log('\n--- Troubleshooting ---');
      console.log('1. Make sure you are using an "App Password", NOT your regular password.');
      console.log('2. Check if 2-Step Verification is enabled on your Google Account.');
      console.log('3. Ensure GMAIL_USER is the full email address.');
    }
  }
}

main();
