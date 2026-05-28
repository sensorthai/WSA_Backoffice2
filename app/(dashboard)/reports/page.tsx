"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo, Suspense, Fragment } from "react"
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
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Receipt,
  FileText
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

type ReportType = 'wfh' | 'leave' | 'purchase' | 'car'

const reportConfigs = {
  wfh: { title: "รายงานการเข้างาน", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  leave: { title: "รายงานการลาหยุด", icon: Palmtree, color: "text-emerald-600", bg: "bg-emerald-50" },
  purchase: { title: "รายงานการเบิกจ่าย", icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-50" },
  car: { title: "รายงานการใช้รถบริษัท", icon: Car, color: "text-indigo-600", bg: "bg-indigo-50" }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold text-[10px]">อนุมัติแล้ว</Badge>
    case 'rejected': return <Badge className="bg-rose-100 text-rose-700 border-0 font-bold text-[10px]">ถูกปฏิเสธ</Badge>
    case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-0 font-bold text-[10px]">รออนุมัติ</Badge>
    default: return <Badge className="bg-slate-100 text-slate-600 border-0 font-bold text-[10px]">{status}</Badge>
  }
}

const paymentLabels: Record<string, string> = { petty_cash: 'เงินสดย่อย', credit_card: 'บัตรเครดิต', k_biz: 'K-Biz' }

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
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["reports", reportType, month, deptFilter],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=${reportType}&month=${month}&department_id=${deptFilter}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "เกิดข้อผิดพลาดในการดึงข้อมูล")
      return json
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
    } catch {
      alert("เกิดข้อผิดพลาดในการส่งอีเมล")
    }
  }

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    let result = data
    if (reportType === 'purchase' && statusFilter !== 'all') {
      result = result.filter((row: any) => row.status === statusFilter)
    }
    if (!search.trim()) return result
    const query = search.toLowerCase()
    return result.filter((row: any) => {
      if (reportType === 'wfh') return row.name?.toLowerCase().includes(query)
      if (reportType === 'leave') return row.name?.toLowerCase().includes(query)
      if (reportType === 'purchase') {
        return (
          row.title?.toLowerCase().includes(query) ||
          row.user?.full_name?.toLowerCase().includes(query) ||
          row.document_number?.toLowerCase().includes(query) ||
          row.vendor?.toLowerCase().includes(query) ||
          row.customer_name?.toLowerCase().includes(query) ||
          row.project_name?.toLowerCase().includes(query)
        )
      }
      if (reportType === 'car') {
        return row.license_plate?.toLowerCase().includes(query) || row.model?.toLowerCase().includes(query)
      }
      return false
    })
  }, [data, search, reportType, statusFilter])

  const totals = useMemo(() => {
    if (!filteredData || !Array.isArray(filteredData)) return null
    if (reportType === 'wfh') {
      return { office: filteredData.reduce((s: number, r: any) => s + r.office_days, 0), home: filteredData.reduce((s: number, r: any) => s + r.wfh_days, 0), onsite: filteredData.reduce((s: number, r: any) => s + r.onsite_days, 0), absent: filteredData.reduce((s: number, r: any) => s + r.absent_days, 0) }
    }
    if (reportType === 'leave') {
      return { sick: filteredData.reduce((s: number, r: any) => s + r.sick_used, 0), personal: filteredData.reduce((s: number, r: any) => s + r.personal_used, 0), vacation: filteredData.reduce((s: number, r: any) => s + r.vacation_used, 0) }
    }
    if (reportType === 'purchase') {
      return {
        amount: filteredData.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0),
        beforeVat: filteredData.reduce((s: number, r: any) => s + Number(r.amount_before_vat || 0), 0),
        vat: filteredData.reduce((s: number, r: any) => s + Number(r.vat_amount || 0), 0),
        count: filteredData.length,
        approved: filteredData.filter((r: any) => r.status === 'approved').length,
        pending: filteredData.filter((r: any) => r.status === 'pending').length,
        rejected: filteredData.filter((r: any) => r.status === 'rejected').length
      }
    }
    if (reportType === 'car') {
      return { mileage: filteredData.reduce((s: number, r: any) => s + r.total_mileage, 0), bookings: filteredData.reduce((s: number, r: any) => s + r.bookings_count, 0) }
    }
    return null
  }, [filteredData, reportType])

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-700 print:p-0 print:m-0 print:space-y-4">
      {/* Print Header */}
      <div className="hidden print:block mb-6 border-b-4 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900">บริษัท เซนเซอร์ไทย จำกัด</h1>
            <h2 className="text-xl font-bold text-slate-700 mt-1">รายงานสรุปการเบิกจ่าย</h2>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>ประจำเดือน: {format(new Date(month + '-01'), "MMMM yyyy", { locale: th })}</p>
            <p>พิมพ์เมื่อ: {format(new Date(), "d MMMM yyyy HH:mm", { locale: th })}</p>
            <p>จำนวนรายการ: {filteredData.length} รายการ</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 no-print">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3 md:gap-4">
            <FileBarChart className="text-blue-600 w-8 h-8 md:w-10 md:h-10" /> ระบบรายงาน WSA
          </h1>
          <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">Analytics & Financial Reporting</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 md:h-12 px-4 md:px-6 rounded-2xl border-slate-100 font-black gap-2 text-sm" onClick={() => window.print()}>
            <Printer size={16} /> <span className="hidden sm:inline">พิมพ์รายงาน</span><span className="sm:hidden">พิมพ์</span>
          </Button>
          <Button variant="outline" className="h-11 md:h-12 px-4 md:px-6 rounded-2xl border-slate-100 font-black gap-2 text-blue-600 hover:bg-blue-50 text-sm" onClick={handleSendGmail}>
            <Mail size={16} /> <span className="hidden sm:inline">ส่ง Gmail</span>
          </Button>
          <Button className="h-11 md:h-12 px-6 md:px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black gap-2 shadow-xl text-sm" onClick={handleExportCsv}>
            <Download size={16} /> CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-[2rem] md:rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white no-print">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-end gap-4 md:gap-6">
          <div className="space-y-2 flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกเดือนที่ต้องการ</label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold px-4" />
          </div>
          <div className="space-y-2 flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">แผนก</label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="all">ทุกแผนก</SelectItem>
                <SelectItem value="it">IT Department</SelectItem>
                <SelectItem value="hr">HR & Admin</SelectItem>
                <SelectItem value="sales">Sales & Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reportType === 'purchase' && (
            <div className="space-y-2 flex-1 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะ</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                  <SelectItem value="pending">รออนุมัติ</SelectItem>
                  <SelectItem value="rejected">ถูกปฏิเสธ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="h-12 w-full md:w-auto px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20 gap-2" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="animate-spin" /> : "ดูรายงาน"}
          </Button>
        </CardContent>
      </Card>

      {/* Purchase Summary Cards */}
      {reportType === 'purchase' && totals && !isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 no-print">
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการทั้งหมด</div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{(totals as any).count}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-600">✓{(totals as any).approved}</span>
                <span className="text-[10px] font-bold text-amber-600">◷{(totals as any).pending}</span>
                <span className="text-[10px] font-bold text-rose-600">✕{(totals as any).rejected}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยอดก่อน VAT</div>
              <div className="text-lg md:text-2xl font-black text-slate-900 mt-1">{Number((totals as any).beforeVat).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">บาท</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VAT รวม</div>
              <div className="text-lg md:text-2xl font-black text-amber-600 mt-1">{Number((totals as any).vat).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">บาท</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-blue-100 shadow-sm bg-blue-50/30">
            <CardContent className="p-4 md:p-5">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">ยอดรวมเบิกจ่าย</div>
              <div className="text-lg md:text-2xl font-black text-blue-700 mt-1">{Number((totals as any).amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] font-bold text-blue-400 mt-1">บาท</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print Summary */}
      {reportType === 'purchase' && totals && (
        <div className="hidden print:grid print:grid-cols-4 print:gap-4 print:text-sm print:border print:border-slate-300 print:rounded-lg print:p-4">
          <div><strong>รายการ:</strong> {(totals as any).count}</div>
          <div><strong>ยอดก่อน VAT:</strong> {Number((totals as any).beforeVat).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</div>
          <div><strong>VAT:</strong> {Number((totals as any).vat).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</div>
          <div><strong>ยอดรวม:</strong> {Number((totals as any).amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</div>
        </div>
      )}

      {/* Data Table */}
      <Card className="rounded-[2rem] md:rounded-[3rem] print:rounded-none border-0 shadow-sm ring-1 ring-slate-100 print:ring-0 bg-white overflow-hidden">
        <div className="px-6 md:px-10 pt-6 md:pt-10 bg-slate-50/50 border-b border-slate-100 no-print">
          <div className="flex flex-col md:flex-row items-center justify-between py-4 md:py-6 gap-4">
            <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              {reportConfigs[reportType].title}
              <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-400 font-bold uppercase text-[10px]">{month}</Badge>
            </h3>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="ค้นหา เลขที่เอกสาร, คู่ค้า, โครงการ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl border-slate-100 bg-white shadow-inner font-medium text-sm" />
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-40 text-center space-y-4"><Loader2 className="animate-spin text-blue-600 w-12 h-12 mx-auto" /><p className="text-slate-400 font-bold">กำลังประมวลผลข้อมูล...</p></div>
          ) : error ? (
            <div className="py-24 text-center space-y-6 max-w-md mx-auto">
              <div className="p-6 bg-rose-50 text-rose-500 rounded-full inline-block"><AlertCircle size={48} /></div>
              <h3 className="text-xl font-black text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
              <p className="text-slate-500 font-medium">{error instanceof Error ? error.message : String(error)}</p>
              <Button onClick={() => refetch()} variant="outline" className="rounded-xl px-6 h-11 border-slate-200">ลองใหม่อีกครั้ง</Button>
            </div>
          ) : !Array.isArray(data) ? (
            <div className="py-24 text-center space-y-6 max-w-md mx-auto">
              <div className="p-6 bg-rose-50 text-rose-500 rounded-full inline-block"><AlertCircle size={48} /></div>
              <h3 className="text-xl font-black text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
              <p className="text-slate-500 font-medium">{(data as any)?.error || "ข้อมูลไม่ถูกต้อง"}</p>
              <Button onClick={() => refetch()} variant="outline" className="rounded-xl px-6 h-11 border-slate-200">ลองใหม่อีกครั้ง</Button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <Table className="print:text-[11px]" style={{ minWidth: reportType === 'purchase' ? 1000 : undefined }}>
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
                        <TableHead className="pl-4 print:pl-1 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest w-6"></TableHead>
                        <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">วันที่</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">เลขที่เอกสาร</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">รายการ</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">คู่ค้า</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ผู้ขอ</TableHead>
                        <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ชำระ</TableHead>
                        <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">ก่อน VAT</TableHead>
                        <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">VAT</TableHead>
                        <TableHead className="text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">ยอดรวม</TableHead>
                        <TableHead className="pr-4 print:pr-1 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">สถานะ</TableHead>
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
                  {filteredData.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-20 text-slate-400 font-bold">ไม่พบข้อมูลรายงานในระบบ</TableCell></TableRow>
                  ) : (
                    filteredData.map((row: any, idx: number) => (
                      <Fragment key={idx}>
                        <TableRow className={`border-slate-50 hover:bg-slate-50/30 ${reportType === 'purchase' ? 'cursor-pointer' : ''}`} onClick={() => reportType === 'purchase' && toggleRow(idx)}>
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
                              <TableCell className="text-center text-slate-400 border-l border-slate-50">{row.sick_quota}</TableCell>
                              <TableCell className="text-center font-bold text-amber-600">{row.sick_used}</TableCell>
                              <TableCell className="text-center font-black text-slate-900 border-r border-slate-50">{row.sick_remaining}</TableCell>
                              <TableCell className="text-center text-slate-400 border-l border-slate-50">{row.personal_quota}</TableCell>
                              <TableCell className="text-center font-bold text-blue-600">{row.personal_used}</TableCell>
                              <TableCell className="text-center font-black text-slate-900 border-r border-slate-50">{row.personal_remaining}</TableCell>
                              <TableCell className="text-center text-slate-400 border-l border-slate-50">{row.vacation_quota}</TableCell>
                              <TableCell className="text-center font-bold text-emerald-600">{row.vacation_used}</TableCell>
                              <TableCell className="text-center font-black text-slate-900 border-r border-slate-50">{row.vacation_remaining}</TableCell>
                            </>
                          )}
                          {reportType === 'purchase' && (
                            <>
                              <TableCell className="pl-4 print:pl-1 py-3 w-6 no-print">
                                {expandedRows.has(idx) ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400 print:hidden" />}
                              </TableCell>
                              <TableCell className="py-3 text-slate-500 text-xs font-mono whitespace-nowrap">{row.document_date || (row.created_at ? format(new Date(row.created_at), "dd/MM/yy") : "-")}</TableCell>
                              <TableCell className="text-xs font-mono font-bold text-blue-600 whitespace-nowrap">{row.document_number || "-"}</TableCell>
                              <TableCell className="font-bold text-slate-900 text-sm max-w-[180px] truncate">
                                {row.source === 'reimbursement' && <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] mr-1.5 align-middle">Petty Cash</Badge>}
                                {row.title}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600 max-w-[140px] truncate">{row.vendor || "-"}</TableCell>
                              <TableCell className="text-sm text-slate-600 whitespace-nowrap">{row.user?.full_name}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap"><Badge className="bg-slate-100 text-slate-600 border-0 text-[10px]">{paymentLabels[row.payment_method] || '-'}</Badge></TableCell>
                              <TableCell className="text-right font-medium text-slate-600 text-sm tabular-nums">{Number(row.amount_before_vat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-medium text-amber-600 text-sm tabular-nums">{Number(row.vat_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-black text-slate-900 text-sm tabular-nums">{Number(row.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="pr-4 print:pr-1 text-center">{getStatusBadge(row.status)}</TableCell>
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
                        {/* Expanded Detail Row for Purchase */}
                        {reportType === 'purchase' && expandedRows.has(idx) && (
                          <TableRow className="bg-slate-50/50 print:bg-white border-slate-100">
                            <TableCell colSpan={11} className="px-4 print:px-1 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="space-y-2 p-3 md:p-4 bg-white rounded-2xl border border-slate-100 print:border-slate-300 print:rounded-none print:p-2">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Building2 size={12} /> ข้อมูลคู่ค้า</div>
                                  <div className="font-bold text-slate-800 text-sm">{row.vendor || '-'}</div>
                                  {row.vendor_address && <div className="text-slate-500 text-xs">{row.vendor_address}</div>}
                                  {row.vendor_tax_id && <div className="text-xs"><span className="text-slate-400">Tax ID:</span> <span className="font-mono font-bold">{row.vendor_tax_id}</span></div>}
                                </div>
                                <div className="space-y-2 p-3 md:p-4 bg-white rounded-2xl border border-slate-100 print:border-slate-300 print:rounded-none print:p-2">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><FileText size={12} /> ลูกค้า / โครงการ</div>
                                  {row.customer_name && <div className="text-xs"><span className="text-slate-400">ลูกค้า:</span> <span className="font-bold text-slate-800">{row.customer_name}</span></div>}
                                  {row.customer_tax_id && <div className="text-xs"><span className="text-slate-400">Tax ID:</span> <span className="font-mono font-bold">{row.customer_tax_id}</span></div>}
                                  {row.project_name && <div className="text-xs"><span className="text-slate-400">โครงการ:</span> <span className="font-bold text-blue-700">{row.project_name}</span></div>}
                                  {row.document_type && <div className="text-xs"><span className="text-slate-400">ประเภท:</span> <span className="font-bold">{row.document_type}</span></div>}
                                </div>
                                <div className="space-y-2 p-3 md:p-4 bg-white rounded-2xl border border-slate-100 print:border-slate-300 print:rounded-none print:p-2">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Receipt size={12} /> รายการสินค้า</div>
                                  {(row.items || []).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className="text-slate-600">{i+1}. {item.name} x{item.quantity}</span>
                                      <span className="font-bold text-slate-900 tabular-nums">{(item.quantity * item.unit_price).toLocaleString('th-TH')} ฿</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {(row.supervisor_note || row.ceo_note || row.purpose) && (
                                <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs text-slate-600 space-y-1 print:bg-white print:border-slate-300">
                                  {row.purpose && <div><span className="font-bold text-slate-400">วัตถุประสงค์:</span> {row.purpose}</div>}
                                  {row.supervisor_note && <div><span className="font-bold text-amber-600">หัวหน้า:</span> {row.supervisor_note}</div>}
                                  {row.ceo_note && <div><span className="font-bold text-blue-600">CEO:</span> {row.ceo_note}</div>}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  )}
                </TableBody>
                <TableFooter className="bg-slate-900 text-white font-black print:bg-slate-800">
                  <TableRow>
                    <TableCell className="pl-10 print:pl-2 py-6" colSpan={reportType === 'purchase' ? 2 : 1}>Grand Total</TableCell>
                    {reportType === 'wfh' && (
                      <><TableCell>{(totals as any)?.office}</TableCell><TableCell>{(totals as any)?.home}</TableCell><TableCell>{(totals as any)?.onsite}</TableCell><TableCell>{(totals as any)?.absent}</TableCell><TableCell className="pr-10 text-right">-</TableCell></>
                    )}
                    {reportType === 'leave' && (
                      <>
                        <TableCell colSpan={3} className="text-center">{(totals as any)?.sick}</TableCell>
                        <TableCell colSpan={3} className="text-center">{(totals as any)?.personal}</TableCell>
                        <TableCell colSpan={3} className="text-center">{(totals as any)?.vacation}</TableCell>
                      </>
                    )}
                    {reportType === 'purchase' && (
                      <>
                        <TableCell colSpan={5}></TableCell>
                        <TableCell className="text-right tabular-nums">{Number((totals as any)?.beforeVat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-300">{Number((totals as any)?.vat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right tabular-nums text-xl">{Number((totals as any)?.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</TableCell>
                        <TableCell className="pr-4 print:pr-1"></TableCell>
                      </>
                    )}
                    {reportType === 'car' && (
                      <><TableCell></TableCell><TableCell>{(totals as any)?.bookings} วัน</TableCell><TableCell>{(totals as any)?.mileage?.toLocaleString()} กม.</TableCell><TableCell className="pr-10 text-right">-</TableCell></>
                    )}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Footer - Signature Blocks */}
      <div className="hidden print:block mt-8 pt-6 border-t-2 border-slate-300">
        <div className="grid grid-cols-3 gap-8 text-center text-sm">
          <div className="space-y-8">
            <p className="text-slate-500">ผู้จัดทำรายงาน</p>
            <div className="border-b border-slate-300 w-48 mx-auto"></div>
            <p className="text-slate-400 text-xs">วันที่ ......./......./.......  </p>
          </div>
          <div className="space-y-8">
            <p className="text-slate-500">ผู้ตรวจสอบ</p>
            <div className="border-b border-slate-300 w-48 mx-auto"></div>
            <p className="text-slate-400 text-xs">วันที่ ......./......./.......  </p>
          </div>
          <div className="space-y-8">
            <p className="text-slate-500">ผู้อนุมัติ</p>
            <div className="border-b border-slate-300 w-48 mx-auto"></div>
            <p className="text-slate-400 text-xs">วันที่ ......./......./.......  </p>
          </div>
        </div>
      </div>
    </div>
  )
}
