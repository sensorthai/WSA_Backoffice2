import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import * as XLSX from "xlsx"

// Thai header → DB field mapping
const HEADER_MAP: Record<string, string> = {
  "เลขที่": "student_number",
  "คำนำหน้า": "prefix",
  "ชื่อ": "first_name",
  "นามสกุล": "last_name",
  "เลขประจำตัว": "nickname",
  "ระดับชั้น": "class_level",
  "ปีการศึกษา": "academic_year",
  "หมายเหตุ": "notes",
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 })
  if (!['admin', 'employee'].includes((session.user as any).role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const schoolId = formData.get("school_id") as string

    if (!file) return NextResponse.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 })
    if (!schoolId) return NextResponse.json({ error: "กรุณาเลือกโรงเรียน" }, { status: 400 })

    // Read Excel
    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: "buffer" })

    // Use first sheet (รายชื่อนักเรียน)
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    if (rawData.length < 2) {
      return NextResponse.json({ error: "ไม่พบข้อมูลในไฟล์ (ต้องมีอย่างน้อย 1 แถว + หัวตาราง)" }, { status: 400 })
    }

    // Map headers
    const headers = rawData[0].map((h: any) => String(h).trim())
    const fieldMapping: (string | null)[] = headers.map(h => HEADER_MAP[h] || null)

    // Validate required headers exist
    const requiredFields = ["student_number", "first_name", "last_name", "class_level"]
    const mappedFields = fieldMapping.filter(Boolean) as string[]
    const missingFields = requiredFields.filter(f => !mappedFields.includes(f))
    if (missingFields.length > 0) {
      const missingThai = Object.entries(HEADER_MAP)
        .filter(([, v]) => missingFields.includes(v))
        .map(([k]) => k)
      return NextResponse.json({
        error: `ไม่พบคอลัมน์ที่จำเป็น: ${missingThai.join(", ")}`,
      }, { status: 400 })
    }

    // Parse rows
    const students: any[] = []
    const errors: string[] = []

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.every((cell: any) => !cell && cell !== 0)) continue // skip empty rows

      const record: any = {
        school_id: schoolId,
        org_id: '00000000-0000-0000-0000-000000000001',
      }

      fieldMapping.forEach((field, colIdx) => {
        if (field && row[colIdx] !== undefined && row[colIdx] !== null) {
          const val = row[colIdx]
          if (field === "student_number") {
            record[field] = typeof val === "number" ? val : parseInt(String(val)) || 0
          } else {
            record[field] = String(val).trim()
          }
        }
      })

      // Validate required fields
      if (!record.student_number || record.student_number <= 0) {
        errors.push(`แถว ${i + 1}: เลขที่ไม่ถูกต้อง`)
        continue
      }
      if (!record.first_name) { errors.push(`แถว ${i + 1}: ไม่มีชื่อ`); continue }
      if (!record.last_name) { errors.push(`แถว ${i + 1}: ไม่มีนามสกุล`); continue }
      if (!record.class_level) { errors.push(`แถว ${i + 1}: ไม่มีระดับชั้น`); continue }

      students.push(record)
    }

    if (students.length === 0) {
      return NextResponse.json({
        error: "ไม่พบข้อมูลที่ถูกต้อง",
        errors,
      }, { status: 400 })
    }

    // Insert to DB
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.from('students').insert(students).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      message: `นำเข้านักเรียนสำเร็จ ${data?.length || 0} คน${errors.length > 0 ? ` (ข้อผิดพลาด ${errors.length} แถว)` : ""}`,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 })
  }
}
