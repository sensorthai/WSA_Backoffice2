import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = params.id
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  const supabase = createSupabaseServerClient()
  
  // Verify ownership and status
  const { data: reimb } = await supabase
    .from('reimbursements')
    .select('user_id, status')
    .eq('id', id)
    .single()

  if (!reimb) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 })
  if (reimb.user_id !== session.user.id) return NextResponse.json({ error: "ไม่มีสิทธิ์ลบ" }, { status: 403 })
  if (reimb.status !== 'pending') return NextResponse.json({ error: "ไม่สามารถลบรายการที่กำลังดำเนินการหรืออนุมัติแล้วได้" }, { status: 400 })

  const { error } = await supabase.from('reimbursements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
