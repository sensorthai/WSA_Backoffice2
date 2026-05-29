"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { formatInTimeZone } from "date-fns-tz"
import { toast } from "sonner"
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
  MapPin,
  Save,
  FileText
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
  const [workDone, setWorkDone] = useState("")

  // Mutation to Save Daily Work Done
  const saveWorkDoneMutation = useMutation({
    mutationFn: async (work_done: string) => {
      const res = await fetch("/api/checkin", {
        method: "PATCH",
        body: JSON.stringify({ work_done }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "บันทึกไม่สำเร็จ")
      }
      return res.json()
    },
    onMutate: async (work_done) => {
      await queryClient.cancelQueries({ queryKey: ["my-checkin"] })
      const previousMyCheckin = queryClient.getQueryData<any>(["my-checkin"])

      // Optimistically update the work_done field in cache
      if (previousMyCheckin) {
        queryClient.setQueryData(["my-checkin"], {
          ...previousMyCheckin,
          work_done: work_done
        })
      }

      return { previousMyCheckin }
    },
    onError: (err: any, work_done, context) => {
      if (context?.previousMyCheckin) {
        queryClient.setQueryData(["my-checkin"], context.previousMyCheckin)
      }
      toast.error("ไม่สามารถบันทึกเนื้องานได้: " + err.message)
    },
    onSuccess: () => {
      toast.success("บันทึกเนื้องานวันนี้เรียบร้อยแล้ว! ข้อมูลนี้จะนำไปสรุปในรายงานประจำสัปดาห์ของคุณ")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-checkin"] })
    }
  })

  // 1. Fetch User's Today Check-in
  const { data: myStatus, isLoading: myLoading } = useQuery({
    queryKey: ["my-checkin"],
    queryFn: async () => {
      const res = await fetch("/api/checkin")
      if (!res.ok) return { status: null }
      return res.json()
    }
  })

  // Synchronize workDone when today's checkin status fetches
  useEffect(() => {
    if (myStatus?.work_done) {
      setWorkDone(myStatus.work_done)
    } else if (myStatus?.note && myStatus.note.includes('[บันทึกงานประจำวัน]:')) {
      setWorkDone(myStatus.note.split('[บันทึกงานประจำวัน]:')[1]?.trim() || "")
    }
  }, [myStatus])

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
    enabled: !!session?.user && (session.user as any).role !== 'outsource'
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
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["my-checkin"] })
      const previousMyCheckin = queryClient.getQueryData(["my-checkin"])

      // Optimistically set check-in status
      queryClient.setQueryData(["my-checkin"], {
        id: "optimistic-id",
        status: payload.status,
        note: payload.note,
        created_at: new Date().toISOString()
      })

      return { previousMyCheckin }
    },
    onError: (err: any, payload, context) => {
      if (context?.previousMyCheckin) {
        queryClient.setQueryData(["my-checkin"], context.previousMyCheckin)
      }
      toast.error("ไม่สามารถบันทึกเช็คอินได้: " + err.message)
    },
    onSuccess: () => {
      toast.success("บันทึกการเช็คอินเรียบร้อยแล้ว!")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-checkin"] })
      queryClient.invalidateQueries({ queryKey: ["team-checkins"] })
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

  // Filters and status groupings for the custom dashboard layout
  const officeUsers = useMemo(() => {
    return filteredTeam.filter((u: any) => u.checkin?.status === 'office')
  }, [filteredTeam])

  const homeUsers = useMemo(() => {
    return filteredTeam.filter((u: any) => u.checkin?.status === 'home')
  }, [filteredTeam])

  const onsiteUsers = useMemo(() => {
    return filteredTeam.filter((u: any) => u.checkin?.status === 'onsite')
  }, [filteredTeam])

  const leaveUsers = useMemo(() => {
    return filteredTeam.filter((u: any) => u.checkin?.status === 'leave' || u.checkin?.status === 'holiday')
  }, [filteredTeam])

  const notCheckedUsers = useMemo(() => {
    return filteredTeam.filter((u: any) => u.checkin?.status === 'not_checked' || !u.checkin?.status)
  }, [filteredTeam])

  // Dynamic department grouping
  const departmentsGrouped = useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    filteredTeam.forEach((u: any) => {
      if (u.department) {
        if (!groups[u.department]) {
          groups[u.department] = []
        }
        groups[u.department].push(u)
      }
    })
    return groups
  }, [filteredTeam])

  const currentStatus = myStatus?.id ? statusOptions.find(o => o.id === myStatus.status) : null

  const renderUserCard = (u: any, badgeText: string, badgeBgClass: string, badgeTextClass: string) => (
    <div key={u.id} className="p-3 bg-white hover:bg-slate-50 border border-slate-100/80 hover:border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center gap-2.5">
        {/* Avatar - fixed size */}
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
            <AvatarImage src={u.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 font-bold text-[10px]">
              {u.full_name?.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm",
            u.checkin?.status === 'office' ? "bg-emerald-500" :
            u.checkin?.status === 'home' ? "bg-blue-500" :
            u.checkin?.status === 'onsite' ? "bg-indigo-500" :
            u.checkin?.status === 'leave' ? "bg-amber-500" :
            u.checkin?.status === 'holiday' ? "bg-slate-400" :
            "bg-rose-500 animate-pulse"
          )} />
        </div>

        {/* Name + department - takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <div className="font-extrabold text-slate-800 text-[13px] truncate group-hover:text-blue-600 transition-colors leading-tight">{u.full_name}</div>
          <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">{u.department}</div>
        </div>

        {/* Badge + Note icon - compact, won't grow */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Badge className={cn("rounded-full px-2 py-0.5 font-bold text-[7px] tracking-wider border-0 uppercase whitespace-nowrap", badgeBgClass, badgeTextClass)}>
            {badgeText}
          </Badge>
          
          {/* Note message button */}
          <div className="relative group/note">
            <div className={cn(
              "p-1 rounded-lg transition-all cursor-pointer",
              u.checkin?.note 
                ? "bg-blue-50 text-blue-500 hover:bg-blue-100" 
                : "bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400"
            )}>
              <MessageSquare size={11} />
            </div>
            {u.checkin?.note && (
              <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/note:opacity-100 transition-all duration-300 z-50 pointer-events-none shadow-xl translate-y-1 group-hover/note:translate-y-0 leading-normal">
                <div className="font-bold mb-0.5 opacity-50 uppercase tracking-widest text-[8px]">บันทึกเนื้องาน</div>
                <p>"{u.checkin.note}"</p>
                <div className="absolute top-full right-3 w-2 h-2 bg-slate-900 rotate-45 -translate-y-1" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

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

                  {['office', 'home', 'onsite'].includes(myStatus.status) && (
                    <div className="pt-6 border-t border-slate-100 space-y-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText size={16} />
                        </span>
                        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide">📝 พิมพ์เนื้องานประจำวันนี้</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <Textarea
                          placeholder="พิมพ์ระบุเนื้องานหรือผลงานที่คุณทำสำเร็จในวันนี้ เช่น พัฒนา API เสร็จสิ้น, แก้บั๊กหน้าเช็คอิน..."
                          className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all resize-none h-28 p-4 text-xs text-slate-700 leading-relaxed font-medium"
                          value={workDone}
                          onChange={(e) => setWorkDone(e.target.value)}
                        />
                        <Button
                          className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-xs shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5"
                          disabled={saveWorkDoneMutation.isPending || !workDone.trim()}
                          onClick={() => saveWorkDoneMutation.mutate(workDone)}
                        >
                          {saveWorkDoneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          บันทึกเนื้องานวันนี้
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic text-center">
                        * ข้อมูลนี้จะเชื่อมโยงไปสร้างรายงานประจำสัปดาห์โดยอัตโนมัติ
                      </p>
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
                        toast.warning("กรุณาระบุสถานที่สำหรับการเช็คอิน Onsite")
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
                            
                            toast.error(errorMsg)
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
          {(session?.user as any)?.role !== 'outsource' ? (
            <div className="space-y-8 animate-in slide-in-from-right duration-700">
              
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {[
                  { label: 'OFFICE', count: summary.office, color: 'emerald', icon: Building2 },
                  { label: 'WFH', count: summary.home, color: 'blue', icon: Home },
                  { label: 'ONSITE', count: summary.onsite, color: 'indigo', icon: MapPin },
                  { label: 'ลาหยุด', count: summary.leave, color: 'amber', icon: Palmtree },
                  { label: 'ยังไม่เช็ค', count: summary.notChecked, color: 'rose', icon: AlertCircle },
                ].map((item) => (
                  <div key={item.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)] flex flex-col items-center justify-center text-center gap-1 group transition-all duration-300 hover:scale-105 hover:shadow-md">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300",
                      item.color === 'emerald' ? 'bg-emerald-50 text-emerald-500' : 
                      item.color === 'blue' ? 'bg-blue-50 text-blue-500' : 
                      item.color === 'indigo' ? 'bg-indigo-50 text-indigo-500' : 
                      item.color === 'amber' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'
                    )}>
                      <item.icon size={22} />
                    </div>
                    <div className="font-extrabold text-slate-400 text-[10px] uppercase tracking-widest mt-2">{item.label}</div>
                    <div className={cn(
                      "text-4xl font-black mt-1",
                      item.color === 'emerald' ? 'text-emerald-500' : 
                      item.color === 'blue' ? 'text-blue-500' : 
                      item.color === 'indigo' ? 'text-indigo-500' : 
                      item.color === 'amber' ? 'text-amber-500' : 'text-rose-500'
                    )}>{item.count}</div>
                  </div>
                ))}
              </div>

              {/* Filters & Title Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-slate-900 tracking-tight">รายชื่อทีมวันนี้</h2>
                    <p className="text-slate-400 text-xs font-medium">แสดงสถานะพนักงานทั้งหมดแบบ Real-time</p>
                  </div>
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[200px] h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-blue-100 font-bold text-slate-600">
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

              {/* Loading Indicator */}
              {teamLoading ? (
                <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)]">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-slate-400 font-bold text-lg">กำลังรวบรวมข้อมูลสถานะทีม...</p>
                </div>
              ) : filteredTeam.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)] flex flex-col items-center justify-center gap-4">
                  <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                    <Users size={64} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-900 font-black text-xl">ไม่พบรายชื่อในกลุ่มงานนี้</p>
                    <p className="text-slate-400 text-sm">ลองเปลี่ยนตัวกรองกลุ่มงานอื่น</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Status Grouped Columns (OFFICE, WFH, ONSITE) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* OFFICE Column */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)] relative overflow-hidden flex flex-col">
                      <div className="absolute right-6 top-6 text-slate-100">
                        <Building2 size={64} className="opacity-40" />
                      </div>
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-50 relative z-10">
                        <div className="text-5xl font-black text-emerald-500/25 leading-none">{officeUsers.length}</div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base leading-tight">ในออฟฟิศ</h3>
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider">(OFFICE)</span>
                        </div>
                      </div>
                      <div className="space-y-3 mt-4 flex-1">
                        {officeUsers.map(u => renderUserCard(u, "OFFICE", "bg-emerald-100", "text-emerald-600"))}
                        {officeUsers.length === 0 && (
                          <div className="py-8 text-center text-slate-300 text-xs font-bold border border-dashed border-slate-100 rounded-3xl">
                            ไม่มีพนักงานในสถานะนี้
                          </div>
                        )}
                      </div>
                    </div>

                    {/* WFH Column */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)] relative overflow-hidden flex flex-col">
                      <div className="absolute right-6 top-6 text-slate-100">
                        <Home size={64} className="opacity-40" />
                      </div>
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-50 relative z-10">
                        <div className="text-5xl font-black text-blue-500/25 leading-none">{homeUsers.length}</div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base leading-tight">ทำงานที่บ้าน</h3>
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider">(WFH)</span>
                        </div>
                      </div>
                      <div className="space-y-3 mt-4 flex-1">
                        {homeUsers.map(u => renderUserCard(u, "HOME", "bg-blue-100", "text-blue-600"))}
                        {homeUsers.length === 0 && (
                          <div className="py-8 text-center text-slate-300 text-xs font-bold border border-dashed border-slate-100 rounded-3xl">
                            ไม่มีพนักงานในสถานะนี้
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ONSITE Column */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)] relative overflow-hidden flex flex-col">
                      <div className="absolute right-6 top-6 text-slate-100">
                        <MapPin size={64} className="opacity-40" />
                      </div>
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-50 relative z-10">
                        <div className="text-5xl font-black text-indigo-500/25 leading-none">{onsiteUsers.length}</div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base leading-tight">นอกสถานที่</h3>
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider">(ONSITE)</span>
                        </div>
                      </div>
                      <div className="space-y-3 mt-4 flex-1">
                        {onsiteUsers.map(u => renderUserCard(u, "ONSITE", "bg-indigo-100", "text-indigo-600"))}
                        {onsiteUsers.length === 0 && (
                          <div className="py-8 text-center text-slate-300 text-xs font-bold border border-dashed border-slate-100 rounded-3xl">
                            ไม่มีพนักงานในสถานะนี้
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Department Groups Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(departmentsGrouped).map(([deptName, users]) => (
                      <div key={deptName} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)]">
                        <div className="pb-4 border-b border-slate-50">
                          <h3 className="font-black text-slate-800 text-sm leading-tight tracking-tight">
                            {deptName} <span className="text-blue-500 ml-1">({users.length})</span>
                          </h3>
                        </div>
                        <div className="space-y-3 mt-4">
                          {users.map(u => {
                            let badgeText = "NO-CHECK"
                            let badgeBg = "bg-rose-100"
                            let badgeTextCol = "text-rose-600"
                            if (u.checkin?.status === 'office') {
                              badgeText = "OFFICE"
                              badgeBg = "bg-emerald-100"
                              badgeTextCol = "text-emerald-600"
                            } else if (u.checkin?.status === 'home') {
                              badgeText = "HOME"
                              badgeBg = "bg-blue-100"
                              badgeTextCol = "text-blue-600"
                            } else if (u.checkin?.status === 'onsite') {
                              badgeText = "ONSITE"
                              badgeBg = "bg-indigo-100"
                              badgeTextCol = "text-indigo-600"
                            } else if (u.checkin?.status === 'leave') {
                              badgeText = "LEAVE"
                              badgeBg = "bg-amber-100"
                              badgeTextCol = "text-amber-600"
                            } else if (u.checkin?.status === 'holiday') {
                              badgeText = "HOLIDAY"
                              badgeBg = "bg-slate-100"
                              badgeTextCol = "text-slate-500"
                            }
                            return renderUserCard(u, badgeText, badgeBg, badgeTextCol)
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Row: Other Statuses & Unchecked */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Other Statuses */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)]">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <h3 className="font-black text-slate-800 text-base leading-tight">สถานะอื่นๆ (Other Statuses)</h3>
                        <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-600 border-0 rounded-full font-black text-xs px-3.5 py-1 uppercase">
                          ลาหยุด {leaveUsers.length}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        {leaveUsers.map(u => {
                          const isHoliday = u.checkin?.status === 'holiday'
                          return renderUserCard(
                            u, 
                            isHoliday ? "HOLIDAY" : "LEAVE", 
                            isHoliday ? "bg-slate-100" : "bg-amber-100", 
                            isHoliday ? "text-slate-500" : "text-amber-600"
                          )
                        })}
                        {leaveUsers.length === 0 && (
                          <div className="col-span-full py-12 text-center text-slate-300 text-xs font-bold border border-dashed border-slate-100 rounded-3xl">
                            ไม่มีพนักงานในสถานะลางาน/วันหยุด
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unchecked */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.015)]">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <h3 className="font-black text-slate-800 text-base leading-tight">ยังไม่เช็ค</h3>
                        <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-600 border-0 rounded-full font-black text-xs px-3.5 py-1">
                          {notCheckedUsers.length} คน
                        </Badge>
                      </div>
                      
                      <div className="space-y-3 mt-6">
                        {notCheckedUsers.map(u => renderUserCard(u, "No-Check", "bg-rose-100", "text-rose-600"))}
                        {notCheckedUsers.length === 0 && (
                          <div className="py-12 text-center text-emerald-500 text-xs font-bold border border-dashed border-emerald-100 bg-emerald-50/20 rounded-3xl">
                            พนักงานทุกคนเช็คอินเรียบร้อยแล้ว! 🎉
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-[3rem] border-2 border-dashed border-blue-100 p-16 text-center h-full flex flex-col items-center justify-center animate-in fade-in duration-1000">
              <div className="relative mb-8">
                <Users className="w-24 h-24 text-blue-100" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <AlertCircle size={40} className="text-blue-400 opacity-50" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-blue-900 tracking-tight">ไม่มีสิทธิ์เข้าถึงข้อมูลทีม</h3>
              <p className="text-blue-600/60 max-w-sm mx-auto mt-4 text-base leading-relaxed font-medium">
                พนักงาน Outsource ไม่สามารถดูสถานะการเช็คอินแบบรายทีมได้
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
