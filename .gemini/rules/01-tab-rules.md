# Rules: การใช้ TAB (Tab Navigation Guidelines)

## 1. โครงสร้างและอนิเมชัน (Structure & Animation)
ใช้ปุ่ม `<button>` ธรรมดาจัดวางในแถบขอบล่างสีจาง (`flex border-b border-slate-200 gap-8 pb-1`) และแสดงเส้นขีดล่างแบบเลื่อนสไลด์เมื่อเลือกแท็บ (Active Indicator):
```tsx
<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
```

## 2. การคุมโทนสี (Color Contrast)
* **Active**: สีน้ำเงินหลักของหน้าจอร่วมกับตัวหนาพรีเมียม (เช่น `text-blue-600 font-extrabold`)
* **Inactive**: สีเทาจางและมีเอฟเฟกต์โฮเวอร์ (เช่น `text-slate-400 hover:text-slate-600`)

## 3. ระบบการแสดงผล (Rendering)
สลับการเรนเดอร์เนื้อหาหน้าย่อยผ่านการคุม React State (`activeView`) ร่วมกับการทำเอฟเฟกต์ค่อย ๆ ปรากฏเมื่อผู้ใช้กดสลับหน้า:
```tsx
{activeView === "my-purchases" && (
  <div className="animate-in fade-in duration-500">...</div>
)}
```
