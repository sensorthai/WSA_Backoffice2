import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET() {
  // 1. Create workbook
  const wb = XLSX.utils.book_new()

  // 2. Sample data with Thai headers
  const headers = [
    "เลขที่",        // student_number (INT, required)
    "คำนำหน้า",      // prefix (เด็กชาย, เด็กหญิง, นาย, นางสาว)
    "ชื่อ",          // first_name (required)
    "นามสกุล",       // last_name (required)
    "เลขประจำตัว",      // nickname (optional)
    "ระดับชั้น",     // class_level (required, e.g. ป.1/1, ม.3/2)
    "ปีการศึกษา",    // academic_year (e.g. 2569)
    "หมายเหตุ",      // notes (optional)
  ]

  // 3. Example rows
  const sampleData = [
    [1, "เด็กชาย", "สมชาย", "ใจดี", "12345", "ป.4/1", "2569", ""],
    [2, "เด็กหญิง", "สมหญิง", "รักดี", "12346", "ป.4/1", "2569", ""],
    [3, "เด็กชาย", "วิชัย", "มีสุข", "12347", "ป.4/1", "2569", "นักเรียนใหม่"],
    [4, "เด็กหญิง", "วิไล", "สุขสันต์", "12348", "ป.4/1", "2569", ""],
    [5, "เด็กชาย", "ธนวัฒน์", "จริงใจ", "12349", "ป.4/2", "2569", ""],
  ]

  // 4. Build worksheet
  const wsData = [headers, ...sampleData]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 5. Set column widths
  ws["!cols"] = [
    { wch: 8 },   // เลขที่
    { wch: 14 },  // คำนำหน้า
    { wch: 18 },  // ชื่อ
    { wch: 18 },  // นามสกุล
    { wch: 14 },  // เลขประจำตัว
    { wch: 12 },  // ระดับชั้น
    { wch: 14 },  // ปีการศึกษา
    { wch: 20 },  // หมายเหตุ
  ]

  // 6. Add instruction sheet
  const instrData = [
    ["📋 คำแนะนำการกรอกข้อมูลนักเรียน"],
    [""],
    ["คอลัมน์", "คำอธิบาย", "จำเป็น?", "ตัวอย่าง"],
    ["เลขที่", "เลขที่นักเรียนในชั้น (ตัวเลข)", "✅ จำเป็น", "1, 2, 3..."],
    ["คำนำหน้า", "คำนำหน้าชื่อ", "ไม่จำเป็น", "เด็กชาย, เด็กหญิง, นาย, นางสาว"],
    ["ชื่อ", "ชื่อจริง", "✅ จำเป็น", "สมชาย"],
    ["นามสกุล", "นามสกุล", "✅ จำเป็น", "ใจดี"],
    ["เลขประจำตัว", "เลขประจำตัวนักเรียน", "ไม่จำเป็น", "12345"],
    ["ระดับชั้น", "ชั้นเรียน/ห้อง", "✅ จำเป็น", "ป.4/1, ม.3/2"],
    ["ปีการศึกษา", "ปีการศึกษา พ.ศ.", "ไม่จำเป็น", "2569"],
    ["หมายเหตุ", "ข้อมูลเพิ่มเติม", "ไม่จำเป็น", "นักเรียนใหม่"],
    [""],
    ["⚠️ หมายเหตุสำคัญ:"],
    ["1. ห้ามลบหรือเปลี่ยนชื่อหัวตาราง (แถวที่ 1)"],
    ["2. ลบแถวตัวอย่างก่อนกรอกข้อมูลจริง"],
    ["3. เลขที่ต้องเป็นตัวเลข 1-999"],
    ["4. ชื่อ, นามสกุล และระดับชั้น ห้ามเว้นว่าง"],
    ["5. ระดับชั้นต้องตรงกับที่กำหนดในระบบ เช่น ป.1/1, ป.4/2, ม.3/1"],
    ["6. สามารถ upload หลายชั้นในไฟล์เดียว"],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
  wsInstr["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 12 }, { wch: 30 }]

  // 7. Assemble workbook
  XLSX.utils.book_append_sheet(wb, ws, "รายชื่อนักเรียน")
  XLSX.utils.book_append_sheet(wb, wsInstr, "คำแนะนำ")

  // 8. Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_students.xlsx",
    },
  })
}
