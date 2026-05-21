"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { formatInTimeZone } from "date-fns-tz"
import { 
  Building2, 
  Home, 
  CalendarOff, 
  Palmtree, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  Loader2,
  Users,
  AlertCircle,
  MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TZ = 'Asia/Bangkok'

export default function CheckinPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [note, setNote] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [deptFilter, setDeptFilter] = useState("all")
  const [isLocating, setIsLocating] = useState(false)
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null)

  // 1. Fetch User's Today Check-in
  const { data: myStatus, isLoading: myLoading } = useQuery({
    queryKey: ["my-checkin"],
    queryFn: async () => {
      const res = await fetch("/api/checkin")
      if (!res.ok) return { status: null }
      return res.json()
    }
  })

  const today = new Date()
  const nowHour = parseInt(formatInTimeZone(today, TZ, 'H'))
  
  // Requirement: Use dynamic window from settings
  const checkinWindow = { start: 6, end: 11, edit_end: 12, ...(myStatus?.window || {}) }
  const isWithinCheckinTime = nowHour >= checkinWindow.start && nowHour < checkinWindow.end
  const isWithinEditTime = nowHour < checkinWindow.edit_end


  // 2. Fetch Team Check-ins
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team-checkins"],
    queryFn: async () => {
      const res = await fetch("/api/checkin/team")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session?.user && ['admin', 'ceo', 'supervisor'].includes((session.user as any).role)
  })

  // 3. Fetch Departments for filter
  const { data: departments } = useQuery({
    queryKey: ["admin-depts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/departments")
      if (!res.ok) return []
      return res.json()
    }
  })

  // 4. Mutation to Check-in
  const checkinMutation = useMutation({
    mutationFn: async (payload: { status: string; note: string; location_lat?: number; location_lng?: number }) => {
      const res = await fetch("/api/checkin", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "บันทึกไม่สำเร็จ")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-checkin"] })
      queryClient.invalidateQueries({ queryKey: ["team-checkins"] })
      alert("บันทึกการเช็คอินเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const statusOptions = [
    { id: 'office', label: 'Office', subLabel: '🏢 เข้าออฟฟิศ', icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', active: 'bg-emerald-600 border-emerald-600 text-white' },
    { id: 'home', label: 'WFH', subLabel: '🏠 ทำงานที่บ้าน', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', active: 'bg-blue-600 border-blue-600 text-white' },
    { id: 'onsite', label: 'Onsite', subLabel: '📍 ทำงานนอกสถานที่', icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', active: 'bg-indigo-600 border-indigo-600 text-white' },
    { id: 'leave', label: 'ลาหยุด', subLabel: '🏖 ลาพักผ่อน/ป่วย', icon: Palmtree, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', active: 'bg-amber-600 border-amber-600 text-white' },
    { id: 'holiday', label: 'วันหยุด', subLabel: '🎌 วันหยุดประจำปี', icon: CalendarOff, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', active: 'bg-slate-600 border-slate-600 text-white' },
  ]

  const filteredTeam = useMemo(() => {
    if (!Array.isArray(teamData)) return []
    return teamData.filter((u: any) => 
      deptFilter === "all" || u.department === deptFilter
    )
  }, [teamData, deptFilter])

  const summary = useMemo(() => {
    if (!Array.isArray(teamData)) return { office: 0, home: 0, leave: 0, notChecked: 0 }
    return {
      office: teamData.filter((u: any) => u.checkin.status === 'office').length,
      home: teamData.filter((u: any) => u.checkin.status === 'home').length,
      onsite: teamData.filter((u: any) => u.checkin.status === 'onsite').length,
      leave: teamData.filter((u: any) => u.checkin.status === 'leave').length,
      notChecked: teamData.filter((u: any) => u.checkin.status === 'not_checked').length,
    }
  }, [teamData])

  const currentStatus = myStatus?.id ? statusOptions.find(o => o.id === myStatus.status) : null

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 px-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">เช็คอินเข้างาน</h1>
          <p className="text-slate-500 text-lg">
            {format(today, "EEEEที่ d MMMM yyyy", { locale: th })}
          </p>
        </div>
        {!isWithinCheckinTime && !myStatus?.id && (
          <Badge variant="outline" className="h-fit py-2 px-4 border-red-200 bg-red-50 text-red-600 rounded-full animate-pulse">
            <Clock className="w-4 h-4 mr-2" /> นอกเวลาเช็คอิน ({String(checkinWindow.start).padStart(2, '0')}:00 - {String(checkinWindow.end).padStart(2, '0')}:00)
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Section 1: My Check-in Card */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden h-full flex flex-col border-0">
            <CardHeader className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <CheckCircle2 className="w-7 h-7" />
                สถานะของฉัน
              </CardTitle>
              <p className="text-blue-100 opacity-80 text-sm font-medium">จัดการสถานะการทำงานรายวัน</p>
            </CardHeader>
            
            <CardContent className="p-8 flex-1 space-y-8 bg-white">
              {myLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
              ) : myStatus?.id ? (
                <div className="text-center space-y-6 py-4">
                  <div className={cn(
                    "inline-flex items-center justify-center p-8 rounded-[2rem] transition-all duration-500 scale-110 shadow-inner",
                    currentStatus?.bg,
                    currentStatus?.color
                  )}>
                    {currentStatus && <currentStatus.icon size={56} strokeWidth={1.5} />}
                  </div>
                  
                  <div className="space-y-2">
                    <Badge className={cn("text-xs uppercase tracking-widest px-3 py-1 rounded-full border-0", currentStatus?.active)}>
                      เช็คอินแล้ว
                    </Badge>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                      {currentStatus?.label}
                    </h3>
                    <p className="text-slate-400 font-medium flex items-center justify-center gap-1.5">
                      <Clock size={14} />
                      {formatInTimeZone(new Date(myStatus.created_at), TZ, 'HH:mm')} น.
                    </p>
                  </div>

                  {myStatus.note && (
                    <div className="p-5 bg-slate-50/80 backdrop-blur-sm rounded-3xl text-slate-600 text-sm leading-relaxed border border-slate-100 italic relative group">
                      <MessageSquare size={16} className="absolute -top-2 -left-2 text-slate-200" />
                      "{myStatus.note}"
                    </div>
                  )}

                  {isWithinEditTime && (
                    <Button 
                      variant="outline" 
                      className="w-full rounded-2xl border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 font-bold transition-all py-6"
                      onClick={() => {
                        setSelectedStatus(myStatus.status)
                        setNote(myStatus.note || "")
                        queryClient.setQueryData(["my-checkin"], { status: null })
                      }}
                    >
                      แก้ไขสถานะการเข้างาน
                    </Button>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">แก้ไขข้อมูลได้ก่อนเวลา {String(checkinWindow.edit_end).padStart(2, '0')}:00 น. เท่านั้น</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.id}
                        disabled={!isWithinCheckinTime}
                        onClick={() => setSelectedStatus(opt.id)}
                        className={cn(
                          "group flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-3 relative overflow-hidden",
                          selectedStatus === opt.id 
                            ? "border-blue-600 bg-blue-50/50 text-blue-700 shadow-xl shadow-blue-100/50 -translate-y-1" 
                            : "border-slate-100 bg-slate-50/30 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.02]",
                          !isWithinCheckinTime && "opacity-40 cursor-not-allowed grayscale"
                        )}
                      >
                        <div className={cn(
                          "p-3 rounded-2xl transition-colors",
                          selectedStatus === opt.id ? "bg-blue-600 text-white" : "bg-white group-hover:bg-slate-100"
                        )}>
                          <opt.icon size={24} />
                        </div>
                        <span className="text-sm font-bold tracking-wide uppercase">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">บันทึกเพิ่มเติม {selectedStatus === 'onsite' && <span className="text-rose-500">* บังคับระบุสถานที่</span>}</label>
                      <span className="text-[10px] text-slate-300 italic font-medium">{selectedStatus === 'onsite' ? '' : 'ไม่บังคับ'}</span>
                    </div>
                    <Textarea 
                      placeholder="เช่น ระบุสถานที่ทำงาน..."
                      className="rounded-3xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all resize-none h-32 p-5 text-slate-700 leading-relaxed"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={!isWithinCheckinTime}
                    />
                  </div>

                  {location && (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="text-blue-600 w-5 h-5" />
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">ตำแหน่งปัจจุบัน</p>
                          <p className="text-xs font-bold text-blue-700">แม่นยำในระยะ {Math.round(location.accuracy)} เมตร</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:bg-blue-100 h-8 rounded-lg text-[10px] font-bold"
                        onClick={() => {
                          window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank');
                        }}
                      >
                        ตรวจสอบบนแผนที่
                      </Button>
                    </div>
                  )}

                  <Button 
                    className="w-full h-16 rounded-3xl bg-blue-600 hover:bg-blue-700 font-black text-xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:grayscale"
                    disabled={!selectedStatus || !isWithinCheckinTime || checkinMutation.isPending || isLocating || (selectedStatus === 'onsite' && !note.trim())}
                    onClick={() => {
                      if (selectedStatus === 'onsite' && !note.trim()) {
                        alert("กรุณาระบุสถานที่สำหรับการเช็คอิน Onsite")
                        return
                      }

                      setIsLocating(true)
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setIsLocating(false)
                            const loc = {
                              lat: pos.coords.latitude,
                              lng: pos.coords.longitude,
                              accuracy: pos.coords.accuracy
                            }
                            setLocation(loc)
                            
                            // If accuracy is too low (> 1000m), warn the user
                            if (loc.accuracy > 1000) {
                              if (!confirm(`ระบบตรวจพบตำแหน่งที่มีความแม่นยำต่ำ (${Math.round(loc.accuracy)} เมตร) อาจเกิดจากการระบุตำแหน่งด้วย IP อินเทอร์เน็ต ตำแหน่งนี้อาจไม่ถูกต้อง คุณต้องการบันทึกต่อหรือไม่?`)) {
                                return
                              }
                            }

                            checkinMutation.mutate({ 
                              status: selectedStatus!, 
                              note,
                              location_lat: loc.lat,
                              location_lng: loc.lng
                            })
                          },
                          (err) => {
                            console.warn("Geolocation error:", err)
                            setIsLocating(false)
                            let errorMsg = "ไม่สามารถระบุตำแหน่งได้"
                            if (err.code === 1) errorMsg = "กรุณาอนุญาตให้เข้าถึงตำแหน่งที่ตั้ง (Location Permission) ในเบราว์เซอร์ของคุณ"
                            if (err.code === 3) errorMsg = "การค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
                            
                            alert(errorMsg)
                            if (confirm(`${errorMsg}. ต้องการบันทึกเช็คอินโดยไม่ระบุตำแหน่งหรือไม่?`)) {
                              checkinMutation.mutate({ status: selectedStatus!, note })
                            }
                          },
                          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                        )
                      } else {
                        setIsLocating(false)
                        checkinMutation.mutate({ status: selectedStatus!, note })
                      }
                    }}
                  >
                    {checkinMutation.isPending || isLocating ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-3 h-6 w-6" />}
                    {isLocating ? "กำลังดึงตำแหน่งที่ตั้ง..." : "บันทึกการเช็คอิน"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Team Today */}
        <div className="lg:col-span-7 xl:col-span-8">
          {['admin', 'ceo', 'supervisor'].includes((session?.user as any)?.role) ? (
            <div className="space-y-8 animate-in slide-in-from-right duration-700">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'Office', count: summary.office, color: 'emerald', icon: Building2 },
                  { label: 'WFH', count: summary.home, color: 'blue', icon: Home },
                  { label: 'Onsite', count: summary.onsite, color: 'indigo', icon: MapPin },
                  { label: 'ลาหยุด', count: summary.leave, color: 'amber', icon: Palmtree },
                  { label: 'ยังไม่เช็ค', count: summary.notChecked, color: 'rose', icon: AlertCircle },
                ].map((item) => (
                  <div key={item.label} className={cn(
                    "p-6 rounded-[2rem] border-0 shadow-sm flex flex-col items-center justify-center text-center gap-1 group transition-all hover:scale-105",
                    item.color === 'emerald' ? 'bg-emerald-50' : 
                    item.color === 'blue' ? 'bg-blue-50' : 
                    item.color === 'indigo' ? 'bg-indigo-50' : 
                    item.color === 'amber' ? 'bg-amber-50' : 'bg-rose-50'
                  )}>
                    <item.icon size={20} className={cn(
                      item.color === 'emerald' ? 'text-emerald-600' : 
                      item.color === 'blue' ? 'text-blue-600' : 
                      item.color === 'indigo' ? 'text-indigo-600' : 
                      item.color === 'amber' ? 'text-amber-600' : 'text-rose-600'
                    )} />
                    <div className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mt-1">{item.label}</div>
                    <div className={cn(
                      "text-3xl font-black",
                      item.color === 'emerald' ? 'text-emerald-700' : 
                      item.color === 'blue' ? 'text-blue-700' : 
                      item.color === 'indigo' ? 'text-indigo-700' : 
                      item.color === 'amber' ? 'text-amber-700' : 'text-rose-700'
                    )}>{item.count}</div>
                  </div>
                ))}
              </div>

              {/* Filters Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-slate-900 tracking-tight">รายชื่อทีมวันนี้</h2>
                    <p className="text-slate-400 text-xs font-medium">แสดงสถานะพนักงานทั้งหมดแบบ Real-time</p>
                  </div>
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[220px] h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-blue-100 font-bold text-slate-600">
                    <SelectValue placeholder="ทุกกลุ่มงาน" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    <SelectItem value="all" className="rounded-xl font-medium">ทุกกลุ่มงาน</SelectItem>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.name} className="rounded-xl font-medium">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {teamLoading ? (
                  <div className="col-span-full py-20 text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-200" />
                    <p className="text-slate-400 font-bold text-lg">กำลังรวบรวมข้อมูลสถานะทีม...</p>
                  </div>
                ) : filteredTeam.length === 0 ? (
                  <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
                    <div className="p-6 bg-white rounded-full shadow-sm text-slate-200">
                      <Users size={64} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-900 font-black text-xl">ไม่พบรายชื่อในกลุ่มงานนี้</p>
                      <p className="text-slate-400 text-sm">ลองเปลี่ยนตัวกรองกลุ่มงานอื่น</p>
                    </div>
                  </div>
                ) : filteredTeam.map((u: any) => (
                  <div key={u.id} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex items-center gap-5 hover:-translate-y-1">
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-4 border-white shadow-md ring-1 ring-slate-100 transition-all group-hover:ring-blue-200">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 font-black text-xl">
                          {u.full_name?.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-sm",
                        u.checkin.status === 'office' ? "bg-emerald-500" :
                        u.checkin.status === 'home' ? "bg-blue-500" :
                        u.checkin.status === 'onsite' ? "bg-indigo-500" :
                        u.checkin.status === 'leave' ? "bg-amber-500" :
                        u.checkin.status === 'holiday' ? "bg-slate-400" :
                        "bg-rose-500 animate-pulse"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900 truncate text-lg group-hover:text-blue-700 transition-colors">{u.full_name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{u.department}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-tighter border-0",
                          u.checkin.status === 'office' ? "bg-emerald-100/50 text-emerald-600" :
                          u.checkin.status === 'home' ? "bg-blue-100/50 text-blue-600" :
                          u.checkin.status === 'onsite' ? "bg-indigo-100/50 text-indigo-600" :
                          u.checkin.status === 'leave' ? "bg-amber-100/50 text-amber-600" :
                          u.checkin.status === 'holiday' ? "bg-slate-100/50 text-slate-500" :
                          "bg-rose-100/50 text-rose-500"
                        )}
                      >
                        {u.checkin.status === 'not_checked' ? 'ยังไม่เช็ค' : u.checkin.status}
                      </Badge>
                      {u.checkin.note && (
                        <div className="relative group/note">
                          <div className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-help">
                            <MessageSquare size={14} />
                          </div>
                          <div className="absolute bottom-full right-0 mb-3 w-56 p-4 bg-slate-900 text-white text-xs rounded-2xl opacity-0 group-hover/note:opacity-100 transition-all duration-300 z-50 pointer-events-none shadow-2xl translate-y-2 group-hover/note:translate-y-0">
                            <div className="font-bold mb-1 opacity-50 text-[10px] uppercase">บันทึกเพิ่มเติม</div>
                            <p className="leading-relaxed">"{u.checkin.note}"</p>
                            <div className="absolute top-full right-4 w-3 h-3 bg-slate-900 rotate-45 -translate-y-1.5" />
                          </div>
                        </div>
                      )}
                      
                      {u.checkin.location_lat && u.checkin.location_lng && (
                        <a 
                          href={`https://www.google.com/maps?q=${u.checkin.location_lat},${u.checkin.location_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                          title="ดูตำแหน่งบนแผนที่"
                        >
                          <MapPin size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-[3rem] border-2 border-dashed border-blue-100 p-16 text-center h-full flex flex-col items-center justify-center animate-in fade-in duration-1000">
              <div className="relative mb-8">
                <Users className="w-24 h-24 text-blue-100" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <AlertCircle size={40} className="text-blue-400 opacity-50" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-blue-900 tracking-tight">พื้นที่หัวหน้างาน (Supervisor)</h3>
              <p className="text-blue-600/60 max-w-sm mx-auto mt-4 text-base leading-relaxed font-medium">
                เฉพาะ Supervisor, CEO หรือ Admin เท่านั้นที่สามารถดูสถานะการเช็คอินแบบรายทีมได้
              </p>
              <div className="mt-8 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-200" />
                <div className="w-2 h-2 rounded-full bg-blue-300" />
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
