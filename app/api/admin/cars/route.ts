import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const carSchema = z.object({
  license_plate: z.string().min(1, "กรุณากรอกทะเบียนรถ"),
  model: z.string().min(1, "กรุณากรอกรุ่นรถ"),
  color: z.string().min(1, "กรุณากรอกสีรถ"),
  is_available: z.boolean().default(true),
  caretaker_id: z.string().regex(UUID_REGEX).optional().nullable(),
  tax_renewal_date: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  ctp_expiry_date: z.string().optional().nullable(),
  insurance_file_url: z.string().optional().nullable(),
  ctp_file_url: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('company_cars').select('*').order('created_at')
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    
    // Normalize empty strings to null for optional/nullable fields
    const normalizedBody = { ...body }
    const nullableFields = [
      'caretaker_id',
      'tax_renewal_date',
      'insurance_expiry_date',
      'ctp_expiry_date',
      'insurance_file_url',
      'ctp_file_url'
    ]
    nullableFields.forEach(field => {
      if (normalizedBody[field] === "") {
        normalizedBody[field] = null
      }
    })

    const validatedData = carSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('company_cars')
      .insert(validatedData)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
