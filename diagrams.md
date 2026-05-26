# 📊 แผนภาพลำดับขั้นตอนการทำงาน (Mermaid Sequence Diagrams)

เอกสารรวบรวมแผนภาพลำดับการทำงาน (Sequence Diagrams) ของระบบ **WSA Backoffice** ในรูปแบบ Mermaid เพื่อใช้แสดงเวิร์กโฟลว์การทำงานหลักของระบบ ทั้งในส่วนของการอนุมัติ, การเช็คอินประจำวัน, และการจัดการงานสอน

---

## 1. เวิร์กโฟลว์การอนุมัติเอกสาร (Approval Workflow)
ใช้กับรายการ **การลา (Leave Requests), การจัดซื้อ (Purchase Requests), และการจองรถยนต์บริษัท (Car Bookings)** 

*ไฟล์ดิบ: [approval_workflow.mermaid](file:///c:/Antigravity/WSA_Backoffice/approval_workflow.mermaid)*

```mermaid
sequenceDiagram
    autonumber
    actor Emp as พนักงาน (Employee)
    actor Sup as หัวหน้างาน (Supervisor)
    actor CEO as ผู้บริหาร (CEO)
    participant DB as ฐานข้อมูล (Supabase)
    participant Mail as ระบบอีเมล (Gmail)

    Emp->>DB: ยื่นคำร้องขอ (ลา, จัดซื้อ, จองรถ)
    DB-->>Emp: ตรวจสอบโควตา / วงเงินอนุมัติ
    
    rect rgb(240, 248, 255)
        note right of DB: กรณีเป็นคำขอลา หรือคำขอจองรถยนต์
        DB->>Sup: ส่ง Notification แจ้งคำขอใหม่เข้าระบบ
        DB->>Mail: ส่งอีเมลคำขอรอการอนุมัติ
        Sup->>DB: ดำเนินการอนุมัติ (Approve)
    end

    rect rgb(255, 240, 245)
        note right of DB: กรณีเป็นคำขอจัดซื้อ (Purchase Request)
        alt ยอดจัดซื้อ <= วงเงินอนุมัติของหัวหน้างาน
            DB->>Sup: ส่งอีเมล/แจ้งเตือนคำขอให้ Supervisor
            Sup->>DB: ดำเนินการอนุมัติ (Approve)
        else ยอดจัดซื้อ > วงเงินอนุมัติของหัวหน้างาน
            DB->>CEO: ส่งแจ้งเตือนคำขอให้ CEO โดยตรง
        end
    end

    DB->>CEO: ส่งคำขอการลา/จัดซื้อระดับสูงให้อนุมัติขั้นสุดท้าย
    CEO->>DB: อนุมัติการทำรายการขั้นสุดท้าย (Final Approval)
    
    DB->>Emp: ส่ง Notification แจ้งผลคำร้องได้รับการอนุมัติสำเร็จ
    DB->>Mail: ส่งอีเมลแจ้งผลการทำรายการอนุมัติสำเร็จ
```

---

## 2. เวิร์กโฟลว์บันทึกเนื้องานรายวันและเชื่อมโยงรายงานสัปดาห์ (Daily Work Log Workflow)
ใช้เมื่อพนักงานทำงานครบเวลา และต้องการดึงเนื้องานประจำวันมาเติมลงรายงานสัปดาห์โดยอัตโนมัติ

*ไฟล์ดิบ: [daily_work_log_workflow.mermaid](file:///c:/Antigravity/WSA_Backoffice/daily_work_log_workflow.mermaid)*

```mermaid
sequenceDiagram
    autonumber
    actor Emp as พนักงาน (Employee)
    participant Cron as ระบบตั้งเวลา (Cron Job)
    participant Web as ระบบ WSA Backoffice (Next.js)
    participant DB as ฐานข้อมูล (Supabase)
    participant Mail as ระบบอีเมล (Gmail)

    Emp->>DB: ลงเวลาเช็คอินเข้างาน (Office / WFH / Onsite) ในตอนเช้า
    
    Note over Cron, DB: หลังเลิกงาน (เวลา 17:30 น. ของทุกวันจันทร์ - ศุกร์)
    Cron->>DB: ค้นหาพนักงานที่เช็คอินแล้วแต่ยังไม่ได้บันทึกเนื้องาน
    DB-->>Cron: คืนค่าข้อมูลพนักงานที่ต้องแจ้งเตือน
    Cron->>Mail: ส่งอีเมลคำขอ "พิมพ์ระบุเนื้องานวันนี้" ไปยังพนักงาน
    
    Emp->>Mail: เปิดลิงก์จากอีเมลเพื่อเข้าหน้าเช็คอิน
    Emp->>Web: พิมพ์กรอกเนื้องานประจำวันนี้ (Daily Work Log)
    Web->>DB: PATCH อัปเดตเนื้องานลงตาราง wfh_checkins
    DB-->>Web: ยืนยันบันทึกผลงานสำเร็จ
    
    Note over Emp, Web: สิ้นสุดสัปดาห์ (วันศุกร์)
    Emp->>Web: เข้าสู่หน้ารายงานประจำสัปดาห์ (Weekly Report)
    Emp->>Web: คลิกปุ่ม "ดึงข้อมูลจากบันทึกงานรายวัน" (Import Daily Logs)
    Web->>DB: ดึงข้อมูลประวัติบันทึกงานของพนักงานในสัปดาห์นี้
    DB-->>Web: คืนข้อมูลเนื้องานรายวัน
    Web->>Web: แปลงข้อมูลบันทึกรายวันลงช่องรายการแผนงานให้อัตโนมัติ
    Emp->>Web: ตรวจสอบความถูกต้องและกดยืนยันส่งรายงาน (Submit)
```

---

## 3. เวิร์กโฟลว์ระบบจัดการงานสอน (Teaching Management Workflow)
ใช้กับ **พนักงาน (ครูผู้สอน)** และโรงเรียนเป้าหมายในการลงบันทึกเวลา พิกัด GPS และบันทึกผลการสอนรายวัน

*ไฟล์ดิบ: [teaching_management_workflow.mermaid](file:///c:/Antigravity/WSA_Backoffice/teaching_management_workflow.mermaid)*

```mermaid
sequenceDiagram
    autonumber
    actor Admin as ผู้จัดตารางสอน (Admin)
    actor Teacher as พนักงาน (ครูผู้สอน)
    participant DB as ฐานข้อมูล (Supabase)

    Admin->>DB: กำหนดตารางการสอน (Teaching Assignment)
    note over Admin, DB: กำหนดวัน, เวลา, โรงเรียน และวิชาที่มอบหมาย
    
    Teacher->>DB: ตรวจสอบตารางสอนประจำวันของตนเอง
    
    rect rgb(240, 255, 240)
        note over Teacher, DB: เมื่อถึงโรงเรียนปลายทาง
        Teacher->>DB: ลงเวลาเข้าสอน (Check-in) พร้อมบันทึกพิกัด GPS (Lat, Lng)
    end
    
    Teacher->>DB: ทำการเรียนการสอนจริงที่โรงเรียน
    
    rect rgb(255, 248, 240)
        note over Teacher, DB: เมื่อจบคาบเรียนการสอน
        Teacher->>DB: ลงเวลาออกสอน (Check-out)
        Teacher->>DB: กรอกรายงานการสอนรายวัน (Teaching Logs)<br>(ระบุหัวข้อ, จำนวนนักเรียน, พฤติกรรมนักเรียน)
    end
    
    Admin->>DB: ตรวจสอบและอนุมัติความถูกต้องของรายงานสอน (Review & Approve)
```
