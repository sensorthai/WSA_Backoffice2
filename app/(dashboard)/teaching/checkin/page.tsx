"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function TeachingCheckinRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/teaching")
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm font-medium">กำลังไปยังหน้ารวมตารางสอนและเช็คอิน...</p>
    </div>
  )
}
