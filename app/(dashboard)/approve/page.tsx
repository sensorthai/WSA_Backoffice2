"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  CalendarDays,
  Loader2,
  ChevronRight,
  ShieldCheck
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"


export default function ApprovePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  const [selectedLeave, setSelectedLeave] = useState<any>(null)
  const [approvalNote, setApprovalNote] = useState("")

  // 1. Fetch Pending Leaves
  const { data: pendingLeaves, isLoading: leavesLoading } = useQuery({
    queryKey: ["pending-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leaves/pending")
      return res.json()
    },
    enabled: !!session?.user
  })

  // 2. Mutation for Approval/Rejection
  const approveMutation = useMutation({
    mutationFn: async ({ id, action, note, stage }: any) => {
      const res = await fetch(`/api/leaves/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ action, note, stage }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error("การดำเนินการล้มเหลว")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-leaves"] })
      setSelectedLeave(null)
      setApprovalNote("")
      alert("ดำเนินการเรียบร้อยแล้ว")
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const handleAction = (action: 'approve' | 'reject') => {
    const stage = userRole === 'supervisor' ? 'supervisor' : 'ceo'
    approveMutation.mutate({
      id: selectedLeave.id,
      action,
      note: approvalNote,
      stage
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-slate-200">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-600/30">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">เมนูพิจารณาอนุมัติ</h1>
            <p className="text-blue-100/60 font-medium mt-1">จัดการคำขอที่รอการพิจารณาจากพนักงานในสังกัด</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
           <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
           <span className="text-sm font-bold uppercase tracking-widest text-blue-200">
             {userRole} Mode
           </span>
        </div>
      </div>

      <Tabs defaultValue="leaves" className="w-full space-y-8">
        <TabsList className="bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 inline-flex shadow-sm">
          <TabsTrigger 
            value="leaves" 
            className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 font-bold transition-all"
          >
            รายการใบลา
            <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
              {pendingLeaves?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="purchases" 
            className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 font-bold transition-all"
          >
            รายการใบเบิก
            <Badge className="ml-2 bg-slate-100 text-slate-400 hover:bg-slate-100">0</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-4">
          {leavesLoading ? (
            <div className="py-32 text-center flex flex-col items-center gap-4 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
               <Loader2 className="w-12 h-12 animate-spin text-blue-200" />
               <p className="text-slate-400 font-bold">กำลังรวบรวมรายการที่รอพิจารณา...</p>
            </div>
          ) : !Array.isArray(pendingLeaves) || pendingLeaves.length === 0 ? (
            <div className="py-32 text-center flex flex-col items-center gap-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <div className="p-8 bg-white rounded-full shadow-sm text-slate-200">
                  <CheckCircle2 size={64} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">ไม่มีรายการค้างคา</h3>
                  <p className="text-slate-400 font-medium">
                    {pendingLeaves?.error || "ทุกอย่างได้รับการจัดการเรียบร้อยแล้วในขณะนี้"}
                  </p>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingLeaves.map((leave: any) => (
                <Card 
                  key={leave.id} 
                  className="group rounded-[2.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 overflow-hidden cursor-pointer hover:-translate-y-1"
                  onClick={() => setSelectedLeave(leave)}
                >
                  <CardContent className="p-0">
                     <div className="flex flex-col md:flex-row items-center p-8 gap-8">
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                           <Avatar className="w-20 h-20 border-4 border-slate-50 shadow-inner">
                              <AvatarImage src={leave.user?.avatar_url} />
                              <AvatarFallback className="bg-slate-100 text-slate-400 font-black text-2xl">
                                 {leave.user?.full_name?.substring(0, 2)}
                              </AvatarFallback>
                           </Avatar>
                           <div className="min-w-0">
                              <h3 className="font-black text-2xl text-slate-900 tracking-tight">{leave.user?.full_name}</h3>
                              <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-0.5">{leave.user?.department}</p>
                              <div className="flex items-center gap-4 mt-2">
                                 <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 rounded-lg px-3 py-1 font-bold uppercase text-[10px]">
                                    {leave.leave_type}
                                 </Badge>
                                 <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                    <Clock size={14} />
                                    {format(new Date(leave.created_at), "d MMM HH:mm", { locale: th })}
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-1.5 px-8 border-x border-slate-100">
                           <div className="text-3xl font-black text-slate-900">{leave.days_count} <span className="text-sm font-bold text-slate-400">วัน</span></div>
                           <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ระยะเวลาการลา</div>
                        </div>

                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                              <ChevronRight size={24} />
                           </div>
                        </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases">
           <div className="py-32 text-center flex flex-col items-center gap-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <p className="text-slate-400 font-bold text-lg">ระบบใบเบิกกำลังอยู่ระหว่างการพัฒนา</p>
           </div>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={(open) => !open && setSelectedLeave(null)}>
        <DialogContent className="rounded-[3rem] sm:max-w-[600px] border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          {selectedLeave && (
            <>
              <div className="bg-slate-900 p-10 text-white relative">
                <DialogHeader>
                  <div className="flex items-center gap-5 mb-6">
                     <Avatar className="w-16 h-16 border-2 border-white/20">
                        <AvatarImage src={selectedLeave.user?.avatar_url} />
                        <AvatarFallback>{selectedLeave.user?.full_name?.charAt(0)}</AvatarFallback>
                     </Avatar>
                     <div>
                        <DialogTitle className="text-3xl font-black">{selectedLeave.user?.full_name}</DialogTitle>
                        <p className="text-blue-400 font-bold text-sm tracking-widest uppercase">{selectedLeave.user?.department}</p>
                     </div>
                  </div>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-4 border-t border-white/10">
                   <div>
                      <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">ประเภทการลา</div>
                      <div className="text-xl font-bold uppercase">{selectedLeave.leave_type}</div>
                   </div>
                   <div>
                      <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">จำนวนวัน</div>
                      <div className="text-xl font-bold">{selectedLeave.days_count} วัน</div>
                   </div>
                </div>
              </div>

              <div className="p-6 md:p-10 space-y-8 bg-white">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-xs">
                      <CalendarDays size={16} className="text-blue-600" /> ช่วงเวลาที่ขอลา
                   </div>
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-around text-center">
                      <div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">จากวันที่</div>
                         <div className="text-lg font-black text-slate-900">{format(new Date(selectedLeave.start_date), "d MMMM yyyy", { locale: th })}</div>
                      </div>
                      <div className="w-10 h-px bg-slate-200" />
                      <div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">ถึงวันที่</div>
                         <div className="text-lg font-black text-slate-900">{format(new Date(selectedLeave.end_date), "d MMMM yyyy", { locale: th })}</div>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-xs">
                      <FileText size={16} className="text-blue-600" /> เหตุผลการลา
                   </div>
                   <div className="p-6 bg-blue-50/30 rounded-3xl text-slate-700 leading-relaxed font-medium italic">
                      "{selectedLeave.reason}"
                   </div>
                </div>

                <div className="space-y-3">
                   <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุการพิจารณา (Optional)</Label>
                   <Textarea 
                      placeholder="ใส่ข้อความแจ้งพนักงานหากมีการปฏิเสธหรือคำแนะนำเพิ่มเติม..."
                      className="rounded-3xl border-slate-100 bg-slate-50/50 p-5 focus:ring-blue-600/20"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                   />
                </div>

                <DialogFooter className="flex flex-row gap-4 pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleAction('reject')}
                    disabled={approveMutation.isPending}
                    className="flex-1 h-16 rounded-[2rem] font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all border-2 border-transparent hover:border-rose-100"
                  >
                    <XCircle className="mr-2 w-6 h-6" /> ปฏิเสธ
                  </Button>
                  <Button 
                    onClick={() => handleAction('approve')}
                    disabled={approveMutation.isPending}
                    className="flex-[2] h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                  >
                    {approveMutation.isPending ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                    อนุมัติคำขอลา
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
