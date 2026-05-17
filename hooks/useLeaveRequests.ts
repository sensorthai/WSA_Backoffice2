"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { LeaveRequest } from "@/types"
import { useUser } from "./useUser"

export function useLeaveRequests() {
  const { profile } = useUser()
  const queryClient = useQueryClient()

  // Fetch own leave requests
  const { data: myLeaves, isLoading: isLoadingMyLeaves } = useQuery({
    queryKey: ['my-leave-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as LeaveRequest[]
    },
    enabled: !!profile?.id,
  })

  // Mutation to create a leave request
  const createLeave = useMutation({
    mutationFn: async (newLeave: Partial<LeaveRequest>) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([{ ...newLeave, user_id: profile?.id }])
        .select()
      
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] })
    },
  })

  return {
    myLeaves,
    isLoadingMyLeaves,
    createLeave,
  }
}
