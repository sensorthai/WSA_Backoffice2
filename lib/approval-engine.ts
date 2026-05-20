import { createSupabaseServerClient } from "@/lib/supabase"
import { APPROVAL_RULES, ApprovalEntity, ApprovalAction, ApprovalStage } from "./approval-rules"
import { 
  sendLeaveApproved, 
  sendLeaveRejected, 
  sendPurchaseApproved, 
  sendPurchaseRejected, 
  sendCarBookingApproved,
  sendPurchaseSubmitted 
} from "./gmail"

interface ProcessApprovalParams {
  entityType: ApprovalEntity
  entityId: string
  actorUserId: string
  actorRole: string
  action: ApprovalAction
  stage: ApprovalStage
  note?: string
}

export async function processApproval({
  entityType,
  entityId,
  actorUserId,
  actorRole,
  action,
  stage,
  note
}: ProcessApprovalParams) {
  const supabase = createSupabaseServerClient()
  const rule = APPROVAL_RULES[entityType]
  const table = entityType === 'leave' ? 'leave_requests' : 
                entityType === 'purchase' ? 'purchase_requests' : 'car_bookings'

  // 1. Fetch record with user info
  const { data: record, error: fetchError } = await supabase
    .from(table)
    .select('*, user:users!user_id!inner(id, full_name, email, position:positions(approval_limit))')
    .eq('id', entityId)
    .single()

  if (fetchError || !record) throw new Error("ไม่พบรายการที่ต้องการอนุมัติ")

  // 2. Validate actor permission
  const allowedRoles = rule.roles[stage]
  if (!allowedRoles.includes(actorRole)) {
    throw new Error("คุณไม่มีสิทธิ์ดำเนินการในขั้นตอนนี้")
  }

  // 3. Validate state
  if (stage === 'supervisor' && record.status !== 'pending') {
    throw new Error("รายการนี้ไม่ได้อยู่ในสถานะรอหัวหน้าอนุมัติ")
  }
  if (stage === 'ceo' && record.status !== 'supervisor_approved') {
    throw new Error("รายการนี้ต้องผ่านการอนุมัติจากหัวหน้าก่อน")
  }

  // 4. Determine next status
  let nextStatus = action === 'approve' ? rule[stage === 'supervisor' ? 'supervisorStatus' : 'ceoStatus'].approve : rule[stage === 'supervisor' ? 'supervisorStatus' : 'ceoStatus'].reject

  // Special logic for escalation (Supervisor Stage)
  let escalationNeeded = false
  if (stage === 'supervisor' && action === 'approve') {
    const limit = record.user?.position?.approval_limit
    if (typeof rule.requiresCeo === 'function') {
      escalationNeeded = rule.requiresCeo(record, limit)
    } else {
      escalationNeeded = !!rule.requiresCeo
    }

    if (!escalationNeeded) {
      // If no CEO needed, jump straight to final approved
      nextStatus = rule.ceoStatus.approve
    }
  }

  // 5. Update Record
  const updateData: any = {
    status: nextStatus,
    updated_at: new Date().toISOString()
  }

  if (stage === 'supervisor') {
    updateData.supervisor_id = actorUserId
    updateData.supervisor_approved_at = new Date().toISOString()
    updateData.supervisor_note = note
  } else {
    updateData.ceo_approved_at = new Date().toISOString()
    updateData.ceo_note = note
  }
  
  // Car booking uses different column names for legacy reasons, let's map them if needed
  if (entityType === 'car_booking') {
    delete updateData.supervisor_approved_at
    delete updateData.supervisor_note
    updateData.approved_at = new Date().toISOString()
    updateData.approver_note = note
  }

  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', entityId)
    .select()
    .single()

  if (updateError) throw new Error(updateError.message)

  // 6. Notifications
  const requesterId = record.user_id
  const requesterEmail = record.user?.email
  const requesterName = record.user?.full_name

  // Notify Requester about current action
  await supabase.from('notifications').insert({
    user_id: requesterId,
    type: `${entityType}_update`,
    title: action === 'approve' ? 'ความคืบหน้าการอนุมัติ' : 'คำขอของคุณถูกปฏิเสธ',
    message: action === 'approve' ? `คำขอ ${entityType} ของคุณได้รับการอนุมัติในขั้น ${stage}` : `คำขอ ${entityType} ถูกปฏิเสธโดยผู้อนุมัติ`,
    reference_id: entityId,
    reference_type: table
  })

  // 7. If escalation needed -> Notify CEO
  if (escalationNeeded) {
    const { data: ceo } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('role', 'ceo')
      .single()

    if (ceo) {
      await supabase.from('notifications').insert({
        user_id: ceo.id,
        type: `${entityType}_escalation`,
        title: 'คำขอรอรับการอนุมัติจาก CEO',
        message: `รายการจาก ${requesterName} ยอดเงินเกินกำหนดของหัวหน้างาน`,
        reference_id: entityId,
        reference_type: table
      })
      
      if (ceo.email && entityType === 'purchase') {
        sendPurchaseSubmitted(ceo.email, {
          name: ceo.full_name,
          title: record.title,
          totalAmount: record.total_amount,
          requesterName
        })
      }
    }
  }

  // 8. Email to Requester on Final Result
  if (action === 'reject' || (action === 'approve' && !escalationNeeded) || stage === 'ceo') {
    if (requesterEmail) {
      const emailData = {
        name: requesterName,
        approverName: actorRole,
        note
      }

      if (entityType === 'leave') {
        action === 'approve' 
          ? sendLeaveApproved(requesterEmail, { ...emailData, leaveType: record.leave_type, startDate: record.start_date, endDate: record.end_date })
          : sendLeaveRejected(requesterEmail, { ...emailData, leaveType: record.leave_type, startDate: record.start_date, endDate: record.end_date })
      } else if (entityType === 'purchase') {
        action === 'approve'
          ? sendPurchaseApproved(requesterEmail, { ...emailData, title: record.title, totalAmount: record.total_amount })
          : sendPurchaseRejected(requesterEmail, { ...emailData, title: record.title, totalAmount: record.total_amount })
      } else if (entityType === 'car_booking' && action === 'approve') {
        const { data: car } = await supabase.from('company_cars').select('*').eq('id', record.car_id).single()
        sendCarBookingApproved(requesterEmail, {
          name: requesterName,
          destination: record.destination,
          carModel: car?.model,
          licensePlate: car?.license_plate,
          startDatetime: new Date(record.start_datetime).toLocaleString('th-TH')
        })
      }
    }
  }

  return updated
}
