import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // 1. Fetch resolved ticket
  const { data: ticket, error: fetchError } = await supabase
    .from('work_tickets')
    .select(`
      *,
      ticket_type:ticket_types(name, custom_fields)
    `)
    .eq('id', params.id)
    .single()

  if (fetchError || !ticket) {
    return NextResponse.json({ error: "ไม่พบตั๋วดังกล่าว" }, { status: 404 })
  }

  if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
    return NextResponse.json({ error: "ตั๋วยังไม่เสร็จสิ้น ไม่สามารถบันทึกเป็น Know-how ได้" }, { status: 400 })
  }

  // 2. Build Know-how Markdown Content
  let customFieldsContent = ''
  if (ticket.custom_answers && Object.keys(ticket.custom_answers).length > 0) {
    const fields = ticket.ticket_type?.custom_fields || []
    customFieldsContent = '\n### ข้อมูลอุปกรณ์ / รายละเอียดงานเพิ่มเติม\n'
    for (const key of Object.keys(ticket.custom_answers)) {
      const fieldMeta = fields.find((f: any) => f.name === key)
      const label = fieldMeta?.label || key
      customFieldsContent += `- **${label}:** ${ticket.custom_answers[key]}\n`
    }
  }

  const content = `## กรณีศึกษาการแก้ปัญหา: ${ticket.title}

### รายละเอียดอาการ / คำร้องขอ
${ticket.description}
${customFieldsContent}

---

### วิธีการแก้ไขปัญหา (Resolution)
${ticket.resolution_notes || 'ไม่มีข้อมูลบันทึกรายละเอียดการแก้ปัญหา'}

### ปัญหา/อุปสรรคที่พบระหว่างทำงาน
${ticket.obstacles || 'ไม่มี'}

### คำแนะนำ/แนวทางป้องกันสำหรับครั้งถัดไป
${ticket.recommendations || 'ไม่มี'}

*บทความนี้ถูกสร้างขึ้นโดยอัตโนมัติจากตั๋วงานรหัส ${ticket.id}*`

  // 3. Insert into knowledge_base table
  const { error: kbError } = await supabase
    .from('knowledge_base')
    .insert({
      title: `[Case Study] ${ticket.title}`,
      content,
      category: ticket.ticket_type?.name || 'Troubleshooting',
      attachment_url: ticket.photo_url || null,
      created_by: session.user.id
    })

  if (kbError) {
    return NextResponse.json({ error: kbError.message }, { status: 500 })
  }

  // 4. Update work_tickets record to reflect know-how sync
  await supabase
    .from('work_tickets')
    .update({ is_knowledge_base: true })
    .eq('id', params.id)

  return NextResponse.json({ success: true })
}
