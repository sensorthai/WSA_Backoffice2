"use client"

export const dynamic = 'force-dynamic'

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft, School, BookOpen, Users, Calendar, Clock, DollarSign,
  FileSpreadsheet, Video, Presentation, FileText, Link2, Package,
  CheckCircle, AlertTriangle, Loader2, MapPin, Phone, Mail
} from "lucide-react"

const TYPE_ICONS: Record<string, any> = {
  manual: BookOpen, slide: Presentation, video: Video,
  document: FileText, link: Link2, other: Package,
}
const TYPE_LABELS: Record<string, string> = {
  manual: "คู่มือ", slide: "Slide", video: "YouTube",
  document: "เอกสาร", link: "ลิงก์", other: "อื่นๆ",
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params?.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ["teaching-assignment-detail", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/teaching/assignment/${assignmentId}`)
      if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลได้")
      return res.json()
    },
    enabled: !!assignmentId,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  )
  if (error || !data) return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-4">เกิดข้อผิดพลาด</p>
      <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
    </div>
  )

  const { assignment: a, students, materials, summary: s } = data
  const school = a.school || {}
  const subject = a.subject || {}

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {subject.name || "งานมอบหมาย"} {subject.code && <span className="text-indigo-500">({subject.code})</span>}
          </h1>
          <p className="text-sm text-slate-500">
            {school.name} • {a.class_level || "-"} • ปี {a.academic_year || "-"}
          </p>
        </div>
        <Badge className={`ml-auto text-sm px-3 py-1 ${a.status === 'active' ? 'bg-emerald-100 text-emerald-800' : a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>
          {a.status === 'active' ? '🟢 กำลังสอน' : a.status === 'completed' ? '🔵 เสร็จสิ้น' : '🔴 ยกเลิก'}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="h-4 w-4" /><span className="text-xs font-medium">นักเรียน</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.total_students} <span className="text-sm font-normal text-slate-400">คน</span></p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Calendar className="h-4 w-4" /><span className="text-xs font-medium">คาบเรียน</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.total_periods} <span className="text-sm font-normal text-slate-400">คาบ ({s.total_sessions} วัน)</span></p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <DollarSign className="h-4 w-4" /><span className="text-xs font-medium">รายได้รวม</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">฿{s.total_income?.toLocaleString()} </p>
            <p className="text-xs text-slate-400">ได้รับแล้ว ฿{s.earned_income?.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <CheckCircle className="h-4 w-4" /><span className="text-xs font-medium">ความคืบหน้า</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.past_dates_count}/{s.total_sessions}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
              <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${s.total_sessions ? (s.past_dates_count / s.total_sessions * 100) : 0}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holiday Warnings */}
      {s.holiday_conflicts?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <AlertTriangle className="h-4 w-4" /> ⚠️ วันสอนตรงกับวันหยุดโรงเรียน
          </div>
          <div className="flex flex-wrap gap-2">
            {s.holiday_conflicts.map((d: string) => (
              <Badge key={d} className="bg-amber-100 text-amber-800 border-amber-300 font-mono">{d}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: School + Subject Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* School Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><School className="h-4 w-4 text-blue-500" /> ข้อมูลโรงเรียน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-slate-900">{school.name}</p>
              {school.address && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{school.address}{school.district && `, ${school.district}`}{school.province && `, ${school.province}`}</span>
                </div>
              )}
              {school.contact_name && (
                <div className="border-t pt-2 mt-2 space-y-1">
                  <p className="text-xs font-bold text-slate-500">ผู้ติดต่อ</p>
                  <p className="text-slate-700">{school.contact_name}</p>
                  {school.contact_phone && <div className="flex items-center gap-1.5 text-slate-500"><Phone className="h-3 w-3" />{school.contact_phone}</div>}
                  {school.contact_email && <div className="flex items-center gap-1.5 text-slate-500"><Mail className="h-3 w-3" />{school.contact_email}</div>}
                </div>
              )}
              {school.finance_contact_name && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-xs font-bold text-slate-500">ฝ่ายการเงิน</p>
                  <p className="text-slate-700">{school.finance_contact_name}</p>
                  {school.finance_contact_phone && <div className="flex items-center gap-1.5 text-slate-500"><Phone className="h-3 w-3" />{school.finance_contact_phone}</div>}
                  {school.finance_contact_email && <div className="flex items-center gap-1.5 text-slate-500"><Mail className="h-3 w-3" />{school.finance_contact_email}</div>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-500" /> ข้อมูลวิชา</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold">{subject.name} {subject.code && <Badge variant="outline" className="ml-1 font-mono text-xs">{subject.code}</Badge>}</p>
              {subject.description && <p className="text-slate-500">{subject.description}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="text-slate-400 block">คาบ/วัน</span>
                  <span className="font-bold text-slate-800">{s.periods_per_day} คาบ</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="text-slate-400 block">ค่าสอน/คาบ</span>
                  <span className="font-bold text-emerald-700">฿{s.fee_per_period?.toLocaleString()}</span>
                </div>
              </div>
              {(a.schedule_time_start || subject.time_start) && (
                <div className="flex items-center gap-2 text-slate-600 pt-1">
                  <Clock className="h-3.5 w-3.5" />
                  {a.schedule_time_start || subject.time_start} - {a.schedule_time_end || subject.time_end || '?'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Dates */}
          {s.upcoming_dates?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" /> วันสอนถัดไป</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {s.upcoming_dates.map((d: string) => (
                    <Badge key={d} variant="secondary" className="font-mono text-xs bg-blue-50 text-blue-700">{d}</Badge>
                  ))}
                  {s.remaining_sessions > 5 && <span className="text-xs text-slate-400 self-center">+{s.remaining_sessions - 5} วัน</span>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Materials + Students */}
        <div className="lg:col-span-2 space-y-4">
          {/* Materials */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-500" /> สื่อการสอน
                <Badge variant="secondary" className="ml-auto">{materials.length} รายการ</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีสื่อการสอนสำหรับวิชานี้</p>
              ) : (
                <div className="space-y-2">
                  {materials.map((m: any) => {
                    const Icon = TYPE_ICONS[m.type] || Package
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{m.title}</p>
                          {m.description && <p className="text-xs text-slate-400 truncate">{m.description}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{TYPE_LABELS[m.type] || m.type}</Badge>
                        {(m.file_url || m.youtube_url) && (
                          <a href={m.youtube_url || m.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-xs h-7">เปิด ↗</Button>
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" /> รายชื่อนักเรียน
                <Badge variant="secondary" className="ml-auto">{students.length} คน</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[60px]">เลขที่</TableHead>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>เลขประจำตัว</TableHead>
                    <TableHead>ระดับชั้น</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-400">ไม่พบนักเรียนในห้องนี้</TableCell></TableRow>
                  ) : students.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{s.student_number}</Badge></TableCell>
                      <TableCell className="font-medium">{s.prefix}{s.first_name} {s.last_name}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{s.nickname || '-'}</TableCell>
                      <TableCell><Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">{s.class_level}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
