"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Plus, 
  CalendarRange, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MoreVertical,
  CalendarDays,
  FileText,
  Loader2,
  Trash2,
  Edit2,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createSupabaseClient } from "@/lib/supabase"

export default function LeavesPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isNewLeaveOpen, setIsNewLeaveOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Form State
  const [leaveType, setLeaveType] = useState("vacation")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 1. Fetch User's Leaves
  const { data, isLoading } = useQuery({
    queryKey: ["my-leaves", statusFilter],
    queryFn: async () => {
      const url = new URL("/api/leaves", window.location.origin)
      if (statusFilter !== "all") url.searchParams.append("status", statusFilter)
      const res = await fetch(url.toString())
      return res.json()
    }
  })

  // 1.1 Fetch Stats
  const { data: stats } = useQuery({
    queryKey: ["leave-stats"],
    queryFn: async () => {
      const res = await fetch("/api/leaves/stats")
      return res.json()
    }
  })

  // 2. Mutation to Create Leave
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/leaves", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] })
      setIsNewLeaveOpen(false)
      resetForm()
      alert("ยื่นคำขอลาเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  // 3. Mutation to Delete/Cancel Leave
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("ยกเลิกใบลาไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] })
      alert("ยกเลิกใบลาเรียบร้อยแล้ว")
    }
  })

  const resetForm = () => {
    setLeaveType("vacation")
    setStartDate("")
    setEndDate("")
    setReason("")
    setAttachment(null)
  }

  const handleFileUpload = async (file: File) => {
    const supabase = createSupabaseClient()
    const userId = session?.user?.id
    if (!userId) throw new Error("User session not found")

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `leave-attachments/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)

    if (uploadError) {
      console.error("Upload Error Details:", uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">รออนุมัติ</Badge>
      case 'supervisor_approved':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">หัวหน้าอนุมัติแล้ว</Badge>
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">อนุมัติแล้ว</Badge>
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">ปฏิเสธ</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-12">
      {/* Header Section */}
      {/* Leave Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-1000 delay-150">
        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden group hover:shadow-xl hover:shadow-blue-900/5 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all">
                <FileText size={20} />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sick Leave</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">
                {stats?.sick || 0} <span className="text-slate-300 text-xl">/ {stats?.quotas?.sick_quota || 30}</span>
              </div>
              <div className="text-xs font-bold text-slate-400 flex justify-between items-center">
                <span>ลาป่วยในปีนี้ (วัน)</span>
                <span className="text-amber-600">คงเหลือ {(stats?.quotas?.sick_quota || 30) - (stats?.sick || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden group hover:shadow-xl hover:shadow-blue-900/5 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                <User size={20} />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">
                {stats?.personal || 0} <span className="text-slate-300 text-xl">/ {stats?.quotas?.personal_quota || 6}</span>
              </div>
              <div className="text-xs font-bold text-slate-400 flex justify-between items-center">
                <span>ลากิจในปีนี้ (วัน)</span>
                <span className="text-blue-600">คงเหลือ {(stats?.quotas?.personal_quota || 6) - (stats?.personal || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden group hover:shadow-xl hover:shadow-blue-900/5 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <CalendarRange size={20} />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vacation</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">
                {stats?.vacation || 0} <span className="text-slate-300 text-xl">/ {stats?.quotas?.vacation_quota || 6}</span>
              </div>
              <div className="text-xs font-bold text-slate-400 flex justify-between items-center">
                <span>ลาพักร้อนในปีนี้ (วัน)</span>
                <span className="text-emerald-600">คงเหลือ {(stats?.quotas?.vacation_quota || 6) - (stats?.vacation || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 bg-slate-900 text-white overflow-hidden group hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/10 text-white rounded-2xl">
                <CheckCircle2 size={20} />
              </div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Used</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-white">{stats?.total || 0}</div>
              <div className="text-xs font-bold text-white/40">ใช้ไปทั้งหมด (วัน)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-emerald-500 text-white rounded-3xl shadow-xl shadow-emerald-500/20">
            <CalendarRange size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">การลางานของฉัน</h1>
            <p className="text-slate-400 font-medium mt-0.5">จัดการและติดตามสถานะคำขอลาทั้งหมด</p>
          </div>
        </div>

        <Dialog open={isNewLeaveOpen} onOpenChange={setIsNewLeaveOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-8 h-14 font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95">
              <Plus className="mr-2 w-5 h-5" /> สร้างใบลาใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] sm:max-w-[500px] border-0 shadow-2xl p-0 overflow-hidden">
            <div className="bg-emerald-600 p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <CalendarDays size={28} /> ยื่นขอลาหยุด
                </DialogTitle>
                <p className="text-emerald-100 opacity-80 mt-1">กรุณากรอกรายละเอียดการลาของคุณ</p>
              </DialogHeader>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการลา</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 focus:ring-emerald-500/20 font-medium">
                    <SelectValue placeholder="เลือกประเภทการลา" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="sick" className="rounded-xl">ลาป่วย (Sick Leave)</SelectItem>
                    <SelectItem value="personal" className="rounded-xl">ลากิจ (Personal Leave)</SelectItem>
                    <SelectItem value="vacation" className="rounded-xl">ลาพักร้อน (Vacation Leave)</SelectItem>
                    <SelectItem value="other" className="rounded-xl">ลาอื่นๆ (Other)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันที่เริ่ม</Label>
                  <Input 
                    type="date" 
                    className="rounded-2xl h-12 border-slate-100 bg-slate-50/50" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันที่สิ้นสุด</Label>
                  <Input 
                    type="date" 
                    className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เหตุผลการลา</Label>
                <Textarea 
                  placeholder="ระบุรายละเอียดหรือเหตุผล..."
                  className="rounded-2xl min-h-[100px] border-slate-100 bg-slate-50/50 focus:ring-emerald-500/20 p-4"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {leaveType === 'sick' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <FileText size={14} className="text-amber-500" /> ใบรับรองแพทย์ (บังคับ)
                  </Label>
                  <Input 
                    type="file" 
                    accept="image/*,.pdf"
                    className="rounded-2xl h-12 border-slate-100 bg-amber-50/30 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                  <p className="text-[10px] text-amber-600 font-bold ml-1">* จำเป็นต้องแนบเอกสารเพื่อยืนยันการลาป่วย</p>
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsNewLeaveOpen(false)}
                  className="rounded-2xl h-14 font-bold text-slate-400 hover:text-slate-600"
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      setIsUploading(true)
                      let url = null
                      if (leaveType === 'sick') {
                        if (!attachment) {
                          alert("กรุณาแนบใบรับรองแพทย์")
                          return
                        }
                        url = await handleFileUpload(attachment)
                      }
                      createMutation.mutate({ 
                        leave_type: leaveType, 
                        start_date: startDate, 
                        end_date: endDate, 
                        reason,
                        attachment_url: url
                      })
                    } catch (err) {
                      alert("การอัปโหลดไฟล์ล้มเหลว")
                    } finally {
                      setIsUploading(false)
                    }
                  }}
                  disabled={!startDate || !endDate || !reason || (leaveType === 'sick' && !attachment) || createMutation.isPending || isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 px-8 font-black shadow-lg shadow-emerald-600/20"
                >
                  {(createMutation.isPending || isUploading) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  ส่งคำขอลา
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3 font-black text-slate-900 uppercase tracking-widest text-sm">
            <FileText size={18} className="text-slate-400" /> รายการใบลาของคุณ
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="pending">รออนุมัติ</SelectItem>
              <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
              <SelectItem value="rejected">ปฏิเสธ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-200" />
            <p className="text-slate-400 font-bold">กำลังรวบรวมข้อมูลรายการลาของคุณ...</p>
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="p-8 bg-white rounded-full shadow-sm text-slate-200">
               <CalendarRange size={64} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">ไม่พบรายการใบลา</h3>
              <p className="text-slate-400 font-medium">คุณยังไม่มีคำขอลาในช่วงเวลาที่เลือก</p>
            </div>
            <Button 
               variant="outline" 
               className="rounded-xl border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
               onClick={() => setIsNewLeaveOpen(true)}
            >
               เริ่มยื่นขอลาครั้งแรก
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.data.map((leave: any) => (
              <Card key={leave.id} className="group overflow-hidden rounded-3xl border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch">
                    {/* Status Color Bar */}
                    <div className={cn(
                      "w-full md:w-2",
                      leave.status === 'pending' ? "bg-amber-400" :
                      leave.status === 'approved' ? "bg-emerald-500" :
                      leave.status === 'rejected' ? "bg-rose-500" : "bg-blue-500"
                    )} />
                    
                    <div className="flex-1 p-6 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">ลา{leave.leave_type === 'sick' ? 'ป่วย' : leave.leave_type === 'personal' ? 'กิจ' : 'พักร้อน'}</h3>
                          {getStatusBadge(leave.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-300" />
                            {format(new Date(leave.start_date), "d MMM yyyy", { locale: th })} - {format(new Date(leave.end_date), "d MMM yyyy", { locale: th })}
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-600">
                            {leave.days_count} วัน
                          </div>
                        </div>
                        {leave.reason && (
                           <p className="text-slate-400 text-sm line-clamp-1 italic mt-1 font-medium">"{leave.reason}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {leave.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => {
                              if (confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกใบลาวันนี้?")) {
                                deleteMutation.mutate(leave.id)
                              }
                            }}
                          >
                            <Trash2 size={20} />
                          </Button>
                        )}
                        {leave.attachment_url && (
                          <a href={leave.attachment_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="rounded-xl text-amber-600 hover:bg-amber-50 gap-2 font-bold">
                               <FileText size={16} /> ใบรับรองแพทย์
                            </Button>
                          </a>
                        )}
                        <Link href={`/leaves/${leave.id}`}>
                           <Button variant="outline" className="rounded-xl border-slate-100 hover:bg-slate-50 font-bold">
                              รายละเอียด
                           </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
