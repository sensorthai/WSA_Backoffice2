"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns"
import { th } from "date-fns/locale"
import {
  Plus, Trash2, Send, CheckCircle2, FileText,
  ChevronDown, ChevronRight, Paperclip, AlertCircle,
  Users, RefreshCw, MessageSquare, Save, ArrowLeft, Calendar,
  Sparkles, AlertTriangle, Check, ExternalLink, CalendarOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const PROGRESS_OPTIONS = [
  { value: 'not_started', label: 'ยังไม่เริ่ม', color: 'bg-slate-500/10 text-slate-600 border border-slate-500/20 dark:text-slate-400' },
  { value: 'in_progress', label: 'กำลังดำเนินการ', color: 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400' },
  { value: 'completed', label: 'เสร็จสิ้น', color: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400' },
  { value: 'has_issue', label: 'ติดปัญหา', color: 'bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:text-rose-400' },
]

type ReportItem = {
  id?: string
  plan: string
  progress: string
  problems: string
  suggestions: string
  file_url: string
  file_name: string
  is_completed: boolean
  manager_comment?: string
  deadline?: string
}

const emptyItem = (): ReportItem => ({
  plan: '', progress: 'not_started', problems: '', suggestions: '',
  file_url: '', file_name: '', is_completed: false,
  manager_comment: '', deadline: ''
})

export default function WeeklyReportsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("my")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [showCreate, setShowCreate] = useState(false)
  const [expandedReports, setExpandedReports] = useState<string[]>([])
  const [editingReport, setEditingReport] = useState<string | null>(null)
  const [confirmSubmitReportId, setConfirmSubmitReportId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<ReportItem[]>([])
  const [reviewComment, setReviewComment] = useState("")
  const [reviewingReport, setReviewingReport] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // New report form
  const [newWeekOffset, setNewWeekOffset] = useState(0)
  const [newItems, setNewItems] = useState<ReportItem[]>([emptyItem(), emptyItem(), emptyItem()])

  const weekStart = startOfWeek(addWeeks(new Date(), newWeekOffset), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(addWeeks(new Date(), newWeekOffset), { weekStartsOn: 1 })
  const weekLabel = `${format(weekStart, 'd')}-${format(weekEnd, 'd MMM', { locale: th })}`

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["weekly-reports", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/weekly-reports?view=${activeTab}`)
      return res.json()
    }
  })

  // Group weekly stats
  const stats = {
    total: reports && Array.isArray(reports) ? reports.length : 0,
    completed: reports && Array.isArray(reports) 
      ? reports.filter(r => r.status === 'reviewed').length 
      : 0,
    pending: reports && Array.isArray(reports) 
      ? reports.filter(r => r.status === 'submitted').length 
      : 0,
    drafts: reports && Array.isArray(reports) 
      ? reports.filter(r => r.status === 'draft').length 
      : 0,
  }

  const handleImportDailyLogs = async () => {
    try {
      setIsImporting(true)
      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(weekEnd, 'yyyy-MM-dd')
      const res = await fetch(`/api/checkin/weekly-summary?start_date=${startStr}&end_date=${endStr}`)
      if (!res.ok) throw new Error("ดึงบันทึกงานไม่สำเร็จ")
      const logs = await res.json()

      if (logs.length === 0) {
        toast.warning("ไม่พบบันทึกเนื้องานรายวันในช่วงเวลาสัปดาห์นี้")
        return
      }

      // Convert daily logs to ReportItems
      const importedItems: ReportItem[] = logs.map((log: any) => ({
        plan: `[บันทึกรายวัน ${format(new Date(log.date), 'dd/MM/yyyy')}]: ${log.work}`,
        progress: 'completed',
        problems: '',
        suggestions: '',
        file_url: '',
        file_name: '',
        is_completed: true
      }))

      if (confirm(`พบข้อมูลเนื้องานรายวัน ${logs.length} รายการ คุณต้องการเขียนทับรายการในตารางด้านล่างหรือไม่? (กด Cancel เพื่อต่อท้ายข้อมูลเดิม)`)) {
        setNewItems(importedItems)
      } else {
        setNewItems(prev => {
          const filteredPrev = prev.filter(i => i.plan.trim() !== "")
          return [...filteredPrev, ...importedItems]
        })
      }
    } catch (err: any) {
      toast.error("ดึงบันทึกงานไม่สำเร็จ: " + err.message)
    } finally {
      setIsImporting(false)
    }
  }

  // Find and format incomplete tasks from the previous weekly report
  const loadPreviousIncompleteTasks = useCallback(() => {
    if (!Array.isArray(reports)) return []
    
    // Find the most recent weekly report before the currently selected week
    const currentWeekStart = startOfWeek(addWeeks(new Date(), newWeekOffset), { weekStartsOn: 1 })
    const currentWeekStartStr = format(currentWeekStart, 'yyyy-MM-dd')
    const pastReports = reports.filter((r: any) => r.week_start < currentWeekStartStr)
    
    if (pastReports.length === 0) return []
    
    // The first one is the most recent because reports are sorted by week_start DESC
    const latestPastReport = pastReports[0]
    
    // Find incomplete items (progress !== 'completed' or is_completed === false)
    return (latestPastReport.items || [])
      .filter((item: any) => !item.is_completed && item.progress !== 'completed')
      .map((item: any) => ({
        plan: `[งานค้างจากสัปดาห์ก่อน]: ${item.plan.replace(/^\[งานค้างจากสัปดาห์ก่อน\]:\s*/, "")}`,
        progress: item.progress === 'not_started' ? 'not_started' : 'in_progress',
        problems: item.problems || '',
        suggestions: item.suggestions || '',
        file_url: item.file_url || '',
        file_name: item.file_name || '',
        is_completed: false
      }))
  }, [reports, newWeekOffset])

  const handleImportPreviousIncomplete = () => {
    const incomplete = loadPreviousIncompleteTasks()
    if (!incomplete || incomplete.length === 0) {
      toast.info("ไม่พบรายการงานค้างสะสมจากสัปดาห์ที่แล้ว")
      return
    }

    if (confirm(`พบงานค้าง ${incomplete.length} รายการ คุณต้องการเขียนทับรายการในตารางด้านล่างหรือไม่? (กด Cancel เพื่อต่อท้ายข้อมูลเดิม)`)) {
      setNewItems(incomplete)
    } else {
      setNewItems(prev => {
        const filteredPrev = prev.filter(i => i.plan.trim() !== "")
        return [...filteredPrev, ...incomplete]
      })
    }
    toast.success(`ดึงงานค้างสำเร็จ ${incomplete.length} รายการ!`)
  }

  // Auto-import incomplete tasks when opening the create form or changing the week
  useEffect(() => {
    if (showCreate) {
      const incomplete = loadPreviousIncompleteTasks()
      if (incomplete && incomplete.length > 0) {
        setNewItems(incomplete)
        toast.info(`ระบบดึงงานค้างสะสมจากสัปดาห์ก่อนมาให้คุณ ${incomplete.length} รายการอัตโนมัติ`)
      } else {
        setNewItems([emptyItem(), emptyItem(), emptyItem()])
      }
    }
  }, [showCreate, newWeekOffset, reports, loadPreviousIncompleteTasks])

  // Create
  const createMutation = useMutation({
    mutationFn: async () => {
      const validItems = newItems.filter(i => i.plan.trim())
      const res = await fetch("/api/weekly-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: format(weekStart, 'yyyy-MM-dd'),
          week_end: format(weekEnd, 'yyyy-MM-dd'),
          week_label: weekLabel,
          items: validItems
        })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
      setShowCreate(false)
      setNewItems([emptyItem(), emptyItem(), emptyItem()])
      toast.success("บันทึกร่างรายงานประจำสัปดาห์เรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      toast.error("ไม่สามารถบันทึกร่างรายงานได้: " + err.message)
    }
  })

  // Update items
  const updateMutation = useMutation({
    mutationFn: async ({ id, items }: { id: string; items: ReportItem[] }) => {
      const res = await fetch(`/api/weekly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.filter(i => i.plan.trim()) })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
      setEditingReport(null)
      toast.success("บันทึกการแก้ไขรายงานเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      toast.error("ไม่สามารถบันทึกการแก้ไขได้: " + err.message)
    }
  })

  // Submit
  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/weekly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'submit' })
      })
      if (!res.ok) throw new Error("Failed to submit report")
      return res.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["weekly-reports", activeTab] })
      const previousReports = queryClient.getQueryData<any[]>(["weekly-reports", activeTab]) || []

      // Optimistically update report status to 'submitted'
      queryClient.setQueryData<any[]>(["weekly-reports", activeTab], (old) => {
        if (!old) return []
        return old.map(r => r.id === id ? { ...r, status: 'submitted', submitted_at: new Date().toISOString() } : r)
      })

      return { previousReports }
    },
    onError: (err: any, id, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(["weekly-reports", activeTab], context.previousReports)
      }
      toast.error("ไม่สามารถส่งรายงานได้: " + err.message)
    },
    onSuccess: () => {
      toast.success("ส่งรายงานประจำสัปดาห์เรียบร้อยแล้ว!")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
    }
  })

  // Review
  const reviewMutation = useMutation({
    mutationFn: async ({ id, comment, items }: { id: string; comment: string; items?: ReportItem[] }) => {
      const res = await fetch(`/api/weekly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'review', reviewer_comment: comment, items })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
      setReviewComment("")
      setReviewingReport(null)
      toast.success("บันทึกความคิดเห็นรีวิวรายงานเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      toast.error("ไม่สามารถบันทึกการรีวิวได้: " + err.message)
    }
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/weekly-reports/${id}`, { method: "DELETE" })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
      toast.success("ลบรายงานประจำสัปดาห์เรียบร้อยแล้ว")
    },
    onError: (err: any) => {
      toast.error("ไม่สามารถลบรายงานได้: " + err.message)
    }
  })

  const toggleExpand = (id: string) => {
    setExpandedReports(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const startEditing = (report: any) => {
    setEditingReport(report.id)
    // Auto-expand the card so the editor + save button are visible
    setExpandedReports(prev => prev.includes(report.id) ? prev : [...prev, report.id])
    setEditItems((report.items || []).map((i: any) => ({
      plan: i.plan, progress: i.progress, problems: i.problems || '',
      suggestions: i.suggestions || '', file_url: i.file_url || '',
      file_name: i.file_name || '', is_completed: i.is_completed
    })))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': 
        return (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200/60 rounded-full py-0.5 px-2.5 font-semibold text-xs flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            แบบร่าง
          </Badge>
        )
      case 'submitted': 
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200/50 rounded-full py-0.5 px-2.5 font-semibold text-xs flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            ส่งแล้ว
          </Badge>
        )
      case 'reviewed': 
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full py-0.5 px-2.5 font-semibold text-xs flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ตรวจแล้ว
          </Badge>
        )
      default: 
        return <Badge className="bg-slate-100 text-slate-600 border-0 rounded-full">{status}</Badge>
    }
  }

  const getProgressBadge = (progress: string) => {
    const opt = PROGRESS_OPTIONS.find(o => o.value === progress)
    return <Badge className={cn("border-0 text-[10px] font-bold rounded-lg px-2.5 py-0.5 tracking-wide shadow-sm", opt?.color)}>{opt?.label || progress}</Badge>
  }

  // Render item editor rows (Responsive Cards instead of cramped table grid)
  const renderItemEditor = (items: ReportItem[], setItems: (items: ReportItem[]) => void) => (
    <div className="space-y-6">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className="p-5 md:p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/30 border border-white/20 dark:border-slate-800/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4 hover:shadow-[0_8px_30px_rgba(99,102,241,0.03)] hover:bg-white/60 dark:hover:bg-slate-900/40 transition-all duration-300 relative group"
        >
          {/* Header row of the card */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200/30 dark:border-slate-800/30">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={(v) => {
                    const next = [...items]; next[idx].is_completed = !!v
                    if (v) next[idx].progress = 'completed'
                    setItems(next)
                  }}
                  className="h-6 w-6 rounded-lg border-slate-350 dark:border-slate-650 text-indigo-600 focus:ring-indigo-500/20 transition-all"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none font-thai">ทำสำเร็จแล้ว</span>
              </label>
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 px-2.5 py-1 rounded-xl font-sans">
                TASK #{idx + 1}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1 hidden sm:inline font-sans">PROGRESS:</span>
              <Select 
                value={item.progress} 
                onValueChange={v => { 
                  const next = [...items]
                  next[idx].progress = v
                  if (v === 'completed') next[idx].is_completed = true
                  setItems(next) 
                }}
              >
                <SelectTrigger className={cn("rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold h-9 px-4 min-w-[130px] shadow-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-150/20 font-thai", 
                  PROGRESS_OPTIONS.find(o => o.value === item.progress)?.color
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                  {PROGRESS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-bold rounded-lg m-1 cursor-pointer font-thai">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-350 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl h-9 w-9 transition-colors ml-2"
                onClick={() => { const next = items.filter((_, i) => i !== idx); setItems(next) }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body fields of the card */}
          <div className="grid grid-cols-1 gap-4 pt-1 lg:grid-cols-12">
            {/* Plan / Work details (spacious textarea) */}
            <div className="lg:col-span-7 space-y-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-thai">📝 แผนงาน / รายละเอียดผลงานประจำสัปดาห์</label>
              <Textarea
                placeholder="ระบุแผนงานหรือรายละเอียดผลงานประจำสัปดาห์นี้..."
                value={item.plan}
                onChange={e => { const next = [...items]; next[idx].plan = e.target.value; setItems(next) }}
                className="rounded-2xl border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100/30 dark:focus:ring-indigo-950/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all resize-none min-h-[100px] p-4 text-sm font-medium leading-relaxed font-thai"
              />
            </div>

            {/* Right side: Problems & Suggestions & File */}
            <div className="lg:col-span-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Problems */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-thai">⚠ ปัญหาที่พบ (ถ้ามี)</label>
                  <Input
                    placeholder="ระบุอุปสรรคหรือปัญหา..."
                    value={item.problems}
                    onChange={e => { const next = [...items]; next[idx].problems = e.target.value; setItems(next) }}
                    className="rounded-2xl border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 text-xs h-11 focus:ring-2 focus:ring-indigo-100/30 focus:border-indigo-500 font-thai"
                  />
                </div>

                {/* Suggestions */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-thai">💡 ข้อเสนอแนะ (ถ้ามี)</label>
                  <Input
                    placeholder="ระบุข้อเสนอแนะหรือแนวทาง..."
                    value={item.suggestions}
                    onChange={e => { const next = [...items]; next[idx].suggestions = e.target.value; setItems(next) }}
                    className="rounded-2xl border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 text-xs h-11 focus:ring-2 focus:ring-indigo-100/30 focus:border-indigo-500 font-thai"
                  />
                </div>
              </div>

              {/* File input / name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-thai">📎 ลิงก์ไฟล์หรือเอกสารแนบ (ถ้ามี)</label>
                <div className="relative">
                  <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="ระบุชื่อหรือ URL ของเอกสารแนบ..."
                    value={item.file_name}
                    onChange={e => { const next = [...items]; next[idx].file_name = e.target.value; setItems(next) }}
                    className="rounded-2xl border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 pl-10 text-xs h-11 focus:ring-2 focus:ring-indigo-100/30 focus:border-indigo-500 font-thai"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button 
        variant="outline" 
        className="rounded-2xl border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 w-full h-14 bg-white/20 dark:bg-slate-900/20 hover:bg-white/60 dark:hover:bg-slate-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-850 transition-all duration-300 font-bold flex items-center justify-center gap-2 border-2 font-thai"
        onClick={() => setItems([...items, emptyItem()])}
      >
        <Plus className="w-5 h-5 mr-1" /> เพิ่มรายการงานใหม่
      </Button>
    </div>
  )

  if (!mounted || isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <Sparkles className="absolute w-5 h-5 text-indigo-500 animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm font-bold animate-pulse">กำลังโหลดรายงาน...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-20 max-w-[1400px] mx-auto px-4 md:px-8 space-y-8 animate-in fade-in duration-700">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-10 w-[450px] h-[450px] bg-violet-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      {showCreate ? (
        /* ===== IN-PAGE CREATE FORM ===== */
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => { setShowCreate(false); setNewItems([emptyItem(), emptyItem(), emptyItem()]); }} 
            className="rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:text-slate-400 dark:hover:text-indigo-450 dark:hover:bg-indigo-950/20 font-bold font-thai transition-all"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> 
            <span>กลับไปรายการ</span>
          </Button>
 
          <Card className="rounded-[2.5rem] border border-white/40 dark:border-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.025)] bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 md:p-8 text-white relative border-b border-white/10 dark:border-slate-800/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-3 font-thai">
                <Sparkles className="w-6 h-6 text-indigo-200" />
                <span>สร้างรายงานประจำสัปดาห์</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8">
              
              {/* Date & Import Panel */}
              <div className="flex flex-col gap-6 bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
                {/* Week selector */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Button 
                    variant="outline" 
                    className="rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 font-bold font-thai shadow-sm"
                    onClick={() => setNewWeekOffset(p => p - 1)}
                  >
                    ← สัปดาห์ก่อนหน้า
                  </Button>
                  <div className="text-center min-w-[200px] py-1">
                    <p className="font-extrabold text-lg text-slate-800 dark:text-slate-200 tracking-tight flex items-center justify-center gap-2 font-thai">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                      สัปดาห์ {weekLabel}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-thai mt-1">{format(weekStart, 'yyyy-MM-dd')} ถึง {format(weekEnd, 'yyyy-MM-dd')}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 font-bold font-thai shadow-sm"
                    onClick={() => setNewWeekOffset(p => p + 1)}
                  >
                    สัปดาห์ถัดไป →
                  </Button>
                </div>
 
                {/* Import actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 border-t border-slate-200/30 dark:border-slate-800/30 pt-5">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="rounded-2xl border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-bold font-thai h-11 px-5 gap-2 flex items-center justify-center transition-all duration-300 shadow-sm"
                    onClick={handleImportDailyLogs}
                    disabled={isImporting}
                  >
                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> : <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />}
                    <span>ดึงจากบันทึกเนื้องานรายวัน</span>
                  </Button>
 
                  <Button 
                    type="button"
                    variant="outline" 
                    className="rounded-2xl border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-bold font-thai h-11 px-5 gap-2 flex items-center justify-center transition-all duration-300 shadow-sm"
                    onClick={handleImportPreviousIncomplete}
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span>ดึงงานค้างจากสัปดาห์ก่อน</span>
                  </Button>
                </div>
              </div>
 
              {renderItemEditor(newItems, setNewItems)}
 
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100/60 dark:border-slate-800/40">
                <Button 
                  variant="outline" 
                  className="rounded-2xl h-12 px-6 font-bold font-thai text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850" 
                  onClick={() => { setShowCreate(false); setNewItems([emptyItem(), emptyItem(), emptyItem()]); }}
                >
                  ยกเลิก
                </Button>
                <Button 
                  className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-6 shadow-lg shadow-indigo-600/10 flex items-center gap-2 transition-all duration-300 font-thai"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newItems.some(i => i.plan.trim())}
                >
                  {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>บันทึกแบบร่าง</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===== NORMAL PAGE CONTENT ===== */
        <>
          {/* Header Card (Bento/Glassmorphism style) */}
          <div className="relative overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/30 dark:border-slate-800/30 p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.015)] flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(99,102,241,0.04)]">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-100/30 font-sans">WORKSPACE HUB</span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-normal font-thai mt-1 flex items-center gap-3">
                <span>📋 รายงานรายสัปดาห์</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base leading-relaxed font-thai">
                สั่งงาน ติดตาม และรายงานความคืบหน้าการดำเนินงานในทีมของท่าน
              </p>
            </div>
            
            <Button 
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold px-6 h-13 shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 transition-all duration-300 flex items-center gap-2 self-start md:self-auto transform hover:-translate-y-0.5"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-5 h-5" /> 
              <span className="font-thai">สร้างรายงานใหม่</span>
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-white/20 dark:border-slate-800/20 p-5 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(99,102,241,0.04)] group">
              <div className="p-3.5 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-indigo-100/10">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">TOTALS</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200 font-sans leading-none">{stats.total} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-thai">ฉบับ</span></p>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-white/20 dark:border-slate-800/20 p-5 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(16,185,129,0.04)] group">
              <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-emerald-100/10">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">COMPLETED</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200 font-sans leading-none">{stats.completed} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-thai">ฉบับ</span></p>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-white/20 dark:border-slate-800/20 p-5 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(99,102,241,0.04)] group">
              <div className="p-3.5 bg-gradient-to-br from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-violet-100/10">
                <Send className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">PENDING REVIEW</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200 font-sans leading-none">{stats.pending} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-thai">ฉบับ</span></p>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-white/20 dark:border-slate-800/20 p-5 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.01)] flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(148,163,184,0.04)] group">
              <div className="p-3.5 bg-gradient-to-br from-slate-500/10 to-slate-500/5 text-slate-500 dark:text-slate-400 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-slate-100/10">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">DRAFTS</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200 font-sans leading-none">{stats.drafts} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-thai">ฉบับ</span></p>
              </div>
            </div>
          </div>

          {/* Sub Menu Navigation (Pill Selector tabs) */}
          <div className="flex p-1 bg-slate-200/30 dark:bg-slate-900/50 backdrop-blur-lg border border-white/10 dark:border-slate-800/40 rounded-2xl max-w-[340px] gap-1 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
            <button 
              onClick={() => setActiveTab("my")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 font-thai transform active:scale-95",
                activeTab === "my" 
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_4px_12px_rgba(99,102,241,0.08)] font-extrabold" 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/10"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>รายงานของฉัน</span>
            </button>
            <button 
              onClick={() => setActiveTab("team")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 font-thai transform active:scale-95",
                activeTab === "team" 
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_4px_12px_rgba(99,102,241,0.08)] font-extrabold" 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/10"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>รายงานทีม</span>
            </button>
          </div>

          {activeTab === "my" && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {renderReportList(reports)}
            </div>
          )}
          {activeTab === "team" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {renderTeamReportGroups(reports)}
            </div>
          )}
        </>
      )}
    </div>
  )

  function renderTeamReportGroups(reportList: any) {
    if (!Array.isArray(reportList) || reportList.length === 0) return renderReportList(reportList)
    
    // Group by week_label
    const groups: { [key: string]: any[] } = {}
    reportList.forEach(report => {
      const key = `${report.week_start}|${report.week_label}`
      if (!groups[key]) groups[key] = []
      groups[key].push(report)
    })

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

    return sortedKeys.map(key => {
      const label = key.split('|')[1]
      const weekReports = groups[key]
      return (
        <div key={key} className="space-y-4 mb-8">
          <div className="flex items-center gap-3 border-b border-slate-200/50 pb-2.5 mt-4">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-slate-700 tracking-tight">สัปดาห์ {label}</h2>
            <Badge variant="outline" className="ml-auto rounded-full font-bold text-[10px] bg-slate-50 text-slate-500 border-slate-200">
              ส่งแล้ว {weekReports.length} รายการ
            </Badge>
          </div>
          <div className="space-y-4">
            {renderReportList(weekReports)}
          </div>
        </div>
      )
    })
  }

  function renderReportList(reportList: any) {
    if (reportList && reportList.error) {
      return (
        <Card className="rounded-[2rem] border border-rose-200 bg-rose-50/30">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <p className="text-rose-800 font-extrabold text-lg">เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน</p>
              <p className="text-rose-600 text-sm mt-1">หากเพิ่งติดตั้งใหม่ กรุณารันไฟล์ SQL Script สร้างตารางในฐานข้อมูล</p>
              <p className="text-slate-400 text-xs mt-3 italic bg-white p-3 rounded-2xl border border-slate-100 max-w-lg mx-auto overflow-x-auto text-left font-mono">
                {reportList.error}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (!Array.isArray(reportList) || reportList.length === 0) {
      return (
        <Card className="rounded-[2rem] border border-slate-200/60 bg-white/40 shadow-sm text-center">
          <CardContent className="py-16">
            <CalendarOff className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-extrabold text-base">ยังไม่มีข้อมูลรายงานประจำสัปดาห์</p>
            <p className="text-slate-400 text-xs mt-1">กดปุ่ม &quot;สร้างรายงานใหม่&quot; ด้านบนเพื่อเริ่มต้น</p>
          </CardContent>
        </Card>
      )
    }    return reportList.map((report: any) => {
      const isExpanded = expandedReports.includes(report.id)
      const isEditing = editingReport === report.id
      const isReviewing = reviewingReport === report.id
      const completedCount = report.items?.filter((i: any) => i.is_completed).length || 0
      const totalCount = report.items?.length || 0
      const issueCount = report.items?.filter((i: any) => i.progress === 'has_issue').length || 0

      // Accent border class
      const borderAccentClass = 
        report.status === 'reviewed' ? "border-l-4 border-l-emerald-500" :
        issueCount > 0 ? "border-l-4 border-l-rose-500 animate-pulse" :
        completedCount === totalCount && totalCount > 0 ? "border-l-4 border-l-teal-500" :
        "border-l-4 border-l-indigo-500"

      return (
        <Card 
          key={report.id} 
          className={cn(
            "rounded-[2.5rem] border border-white/40 dark:border-slate-800/30 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.015)] overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] transition-all duration-300",
            borderAccentClass,
            isExpanded && "shadow-[0_15px_45px_rgba(99,102,241,0.04)]"
          )}
        >
          {/* Report Header Block */}
          <div
            className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-colors"
            role="button"
            tabIndex={0}
            onClick={() => toggleExpand(report.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                toggleExpand(report.id)
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                <ChevronRight className="w-4 h-4" />
              </div>

              {activeTab === 'team' && report.user && (
                <Avatar className="h-11 w-11 border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 flex-shrink-0">
                  <AvatarImage src={report.user.avatar_url} />
                  <AvatarFallback className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">{report.user.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base font-thai leading-relaxed">สัปดาห์ {report.week_label}</h3>
                  {getStatusBadge(report.status)}
                  {issueCount > 0 && (
                    <Badge className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100/30 rounded-full text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1 font-thai">
                      <AlertTriangle className="w-3 h-3 text-rose-500" /> 
                      <span>{issueCount} ปัญหา</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold flex flex-wrap items-center gap-1.5 font-thai">
                  {activeTab === 'team' && report.user && (
                    <span className="text-slate-600 dark:text-slate-300 font-bold">{report.user.full_name}</span>
                  )}
                  {activeTab === 'team' && report.user && <span>•</span>}
                  <span>เสร็จสิ้น {completedCount}/{totalCount} รายการ</span>
                  {report.submitted_at && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">ส่งเมื่อ {format(new Date(report.submitted_at), 'd MMM HH:mm', { locale: th })}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
              {report.status === 'draft' && (
                confirmSubmitReportId === report.id ? (
                  <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/30 px-3 py-1.5 rounded-2xl animate-in fade-in slide-in-from-right-2 duration-300">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 font-thai">ส่งรายงานนี้?</span>
                    <Button 
                      size="sm" 
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold h-7 px-3 text-white shadow-sm font-thai"
                      onClick={() => {
                        submitMutation.mutate(report.id)
                        setConfirmSubmitReportId(null)
                      }}
                    >
                      ยืนยัน
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold h-7 px-2.5 font-thai"
                      onClick={() => setConfirmSubmitReportId(null)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-8 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-thai" onClick={() => startEditing(report)}>
                      แก้ไข
                    </Button>
                    <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold h-8 text-white shadow-sm flex items-center gap-1 font-thai"
                      onClick={() => setConfirmSubmitReportId(report.id)}
                    >
                      <Send className="w-3 h-3" /> 
                      <span>ส่งรายงาน</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 w-8"
                      onClick={() => { if (confirm('ต้องการลบรายงานนี้ใช่หรือไม่?')) deleteMutation.mutate(report.id) }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              )}
              {report.status === 'submitted' && activeTab === 'team' && (
                <Button 
                  size="sm" 
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-8 text-white flex items-center gap-1 shadow-sm font-thai"
                  onClick={() => {
                    setReviewingReport(report.id)
                    setExpandedReports(prev => prev.includes(report.id) ? prev : [...prev, report.id])
                    setEditItems((report.items || []).map((i: any) => ({
                      plan: i.plan, progress: i.progress, problems: i.problems || '',
                      suggestions: i.suggestions || '', file_url: i.file_url || '',
                      file_name: i.file_name || '', is_completed: i.is_completed,
                      manager_comment: i.manager_comment || '', deadline: i.deadline || ''
                    })))
                  }}
                >
                  <CheckCircle2 className="w-3 h-3" /> 
                  <span>ตรวจรายงาน</span>
                </Button>
              )}
              {report.status === 'reviewed' && (
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 rounded-full border border-emerald-100/30 shadow-sm flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar Widget */}
          <div className="px-6 pb-4">
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800/40 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} 
              />
            </div>
          </div>

          {/* Expanded Content View */}
          {isExpanded && (
            <div className="border-t border-slate-100/60 dark:border-slate-800/20 bg-slate-50/15 dark:bg-slate-900/10">
              {isEditing ? (
                <div className="p-5 md:p-6 space-y-4">
                  {renderItemEditor(editItems, setEditItems)}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/40 mt-4">
                    <Button variant="outline" className="rounded-2xl px-5 h-11 font-bold text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850" onClick={() => setEditingReport(null)}>ยกเลิก</Button>
                    <Button className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 h-11 shadow-lg shadow-indigo-600/10 flex items-center gap-2 transition-all duration-300 animate-in fade-in duration-300"
                      onClick={() => updateMutation.mutate({ id: report.id, items: editItems })}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="font-thai">บันทึกการแก้ไข</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-5 md:p-6 space-y-4">
                  {/* Checklist Items Container */}
                  <div className="grid grid-cols-1 gap-4">
                    {report.items?.map((item: any, idx: number) => {
                      const itemBorderColor = 
                        item.is_completed || item.progress === 'completed' ? "border-l-4 border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/5" :
                        item.progress === 'has_issue' ? "border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/5 animate-pulse-subtle" :
                        item.progress === 'in_progress' ? "border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-950/5" :
                        "border-l-4 border-l-slate-300 dark:border-l-slate-700 bg-slate-100/5 dark:bg-slate-900/5"

                      return (
                        <div 
                          key={item.id || idx} 
                          className={cn(
                            "p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-4 transition-all duration-300 hover:shadow-md hover:bg-white dark:hover:bg-slate-900/60", 
                            itemBorderColor
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Completion indicator icon */}
                              <div className="mt-1 flex-shrink-0">
                                {item.is_completed ? (
                                  <div className="p-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200/30 shadow-sm flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="p-1 text-slate-300 dark:text-slate-655 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center bg-white dark:bg-slate-800">
                                    <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1 flex-1">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">TASK #{idx + 1}</span>
                                <p className={cn(
                                  "text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed font-thai whitespace-pre-wrap",
                                  item.is_completed && "text-slate-400 dark:text-slate-500 line-through decoration-slate-300/40"
                                )}>
                                  {item.plan}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {getProgressBadge(item.progress)}
                            </div>
                          </div>

                          {/* Metadata Tag Row */}
                          <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-100/30 dark:border-slate-800/10">
                            {item.file_name && (
                              <a 
                                href={item.file_url || '#'} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold transition-all text-[10px] font-thai"
                              >
                                <Paperclip className="w-3 h-3 text-indigo-400" /> 
                                <span>{item.file_name}</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-indigo-400" />
                              </a>
                            )}

                            {item.problems && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/30 text-rose-700 dark:text-rose-400 font-bold text-[10px] font-thai max-w-sm truncate">
                                <span className="text-rose-500">⚠ ปัญหา:</span> {item.problems}
                              </span>
                            )}

                            {item.suggestions && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100/30 text-violet-700 dark:text-violet-400 font-bold text-[10px] font-thai max-w-sm truncate">
                                <span className="text-violet-500">💡 ข้อคิดเห็น:</span> {item.suggestions}
                              </span>
                            )}

                            {!isReviewing && item.manager_comment && (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100/30 text-emerald-700 dark:text-emerald-400 font-bold w-full mt-1.5 text-xs font-thai">
                                <span className="font-extrabold flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> ความเห็นหัวหน้า:</span> {item.manager_comment}
                              </span>
                            )}

                            {!isReviewing && item.deadline && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/30 text-amber-700 dark:text-amber-400 font-bold text-[10px] font-thai mt-1">
                                <span>⏰ กำหนดส่ง:</span> {format(new Date(item.deadline), 'd MMM yyyy', { locale: th })}
                              </span>
                            )}

                            {/* Reviewer Inputs */}
                            {isReviewing && (
                              <div className="w-full mt-3 p-4 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-2xl border border-emerald-150/30 space-y-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block font-thai">ความเห็น / ข้อเสนอแนะ (เฉพาะรายการนี้)</label>
                                  <Input 
                                    placeholder="เพิ่มข้อเสนอแนะสำหรับการทำงานชิ้นนี้..." 
                                    value={editItems[idx]?.manager_comment || ''}
                                    onChange={e => {
                                      const newItems = [...editItems]
                                      newItems[idx] = { ...newItems[idx], manager_comment: e.target.value }
                                      setEditItems(newItems)
                                    }}
                                    className="h-10 text-xs bg-white dark:bg-slate-900 border-emerald-250 dark:border-emerald-900/50 focus-visible:ring-emerald-500 focus-visible:ring-2 rounded-xl"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block font-thai">กำหนดส่งงาน (Deadline)</label>
                                  <Input 
                                    type="date"
                                    value={editItems[idx]?.deadline || ''}
                                    onChange={e => {
                                      const newItems = [...editItems]
                                      newItems[idx] = { ...newItems[idx], deadline: e.target.value }
                                      setEditItems(newItems)
                                    }}
                                    className="h-10 text-xs w-full sm:w-48 bg-white dark:bg-slate-900 border-emerald-250 dark:border-emerald-900/50 focus-visible:ring-emerald-500 focus-visible:ring-2 rounded-xl"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Manager Overall Comment */}
                  {report.reviewer_comment && (
                    <div className="mt-6 p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/30 shadow-inner">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 mt-1 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-extrabold text-emerald-650 dark:text-emerald-450 uppercase tracking-widest font-thai">ความเห็นและคำแนะนำภาพรวมจากหัวหน้างาน</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed font-thai">{report.reviewer_comment}</p>
                          {report.reviewer && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-thai">— {report.reviewer.full_name}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Review Panel */}
                  {isReviewing && (
                    <div className="p-5 md:p-6 bg-emerald-55/10 dark:bg-emerald-950/5 border-t border-emerald-100/40 rounded-[2.5rem] mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <h4 className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 font-thai">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" /> 
                        <span>บันทึกความเห็นผลประเมินรายงาน</span>
                      </h4>
                      <Textarea 
                        placeholder="เขียนคำสั่งงานหรือข้อความประเมินภาพรวมรายสัปดาห์..." 
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)} 
                        className="rounded-2xl min-h-[100px] bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm p-4 leading-relaxed font-thai" 
                      />
                      <div className="flex justify-end gap-3">
                        <Button 
                          variant="outline" 
                          className="rounded-xl h-10 px-4 font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 font-thai" 
                          onClick={() => { setReviewingReport(null); setReviewComment(""); setEditItems([]); }}
                        >
                          ยกเลิก
                        </Button>
                        <Button 
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 shadow-sm font-thai"
                          onClick={() => reviewMutation.mutate({ id: report.id, comment: reviewComment, items: editItems })}
                          disabled={reviewMutation.isPending}
                        >
                          {reviewMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                          ยืนยันการตรวจและส่งข้อคิดเห็น
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )
    })
  }
}
