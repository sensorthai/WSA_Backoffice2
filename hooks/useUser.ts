"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { UserProfile } from "@/types"

export function useUser() {
  const { data: session, status } = useSession()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile', session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found in our DB yet
          return null
        }
        throw error
      }

      return data as UserProfile
    },
    enabled: !!session?.user?.email,
  })

  return {
    user: session?.user,
    profile,
    isLoading: status === 'loading' || isLoading,
    isAuthenticated: status === 'authenticated',
    error,
  }
}
