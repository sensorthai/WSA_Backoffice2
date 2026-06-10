# WSA Backoffice (SME Backoffice)

ระบบบริหารจัดการภายในองค์กรแบบครบวงจร — Internal Enterprise Management Platform

## 🚀 Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript |
| **Styling** | Tailwind CSS + Radix UI + shadcn/ui |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage) |
| **Auth** | NextAuth.js v5 (Google OAuth + Credentials) |
| **State** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod |
| **Email** | Nodemailer (Gmail SMTP) |
| **i18n** | Custom context (TH / EN) |

## 📦 Modules

| # | Module | Path | Status |
|:--|:---|:---|:---|
| 1 | Authentication & Authorization | `/login` | ✅ Production |
| 2 | Dashboard | `/dashboard` | ✅ Production |
| 3 | CEO Dashboard | `/ceo` | ✅ Production |
| 4 | Admin Panel | `/admin` | ✅ Production |
| 5 | Check-in / Time Attendance | `/checkin` | ✅ Production |
| 6 | Leave Management | `/leaves` | ✅ Production |
| 7 | Purchase Requests | `/purchases` | ✅ Production |
| 8 | Car Booking | `/cars` | ✅ Production |
| 9 | Teaching Management | `/teaching`, `/teaching-mgmt` | ✅ Production |
| 10 | Weekly Reports | `/weekly-reports` | ✅ Production |
| 11 | Approval Center | `/approvals` | ✅ Production |
| 12 | Reimbursements | `/reimbursements` | ✅ Production |
| 13 | Meeting Rooms | `/meeting-rooms` | ✅ Production |
| 14 | Assets Management | `/assets` | ✅ Production |
| 15 | **Noticeboard & Holidays** | `/noticeboard` | ✅ **New** |
| 16 | Employee Directory | `/directory` | ✅ Production |
| 17 | Helpdesk Tickets | `/helpdesk` | ✅ Production |
| 18 | Knowledge Base | `/knowledge` | ✅ Production |
| 19 | **Health & Doctor Appointments** | `/profile` | ✅ **Enhanced** |

## 🆕 Recent Updates

### Noticeboard & Holiday Calendar (`/noticeboard`)
- กระดานประกาศข่าวสาร 3 ประเภท (news, holiday, policy) สำหรับ Admin/CEO สร้าง/แก้ไข/ลบ
- ปฏิทินวันหยุดประจำปี 2569 ครบ 20 วัน อ้างอิงจาก [ธนาคารแห่งประเทศไทย](https://www.bot.or.th/th/financial-institutions-holiday.html)
- แบ่งตามเดือน พร้อม expand/collapse — พนักงานทุกคนดูได้

### Health Profile & Doctor Appointments (`/profile`)
- บันทึกข้อมูลสุขภาพส่วนบุคคล (หมู่เลือด, โรคประจำตัว, ภูมิแพ้, รพ.ประกันสังคม)
- จัดการนัดหมายแพทย์ — ส่ง **อีเมลยืนยันทันที** เมื่อสร้างนัดหมาย
- Cron job `/api/cron/doctor-appointments` แจ้งเตือนล่วงหน้า 7 วัน และ 1 วัน

### Cron Jobs
| Job | Endpoint | Schedule (ICT) |
|:---|:---|:---|
| Check-in Reminder | `/api/cron/checkin-reminder` | Mon-Fri 10:30 |
| Daily Summary | `/api/cron/daily-summary` | Daily 18:00 |
| Car Expirations | `/api/cron/car-expirations` | Daily 09:00 |
| Doctor Appointments | `/api/cron/doctor-appointments` | Daily 09:00 |
| Work Done Request | `/api/cron/work-done-request` | Mon-Fri 17:00 |

## 🏃 Getting Started

```bash
npm install
npm run dev        # → http://localhost:3001
```

## 📁 Project Structure

```
app/
├── (auth)/          # Login, Pending Approval
├── (dashboard)/     # All dashboard modules
│   ├── noticeboard/ # 🆕 Noticeboard & Holidays
│   ├── profile/     # Health + Doctor Appointments
│   └── ...
├── api/
│   ├── announcements/   # 🆕 Noticeboard CRUD
│   ├── cron/            # Cron job endpoints
│   └── ...
components/
├── dashboard/
│   └── NoticeboardData.tsx  # 🆕 Holiday data
└── ...
supabase/
└── migrations/      # Database migrations
scratch/
├── seed_bot_holidays_2026.mjs  # 🆕 Seed BOT holidays
└── ...
```

## 📄 Documentation

- [`feature.md`](./feature.md) — Full feature spec with workflows (Mermaid diagrams)
- [`project_scope.md`](./project_scope.md) — Project scope summary
- [`CRON.md`](./CRON.md) — Cron job configuration
- [`VSCODE.md`](./VSCODE.md) — VS Code setup notes
