"use client"

import { useUser } from "./useUser"
import { UserRole } from "@/types"

export function useRole() {
  const { profile, isLoading } = useUser()

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false
    return roles.includes(profile.role)
  }

  return {
    role: profile?.role || null,
    isLoading,
    isAdmin: profile?.role === 'admin',
    isCeo: profile?.role === 'ceo',
    isSupervisor: profile?.role === 'supervisor',
    isEmployee: profile?.role === 'employee',
    hasRole,
  }
}
