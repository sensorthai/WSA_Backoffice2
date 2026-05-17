"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  ChevronLeft, 
  CalendarDays, 
  Clock, 
  FileText, 
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  User,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export default function LeaveDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // 1. Fetch Leave Detail
  const { data: leave, isLoading, error } = useQuery({
    queryKey: ["leave", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/leaves/${params.id}`)
      if (!res.ok) throw new Error("ไม่พบข้อมูลใบลา")
      return res.json()
    }
  })

  // 2. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leaves/${params.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("ยกเลิกไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] })
      alert("ยกเลิกใบลาเรียบร้อยแล้ว")
      router.push("/leaves")
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'รออนุมัติ', color: 'bg-amber-500', icon: Clock, bg: 'bg-amber-50' }
      case 'supervisor_approved':
        return { label: 'หัวหน้าอนุมัติแล้ว', color: 'bg-blue-500', icon: ShieldCheck, bg: 'bg-blue-50' }
      case 'approved':
        return { label: 'อนุมัติแล้ว', color: 'bg-emerald-500', icon: CheckCircle2, bg: 'bg-emerald-50' }
      case 'rejected':
        return { label: 'ปฏิเสธ', color: 'bg-rose-500', icon: XCircle, bg: 'bg-rose-50' }
      default:
        return { label: status, color: 'bg-slate-500', icon: AlertCircle, bg: 'bg-slate-50' }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
        <p className="text-slate-400 font-bold">กำลังโหลดรายละเอียด...</p>
      </div>
    )
  }

  if (error || !leave) {
    const errorMsg = (error as any)?.message || (leave as any)?.error || "ไม่พบข้อมูลใบลาที่คุณต้องการ หรือคุณไม่มีสิทธิ์เข้าถึง"
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-6">
        <div className="p-8 bg-rose-50 text-rose-500 rounded-full inline-block">
          <AlertCircle size={64} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">เกิดข้อผิดพลาด</h1>
        <p className="text-slate-500 font-medium">{errorMsg}</p>
        <Button onClick={() => router.push("/leaves")} variant="outline" className="rounded-xl px-8 h-12">
          กลับไปยังรายการใบลา
        </Button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(leave.status)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Navigation */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="group text-slate-500 hover:text-slate-900 font-bold px-0 hover:bg-transparent"
      >
        <ChevronLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        ย้อนกลับ
      </Button>

      {/* Header Card */}
      <div className="relative overflow-hidden bg-white p-10 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-lg", statusInfo.color)}>
              <statusInfo.icon size={16} />
              {statusInfo.label}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              ลา{leave.leave_type === 'sick' ? 'ป่วย' : leave.leave_type === 'personal' ? 'กิจ' : 'พักร้อน'}
            </h1>
            <p className="text-slate-400 text-lg font-medium">
              รหัสอ้างอิง: <span className="font-bold text-slate-600 uppercase">#{leave.id.substring(0, 8)}</span>
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 bg-slate-50 px-8 py-6 rounded-[2rem] border border-slate-100">
            <div className="text-5xl font-black text-slate-900">{leave.days_count}</div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">วันหยุดรวม</div>
          </div>
        </div>

        {/* Status indicator on top right */}
        <div className={cn("absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 rounded-full blur-[60px] opacity-20", statusInfo.color)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-xs">
                <CalendarDays size={18} className="text-blue-600" /> ระยะเวลาที่ขอลา
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เริ่มต้น</div>
                  <div className="text-xl font-black text-slate-900">{format(new Date(leave.start_date), "d MMMM yyyy", { locale: th })}</div>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สิ้นสุด</div>
                  <div className="text-xl font-black text-slate-900">{format(new Date(leave.end_date), "d MMMM yyyy", { locale: th })}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-xs">
                <FileText size={18} className="text-blue-600" /> เหตุผลการลา
              </div>
              <div className="p-8 bg-blue-50/30 rounded-[2rem] text-slate-700 leading-relaxed font-medium text-lg italic">
                "{leave.reason}"
              </div>
            </div>
          </Card>

          {/* Action Footer */}
          {leave.status === 'pending' && (
            <div className="flex justify-end gap-4">
              <Button 
                variant="ghost" 
                className="rounded-2xl h-14 px-8 font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                onClick={() => {
                  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอลาครั้งนี้?")) {
                    cancelMutation.mutate()
                  }
                }}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="mr-2 w-5 h-5" />}
                ยกเลิกใบลา
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar Info - Approval Timeline */}
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 p-8">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" /> ลำดับการอนุมัติ
            </h3>
            
            <div className="space-y-10 relative">
              {/* Timeline Line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

              {/* Step 1: Supervisor */}
              <div className="relative flex gap-6">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm",
                  leave.supervisor_approved_at ? "bg-emerald-500" : leave.status === 'rejected' && leave.supervisor_note ? "bg-rose-500" : "bg-slate-200"
                )}>
                  {leave.supervisor_approved_at ? <CheckCircle2 size={12} className="text-white" /> : null}
                </div>
                <div className="space-y-2">
                  <div className="font-black text-slate-900 text-sm">หัวหน้างาน (Supervisor)</div>
                  {leave.supervisor_approved_at ? (
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">อนุมัติเมื่อ {format(new Date(leave.supervisor_approved_at), "d MMM HH:mm", { locale: th })}</div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-400 uppercase">รอดำเนินการ</div>
                  )}
                  {leave.supervisor_note && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-500 font-medium">
                       {leave.supervisor_note}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: CEO */}
              <div className="relative flex gap-6">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm",
                  leave.ceo_approved_at ? "bg-emerald-500" : leave.status === 'rejected' && leave.ceo_note ? "bg-rose-500" : "bg-slate-200"
                )}>
                  {leave.ceo_approved_at ? <CheckCircle2 size={12} className="text-white" /> : null}
                </div>
                <div className="space-y-2">
                  <div className="font-black text-slate-900 text-sm">CEO / ฝ่ายบุคคล</div>
                  {leave.ceo_approved_at ? (
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">อนุมัติเมื่อ {format(new Date(leave.ceo_approved_at), "d MMM HH:mm", { locale: th })}</div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-400 uppercase">รอดำเนินการ</div>
                  )}
                  {leave.ceo_note && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-500 font-medium">
                       {leave.ceo_note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Requester Info */}
          <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 p-8 bg-slate-900 text-white">
             <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-white/20">
                   <AvatarFallback className="bg-blue-600 text-white font-black">{leave.users?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                   <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ผู้ขอลา</div>
                   <div className="font-bold">{leave.users?.full_name}</div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
