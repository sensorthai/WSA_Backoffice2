"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, addYears } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Building2, 
  Home, 
  Palmtree, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Car,
  Wallet,
  ArrowRight,
  UserCheck,
  ChevronRight,
  CheckSquare,
  MapPin
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function CEOPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { title: "พนักงานที่ Office", value: data?.wfh?.office?.length, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50", users: data?.wfh?.office },
           { title: "Work from Home", value: data?.wfh?.home?.length, icon: Home, color: "text-blue-600", bg: "bg-blue-50", users: data?.wfh?.home },
           { title: "ลาหยุดวันนี้", value: data?.wfh?.leave?.length, icon: Palmtree, color: "text-amber-600", bg: "bg-amber-50", users: data?.wfh?.leave },
           { title: "รออนุมัติ", value: data?.pending_approvals?.total, icon: Clock, color: "text-rose-600", bg: "bg-rose-50", link: "#approvals", sub: "คลิกเพื่อดูรายการ" }
         ].map((card, i) => (
           <Card key={i} className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 hover:shadow-xl transition-all duration-500 overflow-hidden group">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", card.bg)}>
                       <card.icon className={cn("w-8 h-8", card.color)} />
                    </div>
                    {card.users && (
                      <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="ghost" size="sm" className="rounded-full text-xs font-black text-slate-400 hover:bg-slate-100 uppercase tracking-widest">ดูรายชื่อ</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 rounded-3xl p-4 shadow-2xl border-0 ring-1 ring-slate-100">
                           <div className="space-y-3">
                              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">รายชื่อพนักงาน</h4>
                              {card.users.length > 0 ? card.users.slice(0, 5).map((u: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                   <Avatar className="h-6 w-6">
                                      <AvatarImage src={u.avatar_url} />
                                      <AvatarFallback className="text-[10px]">{u.full_name?.charAt(0)}</AvatarFallback>
                                   </Avatar>
                                   <span className="text-sm font-bold text-slate-700">{u.full_name}</span>
                                </div>
                              )) : <p className="text-slate-300 text-sm italic">ไม่มีรายการ</p>}
                              {card.users.length > 5 && <p className="text-[10px] text-slate-400 text-center pt-2">และอื่นๆ อีก {card.users.length - 5} ท่าน</p>}
                           </div>
                        </PopoverContent>
                      </Popover>
                    )}
                 </div>
                 <div className="mt-8">
                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">{card.title}</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black text-slate-900 tracking-tighter">{card.value}</span>
                       <span className="text-slate-400 font-bold">ท่าน</span>
                    </div>
                    {card.sub && (
                      <a href={card.link} className="text-xs font-bold text-rose-500 mt-2 block hover:underline">{card.sub}</a>
                    )}
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      {/* Row 2: WFH Status Grid */}
      <Card className="rounded-[3rem] border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
         <CardHeader className="p-10 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-2xl font-black text-slate-900">สถานะการเข้างานพนักงาน</CardTitle>
               <p className="text-slate-400 font-medium text-sm">ตรวจสอบความพร้อมของทีมงานทุกคน</p>
            </div>
            <div className="flex gap-4">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input 
                     placeholder="ค้นหาชื่อพนักงาน..." 
                     className="pl-11 h-12 rounded-xl w-64 border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-medium"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
               {filteredUsers.map((user: any) => (
                 <div key={user.id} className="p-6 rounded-[2rem] border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-xl transition-all duration-500 group">
                    <div className="relative inline-block mb-4">
                       <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-slate-900 text-white font-black">{user.full_name?.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <div className={cn("absolute bottom-0 right-0 w-5 h-5 border-4 border-white rounded-full shadow-sm", getStatusColor(user.status))} />
                    </div>
                    <h4 
                       className={cn(
                          "font-black text-slate-900 truncate flex items-center gap-1",
                          user.checkin?.location_lat && "cursor-pointer hover:text-blue-600 transition-colors"
                       )}
                       onClick={() => {
                          if (user.checkin?.location_lat && user.checkin?.location_lng) {
                             window.open(`https://www.google.com/maps?q=${user.checkin.location_lat},${user.checkin.location_lng}`, '_blank');
                          }
                       }}
                    >
                       {user.full_name}
                       {user.checkin?.location_lat && <MapPin className="w-3 h-3 text-blue-500" />}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                       {user.checkin?.note ? `"${user.checkin.note}"` : (user.department?.name || 'WSA STAFF')}
                    </p>
                    <Badge variant="ghost" className="mt-4 rounded-full bg-white text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm border-0">{user.label}</Badge>
                 </div>
               ))}
            </div>
         </CardContent>
      </Card>

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

function Label({ children, className }: any) {
  return <label className={cn("block text-xs font-medium text-slate-700", className)}>{children}</label>
}
