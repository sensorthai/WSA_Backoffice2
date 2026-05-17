"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle2, Clock, Eye, FileText, Loader2,
  MapPin, School, BookOpen, ExternalLink, Users, FileEdit
} from "lucide-react"
import { useUser } from "@/hooks/useUser"

export function TeachingLogsReview() {
  const { profile } = useUser()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("submitted")
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [dateFilter, setDateFilter] = useState("")

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

      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLog(log)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail / Review Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" /> รายงานการสอน
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 pt-2">
              {/* Summary Info */}
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
                {selectedLog.class_level && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ระดับชั้น</span>
                    <Badge variant="outline">{selectedLog.class_level}</Badge>
                  </div>
                )}
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

              {/* Report Content */}
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

              {/* Attendance */}
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

              {selectedLog.report_notes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-700">💬 หมายเหตุ</h4>
                  <p className="text-sm bg-amber-50 p-3 rounded-lg text-amber-800">{selectedLog.report_notes}</p>
                </div>
              )}

              {/* Review Action */}
              {selectedLog.status === "submitted" && (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => reviewMutation.mutate(selectedLog.id)} disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  ตรวจรายงานเรียบร้อย
                </Button>
              )}

              {selectedLog.status === "reviewed" && selectedLog.reviewer && (
                <div className="flex items-center gap-2 justify-center text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  ตรวจโดย {selectedLog.reviewer?.full_name} เมื่อ {selectedLog.reviewed_at && new Date(selectedLog.reviewed_at).toLocaleString('th-TH')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
