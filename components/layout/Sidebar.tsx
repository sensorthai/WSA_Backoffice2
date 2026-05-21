"use client"
import { useState } from "react"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  UserCheck,
  CalendarRange,
  ShoppingBag,
  Car,
  CheckSquare,
  Settings,
  Crown,
  FileBarChart,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Layers,
  Briefcase,
  Palmtree,
  ClipboardList,
  FileSpreadsheet,
  BookOpenCheck,
  Grid3X3,
  ClipboardCheck,
  Coins
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/useUser"

import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { profile } = useUser()
  const role = profile?.role || 'employee'
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(["จัดการระบบ"])

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const { data: pendingApprovals } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending")
      return res.json()
    },
    enabled: role !== 'employee',
    refetchInterval: 60000 // Refresh sidebar count every minute
  })

  const pendingCount = Array.isArray(pendingApprovals) ? pendingApprovals.length : 0

  const navItems = [
    { label: "CEO Dashboard", href: "/ceo", icon: Crown, roles: ["ceo", "admin"] },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "employee", "supervisor", "ceo"] },
    { label: "Check-in วันนี้", href: "/checkin", icon: UserCheck, roles: ["admin", "employee", "supervisor", "ceo"] },
    { label: "ใบลา", href: "/leaves", icon: CalendarRange, roles: ["admin", "employee", "supervisor", "ceo"] },
    { label: "ใบเบิก", href: "/purchases", icon: ShoppingBag, roles: ["admin", "employee", "supervisor", "ceo"] },
    { label: "ขอใช้รถ", href: "/cars", icon: Car, roles: ["admin", "employee", "supervisor", "ceo"] },
    { label: "รายงานรายสัปดาห์", href: "/weekly-reports", icon: ClipboardCheck, roles: ["admin", "employee", "supervisor", "ceo"] },
    {
      label: "งานสอน",
      href: "/teaching",
      icon: ClipboardList,
      roles: ["outsource", "admin", "employee", "supervisor"],
      requireTeacher: true,
      subItems: [
        { label: "ตารางสอน", href: "/teaching", icon: CalendarRange },
        { label: "เช็คอิน", href: "/teaching/checkin", icon: UserCheck },
        { label: "สมุดบันทึก & รายงาน", href: "/teaching/logbook", icon: BookOpenCheck },
        { label: "สื่อการสอน", href: "/teaching/materials", icon: FileSpreadsheet },
        { label: "ตารางสอน (สัปดาห์/เดือน)", href: "/teaching/timetable", icon: Grid3X3 },
      ]
    },
    { label: "เมนูอนุมัติ", href: "/approvals", icon: CheckSquare, roles: ["admin", "supervisor", "ceo"] },
    { label: "จัดการงานสอน", href: "/teaching-mgmt", icon: BookOpenCheck, roles: ["admin"] },
    {
      label: "จัดการระบบ",
      href: "/admin",
      icon: Settings,
      roles: ["admin"],
      subItems: [
        { label: "พนักงาน", href: "/admin?tab=users", icon: Users },
        { label: "กลุ่มงาน", href: "/admin?tab=departments", icon: Layers },
        { label: "ตำแหน่ง", href: "/admin?tab=positions", icon: Briefcase },
        { label: "รถบริษัท", href: "/admin?tab=cars", icon: Car },
        { label: "ตั้งค่าระบบ", href: "/admin?tab=settings", icon: Settings },
        { label: "เครดิต Google API", href: "/admin?tab=google-api", icon: Coins },
      ]
    },
    {
      label: "รายงานสรุป",
      href: "/reports",
      icon: FileBarChart,
      roles: ["admin", "ceo"],
      subItems: [
        { label: "สรุปการเข้างาน", href: "/reports?tab=wfh", icon: Users },
        { label: "สรุปการลา", href: "/reports?tab=leave", icon: Palmtree },
        { label: "สรุปการเบิกจ่าย", href: "/reports?tab=purchase", icon: ShoppingBag },
        { label: "สรุปการใช้รถ", href: "/reports?tab=car", icon: Car },
      ]
    },

  ]

  const filteredItems = navItems.filter(item => {
    if (!item.roles.includes(role.toLowerCase().trim())) return false
    // Items requiring teacher capability: show for outsource, admin, or is_teacher users
    if ((item as any).requireTeacher) {
      if (role === 'outsource' || role === 'admin') return true
      return profile?.is_teacher === true
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">SME</span>
          </div>
          <span className="font-bold text-white tracking-tight">Backoffice</span>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden text-slate-400" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>



      {/* Navigation Items */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar py-4">
        {filteredItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0
          const isOpen = openSubmenus.includes(item.label)
          const isParentActive = pathname.startsWith(item.href)

          return (
            <div key={item.label} className="space-y-1">
              {hasSubItems ? (
                <button
                  onClick={() => toggleSubmenu(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isParentActive && !isOpen
                      ? "bg-blue-600/10 text-blue-400"
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn(
                      "h-5 w-5",
                      isParentActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                    )} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    pathname === item.href
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn(
                      "h-5 w-5",
                      pathname === item.href ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                    )} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {item.href === "/approvals" && pendingCount > 0 && (
                    <Badge className="bg-red-500 text-white border-0 h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] p-0 px-1">
                      {pendingCount}
                    </Badge>
                  )}
                </Link>
              )}

              {/* Render Sub Items */}
              {hasSubItems && isOpen && (
                <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems?.map((sub) => {
                    // Check active state for query params
                    const subPath = sub.href.split('?')[0]
                    const subQuery = sub.href.split('?')[1]
                    const tabParam = subQuery?.split('=')[1]

                    const isActive = pathname === subPath && searchParams.get('tab') === tabParam

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          isActive
                            ? "text-blue-400 font-bold bg-blue-400/5"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                        )}
                      >
                        {sub.icon && <sub.icon size={14} />}
                        {sub.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>


    </div>
  )
}
