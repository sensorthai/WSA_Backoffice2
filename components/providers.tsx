"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { useState, useEffect } from "react"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }))

  // Enable instant :active state feedback on touchstart for iOS/Mobile Safari
  useEffect(() => {
    const handleTouchStart = () => {}
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
    }
  }, [])

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </QueryClientProvider>
    </SessionProvider>
  )
}

