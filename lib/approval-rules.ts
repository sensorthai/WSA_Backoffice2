export type ApprovalEntity = 'leave' | 'purchase' | 'car_booking'
export type ApprovalAction = 'approve' | 'reject'
export type ApprovalStage = 'supervisor' | 'ceo'

export interface ApprovalRule {
  entityType: ApprovalEntity
  requiresCeo: boolean | ((record: any, supervisorLimit?: number) => boolean)
  supervisorStatus: {
    approve: string
    reject: string
  }
  ceoStatus: {
    approve: string
    reject: string
  }
  roles: {
    supervisor: string[]
    ceo: string[]
  }
}

export const APPROVAL_RULES: Record<ApprovalEntity, ApprovalRule> = {
  leave: {
    entityType: 'leave',
    requiresCeo: (record) => record.days_count >= 3, // For example, 3+ days need CEO
    supervisorStatus: {
      approve: 'supervisor_approved',
      reject: 'rejected'
    },
    ceoStatus: {
      approve: 'approved',
      reject: 'rejected'
    },
    roles: {
      supervisor: ['supervisor', 'admin', 'ceo'],
      ceo: ['ceo', 'admin']
    }
  },
  purchase: {
    entityType: 'purchase',
    requiresCeo: (record, limit) => Number(record.total_amount) > (limit || 0),
    supervisorStatus: {
      approve: 'supervisor_approved', // This will transition to CEO if needed
      reject: 'rejected'
    },
    ceoStatus: {
      approve: 'approved',
      reject: 'rejected'
    },
    roles: {
      supervisor: ['supervisor', 'admin', 'ceo'],
      ceo: ['ceo', 'admin']
    }
  },
  car_booking: {
    entityType: 'car_booking',
    requiresCeo: false, // Cars only need supervisor
    supervisorStatus: {
      approve: 'approved',
      reject: 'rejected'
    },
    ceoStatus: {
      approve: 'approved',
      reject: 'rejected'
    },
    roles: {
      supervisor: ['supervisor', 'admin', 'ceo'],
      ceo: ['ceo', 'admin']
    }
  }
}
