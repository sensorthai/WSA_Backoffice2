"use client"

export const dynamic = 'force-dynamic'
import { Suspense, useState } from "react"
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
import {
  BookOpenCheck,
  School,
  BookOpen,
  ClipboardList,
  GraduationCap,
  FileBarChart,
  BarChart3,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "schools", label: "โรงเรียน", icon: School },
  { id: "students", label: "นักเรียน", icon: GraduationCap },
  { id: "subjects", label: "วิชา & สื่อการสอน", icon: BookOpen },
  { id: "assignments", label: "มอบหมายงาน", icon: ClipboardList },
  { id: "teaching-logs", label: "ตรวจรายงานสอน", icon: FileBarChart },
  { id: "reports-overview", label: "สรุปภาพรวม", icon: BarChart3 },
  { id: "reports-school", label: "รายงานโรงเรียน", icon: FileBarChart },
  { id: "reports-teacher", label: "ผลงานครู", icon: Users },
  { id: "reports-income", label: "รายได้", icon: BarChart3 },
  { id: "reports-monthly", label: "รายงานรายเดือน", icon: FileBarChart },
] as const

const tabDescriptions: Record<string, string> = {
  "schools": "จัดการข้อมูลโรงเรียนลูกค้าที่ส่งครูไปสอน",
  "subjects": "จัดการรายวิชาและสื่อการสอนในแต่ละวิชา",
  "assignments": "มอบหมายครู Outsource ไปสอนที่โรงเรียนลูกค้า",
  "students": "จัดการรายชื่อนักเรียนตามโรงเรียนและระดับชั้น",
  "teaching-logs": "ตรวจรายงานการสอนที่ครูส่งมา ดูเวลาเช็คอินและเนื้อหาที่สอน",
  "reports-overview": "สรุปภาพรวมโรงเรียน ห้องเรียน นักเรียน และครูผู้สอนตามปีการศึกษา",
  "reports-school": "สร้างรายงานสรุปการสอนเพื่อส่งให้โรงเรียนลูกค้า",
  "reports-teacher": "สรุปผลงานครู ความตรงเวลา การส่งรายงาน และคะแนนประเมินรายเดือน",
  "reports-income": "สรุปรายได้ค่าสอนครู Outsource ตามคาบสอนที่ส่งรายงานแล้ว",
  "reports-monthly": "สรุปภาพรวมคาบสอน การเข้าเรียน ความคืบหน้า และแนวโน้มรายเดือน",
}

export default function TeachingMgmtPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
      <TeachingMgmtContent />
    </Suspense>
  )
}

function TeachingMgmtContent() {
  const [activeTab, setActiveTab] = useState("schools")

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
    <div className="space-y-6 animate-in fade-in duration-700 pb-12 max-w-7xl mx-auto">
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
            {tabDescriptions[activeTab] || "บริหารจัดการข้อมูลโรงเรียน วิชา ครู นักเรียน และสื่อการสอน"}
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-64 h-64 bg-indigo-600/15 rounded-full blur-[80px]" />
      </div>

      {/* Tab Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex min-w-max border-b border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <Icon size={16} className={cn(
                    "transition-colors",
                    isActive ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                  )} />
                  {tab.label}
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {renderContent()}
      </div>
    </div>
  )
}
