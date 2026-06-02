import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const privateVehicleSchema = z.object({
  license_plate: z.string().min(1, "กรุณากรอกทะเบียนรถ"),
  model: z.string().min(1, "กรุณากรอกรุ่นรถ"),
  color: z.string().min(1, "กรุณากรอกสีรถ"),
  type: z.enum(['car', 'motorcycle']).default('car'),
  tax_renewal_date: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  ctp_expiry_date: z.string().optional().nullable(),
  oil_change_date: z.string().optional().nullable(),
  insurance_file_url: z.string().optional().nullable(),
  ctp_file_url: z.string().optional().nullable(),
  tax_file_url: z.string().optional().nullable(),
  other_file_url: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('private_vehicles')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Normalize empty strings to null
    const normalizedBody = { ...body }
    const nullableFields = [
      'tax_renewal_date',
      'insurance_expiry_date',
      'ctp_expiry_date',
      'oil_change_date',
      'insurance_file_url',
      'ctp_file_url',
      'tax_file_url',
      'other_file_url'
    ]
    nullableFields.forEach(field => {
      if (normalizedBody[field] === "") {
        normalizedBody[field] = null
      }
    })

    const validatedData = privateVehicleSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('private_vehicles')
      .insert({
        ...validatedData,
        user_id: session.user.id
      })
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
