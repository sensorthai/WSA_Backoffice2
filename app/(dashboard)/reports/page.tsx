"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  FileBarChart, 
  Download, 
  Mail,
  Printer,
  Search,
  Users,
  Palmtree,
  ShoppingBag,
  Car,
  Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ReportType = 'wfh' | 'leave' | 'purchase' | 'car'

const reportConfigs = {
  wfh: { title: "รายงานการเข้างาน", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  leave: { title: "รายงานการลาหยุด", icon: Palmtree, color: "text-emerald-600", bg: "bg-emerald-50" },
  purchase: { title: "รายงานการเบิกจ่าย", icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-50" },
  car: { title: "รายงานการใช้รถบริษัท", icon: Car, color: "text-indigo-600", bg: "bg-indigo-50" }
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-blue-600 w-12 h-12" /></div>}>
      <ReportsContent />
    </Suspense>
  )
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const reportType = (searchParams?.get("tab") as ReportType) || 'wfh'
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [deptFilter, setDeptFilter] = useState("all")
  const [search, setSearch] = useState("")

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["reports", reportType, month, deptFilter],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=${reportType}&month=${month}&department_id=${deptFilter}`)
      return res.json()
    }
  })

  const handleExportCsv = async () => {
    const res = await fetch(`/api/reports?type=${reportType}&month=${month}&department_id=${deptFilter}`, {
      headers: { 'Accept': 'text/csv' }
    })
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportType}-${month}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSendGmail = async () => {
    try {
      const res = await fetch('/api/admin/send-report', { method: 'POST' })
      if (res.ok) alert("ส่งรายงานเข้า Gmail เรียบร้อยแล้ว")
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่งอีเมล")
    }
  }

  const totals = useMemo(() => {
    if (!data || !Array.isArray(data)) return null
    if (reportType === 'wfh') {
      return {
        office: data.reduce((sum, r) => sum + r.office_days, 0),
        home: data.reduce((sum, r) => sum + r.wfh_days, 0),
        onsite: data.reduce((sum, r) => sum + r.onsite_days, 0),
        absent: data.reduce((sum, r) => sum + r.absent_days, 0)
      }
    }
    if (reportType === 'leave') {
      return {
        sick: data.reduce((sum, r) => sum + r.sick_used, 0),
        personal: data.reduce((sum, r) => sum + r.personal_used, 0),
        vacation: data.reduce((sum, r) => sum + r.vacation_used, 0)
      }
    }
    if (reportType === 'purchase') {
      return {
        amount: data.reduce((sum, r) => sum + Number(r.total_amount), 0)
      }
    }
    if (reportType === 'car') {
      return {
        mileage: data.reduce((sum, r) => sum + r.total_mileage, 0),
        bookings: data.reduce((sum, r) => sum + r.bookings_count, 0)
      }
    }
    return null
  }, [data, reportType])

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-700 print:p-0 print:m-0">
      {/* Print Header */}
      <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-6">
        <h1 className="text-4xl font-black text-slate-900">รายงานสรุป{reportConfigs[reportType].title}</h1>
        <div className="flex justify-between items-end mt-4">
          <p className="text-xl font-bold text-slate-600">ประจำปี {month.split('-')[0]} {reportType !== 'purchase' && `(เดือน ${format(new Date(month), "MMMM", { locale: th })})`}</p>
          <p className="text-sm text-slate-400 font-medium">พิมพ์เมื่อ: {format(new Date(), "d MMMM yyyy HH:mm", { locale: th })}</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 no-print">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
            <FileBarChart className="text-blue-600 w-10 h-10" /> ระบบรายงาน WSA
          </h1>
          <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">Analytics & Financial Reporting</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-100 font-black gap-2" onClick={() => window.print()}>
            <Printer size={18} /> พิมพ์รายงาน
          </Button>
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-100 font-black gap-2 text-blue-600 hover:bg-blue-50" onClick={handleSendGmail}>
            <Mail size={18} /> ส่ง Gmail
          </Button>
          <Button className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black gap-2 shadow-xl" onClick={handleExportCsv}>
            <Download size={18} /> ดาวน์โหลด CSV
          </Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white no-print">
        <CardContent className="p-8 flex flex-col md:flex-row items-end gap-6">
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกเดือนที่ต้องการ</label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold px-4" />
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">แผนก</label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                <SelectValue placeholder="เลือกแผนก" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="all">ทุกแผนก</SelectItem>
                <SelectItem value="it">IT Department</SelectItem>
                <SelectItem value="hr">HR & Admin</SelectItem>
                <SelectItem value="sales">Sales & Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="h-12 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20 gap-2" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="animate-spin" /> : "ดูรายงาน"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[3rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
        <div className="px-10 pt-10 bg-slate-50/50 border-b border-slate-100 no-print">
          <div className="flex flex-col md:flex-row items-center justify-between py-6 gap-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              {reportConfigs[reportType].title}
              <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-400 font-bold uppercase text-[10px]">{month}</Badge>
            </h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="ค้นหาในตาราง..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl border-slate-100 bg-white shadow-inner font-medium" />
            </div>
          </div>
        </div>
        <CardContent className="p-0">
            {isLoading ? (
              <div className="py-40 text-center space-y-4">
                <Loader2 className="animate-spin text-blue-600 w-12 h-12 mx-auto" />
                <p className="text-slate-400 font-bold">กำลังประมวลผลข้อมูล...</p>
              </div>
            ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    {reportType === 'wfh' && (
                      <>
                        <TableHead className="pl-10 py-8 font-black text-slate-400 text-[10px] uppercase tracking-widest">ชื่อพนักงาน</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Office</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">WFH</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Onsite</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ขาดงาน</TableHead>
                        <TableHead className="pr-10 text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">รวม (วัน)</TableHead>
                      </>
                    )}
                      {reportType === 'leave' && (
                        <>
                          <TableHead className="pl-10 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">รายชื่อพนักงาน</TableHead>
                          <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] text-center border-x border-slate-100" colSpan={3}>ลาป่วย</TableHead>
                          <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] text-center border-x border-slate-100" colSpan={3}>ลากิจ</TableHead>
                          <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] text-center border-x border-slate-100" colSpan={3}>ลาพักร้อน</TableHead>
                        </>
                      )}
                    {reportType === 'purchase' && (
                      <>
                        <TableHead className="pl-10 py-8 font-black text-slate-400 text-[10px] uppercase tracking-widest">วันที่</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">รายการ</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ผู้ขอ</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">แผนก</TableHead>
                        <TableHead className="pr-10 text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">ยอดเงิน</TableHead>
                      </>
                    )}
                    {reportType === 'car' && (
                      <>
                        <TableHead className="pl-10 py-8 font-black text-slate-400 text-[10px] uppercase tracking-widest">ทะเบียน</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">รุ่นรถ</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">วันใช้งาน</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ระยะทาง</TableHead>
                        <TableHead className="pr-10 text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">ใช้จริง %</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                {reportType === 'leave' && (
                  <TableHeader className="bg-slate-50/30">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="pl-10"></TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center border-l border-slate-100">สิทธิ</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center">ใช้ไป</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center border-r border-slate-100">คงเหลือ</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center border-l border-slate-100">สิทธิ</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center">ใช้ไป</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center border-r border-slate-100">คงเหลือ</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center border-l border-slate-100">สิทธิ</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center">ใช้ไป</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-400 text-center border-r border-slate-100">คงเหลือ</TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                <TableBody>
                  {data?.map((row: any, idx: number) => (
                    <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/30">
                      {reportType === 'wfh' && (
                        <>
                          <TableCell className="pl-10 py-6 font-bold text-slate-900">{row.name}</TableCell>
                          <TableCell className="font-medium text-slate-600">{row.office_days}</TableCell>
                          <TableCell className="font-medium text-slate-600">{row.wfh_days}</TableCell>
                          <TableCell className="font-medium text-slate-600">{row.onsite_days}</TableCell>
                          <TableCell><Badge className="bg-rose-50 text-rose-600 border-0">{row.absent_days}</Badge></TableCell>
                          <TableCell className="pr-10 text-right font-black text-slate-900">{row.total_working_days}</TableCell>
                        </>
                      )}
                      {reportType === 'leave' && (
                        <>
                          <TableCell className="pl-10 py-6 font-bold text-slate-900">{row.name}</TableCell>
                          {/* Sick */}
                          <TableCell className="text-center text-slate-400 border-l border-slate-50">{row.sick_quota}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{row.sick_used}</TableCell>
                          <TableCell className="text-center font-black text-slate-900 border-r border-slate-50">{row.sick_remaining}</TableCell>
                          {/* Personal */}
                          <TableCell className="text-center text-slate-400 border-l border-slate-50">{row.personal_quota}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{row.personal_used}</TableCell>
                          <TableCell className="text-center font-black text-slate-900 border-r border-slate-50">{row.personal_remaining}</TableCell>
                          {/* Vacation */}
                          <TableCell className="text-center text-slate-400 border-l border-slate-50">{row.vacation_quota}</TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{row.vacation_used}</TableCell>
                          <TableCell className="text-center font-black text-slate-900 border-r border-slate-50">{row.vacation_remaining}</TableCell>
                        </>
                      )}
                      {reportType === 'purchase' && (
                        <>
                          <TableCell className="pl-10 py-6 text-slate-400 text-xs">{row.created_at ? format(new Date(row.created_at), "dd/MM/yy") : "-"}</TableCell>
                          <TableCell className="font-bold text-slate-900">{row.title}</TableCell>
                          <TableCell className="font-medium text-slate-600">{row.user?.full_name}</TableCell>
                          <TableCell><Badge className="bg-slate-100 text-slate-600 border-0 uppercase text-[10px]">{row.user?.role || "N/A"}</Badge></TableCell>
                          <TableCell className="pr-10 text-right font-black text-slate-900">{Number(row.total_amount).toLocaleString()} ฿</TableCell>
                        </>
                      )}
                      {reportType === 'car' && (
                        <>
                          <TableCell className="pl-10 py-6 font-bold text-slate-900">{row.license_plate}</TableCell>
                          <TableCell className="font-medium text-slate-600">{row.model}</TableCell>
                          <TableCell className="font-medium text-slate-600">{row.bookings_count} วัน</TableCell>
                          <TableCell className="font-bold text-slate-900">{row.total_mileage?.toLocaleString()} กม.</TableCell>
                          <TableCell className="pr-10 text-right font-black text-blue-600">{row.utilization_rate}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-slate-900 text-white font-black">
                  <TableRow>
                    <TableCell className="pl-10 py-6">Grand Total</TableCell>
                    {reportType === 'wfh' && (
                      <><TableCell>{totals?.office}</TableCell><TableCell>{totals?.home}</TableCell><TableCell>{totals?.onsite}</TableCell><TableCell>{totals?.absent}</TableCell><TableCell className="pr-10 text-right">-</TableCell></>
                    )}
                    {reportType === 'leave' && (
                      <>
                        <TableCell colSpan={3} className="text-center">{totals?.sick}</TableCell>
                        <TableCell colSpan={3} className="text-center">{totals?.personal}</TableCell>
                        <TableCell colSpan={3} className="text-center">{totals?.vacation}</TableCell>
                      </>
                    )}
                    {reportType === 'purchase' && (
                      <><TableCell colSpan={3}></TableCell><TableCell className="pr-10 text-right text-xl">{totals?.amount.toLocaleString()} ฿</TableCell></>
                    )}
                    {reportType === 'car' && (
                      <><TableCell></TableCell><TableCell>{totals?.bookings} วัน</TableCell><TableCell>{totals?.mileage?.toLocaleString()} กม.</TableCell><TableCell className="pr-10 text-right">-</TableCell></>
                    )}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            )}
          </CardContent>
      </Card>
    </div>
  )
}
