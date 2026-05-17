"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NotificationBell } from "./NotificationBell"

interface HeaderProps {
  title: string
  onMenuClick?: () => void
  className?: string
}

export function Header({ title, onMenuClick, className }: HeaderProps) {
  return (
    <header className={cn("h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between", className)}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  )
}
