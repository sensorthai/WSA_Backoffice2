"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useUser } from "./useUser"

export function usePurchaseRequests() {
  const { profile } = useUser()

  const { data: myPurchases, isLoading } = useQuery({
    queryKey: ['my-purchase-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })

  return {
    myPurchases,
    isLoading,
  }
}
