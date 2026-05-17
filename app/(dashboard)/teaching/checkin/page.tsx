"use client"

export const dynamic = 'force-dynamic'
import { Suspense, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MapPin, Clock, School, BookOpen, CheckCircle2,
  LogIn, LogOut, Loader2, ClipboardCheck, CalendarDays
} from "lucide-react"

export default function TeachingCheckinPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <TeachingCheckinContent />
    </Suspense>
  )
}

function TeachingCheckinContent() {
  const { profile } = useUser()
  const queryClient = useQueryClient()
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const today = new Date().toISOString().split("T")[0]
  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
  const fmtDate = (s: string) => { const [y, m, d] = s.split('-'); return `${d}-${m}-${y}` }

  // Fetch today's assignments
  const { data: assignments } = useQuery({
    queryKey: ["my-assignments-active"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignments?status=active")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  const todayAssignments = assignments?.filter((a: any) =>
    (a.schedule_dates || []).includes(today) || (a.schedule_days || []).includes(dayOfWeek)
  ) || []

  // Fetch today's logs
  const { data: todayLogs } = useQuery({
    queryKey: ["my-teaching-logs", today],
    queryFn: async () => {
      const res = await fetch(`/api/teaching-logs?date=${today}`)
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // Get GPS
  function getLocation() {
    setGpsStatus("loading")
    if (!navigator.geolocation) { setGpsStatus("error"); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus("success") },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (assignment: any) => {
      const payload = {
        assignment_id: assignment.id, teacher_id: profile?.id, school_id: assignment.school_id,
        teach_date: today, check_in_time: new Date().toISOString(),
        check_in_lat: coords?.lat || null, check_in_lng: coords?.lng || null,
        status: "pending",
      }
      const res = await fetch("/api/teaching-logs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เช็คอินไม่สำเร็จ")
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-teaching-logs"] }),
    onError: (err: any) => alert(err.message),
  })

  // Check-out mutation
  const checkoutMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await fetch(`/api/teaching-logs/${logId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_out_time: new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เช็คเอาท์ไม่สำเร็จ")
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-teaching-logs"] }),
    onError: (err: any) => alert(err.message),
  })

  function getLogForAssignment(assignmentId: string) {
    return todayLogs?.find((l: any) => l.assignment_id === assignmentId)
  }

  useEffect(() => { getLocation() }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-800 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
            Teaching Check-in
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <ClipboardCheck size={48} className="text-emerald-300" /> เช็คอิน
          </h1>
          <p className="text-emerald-200 text-lg">เช็คอินเมื่อถึงโรงเรียน — เช็คเอาท์เมื่อสอนเสร็จ</p>
          <p className="text-emerald-300/70 text-sm">💡 ส่งรายงานการสอนได้ที่เมนู "สมุดบันทึก"</p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-emerald-600/30 rounded-full blur-[100px]" />
      </div>

      {/* GPS Status */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border">
        <MapPin className={`h-5 w-5 ${gpsStatus === "success" ? "text-emerald-500" : gpsStatus === "error" ? "text-red-500" : "text-slate-400"}`} />
        {gpsStatus === "loading" && <span className="text-sm text-slate-500">กำลังหาตำแหน่ง GPS...</span>}
        {gpsStatus === "success" && <span className="text-sm text-emerald-600 font-medium">ตำแหน่ง GPS พร้อม ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})</span>}
        {gpsStatus === "error" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-500">ไม่สามารถหาตำแหน่งได้</span>
            <Button variant="ghost" size="sm" onClick={getLocation} className="text-xs">ลองอีกครั้ง</Button>
          </div>
        )}
        {gpsStatus === "idle" && <span className="text-sm text-slate-400">รอตำแหน่ง GPS...</span>}
      </div>

      {/* Today's Teaching Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          งานสอนวันนี้ — {fmtDate(today)}
        </h2>

        {todayAssignments.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">😌</div>
            <p className="text-slate-500 font-medium">ไม่มีงานสอนวันนี้</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {todayAssignments.map((assignment: any) => {
              const log = getLogForAssignment(assignment.id)
              const hasCheckedIn = !!log?.check_in_time
              const hasCheckedOut = !!log?.check_out_time

              return (
                <div key={assignment.id}
                  className={`bg-white rounded-2xl border-2 p-6 shadow-sm transition-all ${
                    hasCheckedIn && !hasCheckedOut ? "border-emerald-300 ring-2 ring-emerald-100" :
                    hasCheckedOut ? "border-blue-200" : "border-slate-200"
                  }`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        hasCheckedIn ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        <School className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{assignment.school?.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <BookOpen className="h-3.5 w-3.5" />
                          {assignment.subject?.name}
                          {assignment.schedule_time_start && (
                            <span className="text-slate-400">| {assignment.schedule_time_start} - {assignment.schedule_time_end || '?'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Check-in Button */}
                    {!hasCheckedIn && (
                      <Button onClick={() => checkinMutation.mutate(assignment)} disabled={checkinMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200">
                        {checkinMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                        เช็คอิน
                      </Button>
                    )}

                    {/* Check-in Time Display */}
                    {hasCheckedIn && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        เช็คอินแล้ว {new Date(log.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Check-out Button */}
                    {hasCheckedIn && !hasCheckedOut && (
                      <Button variant="outline" onClick={() => checkoutMutation.mutate(log.id)} disabled={checkoutMutation.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50">
                        {checkoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                        เช็คเอาท์
                      </Button>
                    )}

                    {/* Check-out Time Display */}
                    {hasCheckedOut && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <LogOut className="h-4 w-4" />
                        เช็คเอาท์ {new Date(log.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
