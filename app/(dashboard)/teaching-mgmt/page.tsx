"use client"

export const dynamic = 'force-dynamic'
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SchoolsTable } from "@/components/admin/SchoolsTable"
import { SubjectsTable } from "@/components/admin/SubjectsTable"
import { AssignmentsTable } from "@/components/admin/AssignmentsTable"
import { StudentsTable } from "@/components/admin/StudentsTable"

import { TeachingLogsReview } from "@/components/admin/TeachingLogsReview"
import { ReportsOverview } from "@/components/admin/ReportsOverview"
import { ReportsSchool } from "@/components/admin/ReportsSchool"
import { ReportsTeacher } from "@/components/admin/ReportsTeacher"
import { ReportsIncome } from "@/components/admin/ReportsIncome"
import { ReportsMonthly } from "@/components/admin/ReportsMonthly"
import { BookOpenCheck } from "lucide-react"

export default function TeachingMgmtPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
      <TeachingMgmtContent />
    </Suspense>
  )
}

function TeachingMgmtContent() {
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get("tab") || "schools"

  const renderContent = () => {
    switch (activeTab) {
      case "schools": return <SchoolsTable />
      case "subjects": return <SubjectsTable />
      case "assignments": return <AssignmentsTable />
      case "students": return <StudentsTable />
      case "teaching-logs": return <TeachingLogsReview />
      case "reports-overview": return <ReportsOverview />
      case "reports-school": return <ReportsSchool />
      case "reports-teacher": return <ReportsTeacher />
      case "reports-income": return <ReportsIncome />
      case "reports-monthly": return <ReportsMonthly />
      default: return <SchoolsTable />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-violet-900 to-indigo-800 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-violet-200 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
            Teaching Management
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <BookOpenCheck size={48} className="text-violet-300" /> จัดการงานสอน
          </h1>
          <p className="text-violet-200 text-lg font-medium leading-relaxed">
            {activeTab === 'schools' && "จัดการข้อมูลโรงเรียนลูกค้าที่ส่งครูไปสอน"}
            {activeTab === 'subjects' && "จัดการรายวิชาและสื่อการสอนในแต่ละวิชา"}
            {activeTab === 'assignments' && "มอบหมายครู Outsource ไปสอนที่โรงเรียนลูกค้า"}
            {activeTab === 'students' && "จัดการรายชื่อนักเรียนตามโรงเรียนและระดับชั้น"}
            {activeTab === 'teaching-logs' && "ตรวจรายงานการสอนที่ครูส่งมา ดูเวลาเช็คอินและเนื้อหาที่สอน"}
            {activeTab === 'reports-overview' && "สรุปภาพรวมโรงเรียน ห้องเรียน นักเรียน และครูผู้สอนตามปีการศึกษา"}
            {activeTab === 'reports-school' && "สร้างรายงานสรุปการสอนเพื่อส่งให้โรงเรียนลูกค้า"}
            {activeTab === 'reports-teacher' && "สรุปผลงานครู ความตรงเวลา การส่งรายงาน และคะแนนประเมินรายเดือน"}
            {activeTab === 'reports-income' && "สรุปรายได้ค่าสอนครู Outsource ตามคาบสอนที่ส่งรายงานแล้ว"}
            {activeTab === 'reports-monthly' && "สรุปภาพรวมคาบสอน การเข้าเรียน ความคืบหน้า และแนวโน้มรายเดือน"}
            {!['schools', 'subjects', 'assignments', 'students', 'teaching-logs', 'reports-overview', 'reports-school', 'reports-teacher', 'reports-income', 'reports-monthly'].includes(activeTab) && "บริหารจัดการข้อมูลโรงเรียน วิชา ครู นักเรียน และสื่อการสอน"}
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-64 h-64 bg-indigo-600/15 rounded-full blur-[80px]" />
      </div>

      {/* Content */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {renderContent()}
      </div>
    </div>
  )
}
