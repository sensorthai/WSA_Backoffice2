# Cron Jobs Configuration

เอกสารรวบรวมรายการงานที่ต้องตั้งค่า Cron Job ในระบบ WSA Backoffice

## การตั้งค่าความปลอดภัย
ทุก Endpoint จะต้องระบุ **Authorization Header** หรือ **Query Parameter** เพื่อยืนยันตัวตน:
- **Header:** `Authorization: Bearer <CRON_SECRET>`
- **Query Param:** `?key=<CRON_SECRET>`
*(ค่า `<CRON_SECRET>` สามารถดูได้จากไฟล์ `.env.local` หรือ Environment Variables ของระบบ)*

---

## รายการ Cron Jobs

### 1. การแจ้งเตือนเช็คอิน (Check-in Reminder)
ใช้สำหรับแจ้งเตือนพนักงานที่ยังไม่ได้ทำการเช็คอินในแต่ละวัน
- **Endpoint:** `/api/cron/checkin-reminder`
- **เวลาที่แนะนำ:** ทุกวันจันทร์ - ศุกร์ เวลา 10:30 น. (หรือตามความเหมาะสม)
- **การทำงาน:** ค้นหาพนักงานที่ยังไม่ได้เช็คอินและส่งอีเมลแจ้งเตือน

### 2. รายงานสรุปประจำวัน (Daily Summary)
ส่งรายงานสรุปสถานะของบริษัทให้กับ Admin และ CEO
- **Endpoint:** `/api/cron/daily-summary`
- **เวลาที่แนะนำ:** ทุกวัน เวลา 18:00 น.
- **การทำงาน:** รวบรวมสรุปการเข้างาน (WFH/Office), รายการรออนุมัติทั้งหมด (ลา/จัดซื้อ/จองรถ) และยอดการจัดซื้อในวันนั้น ส่งทางอีเมล

### 3. แจ้งเตือนวันหมดอายุรถยนต์ (Car Expirations)
แจ้งเตือนรายการ ภาษี, ประกัน และ พรบ. รถยนต์ล่วงหน้า
- **Endpoint:** `/api/cron/car-expirations`
- **เวลาที่แนะนำ:** ทุกวัน เวลา 09:00 น.
- **การทำงาน:** ตรวจสอบหารถยนต์ที่มีรายการหมดอายุในอีก **14 วันข้างหน้าพอดี** และส่งอีเมลแจ้งเตือน Admin และผู้ดูแลรถ

---

## ตัวอย่างการตั้งค่า (Vercel Cron)
หากใช้งานบน Vercel สามารถเพิ่มใน `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/checkin-reminder",
      "schedule": "30 10 * * 1-5"
    },
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 18 * * *"
    },
    {
      "path": "/api/cron/car-expirations",
      "schedule": "0 9 * * *"
    }
  ]
}
```

*หมายเหตุ: เวลาใน Cron Schedule มักจะเป็น UTC กรุณาตรวจสอบและปรับให้ตรงกับเวลาประเทศไทย (+7 ชม.)*
