import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { processApproval } from "@/lib/approval-engine"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  const { action, note, stage } = await req.json()

  try {
    const updated = await processApproval({
      entityType: 'reimbursement',
      entityId: params.id,
      actorUserId: session.user.id,
      actorRole: userRole,
      action,
      stage: stage || 'supervisor',
      note
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Reimbursement approval error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 })
  }
}
