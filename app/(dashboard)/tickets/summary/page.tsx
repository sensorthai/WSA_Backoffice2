"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  FileText,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ArrowLeft,
  Loader2,
  Users
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

export default function TicketsSummaryPage() {
  const queryClient = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"))

  // 1. Fetch monthly summary data
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["tickets-summary", selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/summary?month=${selectedMonth}`)
      if (!res.ok) throw new Error("โหลดข้อมูลสรุปงานล้มเหลว")
      return res.json()
    }
  })

  // 2. Convert resolved ticket to Knowledge Base
  const publishToKbMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/tickets/${ticketId}/knowhow`, {
        method: "POST"
      })
      if (!res.ok) throw new Error((await res.json()).error || "บันทึก Know-how ไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      toast.success("บันทึกเข้าระบบ Know-how เรียบร้อยแล้ว!")
      queryClient.invalidateQueries({ queryKey: ["tickets-summary", selectedMonth] })
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link href="/tickets">
          <Button variant="ghost" size="sm" className="rounded-lg h-9 gap-1 text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} /> ย้อนกลับไปยังหน้ารายการตั๋ว
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            รายงานสรุปงานและสถิติตั๋วส่งงานประจำเดือน
          </h2>
          <p className="text-sm text-slate-500">
            วิเคราะห์ประสิทธิภาพการดำเนินงาน ปัญหาอุปสรรค คำแนะนำ และถอดบทเรียนกรณีศึกษาการแก้ปัญหา
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Input
            type="month"
            value={selectedMonth}
            onChange={e => e.target.value && setSelectedMonth(e.target.value)}
            className="w-[180px] h-10 rounded-xl border-slate-200 text-sm font-medium"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-slate-900 rounded-3xl border shadow-sm">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <p className="text-slate-400 font-bold">กำลังสรุปผลสถิติในเดือนนี้...</p>
        </div>
      ) : !summary ? (
        <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-3xl border">
          ไม่สามารถดึงข้อมูลสรุปงานประจำเดือนได้
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">งานเปิดใหม่เดือนนี้</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{summary.total_tickets}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <ClipboardList size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">งานที่กู้คืนสำเร็จ</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{summary.status_distribution?.resolved || 0}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">ปิดตั๋วแล้ว</p>
                  <p className="text-3xl font-black text-slate-600 mt-1">{summary.status_distribution?.closed || 0}</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">พนักงานมีภาระงาน</p>
                  <p className="text-3xl font-black text-indigo-600 mt-1">{summary.worker_performance?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Users size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category / Ticket Type Breakdown */}
            <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-800">แบ่งตามประเภทตั๋วงาน (Ticket Types)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {Object.keys(summary.type_distribution || {}).length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 text-center py-6">ไม่มีสถิติประเภทตั๋วในเดือนนี้</p>
                ) : (
                  Object.keys(summary.type_distribution).map((key) => {
                    const count = summary.type_distribution[key]
                    const percent = ((count / summary.total_tickets) * 100).toFixed(1)
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{key}</span>
                          <span>{count} ตั๋ว ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Worker Performance */}
            <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-800">ภาระงานและการสะสางรายพนักงาน (Workers)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.worker_performance?.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 text-center py-10">ไม่มีพนักงานที่ได้รับมอบหมายงานในเดือนนี้</p>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="pl-6 font-bold text-slate-500 text-xs py-3">พนักงาน</TableHead>
                        <TableHead className="font-bold text-slate-500 text-xs py-3 text-center">งานทั้งหมด</TableHead>
                        <TableHead className="font-bold text-slate-500 text-xs py-3 text-center">งานที่เสร็จสิ้น</TableHead>
                        <TableHead className="pr-6 font-bold text-slate-500 text-xs py-3 text-right">อัตราการสะสาง</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.worker_performance.map((wp: any, idx: number) => {
                        const rate = ((wp.resolved / wp.total) * 100).toFixed(0)
                        return (
                          <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/10">
                            <TableCell className="pl-6 py-3 font-semibold text-slate-800 text-xs">{wp.name}</TableCell>
                            <TableCell className="text-center font-bold text-slate-700 py-3 text-xs">{wp.total}</TableCell>
                            <TableCell className="text-center font-bold text-emerald-600 py-3 text-xs">{wp.resolved}</TableCell>
                            <TableCell className="pr-6 text-right font-black text-indigo-600 py-3 text-xs">{rate}%</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Obstacles & Recommendations section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Obstacles Card */}
            <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="p-6 border-b border-slate-100 flex items-center gap-2 bg-amber-50/20">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">ปัญหาและอุปสรรคที่พบย้อนหลัง</CardTitle>
                  <CardDescription className="text-xs">บันทึกความยากลำบากหน้างานจริงที่พนักงานส่งมา</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {summary.obstacles?.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 text-center py-6">ยังไม่มีการบันทึกปัญหาอุปสรรคในเดือนนี้</p>
                ) : (
                  summary.obstacles.map((obs: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>ชื่องาน: {obs.title}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">ผู้รายงาน: {obs.worker}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">{obs.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recommendations Card */}
            <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="p-6 border-b border-slate-100 flex items-center gap-2 bg-emerald-50/10">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">ข้อเสนอแนะและแนวทางป้องกัน</CardTitle>
                  <CardDescription className="text-xs">แนวคิดการรับมือสำหรับการเจอปัญหาเดิมในครั้งหน้า</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {summary.recommendations?.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 text-center py-6">ยังไม่มีการบันทึกคำแนะนำในเดือนนี้</p>
                ) : (
                  summary.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>ชื่องาน: {rec.title}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">ผู้รายงาน: {rec.worker}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">{rec.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resolved Tickets & Know-how conversion section */}
          <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800">งานแก้ปัญหาที่สำเร็จ (พร้อมบันทึกถอดบทเรียน Know-how)</CardTitle>
              <CardDescription>
                เผยแพร่ตั๋วงานที่แก้ไขสำเร็จและปิดตั๋วเรียบร้อยแล้วไปเป็นบทความคลังความรู้สำหรับพนักงานคนอื่นๆ ค้นหาในอนาคต
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {summary.resolved_tickets?.length === 0 ? (
                <p className="text-sm font-medium text-slate-400 text-center py-10">ยังไม่มีงานแก้ไขปัญหาที่สำเร็จในเดือนนี้</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="pl-6 font-bold text-slate-500 text-xs py-4">ตั๋วงานที่ทำสำเร็จ</TableHead>
                        <TableHead className="font-bold text-slate-500 text-xs py-4">ประเภท</TableHead>
                        <TableHead className="font-bold text-slate-500 text-xs py-4">ลูกค้า</TableHead>
                        <TableHead className="font-bold text-slate-500 text-xs py-4">แนวทางการแก้ไข</TableHead>
                        <TableHead className="pr-6 font-bold text-slate-500 text-xs py-4 text-right">Know-how</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.resolved_tickets.map((ticket: any) => (
                        <TableRow key={ticket.id} className="border-slate-50 hover:bg-slate-50/10">
                          <TableCell className="pl-6 py-4 font-bold text-slate-800 text-xs">{ticket.title}</TableCell>
                          <TableCell className="text-slate-500 font-semibold py-4 text-xs">{ticket.ticket_type?.name}</TableCell>
                          <TableCell className="text-slate-700 py-4 text-xs font-semibold">{ticket.customer_name}</TableCell>
                          <TableCell className="text-slate-600 max-w-[280px] truncate py-4 text-xs font-medium">{ticket.resolution_notes}</TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            {ticket.is_knowledge_base ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 w-max ml-auto text-[10px] py-0.5"><BookOpen size={10} /> บันทึกแล้ว</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={publishToKbMutation.isPending}
                                onClick={() => publishToKbMutation.mutate(ticket.id)}
                                className="h-8 rounded-lg font-bold text-xs gap-1 border-indigo-100 text-indigo-600 hover:bg-indigo-50 shadow-sm"
                              >
                                <BookOpen size={12} /> บันทึกเข้าคลังความรู้
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
