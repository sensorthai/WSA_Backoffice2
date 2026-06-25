import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const files = formData.getAll('file') as File[]
    if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 })

    const supabase = createSupabaseServerClient()

    // 1. Fetch current reimbursement request to check permissions
    const { data: reimb, error: fetchError } = await supabase
      .from('reimbursements')
      .select('user_id, status, receipt_url')
      .eq('id', params.id)
      .single()

    if (fetchError || !reimb) {
      console.error("Fetch reimbursement request error:", fetchError)
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // 2. Check permissions
    const userRole = (session.user as any).role
    const isCEOOrAdmin = ['admin', 'ceo'].includes(userRole)
    const isOwner = reimb.user_id === session.user.id

    // Fetch actor profile for finance manager check
    const { data: actorUser } = await supabase
      .from('users')
      .select('role, department:departments(name), position:positions(name)')
      .eq('id', session.user.id)
      .single()

    const actorDept = (actorUser?.department as any)?.name || ""
    const actorPos = (actorUser?.position as any)?.name || ""
    const isFinanceManager = actorDept === 'ฝ่ายบัญชีและการเงิน' && actorPos === 'ผู้จัดการ'

    let canAddAttachment = false
    if (isCEOOrAdmin) {
      canAddAttachment = true
    } else if (isFinanceManager && reimb.status !== 'paid' && reimb.status !== 'rejected') {
      canAddAttachment = true
    } else if (isOwner && (reimb.status === 'pending' || reimb.status === 'approved')) {
      canAddAttachment = true
    }

    if (!canAddAttachment) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์เพิ่มไฟล์แนบสำหรับรายการนี้" }, { status: 403 })
    }

    const urls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${params.id}_${Date.now()}_${i}.${fileExt}`
      const filePath = `receipts/${reimb.user_id}/${fileName}`

      // Convert File to Buffer for robust server-side upload
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        console.error("Upload error details:", uploadError)
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath)

      urls.push(publicUrl)
    }

    let existingUrls: string[] = []
    if (reimb.receipt_url) {
      const trimmed = reimb.receipt_url.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            existingUrls = parsed
          } else if (typeof parsed === 'string') {
            existingUrls = [parsed]
          }
        } catch {
          existingUrls = [reimb.receipt_url]
        }
      } else {
        existingUrls = [reimb.receipt_url]
      }
    }

    const mergedUrls = [...existingUrls, ...urls]

    // Store the public URLs as a JSON array string in receipt_url text column
    const { error: updateError } = await supabase
      .from('reimbursements')
      .update({ receipt_url: JSON.stringify(mergedUrls) })
      .eq('id', params.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ urls })
  } catch (err: any) {
    console.error("Upload failed:", err)
    return NextResponse.json({ error: "Upload failed: " + err.message }, { status: 500 })
  }
}
