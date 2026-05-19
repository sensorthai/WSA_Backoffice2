"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Building2, 
  Home, 
  Palmtree, 
  Clock, 
  Search, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Car,
  CheckSquare,
  MapPin,
  AlertCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

import { cn } from "@/lib/utils"


export default function CEOPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")

  // --- Data Fetching ---
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["ceo-overview"],
    queryFn: async () => {
      const res = await fetch("/api/ceo/overview")
      return res.json()
    },
    refetchInterval: 60000 // Auto refresh every 60 seconds
  })

  // --- Mutations ---
  const approveMutation = useMutation({
    mutationFn: async ({ id, type, action }: any) => {
      const res = await fetch(`/api/${type === 'leave' ? 'leaves' : type === 'purchase' ? 'purchases' : 'cars/bookings'}/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ action, stage: 'ceo' }),
        headers: { "Content-Type": "application/json" }
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ceo-overview"] })
    }
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async (items: any[]) => {
      return Promise.all(items.map(item => 
        fetch(`/api/${item.type === 'leave' ? 'leaves' : item.type === 'purchase' ? 'purchases' : 'cars/bookings'}/${item.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ action: 'approve', stage: 'ceo' }),
          headers: { "Content-Type": "application/json" }
        })
      ))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ceo-overview"] })
    }
  })

  // --- Helpers ---
  const formatBE = (date: Date) => {
    const d = new Date(date)
    const yearBE = d.getFullYear() + 543
    return format(d, `eeeeที่ d MMMM พ.ศ. ${yearBE}`, { locale: th })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'office': return 'bg-emerald-500'
      case 'home': return 'bg-blue-500'
      case 'onsite': return 'bg-indigo-500'
      case 'leave': return 'bg-amber-500'
      case 'holiday': return 'bg-indigo-500'
      default: return 'bg-slate-300'
    }
  }

  // --- Filtered Data ---
  const filteredUsers = useMemo(() => {
    if (!data?.wfh) return []
    const all = [
      ...data.wfh.office.map((u: any) => ({ ...u, status: 'office', label: 'Office' })),
      ...data.wfh.home.map((u: any) => ({ ...u, status: 'home', label: 'WFH' })),
      ...data.wfh.onsite.map((u: any) => ({ ...u, status: 'onsite', label: 'Onsite' })),
      ...data.wfh.leave.map((u: any) => ({ ...u, status: 'leave', label: 'ลาหยุด' })),
      ...data.wfh.holiday.map((u: any) => ({ ...u, status: 'holiday', label: 'วันหยุด' })),
      ...data.wfh.not_checked.map((u: any) => ({ ...u, status: 'none', label: 'ยังไม่เช็คอิน' }))
    ]
    return all.filter(u => 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  // Group filtered users by department
  const groupedUsersByDepartment = useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    
    filteredUsers.forEach((user: any) => {
      const deptName = user.department?.name || 'ไม่มีกลุ่มงาน (Staff)'
      if (!groups[deptName]) {
        groups[deptName] = []
      }
      groups[deptName].push(user)
    })
    
    return groups
  }, [filteredUsers])

  if (isLoading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
      <p className="text-slate-400 font-bold animate-pulse">กำลังรวบรวมข้อมูลภาพรวม...</p>
    </div>
  )

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
         <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{formatBE(new Date())}</h1>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-slate-400 font-bold text-sm">อัปเดตล่าสุดเมื่อ {format(new Date(), "HH:mm:ss")}</p>
            </div>
         </div>
         <Button 
            variant="outline" 
            className="h-14 px-8 rounded-2xl border-slate-100 hover:bg-slate-50 font-black gap-2 transition-all shadow-sm"
            onClick={() => refetch()}
            disabled={isRefetching}
         >
            <RefreshCw className={cn("w-5 h-5", isRefetching && "animate-spin")} /> รีเฟรชข้อมูล
         </Button>
      </div>

      {/* Row 1: Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
         {[
           { title: "พนักงานที่ Office", value: data?.wfh?.office?.length, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50", users: data?.wfh?.office },
           { title: "Work from Home", value: data?.wfh?.home?.length, icon: Home, color: "text-blue-600", bg: "bg-blue-50", users: data?.wfh?.home },
           { title: "ปฏิบัติงาน Onsite", value: data?.wfh?.onsite?.length, icon: MapPin, color: "text-indigo-600", bg: "bg-indigo-50", users: data?.wfh?.onsite },
           { title: "ยังไม่เช็คอิน", value: data?.wfh?.not_checked?.length, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", users: data?.wfh?.not_checked },
           { title: "ลาหยุดวันนี้", value: data?.wfh?.leave?.length, icon: Palmtree, color: "text-amber-600", bg: "bg-amber-50", users: data?.wfh?.leave }
         ].map((card, i) => (
           <Card key={i} className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 hover:shadow-xl transition-all duration-500 overflow-hidden group">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", card.bg)}>
                       <card.icon className={cn("w-8 h-8", card.color)} />
                    </div>
                 </div>
                 
                 <div className="mt-8">
                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">{card.title}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black text-slate-900 tracking-tighter">{card.value}</span>
                       <span className="text-slate-400 font-bold">ท่าน</span>
                    </div>

                    {/* Show user list directly underneath */}
                    {card.users && (
                      <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {card.users.length > 0 ? (
                           card.users.map((u: any, idx: number) => (
                             <div 
                               key={idx} 
                               className="group/item flex flex-col hover:bg-slate-50/80 p-2 rounded-xl transition-all duration-300"
                             >
                                <div className="flex items-center justify-between min-w-0">
                                   <div className="flex items-center gap-2.5 min-w-0">
                                      <Avatar className="h-6 w-6">
                                         <AvatarImage src={u.avatar_url} />
                                         <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-600">{u.full_name?.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-bold text-slate-700 truncate">{u.full_name}</span>
                                   </div>
                                   {u.checkin?.note && (
                                     <span className="text-[9px] text-blue-600 font-black bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0 border border-blue-100/50">
                                       📝 โน้ต
                                     </span>
                                   )}
                                </div>
                                {u.checkin?.note && (
                                  <div className="hidden group-hover/item:block mt-2 ml-8 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 shadow-sm animate-in slide-in-from-top-1 duration-200">
                                    <p className="font-bold text-[9px] text-slate-400 mb-0.5 uppercase tracking-wider">บันทึกเพิ่มเติม</p>
                                    <p className="italic text-slate-700 font-medium">"{u.checkin.note}"</p>
                                  </div>
                                )}
                             </div>
                           ))
                        ) : (
                          <p className="text-[11px] text-slate-300 italic py-1">ไม่มีรายชื่อ</p>
                        )}
                      </div>
                    )}
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      {/* Row 3: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Left: Purchases */}
         <Card className="rounded-[3rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden flex flex-col">
            <div className="p-10 bg-blue-600 text-white flex justify-between items-center">
               <div>
                  <h3 className="text-2xl font-black">ใบเบิกวันนี้</h3>
                  <p className="text-blue-100 text-sm font-medium">รวมทั้งหมด {data?.purchases_today?.count} รายการ</p>
               </div>
               <div className="text-right">
                  <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">ยอดเงินรวมวันนี้</p>
                  <p className="text-3xl font-black">{Number(data?.purchases_today?.total_amount).toLocaleString()} ฿</p>
               </div>
            </div>
            <div className="flex-1 overflow-x-auto">
               <Table>
                  <TableBody>
                     {data?.purchases_today?.items?.length > 0 ? data.purchases_today.items.map((item: any) => (
                        <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50">
                           <TableCell className="p-8">
                              <div className="flex items-center gap-3">
                                 <Avatar className="h-10 w-10">
                                    <AvatarImage src={item.user?.avatar_url} />
                                    <AvatarFallback>{item.user?.full_name?.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                 <div>
                                    <p className="font-bold text-slate-900">{item.user?.full_name}</p>
                                    <p className="text-xs text-slate-400 font-medium">{item.title}</p>
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell className="text-right p-8">
                              <p className="font-black text-slate-900">{Number(item.total_amount).toLocaleString()} ฿</p>
                              {item.status === 'supervisor_approved' && (
                                <Button 
                                   size="sm" 
                                   className="mt-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-black h-8 text-[10px]"
                                   onClick={() => approveMutation.mutate({ id: item.id, type: 'purchase', action: 'approve' })}
                                >อนุมัติเลย</Button>
                              )}
                           </TableCell>
                        </TableRow>
                     )) : (
                        <TableRow><TableCell className="py-20 text-center text-slate-300 font-bold">ไม่มีการเบิกเงินในวันนี้</TableCell></TableRow>
                     )}
                  </TableBody>
               </Table>
            </div>
         </Card>

         {/* Right: Company Cars */}
         <Card className="rounded-[3rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
            <div className="p-10 flex justify-between items-center">
               <div>
                  <h3 className="text-2xl font-black text-slate-900">รถบริษัทวันนี้</h3>
                  <p className="text-slate-400 text-sm font-medium">รายการจองรถและสถานะรถ</p>
               </div>
               <Car className="text-slate-100 w-12 h-12" />
            </div>
            <div className="px-10 pb-10 space-y-4">
               {data?.car_bookings_today?.available_cars?.map((car: any) => {
                  const booking = data.car_bookings_today.bookings.find((b: any) => b.car_id === car.id)
                  return (
                    <div key={car.id} className="p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-blue-600/20 hover:bg-blue-50/10 transition-all">
                       <div className="flex items-center gap-4">
                          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", booking ? "bg-slate-900 text-white" : "bg-emerald-50 text-emerald-600")}>
                             <Car size={24} />
                          </div>
                          <div>
                             <h4 className="font-black text-slate-900">{car.license_plate}</h4>
                             <p className="text-xs text-slate-400 font-bold">{car.model}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          {booking ? (
                             <div>
                                <Badge className="bg-slate-900 text-white border-0 font-black text-[10px] rounded-lg">ใช้งาน</Badge>
                                <p className="text-xs font-bold text-slate-900 mt-1">{booking.user?.full_name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{booking.destination}</p>
                             </div>
                          ) : (
                             <Badge className="bg-emerald-500 text-white border-0 font-black text-[10px] rounded-lg">ว่าง</Badge>
                          )}
                       </div>
                    </div>
                  )
               })}
            </div>
         </Card>
      </div>

      {/* Row 4: Pending Approvals */}
      <Card id="approvals" className="rounded-[3rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
         <CardHeader className="p-10 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <CheckSquare className="text-blue-600" /> คำขอรอดำเนินการ
               </CardTitle>
               <p className="text-slate-400 font-medium text-sm">พิจารณาใบลาและใบเบิกที่เกินวงเงินของหัวหน้างาน</p>
            </div>
            {data?.pending_approvals?.items?.length > 0 && (
              <Button 
                 className="rounded-2xl bg-slate-900 hover:bg-black text-white font-black px-8 h-14 shadow-xl"
                 onClick={() => {
                    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการอนุมัติรายการทั้งหมด?")) {
                       bulkApproveMutation.mutate(data.pending_approvals.items)
                    }
                 }}
                 disabled={bulkApproveMutation.isPending}
              >
                 อนุมัติทั้งหมด ({data.pending_approvals.total})
              </Button>
            )}
         </CardHeader>
         <CardContent className="p-0">
            <Table>
               <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                     <TableHead className="py-8 pl-10 font-black text-slate-400 text-[10px] uppercase tracking-widest">ประเภท</TableHead>
                     <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ผู้ขอ</TableHead>
                     <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">รายละเอียด</TableHead>
                     <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">ยอดเงิน/จำนวนวัน</TableHead>
                     <TableHead className="pr-10 text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">จัดการ</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {data?.pending_approvals?.items?.length > 0 ? data.pending_approvals.items.map((item: any) => (
                     <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 group">
                        <TableCell className="py-8 pl-10">
                           <Badge className={cn("border-0 rounded-lg font-black text-[10px]", item.color)}>{item.label}</Badge>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                 <AvatarImage src={item.user?.avatar_url} />
                                 <AvatarFallback>{item.user?.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-slate-900">{item.user?.full_name}</span>
                           </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate font-medium text-slate-500">
                           {item.type === 'leave' ? `ลา${item.leave_type} เนื่องจาก ${item.reason || '-'}` : item.title}
                        </TableCell>
                        <TableCell className="font-black text-slate-900 text-lg">
                           {item.type === 'purchase' ? `${Number(item.total_amount).toLocaleString()} ฿` : `${item.days_count} วัน`}
                        </TableCell>
                        <TableCell className="pr-10 text-right">
                           <div className="flex justify-end gap-2">
                              <Button 
                                 size="icon" 
                                 variant="ghost" 
                                 className="rounded-full text-rose-500 hover:bg-rose-50"
                                 onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'reject' })}
                              >
                                 <XCircle size={20} />
                              </Button>
                              <Button 
                                 size="icon" 
                                 variant="ghost" 
                                 className="rounded-full text-emerald-500 hover:bg-emerald-50"
                                 onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'approve' })}
                              >
                                 <CheckCircle2 size={20} />
                              </Button>
                           </div>
                        </TableCell>
                     </TableRow>
                  )) : (
                     <TableRow><TableCell colSpan={5} className="py-24 text-center text-slate-300 font-bold text-lg">ไม่มีรายการค้างอนุมัติสำหรับผู้บริหารในขณะนี้</TableCell></TableRow>
                  )}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
    </div>
  )
}


