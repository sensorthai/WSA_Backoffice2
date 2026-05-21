"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  School, BookOpen, Users, GraduationCap, Loader2,
  BarChart3, CalendarCheck, FileText, TrendingUp
} from "lucide-react"

export function ReportsOverview() {
  const [academicYear, setAcademicYear] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["reports-overview", academicYear],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (academicYear) params.set("academic_year", academicYear)
      const res = await fetch(`/api/reports/overview?${params.toString()}`)
      return res.ok ? res.json() : null
    }
  })

  const summary = data?.summary
  const schools = data?.school_breakdown || []
  const years = data?.academic_years || []

  const statCards = summary ? [
    { label: "โรงเรียน", value: summary.total_schools, icon: School, color: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
    { label: "วิชา", value: summary.total_subjects, icon: BookOpen, color: "from-amber-500 to-amber-600", bg: "bg-amber-50" },
    { label: "ห้องเรียน", value: summary.total_classrooms, icon: BarChart3, color: "from-purple-500 to-purple-600", bg: "bg-purple-50" },
    { label: "นักเรียน", value: summary.total_students, icon: GraduationCap, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
    { label: "ครู Outsource", value: summary.total_teachers, icon: Users, color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50" },
    { label: "คาบสอนเดือนนี้", value: summary.total_logs_this_month, icon: CalendarCheck, color: "from-rose-500 to-rose-600", bg: "bg-rose-50" },
  ] : []

  return (
    <div className="space-y-6">
      {/* Title + Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" /> สรุปภาพรวมการสอน
          </h2>
          <p className="text-sm text-slate-500 mt-1">ข้อมูลรวมโรงเรียน วิชา ห้องเรียน นักเรียน และครูผู้สอน</p>
        </div>
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="ปีการศึกษา (ทั้งหมด)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {years.map((y: string) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-md`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900">{card.value.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Submitted vs Total */}
          {summary && (
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" /> สถานะรายงานเดือนนี้
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: summary.total_logs_this_month > 0 ? `${(summary.submitted_logs / summary.total_logs_this_month * 100)}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                  {summary.submitted_logs}/{summary.total_logs_this_month} ส่งแล้ว
                  {summary.total_logs_this_month > 0 && (
                    <span className="text-emerald-600 ml-1">
                      ({Math.round(summary.submitted_logs / summary.total_logs_this_month * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* School Breakdown Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
            <div className="px-5 py-4 border-b bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <School className="h-4 w-4 text-blue-500" /> สรุปรายโรงเรียน
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>โรงเรียน</TableHead>
                  <TableHead className="text-center">วิชา</TableHead>
                  <TableHead className="text-center">ห้องเรียน</TableHead>
                  <TableHead className="text-center">นักเรียน</TableHead>
                  <TableHead className="text-center">ครู</TableHead>
                  <TableHead className="text-center">คาบ/สัปดาห์</TableHead>
                  <TableHead className="text-center">บันทึก(เดือนนี้)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">ไม่มีข้อมูล</TableCell>
                  </TableRow>
                ) : (
                  <>
                    {schools.map((s: any) => (
                      <TableRow key={s.school_id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <School className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="font-medium text-slate-800">{s.school_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">{s.subjects}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold bg-purple-50 text-purple-700 border-purple-200">{s.classrooms}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-slate-700">{s.student_count.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 font-bold">{s.teachers}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-amber-600">{s.periods_per_week}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-emerald-600">{s.log_count}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-slate-50 font-bold border-t-2">
                      <TableCell className="text-slate-700">รวม ({schools.length} โรงเรียน)</TableCell>
                      <TableCell className="text-center">{schools.reduce((s: number, r: any) => s + r.subjects, 0)}</TableCell>
                      <TableCell className="text-center">{schools.reduce((s: number, r: any) => s + r.classrooms, 0)}</TableCell>
                      <TableCell className="text-center">{schools.reduce((s: number, r: any) => s + r.student_count, 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center">{summary?.total_teachers}</TableCell>
                      <TableCell className="text-center text-amber-600">{schools.reduce((s: number, r: any) => s + r.periods_per_week, 0)}</TableCell>
                      <TableCell className="text-center text-emerald-600">{schools.reduce((s: number, r: any) => s + r.log_count, 0)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
