"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Map path to title
  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard'
    if (path.startsWith('/checkin')) return 'Check-in วันนี้'
    if (path.startsWith('/leaves')) return 'จัดการใบลา'
    if (path.startsWith('/purchases')) return 'ระบบใบเบิก'
    if (path.startsWith('/cars')) return 'ขอใช้รถบริษัท'
    if (path.startsWith('/approve')) return 'เมนูอนุมัติ'
    if (path.startsWith('/admin')) return 'จัดการระบบ'
    if (path.startsWith('/ceo')) return 'CEO Insights'
    return 'Dashboard'
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl md:shadow-none no-print",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          title={getPageTitle(pathname)} 
          onMenuClick={() => setSidebarOpen(true)} 
          className="no-print"
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
