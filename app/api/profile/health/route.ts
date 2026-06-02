import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { z } from "zod"

const healthProfileSchema = z.object({
  blood_type: z.string().optional().nullable(),
  chronic_disease: z.string().optional().nullable(),
  severe_allergies: z.string().optional().nullable(),
  social_security_hospital: z.string().optional().nullable(),
  attending_physician: z.string().optional().nullable(),
  emergency_hospital: z.string().optional().nullable(),
  health_exam_history: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Normalize empty strings to null
    const normalizedBody = { ...body }
    const healthFields = [
      'blood_type',
      'chronic_disease',
      'severe_allergies',
      'social_security_hospital',
      'attending_physician',
      'emergency_hospital',
      'health_exam_history'
    ]
    healthFields.forEach(field => {
      if (normalizedBody[field] === "") {
        normalizedBody[field] = null
      }
    })

    const validatedData = healthProfileSchema.parse(normalizedBody)
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('users')
      .update(validatedData)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "บันทึกข้อมูลสุขภาพสำเร็จแล้ว", user: data })
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError') {
      const msg = error.issues?.[0]?.message || error.errors?.[0]?.message || "ข้อมูลไม่ถูกต้อง"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
