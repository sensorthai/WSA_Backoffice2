"use client"

export const dynamic = 'force-dynamic'
import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Clock, MapPin, BookOpen, School, ClipboardList, Users, GraduationCap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/useUser"

export default function TeachingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
      <TeachingContent />
    </Suspense>
  )
}

function TeachingContent() {
  const { profile } = useUser()
  const today = new Date().toISOString().split('T')[0]

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignments?status=active")
      const text = await res.text()
      if (!res.ok) throw new Error("Failed to fetch")
      return text ? JSON.parse(text) : []
    }
  })

  // Fetch students to count per school+class+year
  const { data: allStudents } = useQuery({
    queryKey: ["teaching-students"],
    queryFn: async () => {
      const res = await fetch("/api/admin/students")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // Build student count lookup: school_id|class_level|academic_year => count
  const studentCounts = new Map<string, number>()
  ;(allStudents || []).forEach((s: any) => {
    const key = `${s.school_id}|${s.class_level}|${s.academic_year}`
    studentCounts.set(key, (studentCounts.get(key) || 0) + 1)
  })

  // Check both schedule_dates (specific dates) and schedule_days (recurring)
  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]

  const todayAssignments = assignments?.filter((a: any) =>
    (a.schedule_dates || []).includes(today) || (a.schedule_days || []).includes(dayOfWeek)
  ) || []

  const otherAssignments = assignments?.filter((a: any) =>
    !(a.schedule_dates || []).includes(today) && !(a.schedule_days || []).includes(dayOfWeek)
  ) || []

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
            Teaching Schedule
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <ClipboardList size={48} className="text-purple-300" /> งานสอนของฉัน
          </h1>
          <p className="text-purple-200 text-lg">ดูตารางสอน งานที่ได้รับมอบหมาย และรายละเอียดโรงเรียน</p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Today's Assignments */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          งานสอนวันนี้ ({today})
        </h2>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
        ) : todayAssignments.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-slate-500 font-medium">ไม่มีงานสอนวันนี้</p>
            <p className="text-sm text-slate-400 mt-1">ดูตารางสอนทั้งหมดด้านล่าง</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {todayAssignments.map((a: any) => (
              <AssignmentCard key={a.id} assignment={a} today={today} isToday studentCount={studentCounts.get(`${a.school_id}|${a.class_level}|${a.academic_year}`) || 0} />
            ))}
          </div>
        )}
      </div>

      {/* Other Assignments */}
      {otherAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            งานสอนอื่นๆ
          </h2>
          <div className="grid gap-4">
            {otherAssignments.map((a: any) => (
              <AssignmentCard key={a.id} assignment={a} today={today} studentCount={studentCounts.get(`${a.school_id}|${a.class_level}|${a.academic_year}`) || 0} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && (!assignments || assignments.length === 0) && (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🎓</div>
          <p className="text-slate-500 font-semibold text-lg">ยังไม่มีงานสอนที่ได้รับมอบหมาย</p>
          <p className="text-sm text-slate-400 mt-2">เมื่อพนักงานมอบหมายงานสอน จะแสดงที่นี่</p>
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ assignment: a, today, isToday = false, studentCount = 0 }: { assignment: any, today: string, isToday?: boolean, studentCount?: number }) {
  const dates = (a.schedule_dates || []) as string[]
  const upcomingDates = dates.filter((d: string) => d >= today).slice(0, 5)
  const nextDate = upcomingDates[0]

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
      isToday ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isToday ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
            }`}>
              <School className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{a.school?.name || 'ไม่ระบุโรงเรียน'}</h3>
              {a.school?.district && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {a.school.district}{a.school.province && `, ${a.school.province}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
              <BookOpen className="h-3 w-3 mr-1" /> {a.subject?.name || '-'}
            </Badge>
            {a.class_level && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                <GraduationCap className="h-3 w-3 mr-1" /> {a.class_level}
              </Badge>
            )}
            {studentCount > 0 && (
              <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                <Users className="h-3 w-3 mr-1" /> {studentCount} คน
              </Badge>
            )}
            {a.schedule_time_start && (
              <Badge variant="outline" className="text-slate-600">
                <Clock className="h-3 w-3 mr-1" /> {a.schedule_time_start} - {a.schedule_time_end || '?'}
              </Badge>
            )}
          </div>

          {/* Upcoming dates */}
          {dates.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">วันสอนถัดไป:</span>
              <div className="flex flex-wrap gap-1.5">
                {upcomingDates.map((d: string) => (
                  <span key={d} className={`px-2 py-0.5 rounded text-xs font-mono ${
                    d === today ? 'bg-blue-600 text-white font-bold' : 'bg-blue-50 text-blue-700'
                  }`}>{d}</span>
                ))}
                {dates.filter((d: string) => d >= today).length > 5 && (
                  <span className="text-xs text-slate-400 self-center">+{dates.filter((d: string) => d >= today).length - 5} วัน</span>
                )}
              </div>
            </div>
          )}

          {a.notes && <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">{a.notes}</p>}
        </div>

        <div className="text-right text-xs text-slate-400 shrink-0">
          <p>ทั้งหมด {dates.length} วัน</p>
          {nextDate && nextDate !== today && <p className="text-blue-600 font-medium">ถัดไป {nextDate}</p>}
        </div>
      </div>
    </div>
  )
}
