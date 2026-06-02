import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const privateVehicleUpdateSchema = z.object({
  license_plate: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['car', 'motorcycle']).optional(),
  tax_renewal_date: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  ctp_expiry_date: z.string().optional().nullable(),
  oil_change_date: z.string().optional().nullable(),
  insurance_file_url: z.string().optional().nullable(),
  ctp_file_url: z.string().optional().nullable(),
  tax_file_url: z.string().optional().nullable(),
  other_file_url: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

    const validatedData = privateVehicleUpdateSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    // Ensure user owns the vehicle or is admin/ceo
    const { data: vehicle, error: fetchError } = await supabase
      .from('private_vehicles')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const isAdmin = ['admin', 'ceo'].includes((session.user as any).role)
    if (vehicle.user_id !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('private_vehicles')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()

  // Ensure user owns the vehicle or is admin/ceo
  const { data: vehicle, error: fetchError } = await supabase
    .from('private_vehicles')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
  }

  const isAdmin = ['admin', 'ceo'].includes((session.user as any).role)
  if (vehicle.user_id !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await supabase
    .from('private_vehicles')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: "ลบข้อมูลรถส่วนตัวเรียบร้อยแล้ว" })
}
