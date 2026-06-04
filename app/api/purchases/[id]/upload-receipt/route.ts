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
    const urls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${params.id}_${Date.now()}_${i}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file)

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath)

      urls.push(publicUrl)
    }

    // Store the public URLs as a JSON array string in receipt_url text column
    const { error: updateError } = await supabase
      .from('purchase_requests')
      .update({ receipt_url: JSON.stringify(urls) })
      .eq('id', params.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ urls })
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
