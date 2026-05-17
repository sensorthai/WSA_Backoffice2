"use client"

export const dynamic = 'force-dynamic'
import { Suspense, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@/hooks/useUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpenCheck, Loader2, CalendarDays, School, BookOpen,
  CheckCircle2, Clock, Send, ChevronLeft, ChevronRight, Users,
  Edit2, Save, FileEdit, Eye, FilePlus, UserCheck
} from "lucide-react"

export default function LogbookPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <LogbookContent />
    </Suspense>
  )
}

function LogbookContent() {
  const { profile } = useUser()
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Calculate week range
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const weekStart = startOfWeek.toISOString().split("T")[0]
  const weekEnd = endOfWeek.toISOString().split("T")[0]
  const formatThaiDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  const fmtDate = (s: string) => { const [y, m, d] = s.split('-'); return `${d}-${m}-${y}` }

  // Fetch all logs (no limit for full history)
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ["logbook-logs-all"],
    queryFn: async () => {
      const res = await fetch(`/api/teaching-logs?limit=500`)
      return res.ok ? res.json() : []
    },
  })

  // Filter by week for weekly view
  const weekLogs = (allLogs || []).filter((l: any) => l.teach_date >= weekStart && l.teach_date <= weekEnd)

  // Apply status filter
  const filteredLogs = statusFilter === "all" ? weekLogs : weekLogs.filter((l: any) => l.status === statusFilter)

  // Fetch attendance for displayed logs
  const logIds = filteredLogs.map((l: any) => l.id)
  const { data: allAttendance } = useQuery({
    queryKey: ["logbook-attendance", logIds.join(",")],
    queryFn: async () => {
      if (logIds.length === 0) return {}
      const results: Record<string, any[]> = {}
      for (const logId of logIds) {
        const res = await fetch(`/api/attendance?teaching_log_id=${logId}`)
        const data = await res.json()
        results[logId] = Array.isArray(data) ? data : []
      }
      return results
    },
    enabled: logIds.length > 0,
  })

  // Fetch assignments for creating new logs
  const { data: assignments } = useQuery({
    queryKey: ["my-assignments-active"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignments?status=active")
      return res.ok ? res.json() : []
    }
  })

  // Form state
  const [formData, setFormData] = useState({
    assignment_id: "", teach_date: "", topics_covered: "", homework_assigned: "",
    student_behavior: "", report_notes: "", teaching_method: "",
  })
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; reason: string }>>({})
  const [reportSchoolId, setReportSchoolId] = useState<string | null>(null)
  const [reportClassLevel, setReportClassLevel] = useState<string>("")

  // Fetch students for attendance
  const { data: classStudents } = useQuery({
    queryKey: ["students-for-attendance", reportSchoolId, reportClassLevel],
    queryFn: async () => {
      if (!reportSchoolId) return []
      let url = `/api/admin/students?school_id=${reportSchoolId}`
      if (reportClassLevel) url += `&class_level=${reportClassLevel}`
      const res = await fetch(url)
      return res.ok ? res.json() : []
    },
    enabled: !!reportSchoolId && isModalOpen,
  })

  // Attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({ logId, records }: { logId: string; records: any[] }) => {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teaching_log_id: logId, records }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "บันทึกเช็คชื่อไม่สำเร็จ") }
    },
  })

  function setStudentAttendance(studentId: string, status: string) {
    setAttendanceMap(prev => ({ ...prev, [studentId]: { status, reason: prev[studentId]?.reason || "" } }))
  }
  function markAllPresent() {
    const map: Record<string, { status: string; reason: string }> = {}
    ;(classStudents || []).forEach((s: any) => { map[s.id] = { status: "present", reason: "" } })
    setAttendanceMap(map)
  }

  // Save/Update mutation
  const saveMutation = useMutation({
    mutationFn: async ({ data, status, logId }: { data: any, status: string, logId?: string }) => {
      const assignment = (assignments || []).find((a: any) => a.id === data.assignment_id)
      const payload = {
        ...data,
        teacher_id: profile?.id,
        school_id: assignment?.school_id,
        class_level: assignment?.class_level,
        student_behavior: data.student_behavior || null,
        teaching_method: data.teaching_method || null,
        homework_assigned: data.homework_assigned || null,
        report_notes: data.report_notes || null,
        status,
      }

      if (logId) {
        // Update existing
        const res = await fetch(`/api/teaching-logs/${logId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error") }
        return res.json()
      } else {
        // Create new
        const res = await fetch("/api/teaching-logs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error") }
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logbook-logs-all"] })
      setIsModalOpen(false)
      setEditingLog(null)
    },
    onError: (err: any) => alert(err.message)
  })

  function openNewLog() {
    setEditingLog(null)
    setFormData({
      assignment_id: "", teach_date: new Date().toISOString().split("T")[0],
      topics_covered: "", homework_assigned: "", student_behavior: "",
      report_notes: "", teaching_method: "",
    })
    setAttendanceMap({})
    setReportSchoolId(null)
    setReportClassLevel("")
    setIsModalOpen(true)
  }

  function openEditLog(log: any) {
    setEditingLog(log)
    setFormData({
      assignment_id: log.assignment_id || "",
      teach_date: log.teach_date || "",
      topics_covered: log.topics_covered || "",
      homework_assigned: log.homework_assigned || "",
      student_behavior: log.student_behavior || "",
      report_notes: log.report_notes || "",
      teaching_method: log.teaching_method || "",
    })
    setReportSchoolId(log.school_id || null)
    setReportClassLevel(log.class_level || "")
    setAttendanceMap({})
    setIsModalOpen(true)
  }

  async function handleSave(status: "draft" | "submitted") {
    // Save the log first
    const result = await saveMutation.mutateAsync({ data: formData, status, logId: editingLog?.id })
    // Save attendance if any
    const attRecords = Object.entries(attendanceMap).map(([student_id, v]) => ({
      student_id, status: v.status, reason: v.reason || null,
    }))
    if (attRecords.length > 0) {
      const logId = editingLog?.id || result?.id
      if (logId) await attendanceMutation.mutateAsync({ logId, records: attRecords })
    }
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "แบบร่าง", color: "bg-slate-100 text-slate-600 border-slate-200" },
    pending: { label: "รอส่ง", color: "bg-amber-50 text-amber-700 border-amber-200" },
    submitted: { label: "ส่งแล้ว", color: "bg-blue-50 text-blue-700 border-blue-200" },
    reviewed: { label: "ตรวจแล้ว", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }

  const behaviorMap: Record<string, string> = {
    excellent: "ดีมาก", good: "ดี", fair: "พอใช้", needs_improvement: "ต้องปรับปรุง"
  }

  const sortedLogs = [...filteredLogs].sort((a: any, b: any) => a.teach_date.localeCompare(b.teach_date))

  // Stats
  const totalLogs = weekLogs.length
  const drafts = weekLogs.filter((l: any) => l.status === 'draft').length
  const submitted = weekLogs.filter((l: any) => l.status === 'submitted' || l.status === 'reviewed').length
  const reviewed = weekLogs.filter((l: any) => l.status === 'reviewed').length

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-indigo-900 to-violet-800 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-violet-200 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
            Digital Logbook
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <BookOpenCheck size={48} className="text-violet-300" /> สมุดบันทึกการสอน
          </h1>
          <p className="text-violet-200 text-lg">บันทึกเนื้อหา ภาระงาน การเข้าเรียน และพฤติกรรมนักเรียน</p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border p-4 shadow-sm">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">สัปดาห์: {formatThaiDate(startOfWeek)} — {formatThaiDate(endOfWeek)}</p>
          <p className="text-sm text-slate-400">{weekOffset === 0 ? "สัปดาห์นี้" : weekOffset === -1 ? "สัปดาห์ที่แล้ว" : `${Math.abs(weekOffset)} สัปดาห์${weekOffset < 0 ? "ก่อน" : "หลัง"}`}</p>
        </div>
        <div className="flex items-center gap-2">
          {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">วันนี้</Button>}
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Stats + Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-slate-800">{totalLogs}</p>
          <p className="text-sm text-slate-500 mt-1">คาบสอน</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-slate-500">{drafts}</p>
          <p className="text-sm text-slate-500 mt-1">แบบร่าง</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-blue-600">{submitted}</p>
          <p className="text-sm text-slate-500 mt-1">ส่งแล้ว</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-emerald-600">{reviewed}</p>
          <p className="text-sm text-slate-500 mt-1">ตรวจแล้ว</p>
        </div>
        <Button onClick={openNewLog} className="rounded-2xl h-auto py-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex flex-col items-center gap-1">
          <FilePlus className="h-6 w-6" />
          <span className="text-sm font-bold">สร้างบันทึกใหม่</span>
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 font-medium">กรอง:</span>
        {["all", "draft", "submitted", "reviewed"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="text-xs rounded-full"
            onClick={() => setStatusFilter(s)}>
            {s === "all" ? "ทั้งหมด" : statusMap[s]?.label || s}
          </Button>
        ))}
      </div>

      {/* Log Entries */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-500" /> รายการบันทึก
        </h2>

        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : sortedLogs.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📓</div>
            <p className="text-slate-500 font-medium">ไม่มีบันทึกการสอนในสัปดาห์นี้</p>
            <Button onClick={openNewLog} variant="outline" className="mt-4">
              <FilePlus className="h-4 w-4 mr-2" /> สร้างบันทึกใหม่
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLogs.map((log: any, idx: number) => {
              const att = allAttendance?.[log.id] || []
              const present = att.filter((a: any) => a.status === 'present').length
              const absent = att.filter((a: any) => a.status === 'absent').length
              const late = att.filter((a: any) => a.status === 'late').length
              const leave = att.filter((a: any) => a.status === 'leave').length
              const st = statusMap[log.status] || statusMap.pending
              const canEdit = log.status === 'draft' || log.status === 'pending'

              return (
                <div key={log.id} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{fmtDate(log.teach_date)}</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-sm flex items-center gap-1 text-slate-600">
                            <School className="h-3.5 w-3.5 text-blue-500" /> {log.school?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <BookOpen className="h-3.5 w-3.5" /> {log.assignment?.subject?.name || '-'}
                          {log.class_level && <Badge variant="outline" className="text-[10px] h-5">{log.class_level}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={st.color}>{st.label}</Badge>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLog(log)}>
                          <Edit2 className="h-4 w-4 text-indigo-500" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {log.topics_covered && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-1">
                      <p className="text-sm font-medium text-slate-700">📖 เนื้อหาที่สอน: {log.topics_covered}</p>
                      {log.homework_assigned && (
                        <p className="text-sm text-slate-500">📝 ภาระงาน/การบ้าน: {log.homework_assigned}</p>
                      )}
                      {log.teaching_method && (
                        <p className="text-sm text-slate-500">🎯 วิธีการสอน: {log.teaching_method}</p>
                      )}
                    </div>
                  )}

                  {/* Footer: Times + Attendance + Behavior */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {log.check_in_time && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Clock className="h-3 w-3" /> เข้า {new Date(log.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {log.check_out_time && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Clock className="h-3 w-3" /> ออก {new Date(log.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {log.student_behavior && (
                      <Badge variant="outline" className="text-[10px]">พฤติกรรม: {behaviorMap[log.student_behavior] || log.student_behavior}</Badge>
                    )}
                    {att.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="text-emerald-600 font-bold">✓{present}</span>
                        {absent > 0 && <span className="text-red-600 font-bold">ขาด{absent}</span>}
                        {late > 0 && <span className="text-amber-600 font-bold">สาย{late}</span>}
                        {leave > 0 && <span className="text-blue-600 font-bold">ลา{leave}</span>}
                      </div>
                    )}
                    {log.report_notes && (
                      <span className="text-slate-400 truncate max-w-[200px]">💬 {log.report_notes}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingLog(null) }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingLog ? <><Edit2 className="h-5 w-5 text-indigo-500" /> แก้ไขบันทึกการสอน</> : <><FilePlus className="h-5 w-5 text-indigo-500" /> สร้างบันทึกใหม่</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Assignment */}
            {!editingLog && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">งานมอบหมาย *</label>
                  <Select value={formData.assignment_id} onValueChange={v => {
                    setFormData(f => ({ ...f, assignment_id: v }))
                    const sel = (assignments || []).find((a: any) => a.id === v)
                    if (sel) { setReportSchoolId(sel.school_id); setReportClassLevel(sel.class_level || "") }
                  }}>
                    <SelectTrigger><SelectValue placeholder="เลือกงาน..." /></SelectTrigger>
                    <SelectContent>
                      {(assignments || []).map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.subject?.name} — {a.school?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">วันที่สอน *</label>
                  <Input type="date" value={formData.teach_date} onChange={e => setFormData(f => ({ ...f, teach_date: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Topics */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">📖 เนื้อหาที่สอน</label>
              <Textarea rows={3} placeholder="บทที่ 3 การเขียนโปรแกรมเบื้องต้น..." value={formData.topics_covered}
                onChange={e => setFormData(f => ({ ...f, topics_covered: e.target.value }))} />
            </div>

            {/* Homework */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">📝 ภาระงาน / การบ้าน</label>
              <Textarea rows={2} placeholder="แบบฝึกหัดท้ายบท..." value={formData.homework_assigned}
                onChange={e => setFormData(f => ({ ...f, homework_assigned: e.target.value }))} />
            </div>

            {/* Behavior + Method */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">😊 พฤติกรรมนักเรียน</label>
                <Select value={formData.student_behavior} onValueChange={v => setFormData(f => ({ ...f, student_behavior: v }))}>
                  <SelectTrigger><SelectValue placeholder="เลือก..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">ดีมาก</SelectItem>
                    <SelectItem value="good">ดี</SelectItem>
                    <SelectItem value="fair">พอใช้</SelectItem>
                    <SelectItem value="needs_improvement">ต้องปรับปรุง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">🎯 วิธีการสอน</label>
                <Input placeholder="บรรยาย, กิจกรรม, Workshop..." value={formData.teaching_method}
                  onChange={e => setFormData(f => ({ ...f, teaching_method: e.target.value }))} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">💬 หมายเหตุ</label>
              <Textarea rows={2} placeholder="เรื่องอื่นๆ ที่ต้องการบันทึก..." value={formData.report_notes}
                onChange={e => setFormData(f => ({ ...f, report_notes: e.target.value }))} />
            </div>

            {/* Attendance Section */}
            {classStudents && classStudents.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-500" /> เช็คชื่อนักเรียน ({classStudents.length} คน)
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={markAllPresent} className="text-xs h-7">✅ มาทุกคน</Button>
                </div>
                <div className="bg-slate-50 rounded-xl border max-h-[200px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100"><tr>
                      <th className="text-left px-3 py-1.5 w-8">#</th>
                      <th className="text-left px-3 py-1.5">ชื่อ</th>
                      <th className="text-center px-1 py-1.5 w-10">มา</th>
                      <th className="text-center px-1 py-1.5 w-10">ขาด</th>
                      <th className="text-center px-1 py-1.5 w-10">สาย</th>
                      <th className="text-center px-1 py-1.5 w-10">ลา</th>
                    </tr></thead>
                    <tbody>{classStudents.map((s: any) => {
                      const att = attendanceMap[s.id]
                      return (<tr key={s.id} className="border-t border-slate-100">
                        <td className="px-3 py-1 text-slate-400">{s.student_number}</td>
                        <td className="px-3 py-1">{s.prefix}{s.first_name} {s.last_name}</td>
                        {(["present","absent","late","leave"] as const).map(st => (
                          <td key={st} className="text-center px-1 py-1">
                            <button type="button" className={`w-7 h-7 rounded-full text-xs font-bold ${att?.status===st ? st==="present"?"bg-emerald-500 text-white":st==="absent"?"bg-red-500 text-white":st==="late"?"bg-amber-500 text-white":"bg-blue-500 text-white" : "bg-slate-200 text-slate-400 hover:bg-slate-300"}`}
                              onClick={() => setStudentAttendance(s.id, st)}>{st==="present"?"✓":st==="absent"?"✗":st==="late"?"L":"ลา"}</button>
                          </td>
                        ))}
                      </tr>)
                    })}</tbody>
                  </table>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">มา {Object.values(attendanceMap).filter(v=>v.status==="present").length}</Badge>
                  <Badge className="bg-red-50 text-red-700 border-red-200">ขาด {Object.values(attendanceMap).filter(v=>v.status==="absent").length}</Badge>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200">สาย {Object.values(attendanceMap).filter(v=>v.status==="late").length}</Badge>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">ลา {Object.values(attendanceMap).filter(v=>v.status==="leave").length}</Badge>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleSave("draft")} disabled={saveMutation.isPending || attendanceMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                บันทึกแบบร่าง
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleSave("submitted")} disabled={saveMutation.isPending || attendanceMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                ส่งรายงาน
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
