"use client"

export const dynamic = 'force-dynamic'
import { Suspense, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2, ChevronLeft, ChevronRight, School, BookOpen,
  Clock, Grid3X3, PartyPopper, Calendar
} from "lucide-react"
import { useUser } from "@/hooks/useUser"

const DAYS = [
  { key: "mon", label: "จันทร์", en: "Mon" },
  { key: "tue", label: "อังคาร", en: "Tue" },
  { key: "wed", label: "พุธ", en: "Wed" },
  { key: "thu", label: "พฤหัสฯ", en: "Thu" },
  { key: "fri", label: "ศุกร์", en: "Fri" },
  { key: "sat", label: "เสาร์", en: "Sat" },
  { key: "sun", label: "อาทิตย์", en: "Sun" },
]

const MONTH_DAYS = [
  { key: "sun", label: "อา" },
  { key: "mon", label: "จ" },
  { key: "tue", label: "อ" },
  { key: "wed", label: "พ" },
  { key: "thu", label: "พฤ" },
  { key: "fri", label: "ศ" },
  { key: "sat", label: "ส" },
]

const DAY_KEY_MAP: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" }

const COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-500" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
]

export default function TimetablePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <TimetableContent />
    </Suspense>
  )
}

function TimetableContent() {
  const { profile } = useUser()
  const [viewMode, setViewMode] = useState<"week" | "month">("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  const toLocalISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${date}`
  }

  const now = new Date()
  const today = toLocalISO(now)

  // Week calculation — handle Sunday (getDay()===0) correctly
  const monday = new Date(now)
  const dayOfWeek = now.getDay() // 0=Sun,1=Mon,...,6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sun→-6, Mon→0, Tue→-1 ...
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7)
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toLocalISO(d)
  })

  // Month calculation
  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthYear = monthDate.getFullYear()
  const monthNum = monthDate.getMonth()
  const daysInMonth = new Date(monthYear, monthNum + 1, 0).getDate()
  const firstDayOfWeek = new Date(monthYear, monthNum, 1).getDay() // 0=Sun
  const monthName = monthDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  // Build month grid cells
  const monthCells = useMemo(() => {
    const cells: { date: string; day: number; isCurrentMonth: boolean }[] = []
    // Leading blanks
    for (let i = 0; i < firstDayOfWeek; i++) {
      const d = new Date(monthYear, monthNum, -firstDayOfWeek + i + 1)
      cells.push({ date: toLocalISO(d), day: d.getDate(), isCurrentMonth: false })
    }
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(monthYear, monthNum, d)
      cells.push({ date: toLocalISO(dt), day: d, isCurrentMonth: true })
    }
    // Trailing blanks
    while (cells.length % 7 !== 0) {
      const d = new Date(monthYear, monthNum + 1, cells.length - firstDayOfWeek - daysInMonth + 1)
      cells.push({ date: toLocalISO(d), day: d.getDate(), isCurrentMonth: false })
    }
    return cells
  }, [monthYear, monthNum, daysInMonth, firstDayOfWeek])

  const formatThaiDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

  // Fetch assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["timetable-assignments", profile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/assignments?status=active&teacher_id=${profile?.id}`)
      const text = await res.text()
      return text ? JSON.parse(text) : []
    },
    enabled: !!profile?.id,
  })

  // Color map + holidays
  const schoolColorMap: Record<string, number> = {}
  const schoolHolidays = new Map<string, { date: string; schoolName: string }[]>()
  let colorIdx = 0;
  (assignments || []).forEach((a: any) => {
    if (a.school_id && !(a.school_id in schoolColorMap)) {
      schoolColorMap[a.school_id] = colorIdx++ % COLORS.length
    }
    const holidays = a.school?.holidays || []
    holidays.forEach((h: string) => {
      if (!schoolHolidays.has(h)) schoolHolidays.set(h, [])
      const existing = schoolHolidays.get(h)!
      if (!existing.find(e => e.schoolName === a.school?.name)) {
        existing.push({ date: h, schoolName: a.school?.name || '?' })
      }
    })
  })

  function getAssignmentsForDate(date: string) {
    const d = new Date(date)
    const dayKey = DAY_KEY_MAP[d.getDay()]
    return (assignments || []).filter((a: any) =>
      (a.schedule_dates || []).includes(date) || (a.schedule_days || []).includes(dayKey)
    )
  }

  function getHolidaysForDate(date: string) {
    return schoolHolidays.get(date) || []
  }

  const weekTotal = weekDates.reduce((sum, date) => sum + getAssignmentsForDate(date).length, 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-900 via-teal-900 to-cyan-800 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-200 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
            Timetable
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <Grid3X3 size={48} className="text-cyan-300" /> ตารางสอน
          </h1>
          <p className="text-cyan-200 text-lg">ดูภาพรวมตารางสอนแบบ{viewMode === "week" ? "รายสัปดาห์" : "รายเดือน"}</p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-cyan-600/30 rounded-full blur-[100px]" />
      </div>

      {/* View Mode Toggle + Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border p-4 shadow-sm">
        <Button variant="outline" size="icon" onClick={() => viewMode === "week" ? setWeekOffset(w => w - 1) : setMonthOffset(m => m - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center flex-1">
          {viewMode === "week" ? (
            <>
              <p className="text-lg font-bold text-slate-800">{formatThaiDate(monday)} — {formatThaiDate(new Date(monday.getTime() + 6 * 86400000))}</p>
              <p className="text-sm text-slate-400">
                {weekOffset === 0 ? "สัปดาห์นี้" : weekOffset === -1 ? "สัปดาห์ที่แล้ว" : `${Math.abs(weekOffset)} สัปดาห์${weekOffset < 0 ? "ก่อน" : "หลัง"}`}
                {weekTotal > 0 && <span className="ml-2 text-cyan-600 font-medium">({weekTotal} คาบ)</span>}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-slate-800">{monthName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(viewMode === "week" ? weekOffset !== 0 : monthOffset !== 0) && (
            <Button variant="ghost" size="sm" onClick={() => { setWeekOffset(0); setMonthOffset(0) }} className="text-xs">วันนี้</Button>
          )}
          <Button variant="outline" size="icon" onClick={() => viewMode === "week" ? setWeekOffset(w => w + 1) : setMonthOffset(m => m + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Mode toggle */}
          <div className="flex border rounded-lg overflow-hidden ml-2">
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" className="rounded-none text-xs h-8 px-3" onClick={() => setViewMode("week")}>
              <Grid3X3 className="h-3.5 w-3.5 mr-1" /> สัปดาห์
            </Button>
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" className="rounded-none text-xs h-8 px-3" onClick={() => setViewMode("month")}>
              <Calendar className="h-3.5 w-3.5 mr-1" /> เดือน
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
      ) : viewMode === "week" ? (
        /* ========== WEEKLY VIEW ========== */
        <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 divide-x min-w-[700px]">
            {DAYS.map((day, dayIdx) => {
              const date = weekDates[dayIdx]
              const isToday = date === today
              const dayAssignments = getAssignmentsForDate(date)
              const dayHolidays = getHolidaysForDate(date)
              const isHoliday = dayHolidays.length > 0

              return (
                <div key={day.key} className={`min-h-[300px] ${isToday ? "bg-cyan-50/40" : isHoliday ? "bg-red-50/30" : (day.key === "sat" || day.key === "sun") ? "bg-slate-50/50" : ""}`}>
                  <div className={`px-3 py-3 text-center border-b ${isToday ? "bg-cyan-100/70" : isHoliday ? "bg-red-50" : (day.key === "sat" || day.key === "sun") ? "bg-orange-50" : "bg-slate-50"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-cyan-700" : isHoliday ? "text-red-500" : (day.key === "sat" || day.key === "sun") ? "text-orange-500" : "text-slate-500"}`}>{day.label}</p>
                    <p className={`text-lg font-black ${isToday ? "text-cyan-800" : isHoliday ? "text-red-600" : "text-slate-700"}`}>
                      {parseInt(date.split("-")[2], 10)}
                    </p>
                    {isToday && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mx-auto mt-1" />}
                    {isHoliday && <div className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto mt-1" />}
                  </div>

                  {isHoliday && (
                    <div className="mx-2 mt-2 px-2.5 py-2 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <PartyPopper className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">วันหยุด</span>
                      </div>
                      {dayHolidays.map((h, i) => (
                        <p key={i} className="text-[11px] text-red-500 truncate flex items-center gap-1">
                          <School className="h-2.5 w-2.5 shrink-0" /> {h.schoolName}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="p-2 space-y-2">
                    {dayAssignments.length === 0 && !isHoliday ? (
                      <div className="text-center py-6"><p className="text-xs text-slate-300">ว่าง</p></div>
                    ) : dayAssignments.map((a: any) => {
                      const ci = schoolColorMap[a.school_id] ?? 0
                      const c = COLORS[ci]
                      const assignmentSchoolHoliday = (a.school?.holidays || []).includes(date)
                      return (
                        <div key={a.id} className={`${assignmentSchoolHoliday ? 'bg-red-50/60 border-red-200 opacity-60' : `${c.bg} ${c.border}`} border rounded-xl p-2.5 transition-all hover:shadow-md cursor-default relative`}>
                          {assignmentSchoolHoliday && (
                            <div className="absolute top-1 right-1">
                              <Badge className="bg-red-100 text-red-600 border-red-200 text-[9px] px-1.5 py-0">หยุด</Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={`w-2 h-2 rounded-full ${assignmentSchoolHoliday ? 'bg-red-400' : c.dot} shrink-0`} />
                            <span className={`text-xs font-bold ${assignmentSchoolHoliday ? 'text-red-500 line-through' : c.text} truncate`}>{a.school?.name}</span>
                          </div>
                          <p className={`text-[11px] flex items-center gap-1 truncate ${assignmentSchoolHoliday ? 'text-red-400 line-through' : 'text-slate-600'}`}>
                            <BookOpen className="h-3 w-3 shrink-0" /> {a.subject?.name}
                          </p>
                          {a.schedule_time_start && (
                            <p className={`text-[10px] flex items-center gap-1 mt-1 ${assignmentSchoolHoliday ? 'text-red-300' : 'text-slate-400'}`}>
                              <Clock className="h-2.5 w-2.5" /> {a.schedule_time_start}-{a.schedule_time_end || '?'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ========== MONTHLY VIEW ========== */
        <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b min-w-[700px]">
            {MONTH_DAYS.map(d => (
              <div key={d.key} className={`py-2 text-center text-xs font-bold tracking-wider ${d.key === "sun" || d.key === "sat" ? "text-red-400 bg-red-50/50" : "text-slate-500 bg-slate-50"}`}>
                {d.label}
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 divide-x divide-y min-w-[700px]">
            {monthCells.map((cell, i) => {
              const isToday = cell.date === today
              const dayAssignments = cell.isCurrentMonth ? getAssignmentsForDate(cell.date) : []
              const dayHolidays = cell.isCurrentMonth ? getHolidaysForDate(cell.date) : []
              const isHoliday = dayHolidays.length > 0
              const isSun = i % 7 === 0
              const isSat = i % 7 === 6

              return (
                <div key={i} className={`min-h-[100px] p-1.5 ${!cell.isCurrentMonth ? "bg-slate-50/50" : isToday ? "bg-cyan-50/40" : isHoliday ? "bg-red-50/20" : isSun || isSat ? "bg-slate-50/30" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${!cell.isCurrentMonth ? "text-slate-300" : isToday ? "bg-cyan-500 text-white" : isHoliday ? "text-red-500" : isSun ? "text-red-400" : "text-slate-700"}`}>
                      {cell.day}
                    </span>
                    {isHoliday && <PartyPopper className="h-3 w-3 text-red-400" />}
                  </div>
                  <div className="space-y-0.5">
                    {dayAssignments.slice(0, 3).map((a: any) => {
                      const ci = schoolColorMap[a.school_id] ?? 0
                      const c = COLORS[ci]
                      const isSchoolHoliday = (a.school?.holidays || []).includes(cell.date)
                      return (
                        <div key={a.id} className={`px-1.5 py-0.5 rounded text-[10px] truncate ${isSchoolHoliday ? 'bg-red-50 text-red-400 line-through' : `${c.bg} ${c.text}`} font-medium`}>
                          {a.subject?.name}
                        </div>
                      )
                    })}
                    {dayAssignments.length > 3 && (
                      <p className="text-[9px] text-slate-400 text-center">+{dayAssignments.length - 3}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {Object.keys(schoolColorMap).length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border">
          <span className="text-xs font-medium text-slate-500">สี:</span>
          {Object.entries(schoolColorMap).map(([schoolId, ci]) => {
            const school = (assignments || []).find((a: any) => a.school_id === schoolId)?.school
            const c = COLORS[ci]
            return (
              <div key={schoolId} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                <span className="text-xs text-slate-600">{school?.name || '?'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
