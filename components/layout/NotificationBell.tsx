"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Bell, BellDot, Check, Car, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export function NotificationBell() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch Notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 30000 
  })

  // Mark as Read Mutation
  const markReadMutation = useMutation({
    mutationFn: async (id?: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify(id ? { id } : { all: true }),
        headers: { "Content-Type": "application/json" }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }
  })

  // Handle Click Outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const unreadCount = notifications.filter((n: any) => !n.is_read).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'car_expiration': return <Car className="w-4 h-4 text-rose-500" />
      case 'alert': return <AlertCircle className="w-4 h-4 text-amber-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <style jsx global>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(5deg); }
          60% { transform: rotate(-5deg); }
          70% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .animate-ring {
          animation: ring 2s ease infinite;
          transform-origin: top;
        }
        .notification-dropdown {
          transform-origin: top right;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* Bell Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "relative rounded-full transition-all duration-500 w-11 h-11",
          isOpen ? "bg-blue-50 text-blue-600 shadow-inner" : "hover:bg-slate-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {unreadCount > 0 ? (
          <BellDot className="w-6 h-6 text-rose-500 animate-ring" />
        ) : (
          <Bell className="w-6 h-6 text-slate-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 border-2 border-white text-[10px] font-black text-white rounded-full shadow-lg shadow-rose-500/20">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Custom Dropdown Content */}
      <div className={cn(
        "absolute right-0 mt-4 w-96 bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-[0_30px_70px_rgba(0,0,0,0.2)] ring-1 ring-slate-200/50 overflow-hidden z-[100] notification-dropdown border border-white",
        isOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-90 invisible pointer-events-none"
      )}>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-xl tracking-tight">การแจ้งเตือน</h3>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                 {unreadCount} รายการใหม่สำหรับคุณ
               </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/10 h-10 rounded-2xl text-[11px] font-black gap-2 px-4 border border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                markReadMutation.mutate();
              }}
            >
              <Check className="w-4 h-4" /> อ่านทั้งหมด
            </Button>
          )}
        </div>
          
          <div className="max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
            {notifications.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {notifications.map((n: any) => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "p-5 hover:bg-slate-50 transition-colors cursor-pointer group relative",
                      !n.is_read && "bg-blue-50/20"
                    )}
                    onClick={() => {
                      if (!n.is_read) markReadMutation.mutate(n.id)
                    }}
                  >
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        n.is_read ? "bg-slate-50 text-slate-400" : "bg-white text-blue-600"
                      )}>
                        {getIcon(n.type)}
                      </div>
                      <div className="space-y-1 pr-6">
                        <p className={cn(
                          "text-sm font-bold leading-tight",
                          n.is_read ? "text-slate-500" : "text-slate-900"
                        )}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider pt-1">
                          {format(new Date(n.created_at), "d MMM HH:mm", { locale: th })}
                        </p>
                      </div>
                    </div>
                    {!n.is_read && (
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-200 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                   <Bell className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-bold text-slate-300">ไม่มีการแจ้งเตือนในขณะนี้</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
               <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">
                  ดูประวัติทั้งหมด
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
