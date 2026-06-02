import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const doctorAppointmentUpdateSchema = z.object({
  title: z.string().optional(),
  doctor_name: z.string().optional().nullable(),
  hospital_name: z.string().optional().nullable(),
  appointment_date: z.string().optional(),
  appointment_time: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
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
    const nullableFields = ['doctor_name', 'hospital_name', 'appointment_time', 'note']
    nullableFields.forEach(field => {
      if (normalizedBody[field] === "") {
        normalizedBody[field] = null
      }
    })

    const validatedData = doctorAppointmentUpdateSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    // Ensure user owns the appointment or is admin/ceo
    const { data: appointment, error: fetchError } = await supabase
      .from('doctor_appointments')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    const isAdmin = ['admin', 'ceo'].includes((session.user as any).role)
    if (appointment.user_id !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('doctor_appointments')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
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

  // Ensure user owns the appointment or is admin/ceo
  const { data: appointment, error: fetchError } = await supabase
    .from('doctor_appointments')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }

  const isAdmin = ['admin', 'ceo'].includes((session.user as any).role)
  if (appointment.user_id !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await supabase
    .from('doctor_appointments')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ message: "ลบนัดหมายแพทย์เรียบร้อยแล้ว" })
}
