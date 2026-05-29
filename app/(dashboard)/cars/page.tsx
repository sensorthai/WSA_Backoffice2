"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns"
import { th } from "date-fns/locale"
import { toast } from "sonner"
import { 
  Car, 
  Plus, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  History, 
  Settings, 
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Navigation,
  Gauge,
  Loader2,
  Trash2,
  Undo2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { cn } from "@/lib/utils"

export default function CarsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  // --- States ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [activeView, setActiveView] = useState("my-bookings")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // --- Form State ---
  const [bookingForm, setBookingForm] = useState({
    start_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_date: format(new Date(), "yyyy-MM-dd"),
    end_time: "17:00",
    car_id: "",
    destination: "",
    purpose: ""
  })

  const [returnForm, setReturnForm] = useState({
    odometer_start: 0,
    odometer_end: 0
  })

  // --- Range Calculation ---
  const startDateTime = useMemo(() => `${bookingForm.start_date}T${bookingForm.start_time}:00`, [bookingForm.start_date, bookingForm.start_time])
  const endDateTime = useMemo(() => `${bookingForm.end_date}T${bookingForm.end_time}:00`, [bookingForm.end_date, bookingForm.end_time])

  // --- Queries ---
  const { data: availableCars, isLoading: isCarsLoading } = useQuery({
    queryKey: ["available-cars", startDateTime, endDateTime],
    queryFn: async () => {
      const res = await fetch(`/api/cars?start_datetime=${startDateTime}&end_datetime=${endDateTime}`)
      return res.json()
    },
    enabled: isBookingModalOpen && !!startDateTime && !!endDateTime
  })

  const { data: myBookings, isLoading: isMyBookingsLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/cars/bookings")
      return res.json()
    }
  })

  const { data: allPendingBookings, isLoading: isAllPendingLoading } = useQuery({
    queryKey: ["all-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/cars/bookings/pending")
      return res.json()
    },
    enabled: userRole !== 'employee'
  })

  // --- Mutations ---
  const createBookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/cars/bookings", {
        method: "POST",
        body: JSON.stringify({
          car_id: payload.car_id,
          start_datetime: payload.startDateTime,
          end_datetime: payload.endDateTime,
          destination: payload.destination,
          purpose: payload.purpose
        }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to book")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      setIsBookingModalOpen(false)
      toast.success("ส่งคำขอจองรถเรียบร้อยแล้ว!")
    },
    onError: (e: any) => toast.error("ไม่สามารถจองรถได้: " + e.message)
  })

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cars/bookings/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Cancel failed")
      return res.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["my-bookings"] })
      const previousBookings = queryClient.getQueryData<any[]>(["my-bookings"]) || []

      // Optimistically filter out the cancelled request
      queryClient.setQueryData<any[]>(["my-bookings"], (old) => {
        if (!old) return []
        return old.filter(b => b.id !== id)
      })

      return { previousBookings }
    },
    onError: (err: any, id, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["my-bookings"], context.previousBookings)
      }
      toast.error("ไม่สามารถยกเลิกการจองได้: " + err.message)
    },
    onSuccess: () => {
      toast.success("ยกเลิกการจองรถเรียบร้อยแล้ว")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
    }
  })

  const approveBookingMutation = useMutation({
    mutationFn: async ({ id, action, note }: any) => {
      const res = await fetch(`/api/cars/bookings/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ action, note }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error((await res.json()).error || "Action failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      toast.success("บันทึกผลการอนุมัติการจองรถเรียบร้อยแล้ว")
    },
    onError: (e: any) => toast.error("ไม่สามารถบันทึกผลการอนุมัติได้: " + e.message)
  })

  const returnCarMutation = useMutation({
    mutationFn: async ({ id, odometer_start, odometer_end }: any) => {
      const res = await fetch(`/api/cars/bookings/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ odometer_start, odometer_end }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error("Return failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      setIsReturnDialogOpen(false)
      toast.success("บันทึกการคืนรถเรียบร้อยแล้ว!")
    },
    onError: (e: any) => toast.error("ไม่สามารถบันทึกการคืนรถได้: " + e.message)
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-600 border-amber-200">รออนุมัติ</Badge>
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200">อนุมัติแล้ว</Badge>
      case 'rejected': return <Badge className="bg-rose-100 text-rose-600 border-rose-200">ปฏิเสธ</Badge>
      case 'returned': return <Badge className="bg-slate-900 text-white border-0">คืนรถแล้ว</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
      {/* Hero Section */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/10 blur-[100px] rounded-full" />
         <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-8">
               <div className="p-6 bg-indigo-600 rounded-[2.5rem] shadow-xl shadow-indigo-600/20">
                  <Car size={56} className="text-white" />
               </div>
               <div>
                  <h1 className="text-5xl font-black tracking-tight">ระบบจองรถบริษัท</h1>
                  <p className="text-slate-400 font-medium mt-3 text-lg">ตรวจสอบรถว่างและจัดการการเดินทางของคุณ</p>
               </div>
            </div>
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-3xl px-12 h-20 font-black text-xl shadow-2xl transition-all active:scale-95 group" onClick={() => setIsBookingModalOpen(true)}>
              <Plus className="mr-3 w-8 h-8 group-hover:rotate-90 transition-transform duration-500" /> จองรถตอนนี้
            </Button>
         </div>
      </div>

      {/* Sub Menu Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-8 pb-1">
        <button 
          onClick={() => setActiveView("my-bookings")}
          className={cn(
            "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
            activeView === "my-bookings" ? "text-indigo-600 font-black" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <History className="w-5 h-5" />
          <span>การจองของฉัน</span>
          {activeView === "my-bookings" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in zoom-in duration-300" />
          )}
        </button>
        {userRole !== 'employee' && (
          <button 
            onClick={() => setActiveView("manage")}
            className={cn(
              "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
              activeView === "manage" ? "text-indigo-600 font-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Settings className="w-5 h-5" />
            <span>จัดการคำขอ</span>
            {allPendingBookings?.length > 0 && (
              <Badge className="bg-indigo-600 text-white shrink-0 text-[10px] px-1.5 py-0.5 rounded-full">{allPendingBookings.length}</Badge>
            )}
            {activeView === "manage" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in zoom-in duration-300" />
            )}
          </button>
        )}
        {userRole === 'admin' && (
          <button 
            onClick={() => setActiveView("calendar")}
            className={cn(
              "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
              activeView === "calendar" ? "text-indigo-600 font-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <CalendarIcon className="w-5 h-5" />
            <span>ปฏิทินรถ</span>
            {activeView === "calendar" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in zoom-in duration-300" />
            )}
          </button>
        )}
      </div>

      {activeView === "my-bookings" && (
        <div className="space-y-6">
           <Card className="rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
              <Table>
                 <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                       <TableHead className="py-8 pl-10 font-black text-slate-400 uppercase tracking-widest text-[11px]">รถที่จอง</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">วันเวลาใช้งาน</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ปลายทาง</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">สถานะ</TableHead>
                       <TableHead className="pr-10 text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">จัดการ</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {isMyBookingsLoading ? (
                      <TableRow>
                         <TableCell colSpan={5} className="py-24 text-center">
                            <Loader2 className="animate-spin inline-block text-indigo-200 w-16 h-16" />
                         </TableCell>
                      </TableRow>
                    ) : myBookings?.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={5} className="py-40 text-center">
                            <div className="flex flex-col items-center gap-6 text-slate-300">
                               <Navigation size={80} strokeWidth={1} />
                               <p className="text-xl font-bold">ไม่พบประวัติการจองรถ</p>
                               <Button variant="outline" className="rounded-2xl px-8" onClick={() => setIsBookingModalOpen(true)}>เริ่มการจองครั้งแรก</Button>
                            </div>
                         </TableCell>
                      </TableRow>
                    ) : myBookings?.map((b: any) => (
                      <TableRow key={b.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group">
                         <TableCell className="py-8 pl-10">
                            <div className="flex items-center gap-4">
                               <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                                  {b.company_cars?.license_plate.split('-')[0]}
                               </div>
                               <div>
                                  <div className="font-black text-slate-900 text-lg">{b.company_cars?.model}</div>
                                  <div className="text-xs text-slate-400 font-bold tracking-widest uppercase">{b.company_cars?.license_plate}</div>
                               </div>
                            </div>
                         </TableCell>
                         <TableCell>
                            <div className="font-bold text-slate-700">
                               {format(new Date(b.start_datetime), "d MMM yy", { locale: th })}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                               {format(new Date(b.start_datetime), "HH:mm")} - {format(new Date(b.end_datetime), "HH:mm")}
                            </div>
                         </TableCell>
                         <TableCell className="font-bold text-slate-600 max-w-[200px] truncate">
                            {b.destination}
                         </TableCell>
                         <TableCell>
                            {getStatusBadge(b.status)}
                         </TableCell>
                         <TableCell className="pr-10 text-right">
                            {b.status === 'pending' && (
                               <Button variant="ghost" size="sm" className="rounded-xl font-bold text-rose-500 hover:bg-rose-50" onClick={() => cancelBookingMutation.mutate(b.id)}>
                                  <Trash2 size={18} className="mr-2" /> ยกเลิก
                               </Button>
                            )}
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </Card>
        </div>
      )}

      {activeView === "manage" && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 gap-8">
              {isAllPendingLoading ? (
                 <div className="py-32 text-center"><Loader2 className="animate-spin inline-block text-indigo-200 w-16 h-16" /></div>
              ) : !Array.isArray(allPendingBookings) || allPendingBookings.length === 0 ? (
                 <Card className="py-40 text-center rounded-[4rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <CheckCircle2 size={80} className="mx-auto text-emerald-200 mb-8" />
                    <h3 className="text-2xl font-black text-slate-900">ไม่มีคำขอที่รอการพิจารณา</h3>
                    <p className="text-slate-400 font-medium text-lg">หัวใจของการทำงานคือความรวดเร็ว คุณทำได้เยี่ยมมาก!</p>
                 </Card>
              ) : (
                 allPendingBookings.map((b: any) => (
                    <Card key={b.id} className="rounded-[3.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-2xl transition-all duration-500 overflow-hidden">
                       <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                             <div className="flex-1 p-12 border-r border-slate-50">
                                <div className="flex items-center justify-between mb-10">
                                   <div className="flex items-center gap-6">
                                      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-inner">
                                         {b.user?.full_name?.charAt(0)}
                                      </div>
                                      <div>
                                         <h3 className="text-3xl font-black text-slate-900">{b.user?.full_name}</h3>
                                         <Badge className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-tighter mt-1">{b.user?.department}</Badge>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">วันเวลาที่ขอใช้</div>
                                      <div className="font-black text-xl text-indigo-600">{format(new Date(b.start_datetime), "d MMM yyyy", { locale: th })}</div>
                                      <div className="text-sm font-bold text-slate-400">{format(new Date(b.start_datetime), "HH:mm")} - {format(new Date(b.end_datetime), "HH:mm")}</div>
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                   <div className="space-y-6">
                                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                                         <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                            <Car size={16} /> ข้อมูลรถ
                                         </div>
                                         <div>
                                            <div className="text-2xl font-black text-slate-900">{b.company_cars?.model}</div>
                                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{b.company_cars?.license_plate} ({b.company_cars?.color})</div>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-4 px-4 text-slate-500">
                                         <MapPin size={24} className="text-indigo-400" />
                                         <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จุดหมายปลายทาง</div>
                                            <div className="font-bold text-lg">{b.destination}</div>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="space-y-6">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วัตถุประสงค์ในการขอใช้รถ</div>
                                      <p className="text-lg font-medium text-slate-600 leading-relaxed italic">"{b.purpose}"</p>
                                   </div>
                                </div>
                             </div>

                             <div className="w-full lg:w-[400px] bg-slate-50/50 p-12 flex flex-col justify-center gap-10">
                                <div className="space-y-4">
                                   <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุ (ถ้ามี)</Label>
                                   <Textarea 
                                      id={`note-${b.id}`}
                                      placeholder="ระบุข้อความหากมีการปฏิเสธหรือคำแนะนำเพิ่มเติม..."
                                      className="min-h-[160px] rounded-[2.5rem] border-slate-100 bg-white shadow-inner p-6 focus:ring-indigo-600/20 font-medium"
                                   />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                   <Button 
                                     variant="ghost" 
                                     className="h-16 rounded-[1.5rem] font-black text-rose-500 hover:bg-rose-100 transition-all text-lg"
                                     onClick={() => approveBookingMutation.mutate({ id: b.id, action: 'reject', note: (document.getElementById(`note-${b.id}`) as HTMLTextAreaElement).value })}
                                   >
                                      <XCircle className="mr-2" /> ปฏิเสธ
                                   </Button>
                                   <Button 
                                     className="h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-2xl shadow-indigo-600/30"
                                     onClick={() => approveBookingMutation.mutate({ id: b.id, action: 'approve', note: (document.getElementById(`note-${b.id}`) as HTMLTextAreaElement).value })}
                                   >
                                      <CheckCircle2 className="mr-2" /> อนุมัติ
                                   </Button>
                                </div>
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                 ))
              )}

              {/* Status Section for 'Approved' to 'Return' */}
              {userRole !== 'employee' && (
                <div className="space-y-8 mt-12">
                   <h2 className="text-3xl font-black text-slate-900 px-4">รายการที่รอการคืนรถ</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {myBookings?.filter((b: any) => b.status === 'approved').map((b: any) => (
                        <Card key={b.id} className="rounded-[2.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-xl transition-all p-8 space-y-6">
                           <div className="flex justify-between items-start">
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">กำลังใช้งาน / อนุมัติแล้ว</Badge>
                              <div className="text-xs text-slate-400 font-black uppercase tracking-widest">{format(new Date(b.start_datetime), "d MMM", { locale: th })}</div>
                           </div>
                           <div>
                              <div className="font-black text-2xl text-slate-900">{b.company_cars?.model}</div>
                              <div className="font-bold text-slate-400">{b.company_cars?.license_plate}</div>
                           </div>
                           <div className="pt-4 border-t border-slate-50">
                              <div className="flex items-center gap-3 text-slate-600 font-bold">
                                 <MapPin size={18} className="text-indigo-400" /> {b.destination}
                              </div>
                           </div>
                           <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black" onClick={() => {
                             setSelectedBooking(b)
                             setIsReturnDialogOpen(true)
                           }}>
                              <Undo2 className="mr-2" /> บันทึกการคืนรถ
                           </Button>
                        </Card>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {activeView === "calendar" && (
        <div className="space-y-6">
           {/* Simple Weekly Calendar Implementation */}
           <div className="bg-white rounded-[3.5rem] p-10 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between mb-10">
                 <h2 className="text-3xl font-black text-slate-900">ตารางการใช้รถประจำสัปดาห์</h2>
                 <div className="flex gap-4">
                    <Button variant="ghost" className="rounded-2xl h-12 w-12 p-0"><ChevronLeft /></Button>
                    <div className="h-12 flex items-center px-6 bg-slate-50 rounded-2xl font-black text-slate-600">
                       {format(startOfWeek(new Date()), "d MMM", { locale: th })} - {format(endOfWeek(new Date()), "d MMM yyyy", { locale: th })}
                    </div>
                    <Button variant="ghost" className="rounded-2xl h-12 w-12 p-0"><ChevronRight /></Button>
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 md:gap-6">
                 {eachDayOfInterval({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }).map((day, idx) => (
                    <div key={idx} className="space-y-6">
                       <div className={cn(
                          "p-6 rounded-[2rem] text-center border transition-all",
                          isSameDay(day, new Date()) ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20" : "bg-slate-50 text-slate-400 border-slate-100"
                       )}>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{format(day, "EEE", { locale: th })}</div>
                          <div className="text-2xl font-black">{format(day, "d")}</div>
                       </div>
                       <div className="space-y-4">
                          {/* Simplified logic: Filter bookings for this day */}
                          {myBookings?.filter((b: any) => b.status === 'approved' && isSameDay(new Date(b.start_datetime), day)).map((b: any) => (
                             <div key={b.id} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 group hover:bg-indigo-600 transition-all cursor-pointer">
                                <div className="text-[10px] font-black text-indigo-400 group-hover:text-white/60 uppercase tracking-widest">{format(new Date(b.start_datetime), "HH:mm")}</div>
                                <div className="font-black text-slate-900 group-hover:text-white text-sm truncate">{b.company_cars?.license_plate}</div>
                                <div className="text-[10px] font-bold text-slate-400 group-hover:text-white/80 truncate">{b.user?.full_name || 'ผู้จอง'}</div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
         <DialogContent className="max-w-7xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <div className="bg-slate-900 p-10 text-white shrink-0">
               <DialogHeader>
                  <DialogTitle className="text-3xl font-black">ระบุข้อมูลการจองรถ</DialogTitle>
                  <p className="text-slate-400 mt-2">กรุณาเลือกวันเวลาที่ต้องการใช้งานเพื่อตรวจสอบรถที่ว่าง</p>
               </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-white custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันเวลาเริ่มต้น</h4>
                     <div className="flex gap-4">
                        <Input type="date" className="h-14 rounded-2xl border-white bg-white font-bold" value={bookingForm.start_date} onChange={e => setBookingForm({...bookingForm, start_date: e.target.value})} />
                        <Input type="time" className="h-14 rounded-2xl border-white bg-white font-bold w-32" value={bookingForm.start_time} onChange={e => setBookingForm({...bookingForm, start_time: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันเวลาสิ้นสุด</h4>
                     <div className="flex gap-4">
                        <Input type="date" className="h-14 rounded-2xl border-white bg-white font-bold" value={bookingForm.end_date} onChange={e => setBookingForm({...bookingForm, end_date: e.target.value})} />
                        <Input type="time" className="h-14 rounded-2xl border-white bg-white font-bold w-32" value={bookingForm.end_time} onChange={e => setBookingForm({...bookingForm, end_time: e.target.value})} />
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <h4 className="text-xl font-black text-slate-900">เลือกรถที่ว่างในช่วงเวลานี้</h4>
                     {isCarsLoading && <Loader2 className="animate-spin text-indigo-600" />}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                     {availableCars?.map((car: any) => (
                        <div 
                           key={car.id} 
                           className={cn(
                              "p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group",
                              bookingForm.car_id === car.id 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-50" 
                                : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20"
                           )}
                           role="button"
                           tabIndex={0}
                           onClick={() => !car.is_booked && setBookingForm({...bookingForm, car_id: car.id})}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter' || e.key === ' ') {
                               if (!car.is_booked) setBookingForm({...bookingForm, car_id: car.id})
                             }
                           }}
                        >
                           <div className="flex justify-between items-start mb-6">
                              <div className={cn(
                                 "w-16 h-16 rounded-3xl flex items-center justify-center transition-colors",
                                 bookingForm.car_id === car.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                              )}>
                                 <Car size={32} />
                              </div>
                              {car.is_booked && <Badge variant="destructive" className="rounded-full">ไม่ว่าง</Badge>}
                           </div>
                           <div className="space-y-1">
                              <div className="text-2xl font-black">{car.model}</div>
                              <div className={cn(
                                 "text-sm font-bold uppercase tracking-widest",
                                 bookingForm.car_id === car.id ? "text-indigo-200" : "text-slate-400"
                              )}>{car.license_plate}</div>
                           </div>
                           <div className="mt-6 pt-6 border-t border-current opacity-10"></div>
                           <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: car.color?.toLowerCase() || '#ccc' }}></div>
                              <span className="text-xs font-black uppercase tracking-tighter opacity-80">{car.color}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">จุดหมายปลายทาง</Label>
                     <Input 
                        placeholder="ระบุสถานที่ หรือ บริษัทปลายทาง..."
                        className="h-16 rounded-2xl border-slate-100 bg-slate-50 focus:ring-indigo-600/20 font-bold"
                        value={bookingForm.destination}
                        onChange={e => setBookingForm({...bookingForm, destination: e.target.value})}
                     />
                  </div>
                  <div className="space-y-4">
                     <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วัตถุประสงค์ในการจอง</Label>
                     <Textarea 
                        placeholder="เช่น ไปพบลูกค้า A, ส่งของ..."
                        className="min-h-[64px] rounded-2xl border-slate-100 bg-slate-50 focus:ring-indigo-600/20 font-bold p-4"
                        value={bookingForm.purpose}
                        onChange={e => setBookingForm({...bookingForm, purpose: e.target.value})}
                     />
                  </div>
               </div>
            </div>

            <DialogFooter className="p-10 bg-slate-50 border-t border-slate-100 shrink-0">
               <Button variant="ghost" className="h-16 px-8 rounded-2xl font-bold text-slate-400" onClick={() => setIsBookingModalOpen(false)}>ยกเลิก</Button>
               <Button 
                  className="h-16 px-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-2xl shadow-indigo-600/20 ml-4 flex-1"
                  disabled={!bookingForm.car_id || !bookingForm.destination || createBookingMutation.isPending}
                  onClick={() => createBookingMutation.mutate({
                    ...bookingForm,
                    startDateTime: `${bookingForm.start_date}T${bookingForm.start_time}:00`,
                    endDateTime: `${bookingForm.end_date}T${bookingForm.end_time}:00`
                  })}
               >
                  {createBookingMutation.isPending ? <Loader2 className="animate-spin" /> : "ยืนยันการจองรถ"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Return Car Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
         <DialogContent className="max-w-md rounded-[3rem] p-10 border-0 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader className="mb-8">
               <DialogTitle className="text-3xl font-black">บันทึกการคืนรถ</DialogTitle>
               <p className="text-slate-400 mt-2">กรุณาระบุเลขไมล์เพื่อปิดจบรายการจอง</p>
            </DialogHeader>
            <div className="space-y-8">
               <div className="space-y-4">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เลขไมล์ขาออก (Odometer Start)</Label>
                  <div className="relative">
                     <Gauge className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                     <Input 
                        type="number" 
                        className="h-16 pl-14 rounded-2xl border-slate-100 bg-slate-50 font-black text-xl"
                        value={returnForm.odometer_start}
                        onChange={e => setReturnForm({...returnForm, odometer_start: parseInt(e.target.value) || 0})}
                     />
                  </div>
               </div>
               <div className="space-y-4">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เลขไมล์ขาเข้า (Odometer End)</Label>
                  <div className="relative">
                     <Gauge className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" />
                     <Input 
                        type="number" 
                        className="h-16 pl-14 rounded-2xl border-slate-100 bg-slate-50 font-black text-xl text-indigo-600"
                        value={returnForm.odometer_end}
                        onChange={e => setReturnForm({...returnForm, odometer_end: parseInt(e.target.value) || 0})}
                     />
                  </div>
               </div>

               <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 text-center">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">ระยะทางที่ใช้</div>
                  <div className="text-3xl font-black text-indigo-600">{Math.max(0, returnForm.odometer_end - returnForm.odometer_start).toLocaleString()} กม.</div>
               </div>
            </div>
            <DialogFooter className="mt-10 flex flex-col gap-4">
               <Button 
                  className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black text-lg"
                  onClick={() => returnCarMutation.mutate({ 
                     id: selectedBooking.id, 
                     odometer_start: returnForm.odometer_start, 
                     odometer_end: returnForm.odometer_end 
                  })}
                  disabled={returnCarMutation.isPending || returnForm.odometer_end < returnForm.odometer_start}
               >
                  {returnCarMutation.isPending ? <Loader2 className="animate-spin" /> : "บันทึกและปิดงาน"}
               </Button>
               <Button variant="ghost" className="w-full h-14 rounded-2xl font-bold text-slate-400" onClick={() => setIsReturnDialogOpen(false)}>ยกเลิก</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  )
}
