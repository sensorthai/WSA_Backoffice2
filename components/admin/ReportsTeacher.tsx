"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Loader2, Users, School, BookOpen, CheckCircle2,
  ChevronLeft, ChevronRight,
  CalendarDays, FileText, TrendingUp, Award
} from "lucide-react"
import { format } from "date-fns"

export function ReportsTeacher() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)

  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthStr = format(targetDate, "yyyy-MM")
  const monthLabel = targetDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-performance", monthStr],
    queryFn: async () => {
      const res = await fetch(`/api/reports/teacher-performance?month=${monthStr}`)
      return res.ok ? res.json() : null
    },
  })

  const teachers = data?.teachers || []

  // Score color
  function scoreColor(score: number) {
    if (score >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200"
    if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-200"
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  function scoreStars(score: number) {
    if (score >= 90) return "⭐⭐⭐"
    if (score >= 70) return "⭐⭐"
    if (score >= 50) return "⭐"
    return "—"
  }

  const behaviorLabels: Record<string, string> = {
    excellent: "ดีมาก", good: "ดี", fair: "พอใช้", needs_improvement: "ปรับปรุง"
  }
  const behaviorColors: Record<string, string> = {
    excellent: "bg-emerald-500", good: "bg-blue-500", fair: "bg-amber-500", needs_improvement: "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Title + Month Nav */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-500" /> รายงานผลงานครู
          </h2>
          <p className="text-sm text-slate-500 mt-1">สรุปความตรงเวลา การส่งรายงาน และคะแนนผลงานรายเดือน</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[140px]">
            <p className="text-sm font-bold text-slate-700">{monthLabel}</p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {monthOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setMonthOffset(0)}>เดือนนี้</Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && teachers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-indigo-500" /></div>
            <p className="text-3xl font-black text-slate-800">{teachers.length}</p>
            <p className="text-xs text-slate-500 mt-1">ครูทั้งหมด</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
            <p className="text-3xl font-black text-emerald-600">
              {teachers.length > 0 ? Math.round(teachers.reduce((s: number, t: any) => s + t.score, 0) / teachers.length) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">คะแนนเฉลี่ย</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /></div>
            <p className="text-3xl font-black text-blue-600">
              {teachers.reduce((s: number, t: any) => s + t.on_time, 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">เข้าตรงเวลา (รวม)</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-purple-500" /></div>
            <p className="text-3xl font-black text-purple-600">
              {teachers.reduce((s: number, t: any) => s + t.submitted, 0)}/{teachers.reduce((s: number, t: any) => s + t.total_logs, 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">ส่งรายงาน</p>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
      ) : teachers.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-slate-400">ไม่มีข้อมูลครูที่มีงานสอนในเดือนนี้</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" /> ตารางภาพรวมครูทุกคน
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>ครู</TableHead>
                <TableHead className="text-center">โรงเรียน</TableHead>
                <TableHead className="text-center">วิชา</TableHead>
                <TableHead className="text-center">วันสอน</TableHead>
                <TableHead className="text-center">ตรงเวลา</TableHead>
                <TableHead className="text-center">สาย</TableHead>
                <TableHead className="text-center">ขาด</TableHead>
                <TableHead className="text-center">ส่งรายงาน</TableHead>
                <TableHead className="text-center">คะแนน</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedTeacher(t)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={t.avatar_url} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {t.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-slate-800 text-sm">{t.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-bold">{t.school_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">{t.subject_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-slate-700">{t.actual_days}</span>
                    <span className="text-slate-400">/{t.expected_days}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-emerald-600">{t.on_time}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${t.late > 0 ? "text-amber-600" : "text-slate-300"}`}>{t.late}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${t.absent > 0 ? "text-red-600" : "text-slate-300"}`}>{t.absent}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-blue-600">{t.submitted}</span>
                    <span className="text-slate-400">/{t.total_logs}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`font-black text-sm px-2.5 ${scoreColor(t.score)}`}>
                      {scoreStars(t.score)} {t.score}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs h-7">ดู</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedTeacher} onOpenChange={(open) => !open && setSelectedTeacher(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-500" /> ผลงานครูรายละเอียด
            </DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-5 pt-2">
              {/* Teacher Info */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                <Avatar className="h-14 w-14 border-2 border-indigo-200">
                  <AvatarImage src={selectedTeacher.avatar_url} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-bold">
                    {selectedTeacher.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold text-slate-800">{selectedTeacher.name}</p>
                  <p className="text-sm text-slate-500">{selectedTeacher.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedTeacher.schools.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        <School className="h-2.5 w-2.5 mr-1" />{s}
                      </Badge>
                    ))}
                    {selectedTeacher.subjects.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        <BookOpen className="h-2.5 w-2.5 mr-1" />{s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score card */}
              <div className="grid grid-cols-5 gap-3">
                <MiniStat label="คะแนนรวม" value={`${selectedTeacher.score}%`} color="text-indigo-700" bg="bg-indigo-50" />
                <MiniStat label="ตรงเวลา" value={selectedTeacher.on_time} color="text-emerald-700" bg="bg-emerald-50" />
                <MiniStat label="สาย" value={selectedTeacher.late} color="text-amber-700" bg="bg-amber-50" />
                <MiniStat label="ขาด" value={selectedTeacher.absent} color="text-red-700" bg="bg-red-50" />
                <MiniStat label="ส่งรายงาน" value={`${selectedTeacher.submitted}/${selectedTeacher.total_logs}`} color="text-blue-700" bg="bg-blue-50" />
              </div>

              {/* Score Breakdown */}
              <div className="bg-white border rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-bold text-slate-700 mb-3">📊 การคำนวณคะแนน</h4>
                <ScoreBar
                  label="ตรงเวลา (40%)"
                  value={selectedTeacher.expected_days > 0 ? Math.round((selectedTeacher.on_time / selectedTeacher.expected_days) * 100) : 0}
                  color="bg-emerald-500"
                />
                <ScoreBar
                  label="ไม่ขาดงาน (30%)"
                  value={selectedTeacher.expected_days > 0 ? Math.round(((selectedTeacher.expected_days - selectedTeacher.absent) / selectedTeacher.expected_days) * 100) : 0}
                  color="bg-blue-500"
                />
                <ScoreBar
                  label="ส่งรายงาน (30%)"
                  value={selectedTeacher.report_rate}
                  color="bg-purple-500"
                />
              </div>

              {/* Attendance Calendar */}
              {selectedTeacher.daily_status && Object.keys(selectedTeacher.daily_status).length > 0 && (
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-500" /> ปฏิทินเข้างาน
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedTeacher.daily_status)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, status]) => (
                        <div
                          key={date}
                          className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border ${
                            status === "ontime"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : status === "late"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}
                          title={`${date}: ${status === "ontime" ? "ตรงเวลา" : status === "late" ? "สาย" : "ขาด"}`}
                        >
                          <span>{parseInt(date.split("-")[2])}</span>
                          <span className="text-[8px]">{status === "ontime" ? "✓" : status === "late" ? "L" : "✗"}</span>
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-3 mt-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> ตรงเวลา</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> สาย</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> ขาด</span>
                  </div>
                </div>
              )}

              {/* Behavior Pie (simplified bar) */}
              {Object.keys(selectedTeacher.behaviors).length > 0 && (
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">😊 ผลตอบรับพฤติกรรมนักเรียน</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedTeacher.behaviors)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([key, count]) => {
                        const total = Object.values(selectedTeacher.behaviors).reduce((s: number, v: any) => s + v, 0)
                        const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">{behaviorLabels[key] || key}</span>
                              <span className="font-bold text-slate-700">{count as number} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${behaviorColors[key] || "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MiniStat({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-700">{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
