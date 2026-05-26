"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns"
import { th } from "date-fns/locale"
import {
  Plus, Trash2, Send, CheckCircle2, Clock, FileText,
  ChevronDown, ChevronRight, Paperclip, AlertCircle,
  Users, RefreshCw, MessageSquare, Save
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const PROGRESS_OPTIONS = [
  { value: 'not_started', label: 'ยังไม่เริ่ม', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'อยู่ระหว่างดำเนินการ', color: 'bg-amber-100 text-amber-700' },
  { value: 'completed', label: 'เสร็จสิ้น', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'has_issue', label: 'ติดปัญหา', color: 'bg-rose-100 text-rose-700' },
]

type ReportItem = {
  plan: string
  progress: string
  problems: string
  suggestions: string
  file_url: string
  file_name: string
  is_completed: boolean
}

const emptyItem = (): ReportItem => ({
  plan: '', progress: 'not_started', problems: '', suggestions: '',
  file_url: '', file_name: '', is_completed: false
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
  const [editItems, setEditItems] = useState<ReportItem[]>([])
  const [reviewComment, setReviewComment] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  // New report form
  const [newWeekOffset, setNewWeekOffset] = useState(0)
  const [newItems, setNewItems] = useState<ReportItem[]>([emptyItem(), emptyItem(), emptyItem()])

  const handleImportDailyLogs = async () => {
    try {
      setIsImporting(true)
      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(weekEnd, 'yyyy-MM-dd')
      const res = await fetch(`/api/checkin/weekly-summary?start_date=${startStr}&end_date=${endStr}`)
      if (!res.ok) throw new Error("ดึงบันทึกงานไม่สำเร็จ")
      const logs = await res.json()

      if (logs.length === 0) {
        alert("ไม่พบบันทึกเนื้องานรายวันในช่วงเวลาสัปดาห์นี้")
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
      alert(err.message)
    } finally {
      setIsImporting(false)
    }
  }

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
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
  })

  // Review
  const reviewMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await fetch(`/api/weekly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'review', reviewer_comment: comment })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
      setReviewComment("")
    }
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/weekly-reports/${id}`, { method: "DELETE" })
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
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
      case 'draft': return <Badge className="bg-slate-100 text-slate-600 border-0">แบบร่าง</Badge>
      case 'submitted': return <Badge className="bg-blue-100 text-blue-700 border-0">ส่งแล้ว</Badge>
      case 'reviewed': return <Badge className="bg-emerald-100 text-emerald-700 border-0">ตรวจแล้ว</Badge>
      default: return <Badge className="bg-slate-100 text-slate-600 border-0">{status}</Badge>
    }
  }

  const getProgressBadge = (progress: string) => {
    const opt = PROGRESS_OPTIONS.find(o => o.value === progress)
    return <Badge className={cn("border-0 text-[10px] font-bold", opt?.color)}>{opt?.label || progress}</Badge>
  }

  // Render item editor rows
  const renderItemEditor = (items: ReportItem[], setItems: (items: ReportItem[]) => void) => (
    <div className="space-y-6">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className="p-6 rounded-[2rem] bg-muted/20 border border-border shadow-sm space-y-4 hover:shadow-md hover:bg-muted/40 transition-all duration-300 relative group"
        >
          {/* Header row of the card */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={item.is_completed}
                onCheckedChange={(v) => {
                  const next = [...items]; next[idx].is_completed = !!v
                  if (v) next[idx].progress = 'completed'
                  setItems(next)
                }}
                className="h-5 w-5 rounded-lg border-border text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-black text-foreground bg-card shadow-sm ring-1 ring-border px-3 py-1.5 rounded-xl">
                รายการที่ #{idx + 1}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">ความคืบหน้า:</span>
              <Select 
                value={item.progress} 
                onValueChange={v => { 
                  const next = [...items]
                  next[idx].progress = v
                  if (v === 'completed') next[idx].is_completed = true
                  setItems(next) 
                }}
              >
                <SelectTrigger className={cn("rounded-xl border-border text-xs font-bold h-9 px-4 min-w-[140px] shadow-sm bg-card", 
                  PROGRESS_OPTIONS.find(o => o.value === item.progress)?.color
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PROGRESS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-bold rounded-lg m-1">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-9 w-9 transition-colors ml-2"
                onClick={() => { const next = items.filter((_, i) => i !== idx); setItems(next) }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body fields of the card */}
          <div className="grid grid-cols-12 gap-4 pt-1">
            {/* Plan / Work details (spacious textarea) */}
            <div className="col-span-12 lg:col-span-7 space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 block">📝 แผนงาน / หัวข้องาน หรือรายละเอียดเนื้องาน</label>
              <Textarea
                placeholder="ระบุแผนงานหรือรายละเอียดผลงานประจำสัปดาห์นี้..."
                value={item.plan}
                onChange={e => { const next = [...items]; next[idx].plan = e.target.value; setItems(next) }}
                className="rounded-2xl border-border bg-card text-foreground focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 transition-all resize-none min-h-[96px] p-4 text-xs font-medium leading-relaxed"
              />
            </div>

            {/* Right side: Problems & Suggestions & File */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="grid grid-cols-12 gap-3">
                {/* Problems */}
                <div className="col-span-12 sm:col-span-6 space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 block">⚠ ปัญหาที่พบ (ถ้ามี)</label>
                  <Input
                    placeholder="ระบุอุปสรรคหรือปัญหา..."
                    value={item.problems}
                    onChange={e => { const next = [...items]; next[idx].problems = e.target.value; setItems(next) }}
                    className="rounded-2xl border-border bg-card text-foreground text-xs h-11"
                  />
                </div>

                {/* Suggestions */}
                <div className="col-span-12 sm:col-span-6 space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 block">💡 ข้อเสนอแนะ (ถ้ามี)</label>
                  <Input
                    placeholder="ระบุข้อเสนอแนะหรือแนวทาง..."
                    value={item.suggestions}
                    onChange={e => { const next = [...items]; next[idx].suggestions = e.target.value; setItems(next) }}
                    className="rounded-2xl border-border bg-card text-foreground text-xs h-11"
                  />
                </div>
              </div>

              {/* File input / name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 block">📎 ลิงก์ไฟล์หรือเอกสารแนบ (ถ้ามี)</label>
                <div className="relative">
                  <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ระบุชื่อหรือ URL ของเอกสารแนบ..."
                    value={item.file_name}
                    onChange={e => { const next = [...items]; next[idx].file_name = e.target.value; setItems(next) }}
                    className="rounded-2xl border-border bg-card text-foreground pl-10 text-xs h-11"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button 
        variant="outline" 
        className="rounded-[1.5rem] border-dashed border-border text-muted-foreground w-full h-14 bg-muted/10 hover:bg-muted/30 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-700 transition-all duration-300 font-black flex items-center justify-center gap-2 border-2"
        onClick={() => setItems([...items, emptyItem()])}
      >
        <Plus className="w-5 h-5 mr-1" /> เพิ่มรายการงานใหม่
      </Button>
    </div>
  )

  if (!mounted) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-blue-600 w-10 h-10" />
        <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดรายงาน...</p>
      </div>
    )
  }

  if (isLoading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดรายงาน...</p>
    </div>
  )

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">📋 รายงานรายสัปดาห์</h1>
          <p className="text-slate-400 font-medium text-sm mt-1">สั่งงาน ติดตาม และรายงานความคืบหน้า</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6 h-12 shadow-lg shadow-blue-600/20">
              <Plus className="w-5 h-5 mr-2" /> สร้างรายงานใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">สร้างรายงานประจำสัปดาห์</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setNewWeekOffset(p => p - 1)}>← สัปดาห์ก่อน</Button>
                  <div className="text-center min-w-[200px]">
                    <p className="font-black text-lg text-slate-900">{weekLabel}</p>
                    <p className="text-xs text-slate-400">{format(weekStart, 'yyyy-MM-dd')} ถึง {format(weekEnd, 'yyyy-MM-dd')}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setNewWeekOffset(p => p + 1)}>สัปดาห์หน้า →</Button>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="rounded-2xl border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-100/70 font-bold h-10 px-6 gap-2 flex items-center justify-center transition-all duration-300"
                  onClick={handleImportDailyLogs}
                  disabled={isImporting}
                >
                  {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-blue-500" />}
                  ดึงข้อมูลจากบันทึกเนื้องานรายวันของสัปดาห์นี้
                </Button>
              </div>

              {/* Column Headers */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-1">✓</div>
                <div className="col-span-3">แผนงาน</div>
                <div className="col-span-2">ความคืบหน้า</div>
                <div className="col-span-2">ปัญหา</div>
                <div className="col-span-2">ข้อเสนอแนะ</div>
                <div className="col-span-1">ไฟล์</div>
                <div className="col-span-1"></div>
              </div>

              {renderItemEditor(newItems, setNewItems)}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>ยกเลิก</Button>
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newItems.some(i => i.plan.trim())}
              >
                {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                บันทึกแบบร่าง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sub Menu Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-8 pb-1">
        <button 
          onClick={() => setActiveTab("my")}
          className={cn(
            "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
            activeTab === "my" ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>รายงานของฉัน</span>
          {activeTab === "my" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab("team")}
          className={cn(
            "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
            activeTab === "team" ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Users className="w-4 h-4" />
          <span>รายงานทีม</span>
          {activeTab === "team" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
          )}
        </button>
      </div>

      {activeTab === "my" && (
        <div className="mt-6 space-y-4">
          {renderReportList(reports)}
        </div>
      )}
      {activeTab === "team" && (
        <div className="mt-6 space-y-4">
          {renderReportList(reports)}
        </div>
      )}
    </div>
  )

  function renderReportList(reportList: any) {
    if (reportList && reportList.error) {
      return (
        <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-slate-100 bg-rose-50/20">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <p className="text-rose-700 font-black text-lg">เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน</p>
              <p className="text-rose-600/80 text-sm mt-1">หากเพิ่งติดตั้งใหม่ กรุณารันไฟล์ SQL Script สร้างตารางในฐานข้อมูล</p>
              <p className="text-slate-400 text-xs mt-2 italic bg-white p-3 rounded-xl border border-slate-100 max-w-lg mx-auto overflow-x-auto text-left font-mono">
                {reportList.error}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (!Array.isArray(reportList) || reportList.length === 0) {
      return (
        <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-slate-100">
          <CardContent className="py-20 text-center">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-lg">ยังไม่มีรายงาน</p>
            <p className="text-slate-300 text-sm mt-1">กดปุ่ม &quot;สร้างรายงานใหม่&quot; เพื่อเริ่มต้น</p>
          </CardContent>
        </Card>
      )
    }

    return reportList.map((report: any) => {
      const isExpanded = expandedReports.includes(report.id)
      const isEditing = editingReport === report.id
      const completedCount = report.items?.filter((i: any) => i.is_completed).length || 0
      const totalCount = report.items?.length || 0
      const issueCount = report.items?.filter((i: any) => i.progress === 'has_issue').length || 0

      return (
        <Card key={report.id} className="rounded-3xl border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300">
          {/* Report Header */}
          <div
            className="p-4 md:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
            onClick={() => toggleExpand(report.id)}
          >
            <div className="flex items-center gap-4">
              {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}

              {activeTab === 'team' && report.user && (
                <Avatar className="h-10 w-10 border-2 border-white shadow">
                  <AvatarImage src={report.user.avatar_url} />
                  <AvatarFallback className="text-xs font-bold bg-slate-100">{report.user.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h3 className="font-black text-slate-900 text-lg">สัปดาห์ {report.week_label}</h3>
                  {getStatusBadge(report.status)}
                  {issueCount > 0 && (
                    <Badge className="bg-rose-50 text-rose-600 border-0 text-[10px]">
                      <AlertCircle className="w-3 h-3 mr-1" /> {issueCount} ติดปัญหา
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {activeTab === 'team' && report.user ? `${report.user.full_name} • ` : ''}
                  {completedCount}/{totalCount} รายการเสร็จ
                  {report.submitted_at && ` • ส่งเมื่อ ${format(new Date(report.submitted_at), 'd MMM HH:mm', { locale: th })}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
              {report.status === 'draft' && (
                <>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => startEditing(report)}>
                    แก้ไข
                  </Button>
                  <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                    onClick={() => { if (confirm('ส่งรายงานนี้ให้หัวหน้างาน?')) submitMutation.mutate(report.id) }}
                  ><Send className="w-3 h-3 mr-1" /> ส่งรายงาน</Button>
                  <Button variant="ghost" size="icon" className="rounded-xl text-rose-400 hover:bg-rose-50 h-8 w-8"
                    onClick={() => { if (confirm('ลบรายงานนี้?')) deleteMutation.mutate(report.id) }}
                  ><Trash2 className="w-4 h-4" /></Button>
                </>
              )}
              {report.status === 'submitted' && activeTab === 'team' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> ตรวจรายงาน
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>ตรวจรายงาน</DialogTitle></DialogHeader>
                    <Textarea placeholder="ความคิดเห็น / คำสั่งเพิ่มเติม..." value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)} className="rounded-xl min-h-[100px]" />
                    <DialogFooter>
                      <Button className="rounded-xl bg-emerald-600 font-bold"
                        onClick={() => reviewMutation.mutate({ id: report.id, comment: reviewComment })}
                      >ยืนยันการตรวจ</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {report.status === 'reviewed' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pb-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="border-t border-slate-100">
              {isEditing ? (
                <div className="p-6 space-y-4">
                  {renderItemEditor(editItems, setEditItems)}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                    <Button variant="outline" className="rounded-2xl px-6 h-12 font-bold text-slate-500 hover:bg-slate-100 transition-all duration-300" onClick={() => setEditingReport(null)}>ยกเลิก</Button>
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 h-12 shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all duration-300"
                      onClick={() => updateMutation.mutate({ id: report.id, items: editItems })}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>บันทึกการแก้ไข</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/50 bg-slate-50/20 dark:bg-slate-900/10">
                  {report.items?.map((item: any, idx: number) => (
                    <div key={item.id || idx} className={cn("pt-4 first:pt-0 flex items-start gap-4 hover:translate-x-1 transition-all duration-300")}>
                      {/* Check/Circle Status Indicator */}
                      <div className="mt-1 flex-shrink-0">
                        {item.is_completed ? (
                          <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 rounded-full border border-slate-200 dark:border-slate-850 shadow-sm">
                            <div className="w-5 h-5 rounded-full border-2 border-current" />
                          </div>
                        )}
                      </div>

                      {/* Content block */}
                      <div className="flex-1 space-y-3">
                        {/* Work description / Plan text (very large and readable) */}
                        <div className="pr-4">
                          <p className={cn(
                            "text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap",
                            item.is_completed && "text-muted-foreground/70 line-through decoration-slate-400/30"
                          )}>
                            {item.plan}
                          </p>
                        </div>

                        {/* Metadata Tag Row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Progress Badge */}
                          {getProgressBadge(item.progress)}

                          {/* Attachment Link */}
                          {item.file_name && (
                            <a 
                              href={item.file_url || '#'} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all font-bold"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> 
                              <span>{item.file_name}</span>
                            </a>
                          )}

                          {/* Problems Tag */}
                          {item.problems && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 font-bold max-w-sm truncate">
                              <span className="font-extrabold">⚠ ปัญหา:</span> {item.problems}
                            </span>
                          )}

                          {/* Suggestions Tag */}
                          {item.suggestions && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold max-w-sm truncate">
                              <span className="font-extrabold">💡 ข้อเสนอแนะ:</span> {item.suggestions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reviewer comment */}
                  {report.reviewer_comment && (
                    <div className="px-6 py-4 bg-emerald-50/30">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ความเห็นหัวหน้า</p>
                          <p className="text-sm text-slate-700 mt-1 font-medium">{report.reviewer_comment}</p>
                          {report.reviewer && <p className="text-xs text-slate-400 mt-1">— {report.reviewer.full_name}</p>}
                        </div>
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
