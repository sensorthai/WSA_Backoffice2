"use client"

import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, FileBarChart, ChevronLeft, ChevronRight,
  TrendingUp, Users, BookOpen, AlertTriangle, FileSpreadsheet,
  FileText, CheckCircle2, XCircle, Clock, CalendarDays
} from "lucide-react"
import { format } from "date-fns"

export function ReportsMonthly() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const printRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthStr = format(targetDate, "yyyy-MM")
  const monthLabel = targetDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })

  const params = new URLSearchParams({ month: monthStr })
  if (selectedSchool !== "all") params.set("school_id", selectedSchool)
  if (selectedClass !== "all") params.set("class_level", selectedClass)

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-report", monthStr, selectedSchool, selectedClass],
    queryFn: async () => {
      const res = await fetch(`/api/reports/monthly?${params}`)
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const classLevels = [...new Set((data?.assignments || []).map((a: any) => a.class_level).filter(Boolean))] as string[]

  // Export PDF — clone element and resolve oklch colors to rgb for html2canvas compatibility
  async function exportPDF() {
    const html2pdf = (await import("html2pdf.js")).default
    const el = printRef.current
    if (!el) return
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.width = el.offsetWidth + "px"
    function resolveColors(source: Element, target: HTMLElement) {
      const computed = window.getComputedStyle(source)
      const propsToResolve = [
        "color", "backgroundColor", "borderColor",
        "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
        "outlineColor", "textDecorationColor", "boxShadow",
      ]
      for (const prop of propsToResolve) {
        const val = computed.getPropertyValue(prop)
        if (val && val !== "none" && val !== "initial") {
          ;(target.style as any)[prop] = val
        }
      }
      if (source === el) {
        const rootStyles = window.getComputedStyle(document.documentElement)
        const cssVarProps = [
          "--background", "--foreground", "--card", "--card-foreground",
          "--popover", "--popover-foreground", "--primary", "--primary-foreground",
          "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
          "--accent", "--accent-foreground", "--destructive", "--border", "--input", "--ring",
        ]
        for (const v of cssVarProps) {
          const resolved = rootStyles.getPropertyValue(v).trim()
          if (resolved) target.style.setProperty(v, resolved)
        }
      }
      const sourceChildren = source.children
      const targetChildren = target.children
      for (let i = 0; i < sourceChildren.length; i++) {
        if (targetChildren[i] instanceof HTMLElement) {
          resolveColors(sourceChildren[i], targetChildren[i] as HTMLElement)
        }
      }
    }
    resolveColors(el, clone)
    clone.style.position = "absolute"
    clone.style.left = "-9999px"
    clone.style.top = "0"
    document.body.appendChild(clone)
    try {
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `รายงานรายเดือน-${monthStr}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(clone).save()
    } finally {
      document.body.removeChild(clone)
    }
  }

  // Export Excel
  async function exportExcel() {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    const summaryData = [
      ["รายงานรายเดือน", monthLabel], [],
      ["สรุปคาบสอน"],
      ["วันที่สอนจริง", data?.teaching_summary?.actual_days],
      ["วันที่ควรสอน", data?.teaching_summary?.expected_days],
      ["% ครบถ้วน", `${data?.teaching_summary?.completion_rate}%`],
      ["จำนวนคาบทั้งหมด", data?.teaching_summary?.total_periods],
      [], ["สรุปการเข้าเรียน"],
      ["อัตราเข้าเรียนเฉลี่ย", `${data?.attendance?.average_rate}%`],
      ["มาเรียน", data?.attendance?.present],
      ["ขาดเรียน", data?.attendance?.absent],
      ["มาสาย", data?.attendance?.late],
      ["ลา", data?.attendance?.leave],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "สรุป")
    const topicsRows = [["วันที่", "วิชา", "เนื้อหา", "ระดับชั้น"]]
    ;(data?.topics || []).forEach((t: any) => topicsRows.push([t.date, t.subject, t.topics, t.class_level]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topicsRows), "เนื้อหาที่สอน")
    const attRows = [["เลขที่", "ชื่อ-สกุล", "มา", "ขาด", "สาย", "ลา", "% เข้าเรียน"]]
    ;(data?.student_attendance || []).forEach((s: any) => {
      const total = s.present + s.absent + s.late + s.leave
      const rate = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0
      attRows.push([s.student_number, s.name, s.present, s.absent, s.late, s.leave, `${rate}%`])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(attRows), "การเข้าเรียนรายคน")
    const trendRows = [["วันที่", "% เข้าเรียน", "มา", "ทั้งหมด"]]
    ;(data?.daily_trend || []).forEach((d: any) => trendRows.push([d.date, `${d.rate}%`, d.present, d.total]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), "แนวโน้มรายวัน")
    XLSX.writeFile(wb, `รายงานรายเดือน-${monthStr}.xlsx`)
  }

  const ts = data?.teaching_summary
  const att = data?.attendance
  const trend = data?.daily_trend || []

  return (
    <div className="space-y-6">
      {/* Title + Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-rose-500" /> รายงานรายเดือน
          </h2>
          <p className="text-sm text-slate-500 mt-1">สรุปภาพรวมคาบสอน การเข้าเรียน และความคืบหน้าประจำเดือน</p>
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

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedSchool} onValueChange={v => { setSelectedSchool(v); setSelectedClass("all") }}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="ทุกโรงเรียน" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกโรงเรียน</SelectItem>
            {(data?.schools || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {classLevels.length > 0 && (
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="ทุกชั้น" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกชั้น</SelectItem>
              {classLevels.sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {data && (
          <>
            <Button variant="outline" size="sm" className="gap-2 h-9" onClick={exportPDF}>
              <FileText className="h-4 w-4 text-red-500" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2 h-9" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
      ) : !data ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"><p className="text-slate-500">ไม่สามารถโหลดข้อมูลได้</p></div>
      ) : (
        <div ref={printRef} className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={<CalendarDays className="h-5 w-5" />} label="คาบสอน" value={`${ts?.actual_days || 0}/${ts?.expected_days || 0}`} sub={`${ts?.completion_rate || 0}% ครบถ้วน`} color="indigo" rate={ts?.completion_rate} />
            <KPICard icon={<Users className="h-5 w-5" />} label="อัตราเข้าเรียน" value={`${att?.average_rate || 0}%`} sub={`มา ${att?.present || 0} จาก ${att?.total_records || 0}`} color="emerald" rate={att?.average_rate} />
            <KPICard icon={<BookOpen className="h-5 w-5" />} label="เนื้อหาสอน" value={`${(data?.topics || []).length}`} sub={`${ts?.subjects?.length || 0} วิชา`} color="blue" />
            <KPICard icon={<AlertTriangle className="h-5 w-5" />} label="นร.ขาดมาก" value={`${(data?.top_absent_students || []).length}`} sub="Top 5" color="rose" />
          </div>

          {/* Attendance Line Chart */}
          {trend.length > 0 && (
            <div className="bg-white rounded-2xl border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> แนวโน้มการเข้าเรียน
              </h3>
              <div className="relative h-[220px] flex items-end gap-[2px] overflow-x-auto pb-8">
                <div className="absolute left-0 top-0 h-[180px] flex flex-col justify-between text-[10px] text-slate-400 pr-2 w-8 z-10">
                  <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                </div>
                <div className="absolute left-8 right-0 top-0 h-[180px]">
                  {[0, 25, 50, 75, 100].map(v => (
                    <div key={v} className="absolute w-full border-t border-dashed border-slate-100" style={{ bottom: `${(v / 100) * 100}%` }} />
                  ))}
                </div>
                <div className="flex items-end gap-1 ml-10 flex-1 h-[180px] relative">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox={`0 0 ${trend.length * 40} 180`}>
                    <polyline points={trend.map((d: any, i: number) => `${i * 40 + 16},${180 - (d.rate / 100) * 180}`).join(" ")}
                      fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    {trend.map((d: any, i: number) => (
                      <circle key={i} cx={i * 40 + 16} cy={180 - (d.rate / 100) * 180} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                    ))}
                  </svg>
                  {trend.map((d: any, i: number) => (
                    <div key={i} className="flex flex-col items-center" style={{ minWidth: 32 }}>
                      <div className="relative w-7 rounded-t-md transition-all duration-500" style={{
                        height: `${Math.max((d.rate / 100) * 180, 4)}px`,
                        background: d.rate >= 80 ? "linear-gradient(to top, #6ee7b7, #34d399)" : d.rate >= 60 ? "linear-gradient(to top, #fde68a, #fbbf24)" : "linear-gradient(to top, #fca5a5, #f87171)",
                      }}>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600 whitespace-nowrap">{d.rate}%</span>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 whitespace-nowrap">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attendance stats + Top 5 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-blue-500" /> สถิติการเข้าเรียน
              </h3>
              <div className="space-y-3">
                <AttBar label="มาเรียน" count={att?.present || 0} total={att?.total_records || 1} color="bg-emerald-500" icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} />
                <AttBar label="ขาดเรียน" count={att?.absent || 0} total={att?.total_records || 1} color="bg-red-500" icon={<XCircle className="h-3.5 w-3.5 text-red-500" />} />
                <AttBar label="มาสาย" count={att?.late || 0} total={att?.total_records || 1} color="bg-amber-500" icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} />
                <AttBar label="ลา" count={att?.leave || 0} total={att?.total_records || 1} color="bg-blue-500" icon={<CalendarDays className="h-3.5 w-3.5 text-blue-500" />} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Top 5 นักเรียนที่ขาดมากสุด
              </h3>
              {(data?.top_absent_students || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">ไม่มีนักเรียนขาดเรียน 🎉</div>
              ) : (
                <div className="space-y-2">
                  {(data?.top_absent_students || []).map((s: any, i: number) => (
                    <div key={s.student_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        i === 0 ? "bg-red-500 text-white" : i === 1 ? "bg-red-400 text-white" : "bg-red-100 text-red-600"
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        {s.student_number && <p className="text-[10px] text-slate-400">เลขที่ {s.student_number}</p>}
                      </div>
                      <Badge className="bg-red-50 text-red-700 border-red-200 font-bold">{s.absent_count} ครั้ง</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Topics covered */}
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-indigo-500" /> ความคืบหน้า — เนื้อหาที่สอนทั้งเดือน
            </h3>
            {(data?.topics || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">ไม่มีข้อมูลเนื้อหาที่สอน</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">วันที่</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">วิชา</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">ชั้น</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">เนื้อหา</th>
                  </tr></thead>
                  <tbody>
                    {(data?.topics || []).map((t: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 font-mono text-xs whitespace-nowrap">{t.date}</td>
                        <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{t.subject}</Badge></td>
                        <td className="py-2 px-3 text-xs text-slate-500">{t.class_level}</td>
                        <td className="py-2 px-3 text-slate-700">{t.topics}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ icon, label, value, sub, color, rate }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string; rate?: number }) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-50 to-indigo-100/50 border-indigo-200",
    emerald: "from-emerald-50 to-emerald-100/50 border-emerald-200",
    blue: "from-blue-50 to-blue-100/50 border-blue-200",
    rose: "from-rose-50 to-rose-100/50 border-rose-200",
  }
  const iconColor: Record<string, string> = { indigo: "text-indigo-500", emerald: "text-emerald-500", blue: "text-blue-500", rose: "text-rose-500" }
  const valueColor: Record<string, string> = { indigo: "text-indigo-700", emerald: "text-emerald-700", blue: "text-blue-700", rose: "text-rose-700" }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 shadow-sm`}>
      <div className={`${iconColor[color]} mb-2`}>{icon}</div>
      <p className={`text-3xl font-black ${valueColor[color]}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
      {rate !== undefined && (
        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${rate >= 80 ? "bg-emerald-400" : rate >= 60 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${Math.min(rate, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

function AttBar({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon: React.ReactNode }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600 flex items-center gap-1.5">{icon} {label}</span>
        <span className="text-sm font-bold text-slate-700">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
