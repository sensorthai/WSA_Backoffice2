import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const doctorAppointmentSchema = z.object({
  title: z.string().min(1, "กรุณากรอกหัวข้อนัดหมาย"),
  doctor_name: z.string().optional().nullable(),
  hospital_name: z.string().optional().nullable(),
  appointment_date: z.string().min(1, "กรุณาเลือกวันนัดหมาย"),
  appointment_time: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('doctor_appointments')
    .select('*')
    .eq('user_id', session.user.id)
    .order('appointment_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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
    const nullableFields = ['doctor_name', 'hospital_name', 'appointment_time', 'note']
    nullableFields.forEach(field => {
      if (normalizedBody[field] === "") {
        normalizedBody[field] = null
      }
    })

    const validatedData = doctorAppointmentSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('doctor_appointments')
      .insert({
        ...validatedData,
        user_id: session.user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
