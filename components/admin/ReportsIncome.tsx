"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, ChevronLeft, ChevronRight, Users, DollarSign,
  TrendingUp, Banknote, School, BookOpen, CalendarDays, FileSpreadsheet
} from "lucide-react"
import { format } from "date-fns"

export function ReportsIncome() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [filterTeacher, setFilterTeacher] = useState("all")
  const [filterSchool, setFilterSchool] = useState("all")

  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthStr = format(targetDate, "yyyy-MM")
  const monthLabel = targetDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })

  const params = new URLSearchParams({ month: monthStr })
  if (filterTeacher !== "all") params.set("teacher_id", filterTeacher)
  if (filterSchool !== "all") params.set("school_id", filterSchool)

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-income", monthStr, filterTeacher, filterSchool],
    queryFn: async () => {
      const res = await fetch(`/api/reports/teacher-income?${params}`)
      return res.ok ? res.json() : null
    },
  })

  const rows = data?.rows || []
  const teacherTotals = data?.teacher_totals || []
  const grand = data?.grand_total
  const fmtMoney = (n: number) => n.toLocaleString("th-TH")

  // Group rows by teacher for display
  const grouped: Record<string, any[]> = {}
  for (const r of rows) {
    if (!grouped[r.teacher_id]) grouped[r.teacher_id] = []
    grouped[r.teacher_id].push(r)
  }

  // Export Excel
  async function exportExcel() {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    // Sheet 1: Detailed breakdown
    const detailRows = [["รายงานรายได้ครู", monthLabel], []]
    detailRows.push(["ครู", "โรงเรียน", "วิชา", "ระดับชั้น", "ค่าสอน/คาบ", "คาบ/วัน", "วันสอน", "คาบรวม", "รายได้ (฿)"])
    for (const r of rows) {
      detailRows.push([
        r.teacher_name, r.school_name, r.subject_name, r.class_level,
        r.teaching_fee, r.periods_per_day, r.teach_days, r.total_periods, r.income
      ])
    }
    detailRows.push([])
    detailRows.push(["รวมทั้งหมด", "", "", "", "", "", "", grand?.total_periods || 0, grand?.total_income || 0])
    const ws1 = XLSX.utils.aoa_to_sheet(detailRows)
    // Set column widths
    ws1["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 10 },
      { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, ws1, "รายละเอียด")

    // Sheet 2: Teacher summary
    const summaryRows: any[][] = [["สรุปรายครู", monthLabel], []]
    summaryRows.push(["ครู", "จำนวนงาน", "คาบรวม", "วันรวม", "รายได้ (฿)"])
    for (const t of teacherTotals) {
      summaryRows.push([t.teacher_name, t.assignments, t.total_periods, t.total_days, t.total_income])
    }
    summaryRows.push([])
    summaryRows.push(["รวมทั้งหมด", `${grand?.teachers || 0} ครู`, grand?.total_periods || 0, "", grand?.total_income || 0])
    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows)
    ws2["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws2, "สรุปรายครู")

    XLSX.writeFile(wb, `รายได้ครู-${monthStr}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Title + Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-500" /> รายงานรายได้ครู
          </h2>
          <p className="text-sm text-slate-500 mt-1">สรุปรายได้ค่าสอนตามคาบสอนที่ส่งรายงานแล้ว</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[140px]">
            <p className="text-sm font-bold text-slate-700">{monthLabel}</p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {monthOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setMonthOffset(0)}>เดือนนี้</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
          <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue placeholder="ครูทั้งหมด" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ครูทั้งหมด</SelectItem>
            {(data?.teachers || []).map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSchool} onValueChange={setFilterSchool}>
          <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue placeholder="ทุกโรงเรียน" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกโรงเรียน</SelectItem>
            {(data?.schools || []).map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {!isLoading && grand && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={<Users className="h-4 w-4 text-indigo-500" />} label="ครูทั้งหมด" value={grand.teachers} />
          <SummaryCard icon={<CalendarDays className="h-4 w-4 text-blue-500" />} label="คาบรวม" value={grand.total_periods.toLocaleString()} />
          <SummaryCard icon={<Banknote className="h-4 w-4 text-emerald-500" />} label="รายจ่ายค่าสอน" value={`฿${fmtMoney(grand.total_income)}`} highlight />
          <SummaryCard icon={<TrendingUp className="h-4 w-4 text-amber-500" />} label="เฉลี่ย/ครู" value={`฿${fmtMoney(grand.avg_per_teacher)}`} />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
      ) : rows.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-slate-400">ไม่มีข้อมูลรายได้ในเดือนนี้</p>
        </div>
      ) : (
        <>
          {/* Detailed Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
            <div className="px-5 py-4 border-b bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" /> ตารางรายได้รายครู
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>ครู</TableHead>
                  <TableHead>โรงเรียน</TableHead>
                  <TableHead>วิชา</TableHead>
                  <TableHead className="text-center">ค่าสอน/คาบ</TableHead>
                  <TableHead className="text-center">คาบ/วัน</TableHead>
                  <TableHead className="text-center">วันสอน</TableHead>
                  <TableHead className="text-center">คาบรวม</TableHead>
                  <TableHead className="text-right">รายได้</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).map(([teacherId, teacherRows]) => {
                  const total = teacherTotals.find((t: any) => t.teacher_id === teacherId)
                  return (
                    <> 
                      {teacherRows.map((r: any, idx: number) => (
                        <TableRow key={`${teacherId}-${idx}`} className="hover:bg-slate-50/50">
                          {idx === 0 ? (
                            <TableCell rowSpan={teacherRows.length} className="align-top border-r border-slate-100">
                              <span className="font-semibold text-slate-800 text-sm">{r.teacher_name}</span>
                            </TableCell>
                          ) : null}
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <School className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>{r.school_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <BookOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>{r.subject_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            ฿{fmtMoney(r.teaching_fee)}
                          </TableCell>
                          <TableCell className="text-center text-sm">{r.periods_per_day}</TableCell>
                          <TableCell className="text-center text-sm">{r.teach_days}</TableCell>
                          <TableCell className="text-center font-bold text-sm">{r.total_periods}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold text-sm ${r.income > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                              ฿{fmtMoney(r.income)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Teacher subtotal row */}
                      {total && teacherRows.length > 1 && (
                        <TableRow className="bg-indigo-50/50 border-t-2 border-indigo-200">
                          <TableCell colSpan={5} className="text-right text-sm font-bold text-indigo-700">
                            รวม {total.teacher_name}
                          </TableCell>
                          <TableCell className="text-center font-bold text-sm text-indigo-700">{total.total_days}</TableCell>
                          <TableCell className="text-center font-bold text-sm text-indigo-700">{total.total_periods}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-black text-indigo-700">฿{fmtMoney(total.total_income)}</span>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
                {/* Grand total */}
                <TableRow className="bg-emerald-50 border-t-2 border-emerald-300">
                  <TableCell colSpan={5} className="text-right font-black text-emerald-800">
                    รวมทั้งหมด ({grand?.teachers} ครู)
                  </TableCell>
                  <TableCell className="text-center font-black text-emerald-800">—</TableCell>
                  <TableCell className="text-center font-black text-emerald-800">{grand?.total_periods.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-black text-lg text-emerald-700">฿{fmtMoney(grand?.total_income || 0)}</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Teacher Summary Cards */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> สรุปรายครู
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teacherTotals.map((t: any) => (
                <div key={t.teacher_id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-colors border">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{t.teacher_name}</p>
                    <p className="text-[11px] text-slate-500">{t.assignments} งาน · {t.total_periods} คาบ · {t.total_days} วัน</p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-sm px-3">
                    ฿{fmtMoney(t.total_income)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm ${highlight ? "ring-2 ring-emerald-200 bg-emerald-50/30" : ""}`}>
      <div className="mb-2">{icon}</div>
      <p className={`text-2xl font-black ${highlight ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}
