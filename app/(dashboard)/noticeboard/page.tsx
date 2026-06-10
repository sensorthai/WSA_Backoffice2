"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toast } from "sonner"
import {
  Megaphone,
  CalendarDays,
  FileText,
  Plus,
  Trash2,
  Edit3,
  PartyPopper,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  HOLIDAY_TYPE_ICON,
  HOLIDAY_TYPE_LABEL,
  HOLIDAY_TYPE_COLOR,
  BOT_HOLIDAYS_2026,
  getHolidaysByMonth,
  formatThaiDate,
} from "@/components/dashboard/NoticeboardData"
import { useUser } from "@/hooks/useUser"

interface Announcement {
  id: string
  title: string
  content: string
  type: "news" | "holiday" | "policy"
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  created_by?: { full_name: string } | null
}

export default function NoticeboardPage() {
  const { profile } = useUser()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === "admin" || profile?.role === "ceo"

  const [activeTab, setActiveTab] = useState<"announcements" | "holidays">("announcements")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<number[]>([])

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formType, setFormType] = useState<"news" | "holiday" | "policy">("news")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")

  const resetForm = () => {
    setFormTitle("")
    setFormContent("")
    setFormType("news")
    setFormStartDate("")
    setFormEndDate("")
    setEditingAnnouncement(null)
  }

  // Fetch announcements
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json() as Promise<Announcement[]>
    },
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string
      title: string
      content: string
      type: string
      start_date?: string | null
      end_date?: string | null
    }) => {
      const url = "/api/announcements"
      const body = data.id
        ? { id: data.id, ...data }
        : data
      const res = await fetch(url, {
        method: data.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      setIsCreateOpen(false)
      resetForm()
      toast.success(editingAnnouncement ? "อัปเดตประกาศสำเร็จ" : "สร้างประกาศสำเร็จ")
    },
    onError: (err: Error) => {
      toast.error(err.message || "เกิดข้อผิดพลาด")
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("ลบประกาศสำเร็จ")
    },
    onError: () => toast.error("เกิดข้อผิดพลาดในการลบ"),
  })

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active }),
      })
      if (!res.ok) throw new Error("Failed")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("อัปเดตสถานะสำเร็จ")
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  })

  const handleSubmit = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("กรุณากรอกหัวข้อและเนื้อหา")
      return
    }
    saveMutation.mutate({
      id: editingAnnouncement?.id,
      title: formTitle.trim(),
      content: formContent.trim(),
      type: formType,
      start_date: formStartDate || null,
      end_date: formEndDate || null,
    })
  }

  const handleEdit = (a: Announcement) => {
    setEditingAnnouncement(a)
    setFormTitle(a.title)
    setFormContent(a.content)
    setFormType(a.type)
    setFormStartDate(a.start_date ? a.start_date.split("T")[0] : "")
    setFormEndDate(a.end_date ? a.end_date.split("T")[0] : "")
    setIsCreateOpen(true)
  }

  const toggleMonth = (month: number) => {
    setExpandedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    )
  }

  const { months, thaiMonths } = getHolidaysByMonth()

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em]">
            Company Bulletin Board
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <Megaphone size={48} className="text-blue-500" /> กระดานข่าวสาร
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            ประกาศข่าวสาร นโยบายบริษัท และปฏิทินวันหยุดประจำปี
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "announcements"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Megaphone size={18} /> ประกาศและข่าวสาร
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "holidays"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CalendarDays size={18} /> ปฏิทินวันหยุดปี 2569
        </button>
      </div>

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-6">
          {/* Admin: Create button */}
          {isAdmin && (
            <div className="flex justify-end">
              <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm() }}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="rounded-xl font-bold shadow-lg shadow-blue-500/20"
                  >
                    <Plus className="mr-2 h-4 w-4" /> สร้างประกาศใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] rounded-2xl p-0 overflow-hidden">
                  <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold">
                      {editingAnnouncement ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6 space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1.5 block">ประเภท</label>
                      <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="news">📰 ข่าวสาร</SelectItem>
                          <SelectItem value="holiday">🎉 วันหยุด</SelectItem>
                          <SelectItem value="policy">📋 นโยบาย</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1.5 block">หัวข้อ</label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="หัวข้อประกาศ..."
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1.5 block">เนื้อหา</label>
                      <Textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="รายละเอียดประกาศ..."
                        rows={5}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">วันที่เริ่ม (ไม่บังคับ)</label>
                        <Input
                          type="date"
                          value={formStartDate}
                          onChange={(e) => setFormStartDate(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">วันที่สิ้นสุด (ไม่บังคับ)</label>
                        <Input
                          type="date"
                          value={formEndDate}
                          onChange={(e) => setFormEndDate(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl"
                        onClick={() => { setIsCreateOpen(false); resetForm() }}
                      >
                        <X className="mr-2 h-4 w-4" /> ยกเลิก
                      </Button>
                      <Button
                        className="flex-1 rounded-xl font-bold"
                        onClick={handleSubmit}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : editingAnnouncement ? (
                          <Edit3 className="mr-2 h-4 w-4" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        {editingAnnouncement ? "บันทึกการแก้ไข" : "สร้างประกาศ"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-slate-300 w-10 h-10" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!announcements || announcements.length === 0) && (
            <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100">
              <CardContent className="p-16 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-slate-700">ยังไม่มีประกาศ</h3>
                <p className="text-slate-400 mt-2">ประกาศข่าวสารและนโยบายจะแสดงที่นี่</p>
              </CardContent>
            </Card>
          )}

          {/* Announcements List */}
          {!isLoading && announcements && announcements.length > 0 && (
            <div className="space-y-4">
              {announcements
                .filter(a => isAdmin || a.is_active)
                .map((a) => (
                <Card
                  key={a.id}
                  className={`rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden transition-all hover:shadow-md ${
                    !a.is_active ? "opacity-50" : ""
                  }`}
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-start gap-5">
                      {/* Icon */}
                      <div
                        className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${
                          a.type === "news"
                            ? "bg-blue-50 text-blue-600"
                            : a.type === "holiday"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {HOLIDAY_TYPE_ICON[a.type] || <Megaphone className="h-6 w-6" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge className={`font-bold border ${HOLIDAY_TYPE_COLOR[a.type]}`}>
                            {HOLIDAY_TYPE_LABEL[a.type]}
                          </Badge>
                          {a.start_date && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(a.start_date), "d MMM yyyy", { locale: th })}
                              {a.end_date && ` - ${format(new Date(a.end_date), "d MMM yyyy", { locale: th })}`}
                            </span>
                          )}
                          {!a.is_active && (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200">
                              <EyeOff className="h-3 w-3 mr-1" /> ซ่อน
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{a.title}</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                          <span>
                            โพสต์เมื่อ {format(new Date(a.created_at), "d MMM yyyy HH:mm", { locale: th })}
                          </span>
                          {a.created_by?.full_name && (
                            <span>โดย {a.created_by.full_name}</span>
                          )}
                        </div>
                      </div>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl"
                            onClick={() => toggleMutation.mutate({ id: a.id, is_active: !a.is_active })}
                            title={a.is_active ? "ซ่อนประกาศ" : "แสดงประกาศ"}
                          >
                            {a.is_active ? (
                              <Eye className="h-4 w-4 text-slate-400" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl"
                            onClick={() => handleEdit(a)}
                          >
                            <Edit3 className="h-4 w-4 text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500"
                            onClick={() => {
                              if (window.confirm("คุณแน่ใจที่จะลบประกาศนี้?")) {
                                deleteMutation.mutate(a.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === "holidays" && (
        <div className="space-y-4">
          {/* Info Banner */}
          <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 bg-gradient-to-br from-red-50 to-amber-50">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 shrink-0 bg-red-100 rounded-2xl flex items-center justify-center">
                  <PartyPopper className="h-7 w-7 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    วันหยุดตามประเพณีของสถาบันการเงิน ประจำปี 2569
                  </h3>
                  <p className="text-sm text-slate-500">
                    อ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) —{" "}
                    <a
                      href="https://www.bot.or.th/th/financial-institutions-holiday.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      bot.or.th
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Holidays by Month */}
          {Object.keys(months).map((monthKey) => {
            const month = parseInt(monthKey)
            const holidays = months[month]
            const isExpanded = expandedMonths.includes(month)

            return (
              <Card
                key={month}
                className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full p-5 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {thaiMonths[month]} 2569
                      </h3>
                      <p className="text-xs text-slate-400">
                        {holidays.length} วันหยุด
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-50 text-red-600 border-red-200 font-bold">
                      {holidays.length} วัน
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 md:px-6 pb-5 md:pb-6 border-t border-slate-50">
                    <div className="divide-y divide-slate-50">
                      {holidays.map((h, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-12 h-12 shrink-0 bg-red-50 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-red-500 leading-none">
                              {new Date(h.date).getDate()}
                            </span>
                            <span className="text-[9px] font-bold text-red-400 uppercase leading-tight">
                              {new Date(h.date).toLocaleDateString("th-TH", { month: "short" })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800">{h.name}</p>
                            <p className="text-xs text-slate-400">
                              {formatThaiDate(h.date)} · {h.nameEn}
                            </p>
                          </div>
                          <Badge className="bg-red-50 text-red-600 border-red-200 shrink-0">
                            🎉 วันหยุด
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}

          {/* Total count */}
          <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 bg-slate-900 text-white">
            <CardContent className="p-6 text-center">
              <p className="text-slate-400 text-sm font-medium">รวมวันหยุดตามประเพณีของสถาบันการเงิน</p>
              <p className="text-4xl font-black mt-1">{BOT_HOLIDAYS_2026.length} วัน</p>
              <p className="text-slate-400 text-xs mt-1">สำหรับปี 2569</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

