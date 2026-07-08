import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "general"
    let bucket = (formData.get("bucket") as string) || "attachments"

    if (!formData.get("bucket") && folder === "receipts") {
      bucket = "receipts"
    }

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const userId = session.user.id

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const filePath = `${folder}/${userId}/${fileName}`

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Map file extension to a valid MIME type accepted by the 'receipts' bucket
    let contentType = file.type
    if (fileExt === 'jpg' || fileExt === 'jpeg') {
      contentType = 'image/jpeg'
    } else if (fileExt === 'png') {
      contentType = 'image/png'
    } else if (fileExt === 'pdf') {
      contentType = 'application/pdf'
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: false
      })

    if (uploadError) {
      console.error("Upload Error:", uploadError)
      return NextResponse.json({ error: `อัปโหลดไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return NextResponse.json({ 
      url: data.publicUrl,
      path: filePath,
      fileName: file.name
    })
  } catch (err: any) {
    console.error("Upload handler error:", err)
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปโหลด" }, { status: 500 })
  }
}
