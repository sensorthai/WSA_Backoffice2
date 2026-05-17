"use client"

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
  Wallet, 
  Car, 
  ChevronRight,
  Loader2,
  MessageSquare,
  Filter,
  History as HistoryIcon,
  Bell,
  Search,
  LayoutGrid,
  Calendar,
  User,
  ArrowRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  // --- States ---
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState("")

  // --- Queries ---
  const { data: pendingItems, isLoading: isPendingLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending")
      return res.json()
    },
    refetchInterval: 30000 // 30 seconds
  })

  const { data: historyItems, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["approval-history"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/history")
      return res.json()
    }
  })

  // --- Mutations ---
  const approveMutation = useMutation({
    mutationFn: async ({ id, type, action, note }: any) => {
      const stage = (type === 'leave' || type === 'purchase') && userRole === 'ceo' ? 'ceo' : 'supervisor'
      const endpoint = `/api/${type === 'leave' ? 'leaves' : type === 'purchase' ? 'purchases' : 'cars/bookings'}/${id}/approve`
      
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, note, stage }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error((await res.json()).error || "Action failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] })
      queryClient.invalidateQueries({ queryKey: ["approval-history"] })
      setIsDetailOpen(false)
      setRejectNote("")
    },
    onError: (e: any) => alert(e.message)
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'leave': return <FileText className="text-emerald-500" />
      case 'purchase': return <Wallet className="text-blue-500" />
      case 'car_booking': return <Car className="text-indigo-500" />
      default: return <LayoutGrid />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-600 border-amber-200">รอหัวหน้า</Badge>
      case 'supervisor_approved': return <Badge className="bg-blue-100 text-blue-600 border-blue-200">รอ CEO</Badge>
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 font-bold">อนุมัติแล้ว</Badge>
      case 'rejected': return <Badge className="bg-rose-100 text-rose-600 border-rose-200">ปฏิเสธ</Badge>
      case 'returned': return <Badge className="bg-slate-900 text-white border-0">คืนรถแล้ว</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const renderDetail = (item: any) => {
    if (!item) return null
    return (
      <div className="space-y-8 py-4">
        <div className="flex items-center gap-4">
           <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
              <AvatarImage src={item.user?.avatar_url} />
              <AvatarFallback className="bg-slate-100 text-xl font-black">{item.user?.full_name?.charAt(0)}</AvatarFallback>
           </Avatar>
           <div>
              <h3 className="text-2xl font-black text-slate-900">{item.user?.full_name}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{item.label} • {format(new Date(item.created_at), "d MMMM yyyy", { locale: th })}</p>
           </div>
        </div>

        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
           {item.type === 'leave' && (
             <>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภทการลา</Label>
                    <div className="text-lg font-black text-slate-900">{item.leave_type}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนวัน</Label>
                    <div className="text-lg font-black text-slate-900">{item.days_count} วัน</div>
                  </div>
               </div>
               <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ระยะเวลา</Label>
                  <div className="font-bold text-slate-600">{format(new Date(item.start_date), "d MMM yyyy", { locale: th })} - {format(new Date(item.end_date), "d MMM yyyy", { locale: th })}</div>
               </div>
             </>
           )}

           {item.type === 'purchase' && (
             <>
                <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการเบิก</Label>
                  <div className="text-2xl font-black text-slate-900">{item.title}</div>
                </div>
                <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-inner">
                   <span className="text-slate-400 font-black uppercase tracking-widest text-xs">ยอดเงินรวม</span>
                   <span className="text-3xl font-black text-blue-600">{Number(item.total_amount).toLocaleString()} ฿</span>
                </div>
             </>
           )}

           {item.type === 'car_booking' && (
             <>
                <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จุดหมายปลายทาง</Label>
                  <div className="text-2xl font-black text-slate-900">{item.destination}</div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันเวลาใช้งาน</Label>
                   <div className="font-bold text-slate-600">{format(new Date(item.start_datetime), "d MMM yyyy HH:mm", { locale: th })}</div>
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ArrowRight size={14} />
                      {format(new Date(item.end_datetime), "d MMM yyyy HH:mm", { locale: th })}
                   </div>
                </div>
             </>
           )}
        </div>

        {item.status === 'pending' || item.status === 'supervisor_approved' ? (
          <div className="space-y-6">
             <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุการพิจารณา</Label>
                <Textarea 
                   placeholder="ใส่ข้อความแจ้งพนักงาน..."
                   className="rounded-3xl border-slate-100 bg-slate-50/50 p-5 focus:ring-blue-600/20"
                   value={rejectNote}
                   onChange={e => setRejectNote(e.target.value)}
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <Button 
                   variant="ghost" 
                   className="h-16 rounded-2xl font-black text-rose-500 hover:bg-rose-50"
                   onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'reject', note: rejectNote })}
                   disabled={approveMutation.isPending}
                >
                   <XCircle className="mr-2" /> ปฏิเสธ
                </Button>
                <Button 
                   className="h-16 rounded-2xl bg-slate-900 text-white font-black shadow-xl"
                   onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'approve', note: rejectNote })}
                   disabled={approveMutation.isPending}
                >
                   <CheckCircle2 className="mr-2" /> อนุมัติคำขอ
                </Button>
             </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">สถานะปัจจุบัน</Label>
             <div className="flex items-center justify-between">
                {getStatusBadge(item.status)}
                <div className="text-xs text-slate-400 font-bold">{format(new Date(item.updated_at || item.created_at), "d MMM yyyy HH:mm", { locale: th })}</div>
             </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">ศูนย์กลางการอนุมัติ</h1>
            <p className="text-slate-400 font-medium mt-2">พิจารณาคำขอลา ใบเบิกเงิน และการจองรถในที่เดียว</p>
         </div>
         <div className="flex gap-4">
            <div className="h-14 px-6 bg-white rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
               <Bell size={20} className="text-blue-500" />
               <span className="font-black text-slate-900">{pendingItems?.length || 0} รายการที่รอดำเนินการ</span>
            </div>
         </div>
      </div>

      <Tabs defaultValue="pending" className="w-full space-y-10">
        <TabsList className="bg-white/50 backdrop-blur-sm p-1.5 rounded-3xl border border-slate-100 inline-flex shadow-sm">
           <TabsTrigger value="pending" className="rounded-2xl px-10 py-4 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-blue-600 font-black text-base transition-all">
              รายการรอดำเนินการ
              {pendingItems?.length > 0 && <Badge className="ml-2 bg-blue-600 text-white border-0">{pendingItems.length}</Badge>}
           </TabsTrigger>
           <TabsTrigger value="history" className="rounded-2xl px-10 py-4 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-blue-600 font-black text-base transition-all">
              <HistoryIcon className="w-5 h-5 mr-2" /> ประวัติการอนุมัติ
           </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
              <Table>
                 <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                       <TableHead className="py-8 pl-10 font-black text-slate-400 uppercase tracking-widest text-[11px]">ประเภท</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ผู้ขอ</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">รายละเอียด</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">วันที่ส่ง</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">สถานะ</TableHead>
                       <TableHead className="pr-10 text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">จัดการ</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {isPendingLoading ? (
                      <TableRow><TableCell colSpan={6} className="py-24 text-center"><Loader2 className="animate-spin inline-block text-blue-200 w-12 h-12" /></TableCell></TableRow>
                    ) : !Array.isArray(pendingItems) || pendingItems.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-40 text-center text-slate-300 font-bold text-lg">ไม่มีรายการรอดำเนินการในขณะนี้</TableCell></TableRow>
                    ) : pendingItems.map((item: any) => (
                      <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group cursor-pointer" onClick={() => { setSelectedItem(item); setIsDetailOpen(true); }}>
                         <TableCell className="py-8 pl-10">
                            <div className="flex items-center gap-3">
                               <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", item.color)}>
                                  {getIcon(item.type)}
                               </div>
                               <span className="font-black text-slate-700">{item.label}</span>
                            </div>
                         </TableCell>
                         <TableCell>
                            <div className="flex items-center gap-3">
                               <Avatar className="h-8 w-8">
                                  <AvatarImage src={item.user?.avatar_url} />
                                  <AvatarFallback>{item.user?.full_name?.charAt(0)}</AvatarFallback>
                               </Avatar>
                               <span className="font-bold text-slate-900">{item.user?.full_name}</span>
                            </div>
                         </TableCell>
                         <TableCell className="max-w-[200px] truncate font-medium text-slate-500">
                            {item.type === 'leave' ? `ลา${item.leave_type} ${item.days_count} วัน` : item.type === 'purchase' ? item.title : item.destination}
                         </TableCell>
                         <TableCell className="text-slate-400 font-medium">
                            {format(new Date(item.created_at), "d MMM HH:mm", { locale: th })}
                         </TableCell>
                         <TableCell>
                            {getStatusBadge(item.status)}
                         </TableCell>
                         <TableCell className="pr-10 text-right">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-lg">
                               <ChevronRight size={20} />
                            </Button>
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Similar Table for History */}
           <Card className="rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
              <Table>
                 <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100">
                       <TableHead className="py-8 pl-10 font-black text-slate-400 uppercase tracking-widest text-[11px]">ประเภท</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ผู้ขอ</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">รายละเอียด</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">สถานะสุดท้าย</TableHead>
                       <TableHead className="pr-10 text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">วันที่อัปเดต</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {isHistoryLoading ? (
                      <TableRow><TableCell colSpan={5} className="py-24 text-center"><Loader2 className="animate-spin inline-block text-blue-200" /></TableCell></TableRow>
                    ) : !Array.isArray(historyItems) || historyItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-40 text-center text-slate-300 font-bold text-lg">ไม่มีประวัติการอนุมัติ</TableCell></TableRow>
                    ) : historyItems.map((item: any) => (
                      <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors" onClick={() => { setSelectedItem(item); setIsDetailOpen(true); }}>
                         <TableCell className="py-8 pl-10">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400">
                                  {getIcon(item.type)}
                               </div>
                               <span className="font-bold text-slate-500">{item.label}</span>
                            </div>
                         </TableCell>
                         <TableCell className="font-bold text-slate-900">{item.user?.full_name}</TableCell>
                         <TableCell className="font-medium text-slate-500">{item.type === 'purchase' ? `${Number(item.total_amount).toLocaleString()} ฿` : item.type === 'leave' ? `${item.days_count} วัน` : item.destination}</TableCell>
                         <TableCell>{getStatusBadge(item.status)}</TableCell>
                         <TableCell className="pr-10 text-right text-slate-400 font-medium">
                            {format(new Date(item.updated_at || item.created_at), "d MMM yy", { locale: th })}
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
         <DialogContent className="max-w-xl rounded-[3rem] p-10 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
               <DialogTitle className="text-slate-400 font-black text-xs uppercase tracking-widest mb-4">รายละเอียดคำขอ</DialogTitle>
            </DialogHeader>
            {renderDetail(selectedItem)}
         </DialogContent>
      </Dialog>
    </div>
  )
}
