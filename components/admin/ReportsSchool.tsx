"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  School, BookOpen, Users, Loader2, CalendarDays, FileText,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download
} from "lucide-react"

export function ReportsSchool() {
  const [selectedSchool, setSelectedSchool] = useState("")
  const [viewMode, setViewMode] = useState<"week" | "month">("week")
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [generating] = useState(false)

  // Compute date range
  const { startDate, endDate, label } = useMemo(() => {
    const now = new Date()
    if (viewMode === "week") {
      const mon = new Date(now)
      mon.setDate(now.getDate() - now.getDay() + 1)
      const fri = new Date(mon)
      fri.setDate(mon.getDate() + 4)
      return {
        startDate: mon.toISOString().split("T")[0],
        endDate: fri.toISOString().split("T")[0],
        label: `สัปดาห์นี้ (${fmtD(mon)} - ${fmtD(fri)})`,
      }
    } else {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        startDate: first.toISOString().split("T")[0],
        endDate: last.toISOString().split("T")[0],
        label: now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
      }
    }
  }, [viewMode])

  // Fetch schools for dropdown
  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/schools")
      return res.ok ? res.json() : []
    }
  })

  // Fetch report data
  const { data: report, isLoading } = useQuery({
    queryKey: ["school-report", selectedSchool, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ school_id: selectedSchool, start_date: startDate, end_date: endDate })
      const res = await fetch(`/api/reports/school?${params}`)
      return res.ok ? res.json() : null
    },
    enabled: !!selectedSchool,
  })

  const behaviorMap: Record<string, string> = {
    excellent: "ดีมาก", good: "ดี", fair: "พอใช้", needs_improvement: "ต้องปรับปรุง"
  }
  const statusTh: Record<string, string> = {
    present: "มา", absent: "ขาด", late: "สาย", leave: "ลา"
  }

  const generatePDF = useCallback((rpt: any, periodLabel: string) => {
    const sMap = statusTh
    const bMap = behaviorMap
    const logsHtml = (rpt.logs || []).map((log: any) => {
      const attList = rpt.attendance_by_log?.[log.id] || []
      const attRows = attList.map((a: any, i: number) =>
        `<tr><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${a.student_number||i+1}</td><td style="padding:4px 8px;border:1px solid #ddd">${a.name}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;color:${a.status==='present'?'#059669':a.status==='absent'?'#dc2626':a.status==='late'?'#d97706':'#2563eb'}">${sMap[a.status]||a.status}</td></tr>`
      ).join('')
      return `<div style="page-break-inside:avoid;margin-bottom:14px;border:1px solid #ccc;border-radius:6px;overflow:hidden">
        <div style="background:#f3f4f6;padding:8px 14px;border-bottom:1px solid #ddd">
          <strong>${fmtDate(log.teach_date)}</strong>
          <span style="color:#555;margin-left:10px">วิชา: ${log.assignment?.subject?.name||'-'}</span>
          ${log.class_level?`<span style="color:#555;margin-left:10px">ห้อง: ${log.class_level}</span>`:''}
          <span style="float:right;color:#555;font-size:12px">ครู: <b>${log.teacher?.full_name||'-'}</b>
          </span>
        </div>
        <div style="padding:10px 14px;font-size:13px">
          ${log.topics_covered?`<p style="margin:0 0 4px"><b>เนื้อหา:</b> ${log.topics_covered}</p>`:''}
          ${log.homework_assigned?`<p style="margin:0 0 4px"><b>การบ้าน:</b> ${log.homework_assigned}</p>`:''}
          ${log.teaching_method?`<p style="margin:0 0 4px"><b>วิธีสอน:</b> ${log.teaching_method}</p>`:''}
          ${log.student_behavior?`<p style="margin:0 0 4px"><b>พฤติกรรม:</b> ${bMap[log.student_behavior]||log.student_behavior}</p>`:''}
          ${log.report_notes?`<p style="margin:0 0 4px;color:#92400e"><b>หมายเหตุ:</b> ${log.report_notes}</p>`:''}
          ${attRows?`<div style="margin-top:6px"><p style="margin:0 0 4px;font-weight:bold;font-size:12px">เช็คชื่อนักเรียน (${attList.length} คน)</p><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f9fafb"><th style="padding:3px 6px;border:1px solid #ddd;width:50px">เลขที่</th><th style="padding:3px 6px;border:1px solid #ddd;text-align:left">ชื่อ-นามสกุล</th><th style="padding:3px 6px;border:1px solid #ddd;width:50px">สถานะ</th></tr></thead><tbody>${attRows}</tbody></table></div>`:''}
        </div>
      </div>`
    }).join('')
    const concern = rpt.concern_students?.length > 0 ? `<div style="margin-top:20px;border:2px solid #fca5a5;border-radius:6px;overflow:hidden;page-break-inside:avoid"><div style="background:#fef2f2;padding:8px 14px;font-weight:bold;color:#991b1b">⚠ นักเรียนที่ต้องดูแล</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#fef2f2"><th style="padding:4px 8px;border:1px solid #fca5a5">เลขที่</th><th style="padding:4px 8px;border:1px solid #fca5a5;text-align:left">ชื่อ</th><th style="padding:4px 8px;border:1px solid #fca5a5">ห้อง</th><th style="padding:4px 8px;border:1px solid #fca5a5">ขาด</th><th style="padding:4px 8px;border:1px solid #fca5a5">สาย</th><th style="padding:4px 8px;border:1px solid #fca5a5">ลา</th></tr></thead><tbody>${rpt.concern_students.map((s: any) => `<tr><td style="padding:4px 8px;border:1px solid #fca5a5;text-align:center">${s.student_number||''}</td><td style="padding:4px 8px;border:1px solid #fca5a5">${s.prefix||''}${s.first_name} ${s.last_name}</td><td style="padding:4px 8px;border:1px solid #fca5a5;text-align:center">${s.class_level||''}</td><td style="padding:4px 8px;border:1px solid #fca5a5;text-align:center;color:#dc2626">${s.attendance.absent||0}</td><td style="padding:4px 8px;border:1px solid #fca5a5;text-align:center;color:#d97706">${s.attendance.late||0}</td><td style="padding:4px 8px;border:1px solid #fca5a5;text-align:center;color:#2563eb">${s.attendance.leave||0}</td></tr>`).join('')}</tbody></table></div>` : ''
    const w = window.open('', '_blank')
    if (!w) { alert('กรุณาอนุญาต popup'); return }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>รายงาน - ${rpt.school?.name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Sarabun',sans-serif;color:#1e293b;padding:20px 30px;font-size:14px;line-height:1.5}@media print{body{padding:10px 15px}@page{size:A4;margin:12mm}}</style></head><body>
      <div style="text-align:center;margin-bottom:20px"><h1 style="font-size:22px;margin:0">รายงานสรุปการสอนรายสัปดาห์</h1><h2 style="font-size:18px;color:#4f46e5;margin:4px 0 0">${rpt.school?.name||''}</h2><p style="color:#666;font-size:12px;margin:2px 0 0">${rpt.school?.address||''}</p><p style="font-size:13px;color:#555;margin:8px 0 0">${periodLabel}${rpt.week_number ? ` | สัปดาห์ที่ ${rpt.week_number}` : ''}</p></div>
      <hr style="border:none;border-top:2px solid #e5e7eb;margin:16px 0"/>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr><td style="background:#eff6ff;border-radius:6px;padding:12px;text-align:center;width:25%"><div style="font-size:24px;font-weight:800">${rpt.summary.total_days}</div><div style="font-size:11px;color:#666">วันสอน</div></td><td style="width:4px"></td><td style="background:#fefce8;border-radius:6px;padding:12px;text-align:center;width:25%"><div style="font-size:24px;font-weight:800">${rpt.summary.total_periods}</div><div style="font-size:11px;color:#666">คาบรวม</div></td><td style="width:4px"></td><td style="background:#ecfdf5;border-radius:6px;padding:12px;text-align:center;width:25%"><div style="font-size:24px;font-weight:800">${rpt.attendance.rate}%</div><div style="font-size:11px;color:#666">อัตราเข้าเรียน</div></td><td style="width:4px"></td><td style="background:#f0f9ff;border-radius:6px;padding:12px;text-align:center;width:25%"><div style="font-size:24px;font-weight:800">${rpt.summary.teachers.length}</div><div style="font-size:11px;color:#666">ครูผู้สอน</div></td></tr></table>
      <p style="font-size:12px;color:#666;margin:0 0 4px">เข้าเรียน: <b style="color:#059669">${rpt.attendance.present}</b> | ขาด: <b style="color:#dc2626">${rpt.attendance.absent}</b> | สาย: <b style="color:#d97706">${rpt.attendance.late}</b> | ลา: <b style="color:#2563eb">${rpt.attendance.leave}</b></p>
      <p style="font-size:12px;color:#666;margin:0 0 16px">ครูผู้สอน: ${rpt.summary.teachers.join(', ')}</p>
      ${(rpt.attendance_by_classroom||[]).length > 0 ? `<h3 style="font-size:15px;margin:16px 0 8px">📋 การเข้าเรียนรายห้อง</h3><table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px"><thead><tr style="background:#f3f4f6"><th style="padding:6px 8px;border:1px solid #ddd;text-align:left">ห้อง</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center">มา</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center">ขาด</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center">สาย</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center">ลา</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center">รวม</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center">อัตรา</th></tr></thead><tbody>${rpt.attendance_by_classroom.map((c:any)=>`<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold">${c.class_level}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#059669;font-weight:bold">${c.present}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#dc2626;font-weight:bold">${c.absent}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#d97706;font-weight:bold">${c.late}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;color:#2563eb;font-weight:bold">${c.leave}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${c.total}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;color:${c.rate>=80?'#059669':c.rate>=60?'#d97706':'#dc2626'}">${c.rate}%</td></tr>`).join('')}</tbody></table>` : ''}
      <hr style="border:none;border-top:2px solid #e5e7eb;margin:16px 0"/>
      <h3 style="font-size:16px;margin:0 0 12px">📖 รายละเอียดการสอนรายวัน</h3>
      ${logsHtml||'<p style="color:#999">ไม่มีข้อมูล</p>'}${concern}
      ${(rpt.teacher_remarks||[]).length > 0 ? `<div style="margin-top:20px;border:2px solid #fbbf24;border-radius:6px;overflow:hidden;page-break-inside:avoid"><div style="background:#fef3c7;padding:8px 14px;font-weight:bold;color:#92400e">📝 หมายเหตุ / ข้อเสนอแนะจากครู</div><div style="padding:10px 14px">${rpt.teacher_remarks.map((r:any)=>`<div style="margin-bottom:8px;padding:6px 10px;background:#fffbeb;border-radius:4px;border:1px solid #fde68a"><div style="font-size:11px;color:#888">${fmtDate(r.date)} | ${r.subject} | โดย ${r.teacher}</div><div style="font-size:13px;color:#78350f;margin-top:2px">${r.notes}</div></div>`).join('')}</div></div>` : ''}
      <div style="margin-top:30px;text-align:center;color:#aaa;font-size:10px">สร้างโดยระบบ WSA Backoffice | ${new Date().toLocaleString('th-TH')}</div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }, [behaviorMap, statusTh])

  return (
    <div className="space-y-6">
      {/* Title + Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" /> รายงานส่งโรงเรียน
          </h2>
          <p className="text-sm text-slate-500 mt-1">สรุปการสอน เนื้อหา และการเข้าเรียนของนักเรียน</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" className="rounded-none text-xs h-8 px-3"
              onClick={() => setViewMode("week")}>สัปดาห์</Button>
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" className="rounded-none text-xs h-8 px-3"
              onClick={() => setViewMode("month")}>เดือน</Button>
          </div>
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="เลือกโรงเรียน..." />
            </SelectTrigger>
            <SelectContent>
              {(schools || []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedSchool ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <School className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">กรุณาเลือกโรงเรียนเพื่อดูรายงาน</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
      ) : report ? (
        <div className="space-y-6" id="school-report-print">
          {/* Report Header */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <School className="h-5 w-5 text-blue-500" /> {report.school?.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{report.school?.address}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{label}</Badge>
                  {viewMode === 'week' && report.week_number && <Badge className="bg-violet-50 text-violet-700 border-violet-200">สัปดาห์ที่ {report.week_number}</Badge>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => generatePDF(report, label)} disabled={generating} className="print:hidden">
                {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                {generating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={CalendarDays} label="วันสอน" value={report.summary.total_days} color="blue" />
            <SummaryCard icon={BookOpen} label="คาบรวม" value={report.summary.total_periods} color="amber" />
            <SummaryCard icon={Users} label="ครูผู้สอน" value={report.summary.teachers.length} color="cyan" />
            <SummaryCard icon={CheckCircle2} label="รายงานส่งแล้ว" value={`${report.summary.submitted_reports}/${report.summary.total_periods}`} color="emerald" />
          </div>

          {/* Attendance Rate */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" /> อัตราการเข้าเรียน
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${report.attendance.rate}%` }} />
              </div>
              <span className="text-lg font-black text-emerald-600">{report.attendance.rate}%</span>
            </div>
            <div className="flex gap-3 text-xs">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">มา {report.attendance.present}</Badge>
              <Badge className="bg-red-50 text-red-700 border-red-200">ขาด {report.attendance.absent}</Badge>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">สาย {report.attendance.late}</Badge>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">ลา {report.attendance.leave}</Badge>
            </div>
          </div>

          {/* Attendance by Classroom */}
          {(report.attendance_by_classroom || []).length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-500" /> การเข้าเรียนรายห้อง
                </h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>ห้องเรียน</TableHead>
                    <TableHead className="text-center">มา</TableHead>
                    <TableHead className="text-center">ขาด</TableHead>
                    <TableHead className="text-center">สาย</TableHead>
                    <TableHead className="text-center">ลา</TableHead>
                    <TableHead className="text-center">รวม</TableHead>
                    <TableHead className="text-center">อัตรา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.attendance_by_classroom.map((c: any) => (
                    <TableRow key={c.class_level}>
                      <TableCell><Badge variant="outline" className="font-bold">{c.class_level}</Badge></TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{c.present}</TableCell>
                      <TableCell className="text-center font-bold text-red-600">{c.absent}</TableCell>
                      <TableCell className="text-center font-bold text-amber-600">{c.late}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{c.leave}</TableCell>
                      <TableCell className="text-center text-slate-500">{c.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${c.rate >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : c.rate >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'} font-bold`}>{c.rate}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Subject Details */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
            <div className="px-5 py-4 border-b bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" /> สรุปรายวิชา
              </h3>
            </div>
            <div className="divide-y">
              {report.subjects.length === 0 ? (
                <div className="p-6 text-center text-slate-400">ไม่มีข้อมูลรายวิชา</div>
              ) : report.subjects.map((sub: any, i: number) => (
                <div key={i}>
                  <button className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedSubject(expandedSubject === sub.name ? null : sub.name)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-amber-500" />
                      </div>
                      <span className="font-bold text-slate-800">{sub.name}</span>
                      <Badge variant="outline" className="text-xs">{sub.total_periods} คาบ</Badge>
                    </div>
                    {expandedSubject === sub.name ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {expandedSubject === sub.name && (
                    <div className="px-5 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[100px]">วันที่</TableHead>
                            <TableHead>เนื้อหา</TableHead>
                            <TableHead>การบ้าน</TableHead>
                            <TableHead className="w-[80px]">พฤติกรรม</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sub.topics.map((t: any, j: number) => (
                            <TableRow key={j}>
                              <TableCell className="font-mono text-xs">{fmtDate(t.date)}</TableCell>
                              <TableCell className="text-sm">{t.topics || '-'}</TableCell>
                              <TableCell className="text-sm text-slate-600">{t.homework || '-'}</TableCell>
                              <TableCell>
                                {t.behavior && <Badge variant="outline" className="text-[10px]">{behaviorMap[t.behavior] || t.behavior}</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {sub.topics.some((t: any) => t.notes) && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-bold text-slate-500">หมายเหตุ:</p>
                          {sub.topics.filter((t: any) => t.notes).map((t: any, k: number) => (
                            <p key={k} className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded">{fmtDate(t.date)}: {t.notes}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Concern Students */}
          {report.concern_students.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto border-red-200">
              <div className="px-5 py-4 border-b bg-red-50">
                <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> นักเรียนที่ต้องดูแล (ขาด/สาย ≥ 2 ครั้ง)
                </h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50/30">
                    <TableHead>เลขที่</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>ระดับชั้น</TableHead>
                    <TableHead className="text-center">ขาด</TableHead>
                    <TableHead className="text-center">สาย</TableHead>
                    <TableHead className="text-center">ลา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.concern_students.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm text-slate-400">{s.student_number}</TableCell>
                      <TableCell className="font-medium">{s.prefix}{s.first_name} {s.last_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{s.class_level}</Badge></TableCell>
                      <TableCell className="text-center">
                        {s.attendance.absent > 0 && <Badge className="bg-red-100 text-red-700 border-red-200">{s.attendance.absent}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.attendance.late > 0 && <Badge className="bg-amber-100 text-amber-700 border-amber-200">{s.attendance.late}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.attendance.leave > 0 && <Badge className="bg-blue-100 text-blue-700 border-blue-200">{s.attendance.leave}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Teacher Remarks */}
          {(report.teacher_remarks || []).length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto border-amber-200">
              <div className="px-5 py-4 border-b bg-amber-50">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> หมายเหตุ / ข้อเสนอแนะจากครู
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {report.teacher_remarks.map((r: any, i: number) => (
                  <div key={i} className="bg-amber-50/50 rounded-lg px-4 py-3 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{fmtDate(r.date)}</span>
                      <Badge variant="outline" className="text-[10px]">{r.subject}</Badge>
                      <span className="text-xs text-slate-500">โดย {r.teacher}</span>
                    </div>
                    <p className="text-sm text-amber-900">{r.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teachers */}
          {report.summary.teachers.length > 0 && (
            <div className="bg-slate-50 rounded-xl border px-4 py-3 flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-cyan-500" />
              <span className="text-slate-500 font-medium">ครูผู้สอน:</span>
              {report.summary.teachers.map((t: string, i: number) => (
                <Badge key={i} className="bg-white border text-slate-700">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    cyan: "from-cyan-500 to-cyan-600",
    emerald: "from-emerald-500 to-emerald-600",
  }
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  )
}

function fmtD(d: Date) {
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function fmtDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${d}-${m}-${y}`
}
