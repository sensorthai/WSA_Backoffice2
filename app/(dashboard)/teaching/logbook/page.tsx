"use client"

export const dynamic = 'force-dynamic'
import { Suspense, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@/hooks/useUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpenCheck, Loader2, CalendarDays, School, BookOpen,
  Clock, Send, ChevronLeft, ChevronRight, Users,
  Edit2, Save, FilePlus, UserCheck, Eye, CheckCircle2, ArrowLeft, AlertCircle, RotateCcw, Unlock
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  const [isConfirmStep, setIsConfirmStep] = useState(false)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isRequestingEdit, setIsRequestingEdit] = useState(false)
  const [editRequestReason, setEditRequestReason] = useState("")

  // Calculate week range
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const weekStart = startOfWeek.toISOString().split("T")[0]
  const weekEnd = endOfWeek.toISOString().split("T")[0]
  const formatThaiDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  const fmtDate = (s: string) => {
    if (!s || !s.includes('-')) return s || '-'
    const [y, m, d] = s.split('-')
    return `${d}-${m}-${y}`
  }
  const fmtDateFullThai = (s: string) => {
    if (!s || !s.includes('-')) return s || '-'
    const [y, m, d] = s.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Fetch all logs (only mine)
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ["logbook-logs-all", profile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/teaching-logs?limit=500&teacher_id=${profile?.id}`)
      return res.ok ? res.json() : []
    },
    enabled: !!profile?.id,
  })

  // Filter by week for weekly view (exclude check-in only drafts)
  const weekLogs = (allLogs || []).filter((l: any) => 
    l.teach_date >= weekStart && 
    l.teach_date <= weekEnd &&
    !(l.status === 'draft' && l.topics_covered === null)
  )

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
    queryKey: ["my-assignments-active", profile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/assignments?status=active&teacher_id=${profile?.id}`)
      return res.ok ? res.json() : []
    },
    enabled: !!profile?.id,
  })

  // Filter out assignments that have already finished / all scheduled dates have already been submitted/reviewed or passed
  const availableAssignments = useMemo(() => {
    if (!Array.isArray(assignments)) return []
    const submittedKeySet = new Set(
      (allLogs || [])
        .filter((l: any) => l.status === "submitted" || l.status === "reviewed")
        .map((l: any) => `${l.assignment_id}_${l.teach_date}`)
    )

    return assignments.filter((a: any) => {
      // 1. If end_date is set and already in the past, hide if all scheduled dates are also submitted
      if (a.end_date && a.end_date < todayStr) {
        const sDates: string[] = Array.isArray(a.schedule_dates) ? a.schedule_dates : []
        const hasPendingPast = sDates.some((d: string) => !submittedKeySet.has(`${a.id}_${d}`))
        if (!hasPendingPast) return false
      }

      const scheduleDates: string[] = Array.isArray(a.schedule_dates) ? a.schedule_dates : []
      if (scheduleDates.length > 0) {
        // Keep assignment only if there is at least one date that has NOT been submitted/reviewed yet
        // AND is either today/past (unsubmitted) or upcoming
        const unsubmittedDates = scheduleDates.filter(
          (d: string) => !submittedKeySet.has(`${a.id}_${d}`)
        )
        if (unsubmittedDates.length === 0) {
          return false // All scheduled sessions for this assignment have been taught & submitted
        }
      }

      return true
    })
  }, [assignments, allLogs, todayStr])

  // Form state
  const [formData, setFormData] = useState({
    assignment_id: "", teach_date: "", topics_covered: "", homework_assigned: "",
    student_behavior: "", report_notes: "", teaching_method: "",
  })
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; reason: string }>>({})
  const [reportSchoolId, setReportSchoolId] = useState<string | null>(null)
  const [reportClassLevel, setReportClassLevel] = useState<string>("")
  
  const isReadOnly =
    !!editingLog &&
    (editingLog.status === "submitted" ||
      editingLog.status === "reviewed" ||
      editingLog.status === "edit_requested")

  const selectedAssignment = useMemo(() => {
    if (editingLog) {
      return (assignments || []).find((a: any) => a.id === editingLog.assignment_id) || editingLog.assignment
    }
    return (assignments || []).find((a: any) => a.id === formData.assignment_id)
  }, [assignments, editingLog, formData.assignment_id])

  // Unsubmitted scheduled dates for the selected assignment
  const unsubmittedDatesForSelected = useMemo(() => {
    if (!selectedAssignment || !Array.isArray(selectedAssignment.schedule_dates)) return []
    const submittedSet = new Set(
      (allLogs || [])
        .filter(
          (l: any) =>
            l.assignment_id === selectedAssignment.id &&
            (l.status === "submitted" || l.status === "reviewed") &&
            l.id !== editingLog?.id
        )
        .map((l: any) => l.teach_date)
    )
    return selectedAssignment.schedule_dates.filter((d: string) => !submittedSet.has(d)).sort()
  }, [selectedAssignment, allLogs, editingLog])

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
        school_id: assignment?.school_id || editingLog?.school_id,
        class_level: assignment?.class_level || editingLog?.class_level,
        student_count: classStudents?.length || Object.keys(attendanceMap).length || null,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["logbook-logs-all"] })
      setIsModalOpen(false)
      setIsConfirmStep(false)
      setEditingLog(null)
      toast.success(variables.status === "submitted" ? "ส่งรายงานการสอนเรียบร้อยแล้ว!" : "บันทึกแบบร่างเรียบร้อยแล้ว")
    },
    onError: (err: any) => toast.error(err.message)
  })

  // Request edit / cancel edit request mutation for submitted/reviewed logs
  const requestEditMutation = useMutation({
    mutationFn: async ({
      log,
      newStatus,
      reason,
    }: {
      log: any
      newStatus: "edit_requested" | "submitted"
      reason?: string
    }) => {
      let updatedNotes = log.report_notes || ""
      if (newStatus === "edit_requested" && reason?.trim()) {
        const prefix = updatedNotes ? `${updatedNotes}\n` : ""
        updatedNotes = `${prefix}[ขอแก้ไข: ${reason.trim()}]`
      }
      const res = await fetch(`/api/teaching-logs/${log.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          report_notes: updatedNotes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "ไม่สามารถส่งคำขอแก้ไขได้")
      }
      return res.json()
    },
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["logbook-logs-all"] })
      setIsRequestingEdit(false)
      setEditRequestReason("")
      if (editingLog && editingLog.id === variables.log.id) {
        setEditingLog({ ...editingLog, status: updated.status, report_notes: updated.report_notes })
        setFormData(f => ({ ...f, report_notes: updated.report_notes || "" }))
      }
      if (variables.newStatus === "edit_requested") {
        toast.success("ส่งคำขอแก้ไขรายงานแล้ว รอผู้ดูแลระบบอนุมัติปลดล็อก")
      } else {
        toast.success("ยกเลิกคำขอแก้ไขรายงานแล้ว")
      }
    },
    onError: (err: any) => toast.error(err.message),
  })

  function openNewLog() {
    setEditingLog(null)
    setIsConfirmStep(false)
    setIsRequestingEdit(false)
    setEditRequestReason("")
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

  function openEditLog(log: any, openEditRequestForm = false) {
    setEditingLog(log)
    setIsConfirmStep(false)
    setIsRequestingEdit(openEditRequestForm)
    setEditRequestReason("")
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
    setReportClassLevel(log.class_level || log.assignment?.class_level || "")
    
    // Load existing attendance if any
    const existingAtt = allAttendance?.[log.id] || []
    const map: Record<string, { status: string; reason: string }> = {}
    existingAtt.forEach((a: any) => {
      if (a.student_id) {
        const st = a.status === "leave" ? "personal" : a.status
        map[a.student_id] = { status: st, reason: a.reason || "" }
      }
    })
    setAttendanceMap(map)
    setIsModalOpen(true)
  }

  function handleRequestSubmitConfirm() {
    if (!formData.assignment_id) {
      toast.error("กรุณาเลือกงานมอบหมาย")
      return
    }
    if (!formData.teach_date) {
      toast.error("กรุณาระบุวันที่สอน")
      return
    }
    if (!formData.topics_covered.trim()) {
      toast.error("กรุณากรอกเนื้อหาที่สอนก่อนส่งรายงาน")
      return
    }
    setIsConfirmStep(true)
  }

  async function handleSave(status: "draft" | "submitted") {
    if (!formData.assignment_id) {
      toast.error("กรุณาเลือกงานมอบหมาย")
      return
    }
    if (!formData.teach_date) {
      toast.error("กรุณาระบุวันที่สอน")
      return
    }
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
    pending: { label: "ส่งกลับ/แก้ไขได้", color: "bg-amber-50 text-amber-700 border-amber-200" },
    edit_requested: { label: "รอปลดล็อกแก้ไข", color: "bg-orange-50 text-orange-700 border-orange-300" },
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

  // Attendance summary for confirmation screen
  const attPresentCount = Object.values(attendanceMap).filter(v => v.status === "present").length
  const attAbsentCount = Object.values(attendanceMap).filter(v => v.status === "absent").length
  const attLateCount = Object.values(attendanceMap).filter(v => v.status === "late").length
  const attSickCount = Object.values(attendanceMap).filter(v => v.status === "sick" || v.status === "sick_leave").length
  const attPersonalCount = Object.values(attendanceMap).filter(v => v.status === "personal" || v.status === "personal_leave" || v.status === "leave").length

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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500 font-medium">กรอง:</span>
        {["all", "draft", "pending", "edit_requested", "submitted", "reviewed"].map(s => (
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
              const sick = att.filter((a: any) => a.status === 'sick' || a.status === 'sick_leave').length
              const personal = att.filter((a: any) => a.status === 'personal' || a.status === 'personal_leave' || a.status === 'leave').length
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
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-0.5">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> {log.assignment?.subject?.name || '-'}
                          <Badge variant="outline" className="text-[10px] h-5 bg-indigo-50/50 text-indigo-700 border-indigo-100/80 font-bold">
                            ระดับชั้น: {log.class_level || log.assignment?.class_level || "ไม่ระบุ"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50/50 text-emerald-700 border-emerald-100/80 font-bold">
                            นักเรียน: {log.student_count || att.length || 0} คน
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn(st.color, "shrink-0")}>{st.label}</Badge>
                      {canEdit ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEditLog(log)}>
                          <Edit2 className="h-4 w-4 text-indigo-500" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEditLog(log)}>
                          <Eye className="h-4 w-4 text-slate-500" />
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
                      <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="text-emerald-600 font-bold">✓{present}</span>
                        {absent > 0 && <span className="text-red-600 font-bold">ขาด{absent}</span>}
                        {late > 0 && <span className="text-amber-600 font-bold">สาย{late}</span>}
                        {sick > 0 && <span className="text-purple-600 font-bold">ป่วย{sick}</span>}
                        {personal > 0 && <span className="text-blue-600 font-bold">กิจ{personal}</span>}
                      </div>
                    )}
                    {log.report_notes && (
                      <span className="text-slate-400 truncate max-w-[200px]">💬 {log.report_notes}</span>
                    )}
                  </div>

                  {canEdit ? (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                      {log.status === "pending" && (
                        <div className="w-full sm:w-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                          <Unlock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>ผู้ดูแลปลดล็อกให้แก้ไขรายงานได้แล้ว</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50/50 gap-1.5 h-9"
                        onClick={() => openEditLog(log)}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> แก้ไขและส่งรายงาน
                      </Button>
                    </div>
                  ) : log.status === "edit_requested" ? (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg font-medium">
                        <Clock className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <span>ส่งคำขอแก้ไขแล้ว (รอผู้ดูแลอนุมัติปลดล็อก)</span>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 gap-1.5 h-9"
                          onClick={() => openEditLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5" /> ดูรายละเอียด
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                          disabled={requestEditMutation.isPending}
                          onClick={() =>
                            requestEditMutation.mutate({ log, newStatus: "submitted" })
                          }
                        >
                          ยกเลิกคำขอ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 gap-1.5 h-9"
                        onClick={() => openEditLog(log)}
                      >
                        <Eye className="h-3.5 w-3.5" /> ดูรายละเอียดรายงาน
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 gap-1.5 h-9"
                        onClick={() => openEditLog(log, true)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> ขอแก้ไขรายงาน
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) {
            setEditingLog(null)
            setIsConfirmStep(false)
            setIsRequestingEdit(false)
            setEditRequestReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isConfirmStep ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  ยืนยันข้อมูลก่อนส่งรายงานการสอน
                </>
              ) : isReadOnly ? (
                <><Eye className="h-5 w-5 text-slate-500" /> รายละเอียดบันทึกการสอน</>
              ) : editingLog ? (
                <><Edit2 className="h-5 w-5 text-indigo-500" /> แก้ไขบันทึกการสอน</>
              ) : (
                <><FilePlus className="h-5 w-5 text-indigo-500" /> สร้างบันทึกใหม่</>
              )}
            </DialogTitle>
          </DialogHeader>

          {isConfirmStep ? (
            /* ─────────────── STEP 2: CONFIRMATION VIEW ─────────────── */
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยันส่งรายงาน</strong>
                  <p className="text-amber-800/90 mt-0.5">
                    เมื่อส่งรายงานแล้ว จะไม่สามารถกลับมาแก้ไขข้อมูลเองได้
                  </p>
                </div>
              </div>

              {/* Date & Assignment Summary Card */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    <span>วันที่สอน: {fmtDateFullThai(formData.teach_date)}</span>
                  </div>
                  <Badge className="bg-indigo-600 text-white font-mono text-xs">
                    {fmtDate(formData.teach_date)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm pt-1">
                  <div>
                    <span className="text-xs text-slate-500 block">โรงเรียน</span>
                    <span className="font-bold text-slate-900">
                      {selectedAssignment?.school?.name || editingLog?.school?.name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">รายวิชา</span>
                    <span className="font-bold text-indigo-900">
                      {selectedAssignment?.subject?.name || editingLog?.assignment?.subject?.name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">ระดับชั้นปีที่สอน</span>
                    <Badge variant="outline" className="mt-0.5 bg-white text-purple-700 border-purple-200 font-bold">
                      ชั้น {reportClassLevel || selectedAssignment?.class_level || "ไม่ระบุ"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">เวลาเรียนตามตาราง</span>
                    <span className="font-semibold text-slate-700">
                      {selectedAssignment?.schedule_time_start
                        ? `${selectedAssignment.schedule_time_start.slice(0, 5)} - ${selectedAssignment.schedule_time_end?.slice(0, 5) || ""} น.`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Entered Teaching Content Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">📖 เนื้อหาที่สอน</span>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-800 whitespace-pre-wrap">
                    {formData.topics_covered || "-"}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1">📝 ภาระงาน / การบ้าน</span>
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 whitespace-pre-wrap min-h-[42px]">
                      {formData.homework_assigned || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1">🎯 วิธีการสอน</span>
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 min-h-[42px]">
                      {formData.teaching_method || "-"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1">😊 พฤติกรรมนักเรียน</span>
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800">
                      {formData.student_behavior ? behaviorMap[formData.student_behavior] || formData.student_behavior : "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1">💬 หมายเหตุ</span>
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 whitespace-pre-wrap">
                      {formData.report_notes || "-"}
                    </div>
                  </div>
                </div>

                {/* Attendance Summary */}
                {classStudents && classStudents.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        สรุปการเช็คชื่อนักเรียน (ทั้งหมด {classStudents.length} คน)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">มาเรียน {attPresentCount} คน</Badge>
                      <Badge className="bg-red-50 text-red-700 border-red-200">ขาดเรียน {attAbsentCount} คน</Badge>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">มาสาย {attLateCount} คน</Badge>
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200">ลาป่วย {attSickCount} คน</Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">ลากิจ {attPersonalCount} คน</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm / Back Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1.5 font-semibold"
                  onClick={() => setIsConfirmStep(false)}
                  disabled={saveMutation.isPending || attendanceMutation.isPending}
                >
                  <ArrowLeft className="h-4 w-4" />
                  กลับไปแก้ไขข้อมูล
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md"
                  onClick={() => handleSave("submitted")}
                  disabled={saveMutation.isPending || attendanceMutation.isPending}
                >
                  {saveMutation.isPending || attendanceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  ยืนยันส่งรายงานการสอน
                </Button>
              </div>
            </div>
          ) : (
            /* ─────────────── STEP 1: FORM INPUT VIEW ─────────────── */
            <div className="space-y-4 pt-2">
              {/* Assignment & Teach Date */}
              {!editingLog ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">งานมอบหมาย (วิชา / ชั้นปี / โรงเรียน) *</label>
                      <Select
                        value={formData.assignment_id}
                        onValueChange={v => {
                          const sel = (availableAssignments || []).find((a: any) => a.id === v)
                          // Default teach_date to today or nearest unsubmitted scheduled date
                          let defaultDate = formData.teach_date
                          if (sel && Array.isArray(sel.schedule_dates) && sel.schedule_dates.length > 0) {
                            const submittedSet = new Set(
                              (allLogs || [])
                                .filter((l: any) => l.assignment_id === sel.id && (l.status === "submitted" || l.status === "reviewed"))
                                .map((l: any) => l.teach_date)
                            )
                            const remaining = sel.schedule_dates.filter((d: string) => !submittedSet.has(d)).sort()
                            if (remaining.length > 0 && !remaining.includes(defaultDate)) {
                              defaultDate = remaining.find((d: string) => d <= todayStr) || remaining[0]
                            }
                          }
                          setFormData(f => ({ ...f, assignment_id: v, teach_date: defaultDate }))
                          if (sel) {
                            setReportSchoolId(sel.school_id)
                            setReportClassLevel(sel.class_level || "")
                          }
                        }}
                      >
                        <SelectTrigger className="h-auto min-h-[40px] py-1.5 text-left">
                          <SelectValue placeholder="เลือกรายวิชาและชั้นปีที่สอน..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAssignments.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-slate-400">
                              ไม่มีรายวิชาที่ค้างส่งรายงานการสอน
                            </div>
                          ) : (
                            availableAssignments.map((a: any) => {
                              const classLabel = a.class_level ? `[ชั้น ${a.class_level}]` : "[ไม่ระบุชั้น]"
                              return (
                                <SelectItem key={a.id} value={a.id} className="py-2">
                                  <span className="font-semibold text-indigo-700">{classLabel}</span>{" "}
                                  <span className="font-medium text-slate-900">{a.subject?.name}</span>{" "}
                                  <span className="text-slate-500">— {a.school?.name}</span>
                                </SelectItem>
                              )
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">วันที่สอน *</label>
                      <Input
                        type="date"
                        value={formData.teach_date}
                        onChange={e => setFormData(f => ({ ...f, teach_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Selected Assignment Info Banner (Class Level + Remaining Dates) */}
                  {selectedAssignment && (
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-indigo-600 text-white font-bold">
                          ชั้นปีที่สอน: {selectedAssignment.class_level || "ไม่ระบุ"}
                        </Badge>
                        <span className="font-semibold text-slate-800">
                          {selectedAssignment.subject?.name}
                        </span>
                        <span className="text-slate-500">({selectedAssignment.school?.name})</span>
                      </div>
                      {unsubmittedDatesForSelected.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-slate-500">เลือกวันสอนตามตาราง:</span>
                          {unsubmittedDatesForSelected.slice(0, 5).map((d: string) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setFormData(f => ({ ...f, teach_date: d }))}
                              className={cn(
                                "px-2 py-0.5 rounded font-mono text-[11px] border transition-colors",
                                formData.teach_date === d
                                  ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                  : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              )}
                            >
                              {fmtDate(d)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Info Banner when editing/viewing an existing log */
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-indigo-600 text-white font-bold">
                      ชั้นปีที่สอน: {reportClassLevel || selectedAssignment?.class_level || "ไม่ระบุ"}
                    </Badge>
                    <span className="font-semibold text-slate-800">
                      {editingLog.assignment?.subject?.name || selectedAssignment?.subject?.name || "-"}
                    </span>
                    <span className="text-slate-500">
                      ({editingLog.school?.name || selectedAssignment?.school?.name || "-"})
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white font-mono text-indigo-700 border-indigo-200">
                    วันที่สอน: {fmtDate(formData.teach_date)}
                  </Badge>
                </div>
              )}

              {/* Topics */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">📖 เนื้อหาที่สอน *</label>
                <Textarea rows={3} placeholder="บทที่ 3 การเขียนโปรแกรมเบื้องต้น..." value={formData.topics_covered} disabled={isReadOnly}
                  onChange={e => setFormData(f => ({ ...f, topics_covered: e.target.value }))} />
              </div>

              {/* Homework */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">📝 ภาระงาน / การบ้าน</label>
                <Textarea rows={2} placeholder="แบบฝึกหัดท้ายบท..." value={formData.homework_assigned} disabled={isReadOnly}
                  onChange={e => setFormData(f => ({ ...f, homework_assigned: e.target.value }))} />
              </div>

              {/* Behavior + Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">😊 พฤติกรรมนักเรียน</label>
                  <Select value={formData.student_behavior} disabled={isReadOnly} onValueChange={v => setFormData(f => ({ ...f, student_behavior: v }))}>
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
                  <Input placeholder="บรรยาย, กิจกรรม, Workshop..." value={formData.teaching_method} disabled={isReadOnly}
                    onChange={e => setFormData(f => ({ ...f, teaching_method: e.target.value }))} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">💬 หมายเหตุ</label>
                <Textarea rows={2} placeholder="เรื่องอื่นๆ ที่ต้องการบันทึก..." value={formData.report_notes} disabled={isReadOnly}
                  onChange={e => setFormData(f => ({ ...f, report_notes: e.target.value }))} />
              </div>

              {/* Attendance Section */}
              {classStudents && classStudents.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-500" /> เช็คชื่อนักเรียน ชั้น {reportClassLevel} ({classStudents.length} คน)
                    </h3>
                    {!isReadOnly && <Button type="button" variant="outline" size="sm" onClick={markAllPresent} className="text-xs h-7">✅ มาทุกคน</Button>}
                  </div>
                  <div className="bg-slate-50 rounded-xl border max-h-[200px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-100"><tr>
                        <th className="text-left px-3 py-1.5 w-8">#</th>
                        <th className="text-left px-3 py-1.5">ชื่อ</th>
                        <th className="text-center px-1 py-1.5 w-10">มา</th>
                        <th className="text-center px-1 py-1.5 w-10">ขาด</th>
                        <th className="text-center px-1 py-1.5 w-10">สาย</th>
                        <th className="text-center px-1 py-1.5 w-12">ลาป่วย</th>
                        <th className="text-center px-1 py-1.5 w-12">ลากิจ</th>
                      </tr></thead>
                      <tbody>{classStudents.map((s: any) => {
                        const att = attendanceMap[s.id]
                        return (<tr key={s.id} className="border-t border-slate-100">
                          <td className="px-3 py-1 text-slate-400">{s.student_number}</td>
                          <td className="px-3 py-1">{s.prefix}{s.first_name} {s.last_name}</td>
                          {(["present","absent","late","sick","personal"] as const).map(st => {
                            const isSelected = att?.status === st || (st === "personal" && att?.status === "leave")
                            return (
                              <td key={st} className="text-center px-1 py-1">
                                <button
                                  type="button"
                                  disabled={isReadOnly}
                                  className={cn(
                                    "w-7 h-7 rounded-full text-xs font-bold transition-colors",
                                    isSelected
                                      ? st === "present"
                                        ? "bg-emerald-500 text-white"
                                        : st === "absent"
                                        ? "bg-red-500 text-white"
                                        : st === "late"
                                        ? "bg-amber-500 text-white"
                                        : st === "sick"
                                        ? "bg-purple-500 text-white"
                                        : "bg-blue-500 text-white"
                                      : "bg-slate-200 text-slate-400 hover:bg-slate-300"
                                  )}
                                  onClick={() => setStudentAttendance(s.id, st)}
                                >
                                  {st === "present" ? "✓" : st === "absent" ? "✗" : st === "late" ? "สาย" : st === "sick" ? "ป่วย" : "กิจ"}
                                </button>
                              </td>
                            )
                          })}
                        </tr>)
                      })}</tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">มา {attPresentCount}</Badge>
                    <Badge className="bg-red-50 text-red-700 border-red-200">ขาด {attAbsentCount}</Badge>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">สาย {attLateCount}</Badge>
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200">ลาป่วย {attSickCount}</Badge>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">ลากิจ {attPersonalCount}</Badge>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {isReadOnly ? (
                  <>
                    {editingLog?.status === "edit_requested" ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-orange-800">
                        <div className="flex items-center gap-2 font-medium">
                          <Clock className="h-4 w-4 text-orange-600 shrink-0" />
                          <span>ส่งคำขอแก้ไขรายงานแล้ว รอผู้ดูแลระบบอนุมัติปลดล็อก</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-orange-300 text-orange-800 hover:bg-orange-100"
                          disabled={requestEditMutation.isPending}
                          onClick={() =>
                            requestEditMutation.mutate({
                              log: editingLog,
                              newStatus: "submitted",
                            })
                          }
                        >
                          ยกเลิกคำขอแก้ไข
                        </Button>
                      </div>
                    ) : isRequestingEdit ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <RotateCcw className="h-4 w-4 text-amber-700" />
                            ระบุเหตุผลที่ต้องการขอแก้ไขรายงานการสอน
                          </span>
                        </div>
                        <Textarea
                          rows={2}
                          placeholder="เช่น กรอกเนื้อหาผิดบท, ลืมเช็คชื่อนักเรียน, ต้องการเพิ่มหมายเหตุ..."
                          value={editRequestReason}
                          onChange={e => setEditRequestReason(e.target.value)}
                          className="bg-white text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setIsRequestingEdit(false)
                              setEditRequestReason("")
                            }}
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5"
                            disabled={requestEditMutation.isPending}
                            onClick={() => {
                              if (!editRequestReason.trim()) {
                                toast.error("กรุณาระบุเหตุผลที่ต้องการขอแก้ไข")
                                return
                              }
                              requestEditMutation.mutate({
                                log: editingLog,
                                newStatus: "edit_requested",
                                reason: editRequestReason,
                              })
                            }}
                          >
                            {requestEditMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            ยืนยันส่งคำขอแก้ไข
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      {editingLog?.status !== "edit_requested" && !isRequestingEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 font-bold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 gap-1.5"
                          onClick={() => setIsRequestingEdit(true)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          ขอแก้ไขรายงานนี้
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 font-bold border-slate-200 text-slate-700"
                        onClick={() => setIsModalOpen(false)}
                      >
                        ปิดหน้าต่าง
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => handleSave("draft")} disabled={saveMutation.isPending || attendanceMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      บันทึกแบบร่าง
                    </Button>
                    <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleRequestSubmitConfirm} disabled={saveMutation.isPending || attendanceMutation.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      ส่งรายงาน
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
