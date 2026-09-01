"use client"

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  MapPin, 
  School, 
  BookOpen, 
  CheckCircle2,
  LogIn, 
  LogOut, 
  Loader2, 
  ClipboardCheck, 
  CalendarDays, 
  Clock, 
  Users, 
  ArrowRight,
  Sparkles,
  BookOpenCheck,
  CalendarRange
} from "lucide-react"

export default function TeachingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <TeachingContent />
    </Suspense>
  )
}

function TeachingContent() {
  const { profile } = useUser()
  const queryClient = useQueryClient()
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const today = new Date().toISOString().split("T")[0]
  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
  const dayNamesThai: Record<string, string> = {
    sun: "วันอาทิตย์", mon: "วันจันทร์", tue: "วันอังคาร",
    wed: "วันพุธ", thu: "วันพฤหัสบดี", fri: "วันศุกร์", sat: "วันเสาร์"
  }

  const fmtDate = (s: string) => {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${Number(y) + 543}`
  }

  // 1. Fetch active assignments for this teacher
  const { data: assignments, isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ["my-assignments-active", profile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/assignments?status=active&teacher_id=${profile?.id}`)
      const text = await res.text()
      if (!res.ok) throw new Error("Failed to fetch assignments")
      return text ? JSON.parse(text) : []
    },
    enabled: !!profile?.id,
  })

  // 2. Fetch today's teaching logs
  const { data: todayLogs, isLoading: isLogsLoading } = useQuery({
    queryKey: ["my-teaching-logs", today],
    queryFn: async () => {
      const res = await fetch(`/api/teaching-logs?date=${today}`)
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // 3. Fetch all students for student counts
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

  // Filter today's vs other assignments
  const todayAssignments = assignments?.filter((a: any) =>
    (a.schedule_dates || []).includes(today) || (a.schedule_days || []).includes(dayOfWeek)
  ) || []

  const otherAssignments = assignments?.filter((a: any) =>
    !(a.schedule_dates || []).includes(today) && !(a.schedule_days || []).includes(dayOfWeek)
  ) || []

  // GPS Handling
  function getLocation() {
    setGpsStatus("loading")
    if (!navigator.geolocation) {
      setGpsStatus("error")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus("success")
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    getLocation()
  }, [])

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (assignment: any) => {
      const payload = {
        assignment_id: assignment.id,
        teacher_id: profile?.id,
        school_id: assignment.school_id,
        teach_date: today,
        check_in_time: new Date().toISOString(),
        check_in_lat: coords?.lat || null,
        check_in_lng: coords?.lng || null,
        status: "draft",
      }
      const res = await fetch("/api/teaching-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เช็คอินไม่สำเร็จ")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-teaching-logs"] })
      toast.success("เช็คอินเข้าสอนสำเร็จเรียบร้อยแล้ว!")
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Check-out mutation
  const checkoutMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await fetch(`/api/teaching-logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_out_time: new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เช็คเอาท์ไม่สำเร็จ")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-teaching-logs"] })
      toast.success("เช็คเอาท์เสร็จสิ้นเรียบร้อยแล้ว!")
    },
    onError: (err: any) => toast.error(err.message),
  })

  function getLogForAssignment(assignmentId: string) {
    return todayLogs?.find((l: any) => l.assignment_id === assignmentId)
  }

  const isLoading = isAssignmentsLoading || isLogsLoading

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-indigo-800/30">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-indigo-200 border border-white/15 text-[11px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
            <Sparkles size={13} className="text-amber-300" /> Teaching & Attendance
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <ClipboardCheck size={44} className="text-indigo-300 shrink-0" /> ตารางสอน & เช็คอิน
          </h1>
          <p className="text-indigo-200 text-base md:text-lg max-w-2xl font-medium leading-relaxed">
            ดูตารางสอน เช็คอินเมื่อเดินทางถึงโรงเรียน และเช็คเอาท์เมื่อการสอนเสร็จสิ้น
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* GPS Location Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            gpsStatus === "success" ? "bg-emerald-50 text-emerald-600" :
            gpsStatus === "error" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400"
          }`}>
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">สถานะพิกัด GPS</div>
            <div className="text-sm font-bold text-slate-700">
              {gpsStatus === "loading" && <span className="text-slate-500">กำลังค้นหาตำแหน่ง GPS...</span>}
              {gpsStatus === "success" && (
                <span className="text-emerald-600">
                  พิกัดพร้อมใช้งาน ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})
                </span>
              )}
              {gpsStatus === "error" && <span className="text-rose-500">ไม่สามารถระบุพิกัดได้ (กรุณาเปิด GPS/Location)</span>}
              {gpsStatus === "idle" && <span className="text-slate-400">รอค้นหาตำแหน่ง GPS...</span>}
            </div>
          </div>
        </div>
        
        {gpsStatus === "error" && (
          <Button variant="outline" size="sm" onClick={getLocation} className="rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50">
            ลองใหม่อีกครั้ง
          </Button>
        )}
      </div>

      {/* Section 1: Today's Teaching & Check-in */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="h-6 w-6 text-blue-600" />
            งานสอนและเช็คอินวันนี้
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold ml-1">
              {dayNamesThai[dayOfWeek] || dayOfWeek} {fmtDate(today)}
            </Badge>
          </h2>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">กำลังโหลดข้อมูลงานสอนวันนี้...</p>
          </div>
        ) : todayAssignments.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">☕</div>
            <h3 className="text-lg font-bold text-slate-800">ไม่มีงานสอนในวันนี้</h3>
            <p className="text-sm text-slate-400 mt-1">คุณสามารถดูตารางสอนในวันอื่นๆ ได้ที่ส่วนด้านล่าง</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {todayAssignments.map((assignment: any) => {
              const log = getLogForAssignment(assignment.id)
              const hasCheckedIn = !!log?.check_in_time
              const hasCheckedOut = !!log?.check_out_time
              const sCount = studentCounts.get(`${assignment.school_id}|${assignment.class_level}|${assignment.academic_year}`) || 0

              return (
                <div 
                  key={assignment.id}
                  className={`bg-white rounded-3xl border-2 p-6 md:p-8 shadow-sm transition-all ${
                    hasCheckedIn && !hasCheckedOut 
                      ? "border-emerald-400 ring-4 ring-emerald-50 shadow-emerald-500/5" 
                      : hasCheckedOut 
                      ? "border-blue-300/80 bg-slate-50/30" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    {/* Left: School & Subject Info */}
                    <div className="space-y-4 flex-1">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          hasCheckedIn && !hasCheckedOut 
                            ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                            : hasCheckedOut 
                            ? "bg-blue-500 text-white shadow-blue-500/20" 
                            : "bg-indigo-50 text-indigo-600"
                        }`}>
                          <School size={28} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black text-slate-900">
                              {assignment.school?.name || "ไม่ระบุโรงเรียน"}
                            </h3>
                            {hasCheckedIn && !hasCheckedOut && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold animate-pulse">
                                กำลังทำการสอน
                              </Badge>
                            )}
                            {hasCheckedOut && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold">
                                สอนเสร็จสิ้นแล้ว
                              </Badge>
                            )}
                          </div>
                          {assignment.school?.district && (
                            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                              <MapPin size={13} className="text-slate-400" />
                              {assignment.school.district} {assignment.school.province ? `, ${assignment.school.province}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Badges / Class details */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                          <BookOpen size={14} className="text-blue-600" />
                          <span>{assignment.subject?.name || "ไม่ระบุวิชา"}</span>
                        </div>
                        {assignment.class_level && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold">
                            <span>ชั้น {assignment.class_level}</span>
                          </div>
                        )}
                        {sCount > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">
                            <Users size={14} className="text-amber-600" />
                            <span>{sCount} คน</span>
                          </div>
                        )}
                        {(assignment.start_time || assignment.end_time) && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold">
                            <Clock size={14} className="text-purple-600" />
                            <span>{assignment.start_time?.slice(0, 5)} - {assignment.end_time?.slice(0, 5)} น.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Check-in / Check-out Action Card */}
                    <div className="flex flex-col gap-3 min-w-[240px] bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">การลงเวลาเข้าสอน</div>
                      
                      {/* Check-in info display */}
                      {hasCheckedIn && (
                        <div className="space-y-1.5 text-xs font-semibold text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">เช็คอิน:</span>
                            <span className="font-bold text-emerald-600">
                              {new Date(log.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </span>
                          </div>
                          {hasCheckedOut && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">เช็คเอาท์:</span>
                              <span className="font-bold text-blue-600">
                                {new Date(log.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!hasCheckedIn ? (
                        <Button 
                          onClick={() => checkinMutation.mutate(assignment)}
                          disabled={checkinMutation.isPending}
                          className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2 border-0"
                        >
                          {checkinMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                          เช็คอินเข้าสอน
                        </Button>
                      ) : !hasCheckedOut ? (
                        <Button 
                          onClick={() => checkoutMutation.mutate(log.id)}
                          disabled={checkoutMutation.isPending}
                          className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 gap-2 border-0"
                        >
                          {checkoutMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                          เช็คเอาท์จบคาบสอน
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-emerald-600">
                          <CheckCircle2 size={18} />
                          <span>บันทึกเวลาครบถ้วนแล้ว</span>
                        </div>
                      )}

                      {/* Quick links to logbook or details */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link href={`/teaching/assignment/${assignment.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-white">
                            ดูรายละเอียด
                          </Button>
                        </Link>
                        {hasCheckedIn && (
                          <Link href={`/teaching/logbook`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                              <BookOpenCheck size={13} className="mr-1" /> สมุดบันทึก
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: Other & Upcoming Teaching Assignments */}
      {otherAssignments.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            ตารางงานสอนอื่นๆ ที่ได้รับมอบหมาย
          </h2>

          <div className="grid gap-4">
            {otherAssignments.map((a: any) => {
              const dates = (a.schedule_dates || []) as string[]
              const upcomingDates = dates.filter((d: string) => d >= today).slice(0, 4)
              const nextDate = upcomingDates[0]
              const sCount = studentCounts.get(`${a.school_id}|${a.class_level}|${a.academic_year}`) || 0

              return (
                <div key={a.id} className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <School size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{a.school?.name || "ไม่ระบุโรงเรียน"}</h3>
                          {a.school?.district && (
                            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <MapPin size={13} /> {a.school.district}{a.school.province && `, ${a.school.province}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <Badge variant="outline" className="text-xs font-bold text-blue-700 bg-blue-50/50 border-blue-200">
                          {a.subject?.name || "ไม่ระบุวิชา"}
                        </Badge>
                        {a.class_level && (
                          <Badge variant="outline" className="text-xs font-bold text-indigo-700 bg-indigo-50/50 border-indigo-200">
                            ชั้น {a.class_level}
                          </Badge>
                        )}
                        {sCount > 0 && (
                          <Badge variant="outline" className="text-xs font-bold text-amber-700 bg-amber-50/50 border-amber-200">
                            {sCount} คน
                          </Badge>
                        )}
                        {(a.start_time || a.end_time) && (
                          <Badge variant="outline" className="text-xs font-bold text-purple-700 bg-purple-50/50 border-purple-200">
                            <Clock size={12} className="mr-1" />
                            {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)} น.
                          </Badge>
                        )}
                      </div>

                      {nextDate && (
                        <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 pt-1">
                          <CalendarDays size={13} />
                          สอนครั้งถัดไป: {fmtDate(nextDate)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Link href={`/teaching/assignment/${a.id}`}>
                        <Button variant="outline" className="h-11 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 gap-1.5 border-slate-200">
                          ดูรายละเอียดงานสอน <ArrowRight size={14} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Global Empty State */}
      {!isLoading && (!assignments || assignments.length === 0) && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-14 text-center shadow-sm">
          <div className="text-5xl mb-4">🎓</div>
          <h3 className="text-xl font-bold text-slate-800">ยังไม่มีงานสอนที่ได้รับมอบหมาย</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            เมื่อผู้ดูแลระบบจัดตารางสอนและมอบหมายงานสอนให้คุณ รายการงานสอนและปุ่มเช็คอินจะปรากฏที่นี่
          </p>
        </div>
      )}
    </div>
  )
}
