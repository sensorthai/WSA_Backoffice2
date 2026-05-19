export type UserRole = 'admin' | 'employee' | 'supervisor' | 'ceo' | 'outsource'

export interface UserProfile {
  id: string
  google_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  department_id: string | null
  position_id: string | null
  supervisor_id: string | null
  is_teacher: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type: 'sick' | 'personal' | 'vacation' | 'other'
  start_date: string
  end_date: string
  days_count: number
  reason: string | null
  status: 'pending' | 'supervisor_approved' | 'approved' | 'rejected'
  supervisor_id: string | null
  created_at: string
}
