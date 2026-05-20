"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Save,
  X,
  BarChart3,
  Activity,
  Sparkles,
  Search,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────
interface ApiLog {
  id: string
  api_name: string
  tokens_used: number
  cost: number
  status: "success" | "error"
  user_id: string | null
  created_at: string
}

interface ApiSettings {
  total_budget_usd: number
  cost_per_request_usd: number
  currency: string
}

interface ApiData {
  settings: ApiSettings
  logs: ApiLog[]
  totalCost: number
  isMock: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────
function formatUSD(v: number) {
  return `$${v.toFixed(4)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function groupByDay(logs: ApiLog[]) {
  const map = new Map<string, { date: string; cost: number; count: number; errors: number }>()
  logs.forEach((log) => {
    const day = log.created_at.slice(0, 10)
    const existing = map.get(day) || { date: day, cost: 0, count: 0, errors: 0 }
    existing.cost += parseFloat(String(log.cost))
    existing.count += 1
    if (log.status === "error") existing.errors += 1
    map.set(day, existing)
  })
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Component ─────────────────────────────────────────────────────
export function GoogleApiCredits() {
  const queryClient = useQueryClient()
  const [editBudget, setEditBudget] = useState(false)
  const [budgetValue, setBudgetValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(30)
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 15

  const { data, isLoading, isError } = useQuery<ApiData>({
    queryKey: ["google-api-credits"],
    queryFn: async () => {
      const res = await fetch("/api/admin/google-api")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const updateBudgetMutation = useMutation({
    mutationFn: async (newBudget: number) => {
      const res = await fetch("/api/admin/google-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_budget_usd: newBudget }),
      })
      if (!res.ok) throw new Error("Failed to update budget")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-api-credits"] })
      setEditBudget(false)
    },
  })

  // Derived data
  const totalBudget = data?.settings?.total_budget_usd || 300
  const totalUsed = data?.totalCost || 0
  const remaining = Math.max(totalBudget - totalUsed, 0)
  const usagePercent = totalBudget > 0 ? Math.min((totalUsed / totalBudget) * 100, 100) : 0
  const isLowBudget = usagePercent > 80
  const isCritical = usagePercent > 95

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysFilter)
    let filtered = data.logs.filter((l) => new Date(l.created_at) >= cutoff)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.api_name.toLowerCase().includes(q) ||
          l.status.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [data?.logs, daysFilter, searchQuery])

  const dailyData = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysFilter)
    const recent = (data?.logs || []).filter((l) => new Date(l.created_at) >= cutoff)
    return groupByDay(recent)
  }, [data?.logs, daysFilter])

  const maxDailyCost = Math.max(...dailyData.map((d) => d.cost), 0.001)

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  )

  // Stats for filtered period
  const periodStats = useMemo(() => {
    const successLogs = filteredLogs.filter((l) => l.status === "success")
    const errorLogs = filteredLogs.filter((l) => l.status === "error")
    const totalTokens = filteredLogs.reduce((s, l) => s + (l.tokens_used || 0), 0)
    const totalCostPeriod = filteredLogs.reduce((s, l) => s + parseFloat(String(l.cost)), 0)
    return {
      totalRequests: filteredLogs.length,
      successCount: successLogs.length,
      errorCount: errorLogs.length,
      totalTokens,
      totalCostPeriod,
      avgCost: filteredLogs.length > 0 ? totalCostPeriod / filteredLogs.length : 0,
    }
  }, [filteredLogs])

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
        <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูล Google API...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 font-bold">ไม่สามารถโหลดข้อมูลได้</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Mock data notice */}
      {data?.isMock && (
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-50 border border-amber-200/50 text-amber-800">
          <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium">
            กำลังแสดงข้อมูลจำลอง — กรุณารัน Migration SQL <code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">025_add_google_api_usage_logs.sql</code> ใน Supabase เพื่อเปิดใช้งานจริง
          </p>
        </div>
      )}

      {/* ── Credit Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Budget */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px]" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/20 rounded-2xl">
                <Coins className="w-6 h-6 text-amber-400" />
              </div>
              {!editBudget ? (
                <button
                  onClick={() => {
                    setBudgetValue(String(totalBudget))
                    setEditBudget(true)
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  title="แก้ไขงบประมาณ"
                >
                  <Pencil size={14} className="text-slate-400" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const v = parseFloat(budgetValue)
                      if (v > 0) updateBudgetMutation.mutate(v)
                    }}
                    disabled={updateBudgetMutation.isPending}
                    className="p-2 rounded-xl hover:bg-emerald-500/20 transition-colors"
                  >
                    {updateBudgetMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin text-emerald-400" />
                    ) : (
                      <Save size={14} className="text-emerald-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditBudget(false)}
                    className="p-2 rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/70">
              งบประมาณรวม
            </p>
            {editBudget ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-300">$</span>
                <input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="w-full text-3xl font-black bg-white/10 rounded-xl px-3 py-1 border border-white/10 focus:outline-none focus:border-amber-400/50 text-white"
                  min={0}
                  step={10}
                  autoFocus
                />
              </div>
            ) : (
              <p className="text-4xl font-black tracking-tight text-amber-300">
                ${totalBudget.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Credits Used */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-40 h-40 bg-rose-500/10 rounded-full blur-[60px]" />
          <div className="relative z-10 space-y-4">
            <div className="p-3 bg-rose-500/20 rounded-2xl w-fit">
              <TrendingUp className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400/70">
              เครดิตที่ใช้ไป
            </p>
            <p className="text-4xl font-black tracking-tight text-rose-300">
              ${totalUsed.toFixed(4)}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              {periodStats.totalRequests} คำขอ / {periodStats.totalTokens.toLocaleString()} tokens
            </p>
          </div>
        </div>

        {/* Credits Remaining */}
        <div className={`relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl group ${
          isCritical
            ? "bg-gradient-to-br from-red-950 via-red-900 to-red-950"
            : isLowBudget
            ? "bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950"
            : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        }`}>
          <div className={`absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-40 h-40 rounded-full blur-[60px] ${
            isCritical ? "bg-red-500/20" : isLowBudget ? "bg-amber-500/20" : "bg-emerald-500/10"
          }`} />
          <div className="relative z-10 space-y-4">
            <div className={`p-3 rounded-2xl w-fit ${
              isCritical ? "bg-red-500/20" : isLowBudget ? "bg-amber-500/20" : "bg-emerald-500/20"
            }`}>
              {isCritical ? (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              ) : isLowBudget ? (
                <TrendingDown className="w-6 h-6 text-amber-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              isCritical ? "text-red-400/70" : isLowBudget ? "text-amber-400/70" : "text-emerald-400/70"
            }`}>
              เครดิตคงเหลือ
            </p>
            <p className={`text-4xl font-black tracking-tight ${
              isCritical ? "text-red-300" : isLowBudget ? "text-amber-300" : "text-emerald-300"
            }`}>
              ${remaining.toFixed(4)}
            </p>
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    isCritical
                      ? "bg-gradient-to-r from-red-500 to-red-400"
                      : isLowBudget
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 font-medium text-right">
                ใช้ไป {usagePercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart Section ────────────────────────────────────────── */}
      <div className="rounded-[2rem] bg-white/70 backdrop-blur-xl border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 md:p-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <BarChart3 className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  การใช้งานรายวัน
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  ค่าใช้จ่ายและจำนวนคำขอ API ย้อนหลัง {daysFilter} วัน
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDaysFilter(d); setCurrentPage(1) }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    daysFilter === d
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
                  }`}
                >
                  {d} วัน
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          {/* Bar Chart */}
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">คำขอทั้งหมด</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{periodStats.totalRequests}</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">สำเร็จ</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{periodStats.successCount}</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">ล้มเหลว</p>
                <p className="text-2xl font-black text-red-700 mt-1">{periodStats.errorCount}</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">ค่าเฉลี่ย/คำขอ</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{formatUSD(periodStats.avgCost)}</p>
              </div>
            </div>

            {/* Visual bar chart */}
            <div className="relative h-64 flex items-end gap-1.5 px-2">
              {dailyData.map((day, i) => {
                const heightPercent = (day.cost / maxDailyCost) * 100
                const dayLabel = new Date(day.date).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })
                const hasErrors = day.errors > 0
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                    style={{ minWidth: 0 }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-slate-900 text-white text-xs rounded-xl px-4 py-3 shadow-xl whitespace-nowrap">
                        <p className="font-black text-amber-400">{dayLabel}</p>
                        <p className="mt-1">ค่าใช้จ่าย: <span className="font-bold">{formatUSD(day.cost)}</span></p>
                        <p>คำขอ: <span className="font-bold">{day.count}</span></p>
                        {hasErrors && <p className="text-red-400">ล้มเหลว: {day.errors}</p>}
                      </div>
                    </div>
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ease-out cursor-pointer group-hover:opacity-80 ${
                        hasErrors
                          ? "bg-gradient-to-t from-red-500 to-red-400"
                          : "bg-gradient-to-t from-blue-600 to-blue-400"
                      }`}
                      style={{
                        height: `${Math.max(heightPercent, 2)}%`,
                        animationDelay: `${i * 30}ms`,
                      }}
                    />
                    {/* Day label (show every 2-3 days for readability) */}
                    {(dailyData.length <= 14 || i % Math.ceil(dailyData.length / 10) === 0) && (
                      <p className="text-[9px] text-slate-400 font-medium mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {dayLabel}
                      </p>
                    )}
                  </div>
                )
              })}
              {dailyData.length === 0 && (
                <div className="w-full flex items-center justify-center h-full text-slate-400">
                  <p className="text-sm font-medium">ไม่มีข้อมูลในช่วงที่เลือก</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Logs Table ───────────────────────────────────────────── */}
      <div className="rounded-[2rem] bg-white/70 backdrop-blur-xl border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 md:p-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/20 rounded-2xl">
                <Activity className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  ประวัติการใช้งาน API
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  รายละเอียดคำขอ {filteredLogs.length} รายการ
                </p>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหา API หรือสถานะ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-medium placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 w-full md:w-64 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                  วัน/เวลา
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                  API
                </th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tokens
                </th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  ค่าใช้จ่าย
                </th>
                <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-8 py-4">
                    <div className="text-sm font-bold text-slate-700">
                      {formatDate(log.created_at)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {formatTime(log.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">
                        {log.api_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-slate-600 font-mono">
                      {(log.tokens_used || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-amber-600 font-mono">
                      {formatUSD(parseFloat(String(log.cost)))}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    {log.status === "success" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 size={12} />
                        สำเร็จ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-bold">
                        <XCircle size={12} />
                        ล้มเหลว
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">
                    ไม่พบรายการที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">
              แสดง {(currentPage - 1) * logsPerPage + 1} -{" "}
              {Math.min(currentPage * logsPerPage, filteredLogs.length)} จาก{" "}
              {filteredLogs.length} รายการ
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ก่อนหน้า
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number
                if (totalPages <= 5) {
                  page = i + 1
                } else if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
