"use client"

export const dynamic = 'force-dynamic'
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { UsersTable } from "@/components/admin/UsersTable"
import { DepartmentsTable } from "@/components/admin/DepartmentsTable"
import { PositionsTable } from "@/components/admin/PositionsTable"
import { CarsTable } from "@/components/admin/CarsTable"
import { SystemSettings } from "@/components/admin/SystemSettings"
import { Settings2 } from "lucide-react"

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
      <AdminContent />
    </Suspense>
  )
}

function AdminContent() {
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get("tab") || "users"

  const renderContent = () => {
    switch (activeTab) {
      case "users": return <UsersTable />
      case "departments": return <DepartmentsTable />
      case "positions": return <PositionsTable />
      case "cars": return <CarsTable />
      case "settings": return <SystemSettings />
      default: return <UsersTable />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-7xl mx-auto">
      {/* Admin Header Hero */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl shadow-slate-200">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em]">
            System Administration
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <Settings2 size={48} className="text-blue-500" /> จัดการระบบ
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            {activeTab === 'users' && "บริหารจัดการข้อมูลพนักงาน สิทธิ์การใช้งาน และการตั้งค่าบัญชี"}
            {activeTab === 'departments' && "กำหนดโครงสร้างแผนกและกลุ่มงานภายในองค์กร"}
            {activeTab === 'positions' && "จัดการตำแหน่งงานและกำหนดวงเงินการอนุมัติ"}
            {activeTab === 'cars' && "จัดการข้อมูลรถยนต์ส่วนกลางและสถานะการใช้งาน"}
            {activeTab === 'settings' && "ตั้งค่าพารามิเตอร์พื้นฐานของระบบ เช่น ช่วงเวลาการเช็คอิน"}
            {!['users', 'departments', 'positions', 'cars', 'settings'].includes(activeTab) && "บริหารจัดการโครงสร้างองค์กร ข้อมูลพนักงาน และทรัพยากรส่วนกลาง"}
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]" />
      </div>

      {/* Content Container */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {renderContent()}
      </div>
    </div>
  )
}
