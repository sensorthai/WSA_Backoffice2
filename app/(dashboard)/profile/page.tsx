"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/hooks/useUser"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toast } from "sonner"
import { 
  User, 
  Mail, 
  Shield, 
  Layers, 
  Briefcase, 
  KeyRound, 
  Save, 
  RefreshCw,
  UserCheck,
  Car,
  Bike,
  Plus,
  Trash2,
  Edit2,
  Paperclip,
  UploadCloud,
  FileText,
  Loader2,
  Heart,
  Activity,
  Calendar,
  Stethoscope,
  Hospital
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function getDaysDiff(dateStr: string): number {
  if (!dateStr) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  
  const diffTime = target.getTime() - today.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export default function ProfilePage() {
  const { profile, isLoading: isUserLoading, error: userError } = useUser()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [activeView, setActiveView] = useState("profile-info")

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // --- Password Form State ---
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  })

  // --- Private Vehicles State ---
  const [isPrivateVehicleModalOpen, setIsPrivateVehicleModalOpen] = useState(false)
  const [editingPrivateVehicle, setEditingPrivateVehicle] = useState<any>(null)
  const [isUploadingPrivateTax, setIsUploadingPrivateTax] = useState(false)
  const [isUploadingPrivateInsurance, setIsUploadingPrivateInsurance] = useState(false)
  const [isUploadingPrivateCtp, setIsUploadingPrivateCtp] = useState(false)
  const [isUploadingPrivateOther, setIsUploadingPrivateOther] = useState(false)

  const [privateVehicleForm, setPrivateVehicleForm] = useState({
    license_plate: "",
    model: "",
    color: "",
    type: "car",
    tax_renewal_date: "",
    insurance_expiry_date: "",
    ctp_expiry_date: "",
    oil_change_date: "",
    insurance_file_url: "",
    ctp_file_url: "",
    tax_file_url: "",
    other_file_url: ""
  })

  // --- Health Profile State ---
  const [healthForm, setHealthForm] = useState({
    blood_type: "",
    chronic_disease: "",
    severe_allergies: "",
    social_security_hospital: "",
    attending_physician: "",
    emergency_hospital: "",
    health_exam_history: ""
  })

  useEffect(() => {
    if (profile) {
      setHealthForm({
        blood_type: profile.blood_type || "",
        chronic_disease: profile.chronic_disease || "",
        severe_allergies: profile.severe_allergies || "",
        social_security_hospital: profile.social_security_hospital || "",
        attending_physician: profile.attending_physician || "",
        emergency_hospital: profile.emergency_hospital || "",
        health_exam_history: profile.health_exam_history || ""
      })
    }
  }, [profile])

  // --- Doctor Appointments State ---
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any>(null)
  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    doctor_name: "",
    hospital_name: "",
    appointment_date: "",
    appointment_time: "",
    note: ""
  })

  // --- Reset Password Mutation ---
  const resetPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch("/api/profile/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      })
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to reset password")
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || "เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว!")
      setPasswordForm({ password: "", confirmPassword: "" })
    },
    onError: (err: any) => {
      toast.error("เกิดข้อผิดพลาด: " + err.message)
    }
  })

  // --- Private Vehicles Queries ---
  const { data: privateVehicles, isLoading: isPrivateVehiclesLoading } = useQuery({
    queryKey: ["private-vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/cars/private")
      if (!res.ok) throw new Error("Failed to fetch private vehicles")
      return res.json()
    },
    enabled: !!profile // Fetch only when user profile is loaded
  })

  // --- Private Vehicles Mutations ---
  const createPrivateVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/cars/private", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create vehicle")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-vehicles"] })
      setIsPrivateVehicleModalOpen(false)
      toast.success("เพิ่มข้อมูลรถยนต์ส่วนตัวสำเร็จแล้ว!")
    },
    onError: (e: any) => toast.error("เกิดข้อผิดพลาด: " + e.message)
  })

  const updatePrivateVehicleMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      const res = await fetch(`/api/cars/private/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update vehicle")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-vehicles"] })
      setIsPrivateVehicleModalOpen(false)
      toast.success("แก้ไขข้อมูลรถยนต์ส่วนตัวสำเร็จแล้ว!")
    },
    onError: (e: any) => toast.error("เกิดข้อผิดพลาด: " + e.message)
  })

  const deletePrivateVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cars/private/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete vehicle")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-vehicles"] })
      toast.success("ลบข้อมูลรถยนต์ส่วนตัวเรียบร้อยแล้ว")
    },
    onError: (e: any) => toast.error("ไม่สามารถลบได้: " + e.message)
  })

  // --- Health Mutations ---
  const updateHealthMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/profile/health", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update health info")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      toast.success("บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว!")
    },
    onError: (e: any) => toast.error("เกิดข้อผิดพลาด: " + e.message)
  })

  // --- Doctor Appointments Queries & Mutations ---
  const { data: appointments, isLoading: isAppointmentsLoading } = useQuery({
    queryKey: ["doctor-appointments"],
    queryFn: async () => {
      const res = await fetch("/api/profile/doctor-appointments")
      if (!res.ok) throw new Error("Failed to fetch appointments")
      return res.json()
    },
    enabled: !!profile
  })

  const createAppointmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/profile/doctor-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create appointment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] })
      setIsAppointmentModalOpen(false)
      toast.success("เพิ่มข้อมูลการนัดหมายพบแพทย์สำเร็จ!")
    },
    onError: (e: any) => toast.error("เกิดข้อผิดพลาด: " + e.message)
  })

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      const res = await fetch(`/api/profile/doctor-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update appointment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] })
      setIsAppointmentModalOpen(false)
      toast.success("แก้ไขข้อมูลการนัดหมายพบแพทย์สำเร็จ!")
    },
    onError: (e: any) => toast.error("เกิดข้อผิดพลาด: " + e.message)
  })

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/profile/doctor-appointments/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete appointment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] })
      toast.success("ลบข้อมูลการนัดหมายแพทย์เรียบร้อยแล้ว")
    },
    onError: (e: any) => toast.error("ไม่สามารถลบได้: " + e.message)
  })

  const handleHealthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateHealthMutation.mutate(healthForm)
  }

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointmentForm.title || !appointmentForm.appointment_date) {
      toast.warning("กรุณากรอกหัวข้อและเลือกวันนัดหมาย")
      return
    }
    if (editingAppointment) {
      updateAppointmentMutation.mutate({
        id: editingAppointment.id,
        payload: appointmentForm
      })
    } else {
      createAppointmentMutation.mutate(appointmentForm)
    }
  }

  const handlePrivateVehicleUpload = async (file: File, field: string, setUploading: (v: boolean) => void) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "private_cars")
      formData.append("bucket", "car-documents")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to upload file")
      }

      const data = await res.json()
      setPrivateVehicleForm(prev => ({ ...prev, [field]: data.url }))
      toast.success("อัปโหลดเอกสารสำเร็จ!")
    } catch (err: any) {
      toast.error(`อัปโหลดล้มเหลว: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handlePrivateVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!privateVehicleForm.license_plate || !privateVehicleForm.model || !privateVehicleForm.color) {
      toast.warning("กรุณากรอกทะเบียน รุ่น และสีรถ")
      return
    }

    if (editingPrivateVehicle) {
      updatePrivateVehicleMutation.mutate({
        id: editingPrivateVehicle.id,
        payload: privateVehicleForm
      })
    } else {
      createPrivateVehicleMutation.mutate(privateVehicleForm)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.password) {
      toast.warning("กรุณากรอกรหัสผ่านใหม่")
      return
    }
    if (passwordForm.password.length < 6) {
      toast.warning("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }
    resetPasswordMutation.mutate(passwordForm.password)
  }

  if (userError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto">
        <p className="text-rose-500 font-black text-xl">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <p className="text-slate-400 text-sm mt-2">{(userError as any)?.message || String(userError)}</p>
        <Button onClick={() => window.location.reload()} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-12 font-bold transition-all shadow-md">
          โหลดหน้าใหม่อีกครั้ง
        </Button>
      </div>
    )
  }

  if (isUserLoading || !mounted) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-blue-600 w-10 h-10" />
        <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูลส่วนตัว...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-rose-500 font-bold">ไม่พบข้อมูลผู้ใช้งานในระบบ</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20">
      {/* Hero Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <Avatar className="h-28 w-28 border-4 border-blue-500/30 shadow-2xl">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="bg-slate-800 text-white text-3xl font-black">
              {profile.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-black tracking-tight">{profile.full_name}</h1>
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase px-3 py-1 rounded-xl text-xs">
                {profile.role}
              </Badge>
              {profile.is_active && (
                <Badge className="bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-xl text-xs border-0">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-slate-400 font-medium text-lg flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-5 h-5 text-slate-500" /> {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="space-y-8">
        <div className="flex border-b border-slate-200 gap-8 pb-1 relative">
          <button
            type="button"
            className={cn(
              "pb-3 font-bold text-sm relative transition-all flex items-center gap-2",
              activeView === "profile-info"
                ? "text-blue-600 font-extrabold"
                : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => setActiveView("profile-info")}
          >
            <User size={16} />
            <span>ข้อมูลส่วนตัว & รหัสผ่าน</span>
            {activeView === "profile-info" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
            )}
          </button>
          <button
            type="button"
            className={cn(
              "pb-3 font-bold text-sm relative transition-all flex items-center gap-2",
              activeView === "private-vehicles"
                ? "text-blue-600 font-extrabold"
                : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => setActiveView("private-vehicles")}
          >
            <Car size={16} />
            <span>รถส่วนตัวของฉัน</span>
            {activeView === "private-vehicles" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
            )}
          </button>
          <button
            type="button"
            className={cn(
              "pb-3 font-bold text-sm relative transition-all flex items-center gap-2",
              activeView === "health-profile"
                ? "text-blue-600 font-extrabold"
                : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => setActiveView("health-profile")}
          >
            <Heart size={16} />
            <span>ข้อมูลสุขภาพ & นัดหมายแพทย์</span>
            {activeView === "health-profile" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
            )}
          </button>
        </div>

        {/* Tab 1: Profile Info */}
        {activeView === "profile-info" && (
          <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Profile Details Card */}
            <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden md:col-span-7 bg-white">
              <CardHeader className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
                <CardTitle className="text-xl font-black text-slate-850 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" /> ข้อมูลทั่วไป
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100/50 rounded-xl text-blue-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">บทบาทหน้าที่</p>
                      <p className="text-base font-bold text-slate-800 capitalize">{profile.role}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100/50 rounded-xl text-blue-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">แผนก / ฝ่ายงาน</p>
                      <p className="text-base font-bold text-slate-800">
                        {profile.department_id ? "มีแผนกงานรองรับ" : "ไม่ได้ระบุแผนกงาน"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100/50 rounded-xl text-blue-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ตำแหน่งงาน</p>
                      <p className="text-base font-bold text-slate-800">
                        {profile.position_id ? "มีตำแหน่งรองรับ" : "ไม่ได้ระบุตำแหน่ง"}
                      </p>
                    </div>
                  </div>

                  {profile.is_teacher && (
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4 text-emerald-800">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">ความสามารถพิเศษ</p>
                        <p className="text-base font-extrabold">ผู้สอน / ครูผู้ฝึกสอน (Teacher)</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden md:col-span-5 bg-white">
              <CardHeader className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
                <CardTitle className="text-xl font-black text-slate-850 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-500" /> ตั้งค่ารหัสผ่านใหม่
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-600 text-xs">รหัสผ่านใหม่ (New Password)</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="อย่างน้อย 6 ตัวอักษร..." 
                      className="h-12 rounded-xl border-slate-200 focus:ring-blue-500/20"
                      value={passwordForm.password}
                      onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-600 text-xs">ยืนยันรหัสผ่านใหม่ (Confirm Password)</Label>
                    <Input 
                      id="confirmPassword"
                      type="password" 
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง..." 
                      className="h-12 rounded-xl border-slate-200 focus:ring-blue-500/20"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <RefreshCw className="animate-spin w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>บันทึกรหัสผ่านใหม่</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

        {/* Tab 2: My Private Vehicles */}
        {activeView === "private-vehicles" && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">รถส่วนตัวของฉัน</h2>
                <p className="text-slate-400 font-medium mt-1">จัดการรถยนต์และรถจักรยานยนต์ส่วนตัวสำหรับแจ้งเตือนเอกสารสำคัญ</p>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 font-bold transition-all shadow-lg shadow-blue-500/15"
                onClick={() => {
                  setEditingPrivateVehicle(null)
                  setPrivateVehicleForm({
                    license_plate: "",
                    model: "",
                    color: "",
                    type: "car",
                    tax_renewal_date: "",
                    insurance_expiry_date: "",
                    ctp_expiry_date: "",
                    oil_change_date: "",
                    insurance_file_url: "",
                    ctp_file_url: "",
                    tax_file_url: "",
                    other_file_url: ""
                  })
                  setIsPrivateVehicleModalOpen(true)
                }}
              >
                <Plus className="mr-2 w-5 h-5" /> เพิ่มรถส่วนตัว
              </Button>
            </div>

            {isPrivateVehiclesLoading ? (
              <div className="py-24 text-center">
                <Loader2 className="animate-spin inline-block text-blue-200 w-16 h-16" />
              </div>
            ) : !privateVehicles || privateVehicles.length === 0 ? (
              <Card className="py-32 text-center rounded-[3.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex flex-col items-center gap-6 text-slate-300">
                  <Car size={80} strokeWidth={1} />
                  <p className="text-xl font-bold text-slate-400">ยังไม่มีรถส่วนตัวในระบบ</p>
                  <Button
                    variant="outline"
                    className="rounded-2xl px-8"
                    onClick={() => {
                      setEditingPrivateVehicle(null)
                      setPrivateVehicleForm({
                        license_plate: "",
                        model: "",
                        color: "",
                        type: "car",
                        tax_renewal_date: "",
                        insurance_expiry_date: "",
                        ctp_expiry_date: "",
                        oil_change_date: "",
                        insurance_file_url: "",
                        ctp_file_url: "",
                        tax_file_url: "",
                        other_file_url: ""
                      })
                      setIsPrivateVehicleModalOpen(true)
                    }}
                  >
                    เพิ่มรถคันแรกของคุณ
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {privateVehicles.map((vehicle: any) => (
                  <Card key={vehicle.id} className="rounded-[2.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-xl transition-all duration-300 p-8 flex flex-col justify-between group">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                            {vehicle.type === "motorcycle" ? (
                              <Bike size={28} />
                            ) : (
                              <Car size={28} />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-lg">{vehicle.model}</div>
                            <div className="text-xs text-slate-400 font-bold tracking-widest uppercase">{vehicle.license_plate}</div>
                          </div>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 border-0 font-bold">
                          {vehicle.color}
                        </Badge>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-50">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-slate-400 font-bold mb-1">วันต่อภาษี</div>
                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                              {vehicle.tax_renewal_date ? (
                                <>
                                  <span>{format(new Date(vehicle.tax_renewal_date), "d MMM yyyy", { locale: th })}</span>
                                  {vehicle.tax_file_url && (
                                    <a href={vehicle.tax_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                      <Paperclip size={14} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-slate-400 font-bold mb-1">ประกันหมดอายุ</div>
                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                              {vehicle.insurance_expiry_date ? (
                                <>
                                  <span>{format(new Date(vehicle.insurance_expiry_date), "d MMM yyyy", { locale: th })}</span>
                                  {vehicle.insurance_file_url && (
                                    <a href={vehicle.insurance_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                      <Paperclip size={14} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-slate-400 font-bold mb-1">พ.ร.บ. หมดอายุ</div>
                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                              {vehicle.ctp_expiry_date ? (
                                <>
                                  <span>{format(new Date(vehicle.ctp_expiry_date), "d MMM yyyy", { locale: th })}</span>
                                  {vehicle.ctp_file_url && (
                                    <a href={vehicle.ctp_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                      <Paperclip size={14} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-slate-400 font-bold mb-1">วันเปลี่ยนน้ำมันเครื่อง</div>
                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                              {vehicle.oil_change_date ? (
                                <>
                                  <span>{format(new Date(vehicle.oil_change_date), "d MMM yyyy", { locale: th })}</span>
                                  {vehicle.other_file_url && (
                                    <a href={vehicle.other_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                      <Paperclip size={14} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* File Download Badges */}
                        {(vehicle.tax_file_url || vehicle.insurance_file_url || vehicle.ctp_file_url || vehicle.other_file_url) && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                            {vehicle.tax_file_url && (
                              <a href={vehicle.tax_file_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 bg-blue-50/50 border-blue-200 text-blue-700">
                                  <FileText className="h-3 w-3 mr-1" /> ภาษี
                                </Badge>
                              </a>
                            )}
                            {vehicle.insurance_file_url && (
                              <a href={vehicle.insurance_file_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 bg-indigo-50/50 border-indigo-200 text-indigo-700">
                                  <FileText className="h-3 w-3 mr-1" /> ประกัน
                                </Badge>
                              </a>
                            )}
                            {vehicle.ctp_file_url && (
                              <a href={vehicle.ctp_file_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 bg-green-50/50 border-green-200 text-green-700">
                                  <FileText className="h-3 w-3 mr-1" /> พ.ร.บ.
                                </Badge>
                              </a>
                            )}
                            {vehicle.other_file_url && (
                              <a href={vehicle.other_file_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 bg-slate-50 border-slate-200 text-slate-700">
                                  <FileText className="h-3 w-3 mr-1" /> เอกสารอื่นๆ
                                </Badge>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-6 border-t border-slate-50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl font-bold h-10 hover:bg-slate-50 text-slate-600"
                        onClick={() => {
                          setEditingPrivateVehicle(vehicle)
                          setPrivateVehicleForm({
                            license_plate: vehicle.license_plate,
                            model: vehicle.model,
                            color: vehicle.color,
                            type: vehicle.type || "car",
                            tax_renewal_date: vehicle.tax_renewal_date ? format(new Date(vehicle.tax_renewal_date), "yyyy-MM-dd") : "",
                            insurance_expiry_date: vehicle.insurance_expiry_date ? format(new Date(vehicle.insurance_expiry_date), "yyyy-MM-dd") : "",
                            ctp_expiry_date: vehicle.ctp_expiry_date ? format(new Date(vehicle.ctp_expiry_date), "yyyy-MM-dd") : "",
                            oil_change_date: vehicle.oil_change_date ? format(new Date(vehicle.oil_change_date), "yyyy-MM-dd") : "",
                            insurance_file_url: vehicle.insurance_file_url || "",
                            ctp_file_url: vehicle.ctp_file_url || "",
                            tax_file_url: vehicle.tax_file_url || "",
                            other_file_url: vehicle.other_file_url || ""
                          })
                          setIsPrivateVehicleModalOpen(true)
                        }}
                      >
                        <Edit2 size={16} className="mr-1.5" /> แก้ไข
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl font-bold h-10 hover:bg-rose-50 text-rose-500 hover:text-rose-600 border-rose-100"
                        onClick={() => {
                          if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรถยนต์ส่วนตัวคันนี้?")) {
                            deletePrivateVehicleMutation.mutate(vehicle.id)
                          }
                        }}
                      >
                        <Trash2 size={16} className="mr-1.5" /> ลบ
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Health Profile & Doctor Appointments */}
        {activeView === "health-profile" && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Health Profile Fields Form */}
              <div className="md:col-span-7 space-y-6">
                <Card className="rounded-[2.5rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
                    <CardTitle className="text-xl font-black text-slate-850 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-blue-500" /> ข้อมูลสุขภาพและฉุกเฉิน
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleHealthSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 md:col-span-1">
                          <Label className="font-bold text-slate-600 text-xs">หมู่โลหิต (Blood Type)</Label>
                          <select
                            className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            value={healthForm.blood_type}
                            onChange={e => setHealthForm({ ...healthForm, blood_type: e.target.value })}
                          >
                            <option value="">ไม่ระบุ</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="O">O</option>
                            <option value="AB">AB</option>
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="font-bold text-slate-600 text-xs">โรคประจำตัว (Chronic Disease)</Label>
                          <Input
                            placeholder="เช่น เบาหวาน, ความดันโลหิตสูง (ถ้าไม่มีระบุ -)"
                            className="h-12 rounded-xl border-slate-200 font-bold"
                            value={healthForm.chronic_disease}
                            onChange={e => setHealthForm({ ...healthForm, chronic_disease: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-slate-600 text-xs">ประวัติการแพ้ยา / แพ้อาหารอย่างรุนแรง</Label>
                        <Input
                          placeholder="ระบุชื่อยาหรืออาหารที่แพ้ พร้อมอาการแพ้ (ถ้าไม่มีระบุ -)"
                          className="h-12 rounded-xl border-slate-200 font-bold"
                          value={healthForm.severe_allergies}
                          onChange={e => setHealthForm({ ...healthForm, severe_allergies: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-600 text-xs">รพ. สิทธิ์ประกันสังคม หรือ รพ. ใกล้บ้าน</Label>
                          <Input
                            placeholder="ระบุชื่อโรงพยาบาล..."
                            className="h-12 rounded-xl border-slate-200 font-bold"
                            value={healthForm.social_security_hospital}
                            onChange={e => setHealthForm({ ...healthForm, social_security_hospital: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-600 text-xs">แพทย์ประจำตัว / แพทย์เจ้าของไข้ (ถ้ามี)</Label>
                          <Input
                            placeholder="ระบุชื่อแพทย์..."
                            className="h-12 rounded-xl border-slate-200 font-bold"
                            value={healthForm.attending_physician}
                            onChange={e => setHealthForm({ ...healthForm, attending_physician: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <Label className="font-bold text-slate-600 text-xs flex items-center gap-1.5">
                          <Hospital className="w-4 h-4 text-emerald-500" />
                          <span>โรงพยาบาลส่งตัวยามฉุกเฉินในเวลางาน (สามารถส่งตัวไปได้ทันที)</span>
                        </Label>
                        <Input
                          placeholder="เช่น โรงพยาบาลวิภาวดี, โรงพยาบาลใกล้บริษัท..."
                          className="h-12 rounded-xl border-slate-200 font-bold"
                          value={healthForm.emergency_hospital}
                          onChange={e => setHealthForm({ ...healthForm, emergency_hospital: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <Label className="font-bold text-slate-600 text-xs flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-rose-500" />
                          <span>ประวัติวัคซีน/ตรวจสุขภาพ & ข้อจำกัดทางร่างกาย</span>
                        </Label>
                        <textarea
                          placeholder="ระบุข้อจำกัด เช่น ห้ามยกของหนักเกิน 10 กก., มีปัญหาการมองเห็นในที่มืด หรือประวัติการตรวจสุขภาพ..."
                          className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                          value={healthForm.health_exam_history}
                          onChange={e => setHealthForm({ ...healthForm, health_exam_history: e.target.value })}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                        disabled={updateHealthMutation.isPending}
                      >
                        {updateHealthMutation.isPending ? (
                          <RefreshCw className="animate-spin w-4 h-4" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>บันทึกข้อมูลสุขภาพ</span>
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Doctor Appointments Section */}
              <div className="md:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">การนัดหมายแพทย์</h2>
                    <p className="text-slate-400 font-medium text-xs mt-1">ตั้งค่านัดหมายล่วงหน้าเพื่อรับการแจ้งเตือนอีเมล</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-4 h-10 shadow-md shadow-blue-500/10"
                    onClick={() => {
                      setEditingAppointment(null)
                      setAppointmentForm({
                        title: "",
                        doctor_name: "",
                        hospital_name: "",
                        appointment_date: "",
                        appointment_time: "",
                        note: ""
                      })
                      setIsAppointmentModalOpen(true)
                    }}
                  >
                    <Plus className="mr-1 w-4 h-4" /> เพิ่มการนัดหมาย
                  </Button>
                </div>

                {isAppointmentsLoading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="animate-spin inline-block text-blue-200 w-12 h-12" />
                  </div>
                ) : !appointments || appointments.length === 0 ? (
                  <Card className="py-16 text-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4 text-slate-350">
                      <Calendar size={48} strokeWidth={1} />
                      <p className="text-sm font-bold text-slate-400">ยังไม่มีนัดหมายแพทย์ล่วงหน้า</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-4 mt-2"
                        onClick={() => {
                          setEditingAppointment(null)
                          setAppointmentForm({
                            title: "",
                            doctor_name: "",
                            hospital_name: "",
                            appointment_date: "",
                            appointment_time: "",
                            note: ""
                          })
                          setIsAppointmentModalOpen(true)
                        }}
                      >
                        เพิ่มนัดหมายแรกของคุณ
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appt: any) => {
                      const daysDiff = getDaysDiff(appt.appointment_date)
                      return (
                        <Card key={appt.id} className="rounded-[2rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 p-6 flex flex-col justify-between group relative overflow-hidden transition-all hover:shadow-md">
                          {daysDiff <= 7 && daysDiff >= 0 && (
                            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                              นัดหมายเร็วๆ นี้ ⚠️
                            </div>
                          )}
                          <div className="space-y-4">
                            <div>
                              <span className="text-[10px] font-extrabold tracking-widest text-blue-500 uppercase">นัดหมายพบแพทย์</span>
                              <h3 className="font-extrabold text-slate-800 text-base mt-0.5">{appt.title}</h3>
                            </div>

                            <div className="space-y-2 text-xs font-bold text-slate-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <span>
                                  {format(new Date(appt.appointment_date), "d MMMM yyyy", { locale: th })}
                                  {appt.appointment_time && ` เวลา ${appt.appointment_time.substring(0, 5)} น.`}
                                </span>
                              </div>
                              {appt.hospital_name && (
                                <div className="flex items-center gap-2">
                                  <Hospital size={14} className="text-slate-400" />
                                  <span>{appt.hospital_name}</span>
                                </div>
                              )}
                              {appt.doctor_name && (
                                <div className="flex items-center gap-2">
                                  <Stethoscope size={14} className="text-slate-400" />
                                  <span>{appt.doctor_name}</span>
                                </div>
                              )}
                              {appt.note && (
                                <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-500 italic mt-2 border border-slate-100">
                                  หมายเหตุ: {appt.note}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                            <button
                              type="button"
                              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold h-9 text-xs transition-all flex items-center justify-center gap-1 active:scale-[0.97]"
                              onClick={() => {
                                setEditingAppointment(appt)
                                setAppointmentForm({
                                  title: appt.title,
                                  doctor_name: appt.doctor_name || "",
                                  hospital_name: appt.hospital_name || "",
                                  appointment_date: appt.appointment_date ? format(new Date(appt.appointment_date), "yyyy-MM-dd") : "",
                                  appointment_time: appt.appointment_time || "",
                                  note: appt.note || ""
                                })
                                setIsAppointmentModalOpen(true)
                              }}
                            >
                              <Edit2 size={12} /> แก้ไข
                            </button>
                            <button
                              type="button"
                              className="flex-1 border border-rose-100 hover:bg-rose-50 text-rose-500 rounded-xl font-bold h-9 text-xs transition-all flex items-center justify-center gap-1 active:scale-[0.97]"
                              onClick={() => {
                                if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการนัดหมายแพทย์นี้?")) {
                                  deleteAppointmentMutation.mutate(appt.id)
                                }
                              }}
                            >
                              <Trash2 size={12} /> ลบ
                            </button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Private Vehicle Modal */}
      <Dialog open={isPrivateVehicleModalOpen} onOpenChange={setIsPrivateVehicleModalOpen}>
         <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <div className="bg-slate-900 p-8 text-white shrink-0">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                     {editingPrivateVehicle ? "แก้ไขข้อมูลรถยนต์ส่วนตัว" : "เพิ่มรถยนต์ส่วนตัวใหม่"}
                  </DialogTitle>
                  <p className="text-slate-400 mt-2">กรอกข้อมูลรถและวันที่หมดอายุเพื่อรับการแจ้งเตือนทางอีเมลล่วงหน้า</p>
               </DialogHeader>
            </div>

            <form onSubmit={handlePrivateVehicleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 bg-white custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">ประเภทรถ</Label>
                     <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className={cn(
                            "h-12 rounded-xl font-bold border transition-all text-sm flex items-center justify-center gap-2",
                            privateVehicleForm.type === "car" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                          )}
                          onClick={() => setPrivateVehicleForm(prev => ({ ...prev, type: "car" }))}
                        >
                           <Car size={16} /> รถยนต์
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "h-12 rounded-xl font-bold border transition-all text-sm flex items-center justify-center gap-2",
                            privateVehicleForm.type === "motorcycle" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                          )}
                          onClick={() => setPrivateVehicleForm(prev => ({ ...prev, type: "motorcycle" }))}
                        >
                           <Bike size={16} /> รถจักรยานยนต์
                        </button>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">เลขทะเบียนรถ</Label>
                     <Input 
                        placeholder="กข 1234 กทม."
                        className="h-12 rounded-xl border-slate-200 font-bold"
                        value={privateVehicleForm.license_plate}
                        onChange={e => setPrivateVehicleForm(prev => ({ ...prev, license_plate: e.target.value }))}
                        required
                     />
                  </div>

                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">รุ่นรถยนต์</Label>
                     <Input 
                        placeholder="เช่น Honda Civic, Yamaha XMAX"
                        className="h-12 rounded-xl border-slate-200 font-bold"
                        value={privateVehicleForm.model}
                        onChange={e => setPrivateVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                        required
                     />
                  </div>

                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">สีรถ</Label>
                     <Input 
                        placeholder="เช่น ดำ, ขาว, แดง"
                        className="h-12 rounded-xl border-slate-200 font-bold"
                        value={privateVehicleForm.color}
                        onChange={e => setPrivateVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                        required
                     />
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-6">ข้อมูลวันหมดอายุและการแนบเอกสาร</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Tax Section */}
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <Label className="text-xs font-black text-blue-500 uppercase tracking-widest block mb-2">ข้อมูลภาษีรถยนต์</Label>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">วันต่อภาษี</Label>
                           <Input 
                              type="date"
                              className="h-11 rounded-xl bg-white border-slate-200 font-bold"
                              value={privateVehicleForm.tax_renewal_date}
                              onChange={e => setPrivateVehicleForm(prev => ({ ...prev, tax_renewal_date: e.target.value }))}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">เอกสารภาษี</Label>
                           <div className="flex items-center gap-3">
                              <Input 
                                 type="file"
                                 id="tax-file-input"
                                 className="hidden"
                                 accept="image/*,.pdf"
                                 onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) handlePrivateVehicleUpload(file, "tax_file_url", setIsUploadingPrivateTax)
                                 }}
                              />
                              <Button
                                 type="button"
                                 variant="outline"
                                 className="w-full h-11 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 border-dashed border-2"
                                 disabled={isUploadingPrivateTax}
                                 onClick={() => document.getElementById("tax-file-input")?.click()}
                              >
                                 {isUploadingPrivateTax ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                 ) : privateVehicleForm.tax_file_url ? (
                                    <>
                                       <FileText size={16} className="text-emerald-500" /> อัปโหลดแล้ว (คลิกเปลี่ยน)
                                    </>
                                 ) : (
                                    <>
                                       <UploadCloud size={16} className="text-slate-400" /> เลือกไฟล์อัปโหลด
                                    </>
                                 )}
                              </Button>
                           </div>
                        </div>
                     </div>

                     {/* Insurance Section */}
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <Label className="text-xs font-black text-blue-500 uppercase tracking-widest block mb-2">ประกันภัยรถยนต์</Label>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">วันหมดอายุประกันภัย</Label>
                           <Input 
                              type="date"
                              className="h-11 rounded-xl bg-white border-slate-200 font-bold"
                              value={privateVehicleForm.insurance_expiry_date}
                              onChange={e => setPrivateVehicleForm(prev => ({ ...prev, insurance_expiry_date: e.target.value }))}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">เอกสารประกันภัย</Label>
                           <div className="flex items-center gap-3">
                              <Input 
                                 type="file"
                                 id="insurance-file-input"
                                 className="hidden"
                                 accept="image/*,.pdf"
                                 onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) handlePrivateVehicleUpload(file, "insurance_file_url", setIsUploadingPrivateInsurance)
                                 }}
                              />
                              <Button
                                 type="button"
                                 variant="outline"
                                 className="w-full h-11 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 border-dashed border-2"
                                 disabled={isUploadingPrivateInsurance}
                                 onClick={() => document.getElementById("insurance-file-input")?.click()}
                              >
                                 {isUploadingPrivateInsurance ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                 ) : privateVehicleForm.insurance_file_url ? (
                                    <>
                                       <FileText size={16} className="text-emerald-500" /> อัปโหลดแล้ว (คลิกเปลี่ยน)
                                    </>
                                 ) : (
                                    <>
                                       <UploadCloud size={16} className="text-slate-400" /> เลือกไฟล์อัปโหลด
                                    </>
                                 )}
                              </Button>
                           </div>
                        </div>
                     </div>

                     {/* CTP Section */}
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <Label className="text-xs font-black text-blue-500 uppercase tracking-widest block mb-2">พ.ร.บ. รถยนต์</Label>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">วันหมดอายุ พ.ร.บ.</Label>
                           <Input 
                              type="date"
                              className="h-11 rounded-xl bg-white border-slate-200 font-bold"
                              value={privateVehicleForm.ctp_expiry_date}
                              onChange={e => setPrivateVehicleForm(prev => ({ ...prev, ctp_expiry_date: e.target.value }))}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">เอกสาร พ.ร.บ.</Label>
                           <div className="flex items-center gap-3">
                              <Input 
                                 type="file"
                                 id="ctp-file-input"
                                 className="hidden"
                                 accept="image/*,.pdf"
                                 onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) handlePrivateVehicleUpload(file, "ctp_file_url", setIsUploadingPrivateCtp)
                                 }}
                              />
                              <Button
                                 type="button"
                                 variant="outline"
                                 className="w-full h-11 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 border-dashed border-2"
                                 disabled={isUploadingPrivateCtp}
                                 onClick={() => document.getElementById("ctp-file-input")?.click()}
                              >
                                 {isUploadingPrivateCtp ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                 ) : privateVehicleForm.ctp_file_url ? (
                                    <>
                                       <FileText size={16} className="text-emerald-500" /> อัปโหลดแล้ว (คลิกเปลี่ยน)
                                    </>
                                 ) : (
                                    <>
                                       <UploadCloud size={16} className="text-slate-400" /> เลือกไฟล์อัปโหลด
                                    </>
                                 )}
                              </Button>
                           </div>
                        </div>
                     </div>

                     {/* Oil Change & Other Documents Section */}
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <Label className="text-xs font-black text-blue-500 uppercase tracking-widest block mb-2">การดูแลรักษาและเอกสารอื่นๆ</Label>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">วันเปลี่ยนถ่ายน้ำมันเครื่องล่าสุด/ถัดไป</Label>
                           <Input 
                              type="date"
                              className="h-11 rounded-xl bg-white border-slate-200 font-bold"
                              value={privateVehicleForm.oil_change_date}
                              onChange={e => setPrivateVehicleForm(prev => ({ ...prev, oil_change_date: e.target.value }))}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold text-slate-600">เอกสารอื่นๆ</Label>
                           <div className="flex items-center gap-3">
                              <Input 
                                 type="file"
                                 id="other-file-input"
                                 className="hidden"
                                 accept="image/*,.pdf"
                                 onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) handlePrivateVehicleUpload(file, "other_file_url", setIsUploadingPrivateOther)
                                 }}
                              />
                              <Button
                                 type="button"
                                 variant="outline"
                                 className="w-full h-11 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 border-dashed border-2"
                                 disabled={isUploadingPrivateOther}
                                 onClick={() => document.getElementById("other-file-input")?.click()}
                              >
                                 {isUploadingPrivateOther ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                 ) : privateVehicleForm.other_file_url ? (
                                    <>
                                       <FileText size={16} className="text-emerald-500" /> อัปโหลดแล้ว (คลิกเปลี่ยน)
                                    </>
                                 ) : (
                                    <>
                                       <UploadCloud size={16} className="text-slate-400" /> เลือกไฟล์อัปโหลด
                                    </>
                                 )}
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 shrink-0">
                  <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold text-slate-400 hover:bg-slate-50" onClick={() => setIsPrivateVehicleModalOpen(false)}>
                     ยกเลิก
                  </Button>
                  <Button 
                     type="submit" 
                     className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-600/10"
                     disabled={createPrivateVehicleMutation.isPending || updatePrivateVehicleMutation.isPending}
                  >
                     {createPrivateVehicleMutation.isPending || updatePrivateVehicleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                        "บันทึกข้อมูล"
                     )}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>

      {/* Doctor Appointment Modal */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
         <DialogContent className="max-w-xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <div className="bg-slate-900 p-8 text-white shrink-0">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                     {editingAppointment ? "แก้ไขข้อมูลนัดหมายแพทย์" : "เพิ่มข้อมูลนัดหมายแพทย์ใหม่"}
                  </DialogTitle>
                  <p className="text-slate-400 mt-2">กรอกข้อมูลการนัดหมายเพื่อส่งอีเมลและแจ้งเตือนคุณล่วงหน้า 1 สัปดาห์ และ 1 วัน</p>
               </DialogHeader>
            </div>

            <form onSubmit={handleAppointmentSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 bg-white custom-scrollbar">
               <div className="space-y-4">
                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">หัวข้อนัดหมาย</Label>
                     <Input 
                        placeholder="เช่น พบทันตแพทย์, ตรวจเบาหวานตามรอบ..."
                        className="h-12 rounded-xl border-slate-200 font-bold"
                        value={appointmentForm.title}
                        onChange={e => setAppointmentForm(prev => ({ ...prev, title: e.target.value }))}
                        required
                     />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">แพทย์ผู้รักษา / แพทย์เจ้าของไข้</Label>
                        <Input 
                           placeholder="ระบุชื่อแพทย์ (ถ้ามี)..."
                           className="h-12 rounded-xl border-slate-200 font-bold"
                           value={appointmentForm.doctor_name}
                           onChange={e => setAppointmentForm(prev => ({ ...prev, doctor_name: e.target.value }))}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">โรงพยาบาล / คลินิก</Label>
                        <Input 
                           placeholder="ระบุชื่อสถานที่พบแพทย์..."
                           className="h-12 rounded-xl border-slate-200 font-bold"
                           value={appointmentForm.hospital_name}
                           onChange={e => setAppointmentForm(prev => ({ ...prev, hospital_name: e.target.value }))}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">วันนัดหมาย</Label>
                        <Input 
                           type="date"
                           className="h-12 rounded-xl border-slate-200 font-bold"
                           value={appointmentForm.appointment_date}
                           onChange={e => setAppointmentForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">เวลานัดหมาย (ถ้ามี)</Label>
                        <Input 
                           type="time"
                           className="h-12 rounded-xl border-slate-200 font-bold"
                           value={appointmentForm.appointment_time}
                           onChange={e => setAppointmentForm(prev => ({ ...prev, appointment_time: e.target.value }))}
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">บันทึกเพิ่มเติม (หมายเหตุ)</Label>
                     <textarea 
                        placeholder="เตรียมประวัติ, งดอาหาร/น้ำล่วงหน้า 8 ชั่วโมง หรือรายละเอียดการพบแพทย์..."
                        className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                        value={appointmentForm.note}
                        onChange={e => setAppointmentForm(prev => ({ ...prev, note: e.target.value }))}
                     />
                  </div>
               </div>

               <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 shrink-0">
                  <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold text-slate-400 hover:bg-slate-50" onClick={() => setIsAppointmentModalOpen(false)}>
                     ยกเลิก
                  </Button>
                  <Button 
                     type="submit" 
                     className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-600/10"
                     disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
                  >
                     {createAppointmentMutation.isPending || updateAppointmentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                        "บันทึกการนัดหมาย"
                     )}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
    </div>
  )
}
