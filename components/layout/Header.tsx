"use client"

import { Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NotificationBell } from "./NotificationBell"
import { useUser } from "@/hooks/useUser"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface HeaderProps {
  title: string
  onMenuClick?: () => void
  className?: string
}

export function Header({ title, onMenuClick, className }: HeaderProps) {
  const { profile } = useUser()
  const role = profile?.role || 'employee'

  return (
    <header className={cn("h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between", className)}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
        
        {/* User Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-blue-500/20">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {profile?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
              {profile?.full_name || "กำลังโหลด..."}
            </span>
            <span className="inline-flex self-start px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
              {role}
            </span>
          </div>
        </div>
 
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
 
        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 rounded-xl flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-xs font-semibold hidden md:inline">ออกจากระบบ</span>
        </Button>
      </div>
    </header>
  )
}

