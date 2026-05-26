"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  CheckCircle2, Eye, FileText, Loader2,
  MapPin, School, BookOpen, ExternalLink, Users, Trash2, Pencil, X, Save
} from "lucide-react"
import { useUser } from "@/hooks/useUser"

export function TeachingLogsReview() {
  const { profile } = useUser()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("submitted")
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [dateFilter, setDateFilter] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [editAttendance, setEditAttendance] = useState<Record<string, string>>({})
  const [classLevelChanged, setClassLevelChanged] = useState(false)

  const { data: logs, isLoading } = useQuery({
    queryKey: ["teaching-logs-review", statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (dateFilter) params.set('date', dateFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/teaching-logs?${params.toString()}`)
      return res.ok ? res.json() : []
    }
  })

  // Fetch attendance for selected log
  const { data: logAttendance } = useQuery({
    queryKey: ["log-attendance-detail", selectedLog?.id],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?teaching_log_id=${selectedLog.id}`)
      return res.ok ? res.json() : []
    },
    enabled: !!selectedLog?.id,
  })

  const reviewMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await fetch(`/api/teaching-logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "reviewed",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching-logs-review"] })
      setSelectedLog(null)
    },
    onError: (err: any) => alert(err.message)
  })

  const editMutation = useMutation({
    mutationFn: async ({ logId, updates }: { logId: string; updates: any }) => {
      const res = await fetch(`/api/teaching-logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teaching-logs-review"] })
      setSelectedLog({ ...selectedLog, ...data })
      setIsEditing(false)
      alert("บันทึกการแก้ไขเรียบร้อยแล้ว")
    },
    onError: (err: any) => alert(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await fetch(`/api/teaching-logs/${logId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching-logs-review"] })
      setSelectedLog(null)
      alert("ลบรายงานการสอนเรียบร้อยแล้ว")
    },
    onError: (err: any) => alert(err.message)
  })

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    submitted: "bg-blue-50 text-blue-700 border-blue-200",
    reviewed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }
  const statusLabels: Record<string, string> = {
    draft: "แบบร่าง",
    pending: "รอส่งรายงาน",
    submitted: "รอตรวจ",
    reviewed: "ตรวจแล้ว",
  }
  const behaviorMap: Record<string, string> = {
    excellent: "ดีมาก", good: "ดี", fair: "พอใช้", needs_improvement: "ต้องปรับปรุง"
  }
  const fmtDate = (s: string) => { const [y, m, d] = s.split('-'); return `${d}-${m}-${y}` }

  // Fetch students for a given school + class_level
  const fetchStudentsForClass = useCallback(async (schoolId: string, classLevel: string) => {
    if (!schoolId || !classLevel) { setClassStudents([]); return }
    setLoadingStudents(true)
    try {
      const res = await fetch(`/api/admin/students?school_id=${schoolId}&class_level=${encodeURIComponent(classLevel)}`)
      const data = res.ok ? await res.json() : []
      setClassStudents(data)
      // Initialize attendance: all present by default
      const att: Record<string, string> = {}
      data.forEach((s: any) => { att[s.id] = 'present' })
      setEditAttendance(att)
    } catch { setClassStudents([]) }
    setLoadingStudents(false)
  }, [])

  const startEditing = () => {
    setEditForm({
      topics_covered: selectedLog.topics_covered || "",
      homework_assigned: selectedLog.homework_assigned || "",
      teaching_method: selectedLog.teaching_method || "",
      student_count: selectedLog.student_count || "",
      class_level: selectedLog.class_level || "",
      student_behavior: selectedLog.student_behavior || "",
      report_notes: selectedLog.report_notes || "",
    })
    setClassStudents([])
    setEditAttendance({})
    setClassLevelChanged(false)
    setIsEditing(true)
  }

  const handleClassLevelChange = (newValue: string) => {
    setEditForm((prev: any) => ({ ...prev, class_level: newValue }))
    setClassLevelChanged(true)
    if (selectedLog?.school?.id && newValue.trim()) {
      fetchStudentsForClass(selectedLog.school.id, newValue.trim())
    } else {
      setClassStudents([])
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({})
    setClassStudents([])
    setEditAttendance({})
    setClassLevelChanged(false)
  }

  const saveEdits = async () => {
    const updates: any = {}
    if (editForm.topics_covered !== (selectedLog.topics_covered || "")) updates.topics_covered = editForm.topics_covered || null
    if (editForm.homework_assigned !== (selectedLog.homework_assigned || "")) updates.homework_assigned = editForm.homework_assigned || null
    if (editForm.teaching_method !== (selectedLog.teaching_method || "")) updates.teaching_method = editForm.teaching_method || null
    if (String(editForm.student_count) !== String(selectedLog.student_count || "")) updates.student_count = editForm.student_count ? Number(editForm.student_count) : null
    if (editForm.class_level !== (selectedLog.class_level || "")) updates.class_level = editForm.class_level || null
    if (editForm.student_behavior !== (selectedLog.student_behavior || "")) updates.student_behavior = editForm.student_behavior || null
    if (editForm.report_notes !== (selectedLog.report_notes || "")) updates.report_notes = editForm.report_notes || null

    // If class_level changed and we have students, also update attendance
    if (classLevelChanged && classStudents.length > 0 && Object.keys(editAttendance).length > 0) {
      // Update student count to match
      updates.student_count = classStudents.length
    }

    if (Object.keys(updates).length === 0 && !classLevelChanged) {
      setIsEditing(false)
      return
    }

    editMutation.mutate({ logId: selectedLog.id, updates })

    // Save attendance if class changed
    if (classLevelChanged && classStudents.length > 0) {
      try {
        const records = Object.entries(editAttendance).map(([student_id, status]) => ({
          student_id,
          status
        }))
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teaching_log_id: selectedLog.id, records })
        })
        queryClient.invalidateQueries({ queryKey: ['log-attendance-detail', selectedLog.id] })
      } catch (err) {
        console.error('Failed to update attendance:', err)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-slate-800">ตรวจรายงานการสอน</h2>
          <div className="flex gap-1 ml-4">
            {["submitted", "reviewed", "pending", "draft", ""].map(s => (
              <Button key={s || "all"} variant={statusFilter === s ? "default" : "outline"}
                size="sm" className="text-xs h-7" onClick={() => setStatusFilter(s)}>
                {s ? statusLabels[s] : "ทั้งหมด"}
              </Button>
            ))}
          </div>
        </div>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="w-[200px]" placeholder="กรองตามวันที่" />
      </div>

      <div className="border rounded-xl bg-white overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>วันที่</TableHead>
              <TableHead>ครู</TableHead>
              <TableHead>โรงเรียน</TableHead>
              <TableHead>วิชา / ระดับชั้น</TableHead>
              <TableHead>เนื้อหาที่สอน</TableHead>
              <TableHead>เช็คอิน / เอาท์</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-[80px] text-right">ดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">กำลังโหลด...</TableCell></TableRow>
            ) : logs?.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">ไม่มีรายงาน</TableCell></TableRow>
            ) : logs?.map((log: any) => (
              <TableRow key={log.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-sm">{fmtDate(log.teach_date)}</TableCell>
                <TableCell>
                  <span className="font-medium text-sm">{log.teacher?.full_name || '-'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-sm">{log.school?.name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-sm">
                      <BookOpen className="h-3 w-3 text-amber-500" />
                      <span>{log.assignment?.subject?.name || '-'}</span>
                    </div>
                    {log.class_level && <Badge variant="outline" className="text-[10px]">{log.class_level}</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-slate-600 truncate max-w-[200px]">{log.topics_covered || '-'}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs text-slate-500">
                    {log.check_in_time && (
                      <span className="text-emerald-600">เข้า {new Date(log.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {log.check_out_time && (
                      <span className="text-blue-600">ออก {new Date(log.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${statusColors[log.status] || statusColors.pending}`}>
                    {statusLabels[log.status] || log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLog(log); setIsEditing(false) }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail / Review / Edit Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) { setSelectedLog(null); setIsEditing(false) } }}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                {isEditing ? "แก้ไขรายงานการสอน" : "รายงานการสอน"}
              </span>
              {!isEditing && selectedLog && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={startEditing}>
                  <Pencil className="h-3.5 w-3.5" /> แก้ไข
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 pt-2">
              {/* Summary Info — always read-only */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ครูผู้สอน</span>
                  <span className="font-medium">{selectedLog.teacher?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">โรงเรียน</span>
                  <span className="font-medium">{selectedLog.school?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">วิชา</span>
                  <span className="font-medium">{selectedLog.assignment?.subject?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">วันที่</span>
                  <span className="font-mono">{fmtDate(selectedLog.teach_date)}</span>
                </div>
                {selectedLog.check_in_time && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">เช็คอิน</span>
                    <span className="text-emerald-600">{new Date(selectedLog.check_in_time).toLocaleTimeString('th-TH')}</span>
                  </div>
                )}
                {selectedLog.check_out_time && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">เช็คเอาท์</span>
                    <span className="text-blue-600">{new Date(selectedLog.check_out_time).toLocaleTimeString('th-TH')}</span>
                  </div>
                )}
                {selectedLog.check_in_lat && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> GPS</span>
                    <a href={`https://www.google.com/maps?q=${selectedLog.check_in_lat},${selectedLog.check_in_lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 text-sm flex items-center gap-1 hover:underline">
                      ดูบน Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* === EDIT MODE === */}
              {isEditing ? (
                <div className="space-y-4 border-2 border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-bold">
                    <Pencil className="h-4 w-4" /> กำลังแก้ไขรายงาน
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">📖 เนื้อหาที่สอน</Label>
                    <Textarea
                      value={editForm.topics_covered}
                      onChange={e => setEditForm({ ...editForm, topics_covered: e.target.value })}
                      className="min-h-[80px] bg-white text-sm"
                      placeholder="ระบุเนื้อหาที่สอน..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">📝 ภาระงาน / การบ้าน</Label>
                    <Textarea
                      value={editForm.homework_assigned}
                      onChange={e => setEditForm({ ...editForm, homework_assigned: e.target.value })}
                      className="min-h-[60px] bg-white text-sm"
                      placeholder="ภาระงาน / การบ้าน..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">🎯 วิธีการสอน</Label>
                    <Textarea
                      value={editForm.teaching_method}
                      onChange={e => setEditForm({ ...editForm, teaching_method: e.target.value })}
                      className="min-h-[60px] bg-white text-sm"
                      placeholder="วิธีการสอน..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">จำนวน น.ร.</Label>
                      <Input
                        type="number"
                        value={editForm.student_count}
                        onChange={e => setEditForm({ ...editForm, student_count: e.target.value })}
                        className="bg-white text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">ระดับชั้น / ห้องเรียน</Label>
                      <Input
                        value={editForm.class_level}
                        onChange={e => handleClassLevelChange(e.target.value)}
                        className="bg-white text-sm"
                        placeholder="ป.1/1, ม.3/2..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">พฤติกรรม</Label>
                      <Select value={editForm.student_behavior} onValueChange={v => setEditForm({ ...editForm, student_behavior: v })}>
                        <SelectTrigger className="bg-white text-sm h-9"><SelectValue placeholder="เลือก" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">ดีมาก</SelectItem>
                          <SelectItem value="good">ดี</SelectItem>
                          <SelectItem value="fair">พอใช้</SelectItem>
                          <SelectItem value="needs_improvement">ต้องปรับปรุง</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">💬 หมายเหตุ</Label>
                    <Textarea
                      value={editForm.report_notes}
                      onChange={e => setEditForm({ ...editForm, report_notes: e.target.value })}
                      className="min-h-[60px] bg-white text-sm"
                      placeholder="หมายเหตุเพิ่มเติม..."
                    />
                  </div>

                  {/* Students for new class_level */}
                  {classLevelChanged && (
                    <div className="space-y-2 border-t pt-3">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        รายชื่อนักเรียน {editForm.class_level && `(${editForm.class_level})`}
                        {classStudents.length > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{classStudents.length} คน</Badge>}
                      </h4>
                      {loadingStudents ? (
                        <div className="flex items-center justify-center py-4 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> กำลังโหลดรายชื่อ...
                        </div>
                      ) : classStudents.length === 0 ? (
                        <div className="text-center py-3 text-sm text-slate-400 bg-slate-50 rounded-lg">
                          ไม่พบนักเรียนในห้อง {editForm.class_level} ของโรงเรียนนี้
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg border max-h-[250px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-slate-100 z-10">
                              <tr>
                                <th className="text-left px-2 py-1.5 font-bold">#</th>
                                <th className="text-left px-2 py-1.5 font-bold">ชื่อ-สกุล</th>
                                <th className="text-center px-2 py-1.5 font-bold w-[140px]">สถานะ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classStudents.map((student: any) => (
                                <tr key={student.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                  <td className="px-2 py-1.5 text-slate-400 font-mono">{student.student_number}</td>
                                  <td className="px-2 py-1.5">{student.prefix}{student.first_name} {student.last_name}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <select
                                      value={editAttendance[student.id] || 'present'}
                                      onChange={e => setEditAttendance(prev => ({ ...prev, [student.id]: e.target.value }))}
                                      className="text-xs border rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-300"
                                    >
                                      <option value="present">✅ มา</option>
                                      <option value="absent">❌ ขาด</option>
                                      <option value="late">⏰ สาย</option>
                                      <option value="leave">📋 ลา</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex gap-2 text-xs">
                        <Button variant="outline" size="sm" className="h-6 text-[10px] text-emerald-600"
                          onClick={() => { const att: Record<string, string> = {}; classStudents.forEach((s: any) => { att[s.id] = 'present' }); setEditAttendance(att) }}>
                          ✅ มาทุกคน
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] text-red-600"
                          onClick={() => { const att: Record<string, string> = {}; classStudents.forEach((s: any) => { att[s.id] = 'absent' }); setEditAttendance(att) }}>
                          ❌ ขาดทุกคน
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Edit Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold gap-2"
                      onClick={saveEdits} disabled={editMutation.isPending}>
                      {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      บันทึกการแก้ไข
                    </Button>
                    <Button variant="outline" className="px-6 font-bold gap-2" onClick={cancelEditing} disabled={editMutation.isPending}>
                      <X className="h-4 w-4" /> ยกเลิก
                    </Button>
                  </div>
                </div>
              ) : (
                /* === VIEW MODE === */
                <>
                  {selectedLog.topics_covered && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-700">📖 เนื้อหาที่สอน</h4>
                      <p className="text-sm bg-indigo-50 p-3 rounded-lg text-indigo-800">{selectedLog.topics_covered}</p>
                    </div>
                  )}

                  {selectedLog.homework_assigned && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-700">📝 ภาระงาน / การบ้าน</h4>
                      <p className="text-sm bg-purple-50 p-3 rounded-lg text-purple-800">{selectedLog.homework_assigned}</p>
                    </div>
                  )}

                  {selectedLog.teaching_method && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-700">🎯 วิธีการสอน</h4>
                      <p className="text-sm bg-cyan-50 p-3 rounded-lg text-cyan-800">{selectedLog.teaching_method}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    {selectedLog.student_count && (
                      <div className="bg-slate-50 p-3 rounded-lg text-center">
                        <span className="text-xs text-slate-500 block">จำนวน น.ร.</span>
                        <p className="text-lg font-bold">{selectedLog.student_count}</p>
                      </div>
                    )}
                    {selectedLog.class_level && (
                      <div className="bg-slate-50 p-3 rounded-lg text-center">
                        <span className="text-xs text-slate-500 block">ระดับชั้น</span>
                        <p className="text-lg font-bold">{selectedLog.class_level}</p>
                      </div>
                    )}
                    {selectedLog.student_behavior && (
                      <div className="bg-slate-50 p-3 rounded-lg text-center">
                        <span className="text-xs text-slate-500 block">พฤติกรรม</span>
                        <p className="text-lg font-bold">{behaviorMap[selectedLog.student_behavior] || selectedLog.student_behavior}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Attendance — always visible */}
              {Array.isArray(logAttendance) && logAttendance.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" /> เช็คชื่อนักเรียน ({logAttendance.length} คน)
                  </h4>
                  <div className="flex gap-2 text-xs">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">มา {logAttendance.filter((a: any) => a.status === 'present').length}</Badge>
                    <Badge className="bg-red-50 text-red-700 border-red-200">ขาด {logAttendance.filter((a: any) => a.status === 'absent').length}</Badge>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">สาย {logAttendance.filter((a: any) => a.status === 'late').length}</Badge>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">ลา {logAttendance.filter((a: any) => a.status === 'leave').length}</Badge>
                  </div>
                  <div className="bg-slate-50 rounded-lg border max-h-[180px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100"><tr>
                        <th className="text-left px-2 py-1">#</th>
                        <th className="text-left px-2 py-1">ชื่อ</th>
                        <th className="text-center px-2 py-1">สถานะ</th>
                      </tr></thead>
                      <tbody>
                        {logAttendance.map((att: any) => (
                          <tr key={att.id} className="border-t border-slate-100">
                            <td className="px-2 py-1 text-slate-400">{att.student?.student_number || '-'}</td>
                            <td className="px-2 py-1">{att.student?.prefix}{att.student?.first_name} {att.student?.last_name}</td>
                            <td className="px-2 py-1 text-center">
                              <Badge className={`text-[10px] ${att.status === 'present' ? 'bg-emerald-100 text-emerald-700' : att.status === 'absent' ? 'bg-red-100 text-red-700' : att.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {att.status === 'present' ? 'มา' : att.status === 'absent' ? 'ขาด' : att.status === 'late' ? 'สาย' : 'ลา'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!isEditing && selectedLog.report_notes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-700">💬 หมายเหตุ</h4>
                  <p className="text-sm bg-amber-50 p-3 rounded-lg text-amber-800">{selectedLog.report_notes}</p>
                </div>
              )}

              {/* Review Status & Actions */}
              {!isEditing && (
                <>
                  {selectedLog.status === "reviewed" && selectedLog.reviewer && (
                    <div className="flex items-center gap-2 justify-center text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      ตรวจโดย {selectedLog.reviewer?.full_name} เมื่อ {selectedLog.reviewed_at && new Date(selectedLog.reviewed_at).toLocaleString('th-TH')}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {selectedLog.status === "submitted" && (
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-medium"
                        onClick={() => reviewMutation.mutate(selectedLog.id)} disabled={reviewMutation.isPending || deleteMutation.isPending}>
                        {reviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        ตรวจรายงานเรียบร้อย
                      </Button>
                    )}

                    <Button variant="destructive" className={selectedLog.status === "submitted" ? "px-4" : "w-full font-medium"}
                      onClick={() => {
                        if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายงานการสอนนี้? ข้อมูลการเช็คชื่อของนักเรียนในคาบนี้จะถูกลบไปด้วยและไม่สามารถกู้คืนได้")) {
                          deleteMutation.mutate(selectedLog.id)
                        }
                      }} disabled={reviewMutation.isPending || deleteMutation.isPending}>
                      {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      ลบรายงาน
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
