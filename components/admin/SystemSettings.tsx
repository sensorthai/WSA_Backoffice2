"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Save, 
  AlertCircle, 
  Loader2,
  CalendarClock,
  History
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export function SystemSettings() {
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error("Failed to fetch settings")
      return res.json()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: any }) => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to update setting")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] })
      alert("บันทึกการตั้งค่าเรียบร้อยแล้ว!")
    },
    onError: (error: any) => {
      alert("เกิดข้อผิดพลาด: " + error.message)
    }
  })

  const [checkinWindow, setCheckinWindow] = useState<{start: number, end: number, edit_end: number} | null>(null)

  // Sync state when data is loaded
  if (settings?.checkin_window && !checkinWindow) {
    setCheckinWindow(settings.checkin_window)
  }

  const handleSave = async () => {
    if (!checkinWindow) return
    setIsSaving(true)
    try {
      await updateMutation.mutateAsync({
        key: "checkin_window",
        value: checkinWindow
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดการตั้งค่าระบบ...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden border-0 bg-white/70 backdrop-blur-xl">
        <CardHeader className="p-8 md:p-10 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
              <CalendarClock className="w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black tracking-tight">ช่วงเวลาเช็คอิน</CardTitle>
              <CardDescription className="text-slate-400 text-base">กำหนดช่วงเวลาที่พนักงานสามารถเช็คอินและแก้ไขข้อมูลได้</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 md:p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Start Time */}
            <div className="space-y-4 group">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">เวลาเริ่มเช็คอิน</Label>
              </div>
              <div className="relative">
                <Input 
                  type="number"
                  min={0}
                  max={23}
                  value={checkinWindow?.start ?? 6}
                  onChange={(e) => setCheckinWindow(prev => ({ ...prev!, start: parseInt(e.target.value) }))}
                  className="h-20 text-4xl font-black text-center rounded-[2rem] border-slate-100 bg-slate-50 focus:bg-white focus:ring-8 focus:ring-blue-100 transition-all border-0 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl">:00</div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center italic">พนักงานเริ่มเช็คอินได้ตั้งแต่เวลานี้</p>
            </div>

            {/* End Time */}
            <div className="space-y-4 group">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">เวลาสิ้นสุดเช็คอิน</Label>
              </div>
              <div className="relative">
                <Input 
                  type="number"
                  min={0}
                  max={23}
                  value={checkinWindow?.end ?? 11}
                  onChange={(e) => setCheckinWindow(prev => ({ ...prev!, end: parseInt(e.target.value) }))}
                  className="h-20 text-4xl font-black text-center rounded-[2rem] border-slate-100 bg-slate-50 focus:bg-white focus:ring-8 focus:ring-blue-100 transition-all border-0 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl">:00</div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center italic">ปิดระบบเช็คอินประจำวัน</p>
            </div>

            {/* Edit End Time */}
            <div className="space-y-4 group">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">เวลาสิ้นสุดการแก้ไข</Label>
              </div>
              <div className="relative">
                <Input 
                  type="number"
                  min={0}
                  max={23}
                  value={checkinWindow?.edit_end ?? 12}
                  onChange={(e) => setCheckinWindow(prev => ({ ...prev!, edit_end: parseInt(e.target.value) }))}
                  className="h-20 text-4xl font-black text-center rounded-[2rem] border-slate-100 bg-slate-50 focus:bg-white focus:ring-8 focus:ring-blue-100 transition-all border-0 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl">:00</div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center italic">แก้ไขข้อมูลสถานะได้ถึงเวลานี้</p>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-100/50 space-y-4">
            <h4 className="flex items-center gap-2 text-blue-900 font-black tracking-tight">
              <AlertCircle size={18} /> ข้อควรระวัง
            </h4>
            <ul className="text-sm text-blue-700/70 space-y-2 font-medium leading-relaxed">
              <li>• เวลาที่ระบุจะอ้างอิงตามเขตเวลา <strong className="text-blue-900">Asia/Bangkok (UTC+7)</strong> เท่านั้น</li>
              <li>• การเปลี่ยนแปลงจะมีผลทันทีกับพนักงานทุกคนที่ยังไม่ได้เช็คอินในวันนี้</li>
              <li>• เวลาสิ้นสุดการแก้ไขควรมีค่ามากกว่าเวลาสิ้นสุดการเช็คอิน</li>
            </ul>
          </div>

          <div className="flex items-center justify-between gap-6 pt-4">
            <div className="flex items-center gap-3 text-slate-400">
              <History size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">อัปเดตล่าสุด: {settings?.checkin_window ? new Date().toLocaleTimeString('th-TH') : '-'}</span>
            </div>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="h-16 px-10 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-3"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
