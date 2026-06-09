"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toast } from "sonner"
import { 
  Plus, 
  Wallet, 
  Clock, 
  FileText,
  Loader2,
  Trash2,
  Receipt,
  CalendarDays,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/useUser"

export default function ReimbursementsPage() {
  const queryClient = useQueryClient()
  const { profile, isLoading: isUserLoading } = useUser()
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Wizard State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState("")
  const [aiAnalyzed, setAiAnalyzed] = useState(false)

  // Form State
  const [amount, setAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [description, setDescription] = useState("")
  const [vendor, setVendor] = useState("")
  const [category, setCategory] = useState("")
  const [purpose, setPurpose] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  // Fetch User's Reimbursements
  const { data, isLoading } = useQuery({
    queryKey: ["my-reimbursements", statusFilter],
    queryFn: async () => {
      const url = new URL("/api/reimbursements", window.location.origin)
      if (statusFilter !== "all") url.searchParams.append("status", statusFilter)
      const res = await fetch(url.toString())
      return res.json()
    }
  })

  // Mutation to Create Reimbursement
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/reimbursements", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to submit")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reimbursements"] })
      setIsCreateModalOpen(false)
      resetForm()
      toast.success("ยื่นคำขอเบิกเงินเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  // Mutation to Delete Reimbursement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reimbursements/${id}`, { method: "DELETE" })
      if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "ยกเลิกไม่สำเร็จ")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reimbursements"] })
      toast.success("ยกเลิกคำขอเรียบร้อยแล้ว")
    },
    onError: (err: any) => {
        toast.error(err.message)
    }
  })

  const resetForm = () => {
    setAmount("")
    setExpenseDate("")
    setDescription("")
    setVendor("")
    setCategory("")
    setPurpose("")
    setAttachment(null)
    setPreviewUrl("")
    setCurrentStep(1)
    setIsScanning(false)
    setScanStatus("")
    setAiAnalyzed(false)
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "receipts")
    formData.append("bucket", "receipts")

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "อัปโหลดไม่สำเร็จ")
    }

    const data = await res.json()
    return data.url
  }

  // AI Analyze Handler
  const handleAIAnalyze = async (file: File) => {
    setIsScanning(true)
    setScanStatus("กำลังอัปโหลดและเชื่อมต่อระบบ AI...")
    setAttachment(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    }

    try {
      const formData = new FormData()
      formData.append("file", file)

      const timer1 = setTimeout(() => setScanStatus("กำลังวิเคราะห์ความคมชัดและประเภทเอกสารด้วย AI..."), 800)
      const timer2 = setTimeout(() => setScanStatus("กำลังประมวลผลข้อความและยอดรวมรายการ..."), 1600)

      const res = await fetch("/api/reimbursements/analyze", {
        method: "POST",
        body: formData
      })

      clearTimeout(timer1)
      clearTimeout(timer2)

      if (!res.ok) throw new Error("AI analysis failed")
      const data = await res.json()

      // Auto-fill form
      setAmount(String(data.amount || ""))
      setExpenseDate(data.expense_date || "")
      setDescription(data.description || "")
      setVendor(data.vendor || "")
      setCategory(data.category || "")
      setPurpose(data.purpose || "")
      setAiAnalyzed(true)

      setIsScanning(false)
      setCurrentStep(2) // Go to review step
    } catch (err) {
      console.error(err)
      setIsScanning(false)
      toast.error("ไม่สามารถวิเคราะห์ใบเสร็จด้วย AI ได้ ระบบจะเปลี่ยนเป็นโหมดกรอกข้อมูลด้วยตนเอง")
      setCurrentStep(2) // Go to manual input
    }
  }

  const handleSubmit = async () => {
    try {
      setIsUploading(true)
      let url = null
      if (attachment) {
        url = await handleFileUpload(attachment)
      }
      createMutation.mutate({ 
        amount: Number(amount), 
        expense_date: expenseDate,
        description: purpose ? `${description} — ${purpose}` : description,
        receipt_url: url
      })
    } catch {
      toast.error("การอัปโหลดไฟล์ล้มเหลว")
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">รอผู้จัดการฝ่ายอบรม</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">รอฝ่ายบัญชีโอนเงิน</Badge>
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">โอนเงินแล้ว</Badge>
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">ปฏิเสธ</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'ceo'

  if (isUserLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
  }

  if (profile && profile.role !== 'outsource' && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-700">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-slate-800">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-slate-500">หน้านี้สงวนไว้สำหรับพนักงาน Outsource, Admin หรือ CEO เท่านั้น</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-500 text-white rounded-3xl shadow-xl shadow-blue-500/20">
            <Wallet size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ระบบเบิกค่าใช้จ่าย</h1>
            <p className="text-slate-400 font-medium mt-0.5">{isAdmin ? 'ดูรายการเบิกค่าใช้จ่ายของพนักงานทั้งหมด' : 'เบิกค่าเดินทาง, ค่าอาหาร, หรือค่าใช้จ่ายสำรองจ่าย (Petty Cash)'}</p>
          </div>
        </div>

        {!isAdmin && (
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            setIsCreateModalOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <Plus className="mr-2 w-5 h-5" /> สร้างคำขอเบิกเงิน
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
              {/* Modal Header & Progress */}
              <div className="bg-slate-900 p-6 md:p-8 text-white shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <DialogTitle className="text-2xl font-black flex items-center gap-3">
                    <Receipt size={24} /> สร้างใบเบิกเงินใหม่
                  </DialogTitle>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(step => (
                      <div key={step} className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        currentStep >= step ? "bg-blue-500 w-8" : "bg-white/10 w-4"
                      )} />
                    ))}
                  </div>
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  {currentStep === 1 && "ขั้นตอนที่ 1 — อัปโหลดใบเสร็จ/ถ่ายภาพ"}
                  {currentStep === 2 && "ขั้นตอนที่ 2 — ตรวจสอบข้อมูล"}
                  {currentStep === 3 && "ขั้นตอนที่ 3 — ยืนยันและส่งคำขอ"}
                </p>
              </div>

              <div className="p-6 md:p-10 bg-white flex-1 overflow-y-auto">
                {/* ========= STEP 1: Upload ========= */}
                {currentStep === 1 && (
                  isScanning ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                      {/* Laser scan beam */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" style={{ top: '30%', animation: 'scan 2s infinite ease-in-out' }} />
                      <style jsx global>{`
                        @keyframes scan {
                          0% { top: 10%; }
                          50% { top: 90%; }
                          100% { top: 10%; }
                        }
                      `}</style>
                      <div className="relative z-10 space-y-6 flex flex-col items-center">
                        <div className="relative">
                          <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-600/40 animate-bounce">
                            <Receipt size={48} className="text-white" />
                          </div>
                          <div className="absolute -inset-2 rounded-[3rem] border-4 border-dashed border-blue-500/50 animate-spin" style={{ animationDuration: '10s' }} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight">AI กำลังวิเคราะห์ใบเสร็จ</h3>
                          <p className="text-blue-400 font-bold mt-2 animate-pulse">{scanStatus}</p>
                        </div>
                        <div className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full backdrop-blur-sm">
                          <Loader2 className="animate-spin text-blue-400" size={16} />
                          <span className="text-xs font-bold text-slate-300">กรุณารอสักครู่...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-[2.5rem] p-8 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                          <Sparkles size={20} />
                          <h2 className="text-xl font-black text-slate-900">อัปโหลดใบเสร็จเพื่อใช้ AI ช่วยกรอกข้อมูล</h2>
                        </div>
                        <p className="text-slate-500 font-medium text-sm">ระบบรองรับไฟล์ PDF, JPEG, PNG หรือถ่ายรูปจากกล้องมือถือได้ทันที</p>
                      </div>
                      <div 
                        className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 text-center hover:border-blue-200 hover:bg-blue-50/30 transition-all group cursor-pointer relative min-h-[250px] flex flex-col items-center justify-center"
                        onClick={() => document.getElementById('reimb-receipt-upload')?.click()}
                      >
                        <input 
                          id="reimb-receipt-upload" 
                          type="file" 
                          accept="image/*,application/pdf"
                          capture="environment"
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) {
                              handleAIAnalyze(file)
                            }
                          }} 
                        />
                        <div className="flex flex-col items-center">
                          <div className="p-6 bg-slate-100 text-slate-400 rounded-[2rem] mb-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                            <UploadCloud size={48} />
                          </div>
                          <h3 className="text-lg font-black text-slate-900">คลิกที่นี่เพื่อเลือกไฟล์ หรือ ถ่ายภาพ</h3>
                          <p className="text-slate-400 text-sm mt-1">หากเข้าใช้งานผ่านมือถือจะเปิดกล้องออโต้</p>
                        </div>
                      </div>
                      <div className="text-center pt-4">
                        <Button variant="outline" className="rounded-2xl h-14 px-8 font-bold text-slate-600 border-slate-200 w-full hover:bg-slate-50" onClick={() => setCurrentStep(2)}>
                          หรือกรอกข้อมูลด้วยตนเองแบบแมนนวล (Manual)
                        </Button>
                      </div>
                    </div>
                  )
                )}

                {/* ========= STEP 2: Review / Edit ========= */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    {aiAnalyzed && (
                      <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-500 rounded-2xl text-white">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-blue-500 uppercase tracking-wider">วิเคราะห์ด้วยระบบ AI สำเร็จ</div>
                            <div className="text-sm font-bold text-slate-700">ข้อมูลด้านล่างถูกกรอกอัตโนมัติ — กรุณาตรวจสอบความถูกต้อง</div>
                          </div>
                        </div>
                        <Badge className="bg-blue-500 text-white font-bold px-3 py-1">AI</Badge>
                      </div>
                    )}

                    {previewUrl && (
                      <div className="rounded-3xl overflow-hidden border border-slate-100 max-h-[200px]">
                        <img src={previewUrl} alt="ใบเสร็จ" className="w-full h-full object-contain bg-slate-50" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold text-lg" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันที่เกิดค่าใช้จ่าย</Label>
                        <Input 
                          type="date" 
                          className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ร้านค้า / ผู้ให้บริการ</Label>
                      <Input 
                        placeholder="เช่น บริษัท ออฟฟิศเมท จำกัด"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทค่าใช้จ่าย</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold">
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ค่าเดินทาง">ค่าเดินทาง</SelectItem>
                          <SelectItem value="ค่าอาหาร/รับรองลูกค้า">ค่าอาหาร/รับรองลูกค้า</SelectItem>
                          <SelectItem value="อุปกรณ์สำนักงาน">อุปกรณ์สำนักงาน</SelectItem>
                          <SelectItem value="ค่าซ่อมบำรุง">ค่าซ่อมบำรุง</SelectItem>
                          <SelectItem value="ค่าอินเทอร์เน็ต/โทรศัพท์">ค่าอินเทอร์เน็ต/โทรศัพท์</SelectItem>
                          <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียด/เหตุผลการเบิก</Label>
                      <Textarea 
                        placeholder="เช่น ค่าเดินทางไปพบลูกค้าบริษัท ABC..."
                        className="rounded-2xl min-h-[80px] border-slate-100 bg-slate-50/50 focus:ring-blue-500/20 p-4"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">จุดประสงค์ในการเบิกจ่าย</Label>
                      <Input 
                        placeholder="ระบุวัตถุประสงค์ในการเบิกจ่าย..."
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </div>

                    {!attachment && (
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <FileText size={14} className="text-amber-500" /> แนบสลิป/ใบเสร็จรับเงิน (ถ้ามี)
                        </Label>
                        <Input 
                          type="file" 
                          accept="image/*,.pdf"
                          className="rounded-2xl h-12 border-slate-100 bg-blue-50/30 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            setAttachment(file)
                            if (file && file.type.startsWith('image/')) {
                              setPreviewUrl(URL.createObjectURL(file))
                            }
                          }}
                        />
                      </div>
                    )}

                    <div className="flex justify-between gap-3 pt-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => { resetForm(); }}
                        className="rounded-2xl h-14 font-bold text-slate-400 hover:text-slate-600"
                      >
                        <ArrowLeft className="mr-2 w-4 h-4" /> กลับ
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep(3)}
                        disabled={!amount || !expenseDate || !description}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-8 font-black shadow-lg shadow-blue-600/20"
                      >
                        ตรวจสอบก่อนส่ง →
                      </Button>
                    </div>
                  </div>
                )}

                {/* ========= STEP 3: Confirm & Submit ========= */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 space-y-1">
                      <h3 className="text-lg font-black text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        ตรวจสอบข้อมูลก่อนยืนยัน
                      </h3>
                      <p className="text-sm text-emerald-600 font-medium">กรุณาตรวจสอบความถูกต้องของข้อมูลด้านล่างก่อนส่งคำขอ</p>
                    </div>

                    {previewUrl && (
                      <div className="rounded-3xl overflow-hidden border border-slate-100 max-h-[150px]">
                        <img src={previewUrl} alt="ใบเสร็จ" className="w-full h-full object-contain bg-slate-50" />
                      </div>
                    )}

                    <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50">
                      <div className="flex justify-between items-center p-5">
                        <span className="text-sm text-slate-400 font-bold">จำนวนเงิน</span>
                        <span className="text-2xl font-black text-blue-600">฿{Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center p-5">
                        <span className="text-sm text-slate-400 font-bold">วันที่ค่าใช้จ่าย</span>
                        <span className="font-bold text-slate-900">{expenseDate ? format(new Date(expenseDate), "d MMMM yyyy", { locale: th }) : '-'}</span>
                      </div>
                      {vendor && (
                        <div className="flex justify-between items-center p-5">
                          <span className="text-sm text-slate-400 font-bold">ร้านค้า/ผู้ให้บริการ</span>
                          <span className="font-bold text-slate-900">{vendor}</span>
                        </div>
                      )}
                      {category && (
                        <div className="flex justify-between items-center p-5">
                          <span className="text-sm text-slate-400 font-bold">ประเภท</span>
                          <Badge className="bg-slate-100 text-slate-700 font-bold">{category}</Badge>
                        </div>
                      )}
                      <div className="p-5">
                        <span className="text-sm text-slate-400 font-bold">รายละเอียด</span>
                        <p className="mt-1 text-slate-900 font-medium">{description}</p>
                      </div>
                      {purpose && (
                        <div className="p-5">
                          <span className="text-sm text-slate-400 font-bold">จุดประสงค์</span>
                          <p className="mt-1 text-slate-900 font-medium">{purpose}</p>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-5">
                        <span className="text-sm text-slate-400 font-bold">ใบเสร็จ</span>
                        <span className="font-bold text-slate-900">{attachment ? `✅ ${attachment.name}` : '❌ ไม่มี'}</span>
                      </div>
                    </div>

                    {aiAnalyzed && (
                      <div className="flex items-center gap-2 text-xs text-blue-500 font-bold px-2">
                        <Sparkles size={14} />
                        <span>ข้อมูลนี้ถูกกรอกอัตโนมัติโดยระบบ AI — กรุณาตรวจสอบก่อนยืนยัน</span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 pt-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => setCurrentStep(2)}
                        className="rounded-2xl h-14 font-bold text-slate-400 hover:text-slate-600"
                      >
                        <ArrowLeft className="mr-2 w-4 h-4" /> แก้ไขข้อมูล
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || isUploading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 px-8 font-black shadow-lg shadow-emerald-600/20"
                      >
                        {(createMutation.isPending || isUploading) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        ✅ ยืนยันส่งคำขอเบิกเงิน
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters & Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3 font-black text-slate-900 uppercase tracking-widest text-sm">
            <Wallet size={18} className="text-slate-400" /> {isAdmin ? 'รายการเบิกเงินทั้งหมด' : 'ประวัติการเบิกเงินของคุณ'}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="pending">รอผู้จัดการฝ่ายอบรม</SelectItem>
              <SelectItem value="approved">รอโอนเงิน</SelectItem>
              <SelectItem value="paid">โอนเงินแล้ว</SelectItem>
              <SelectItem value="rejected">ปฏิเสธ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
            <Loader2 className="w-12 h-12 animate-spin text-blue-200" />
            <p className="text-slate-400 font-bold">กำลังรวบรวมข้อมูล...</p>
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="p-8 bg-white rounded-full shadow-sm text-slate-200">
               <Receipt size={64} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">ไม่พบรายการเบิกเงิน</h3>
              <p className="text-slate-400 font-medium">คุณยังไม่มีประวัติการเบิกค่าใช้จ่ายในช่วงเวลาที่เลือก</p>
            </div>
            {!isAdmin && (
              <Button 
                variant="outline" 
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => setIsCreateModalOpen(true)}
              >
                เริ่มสร้างคำขอเบิกเงิน
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.data.map((reimb: any) => (
              <Card key={reimb.id} className="group overflow-hidden rounded-3xl border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch">
                    <div className={cn(
                      "w-full md:w-2",
                      reimb.status === 'pending' ? "bg-amber-400" :
                      reimb.status === 'approved' ? "bg-blue-500" :
                      reimb.status === 'paid' ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                    
                    <div className="flex-1 p-6 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-xl text-slate-900 tracking-tight text-blue-600">
                            ฿{Number(reimb.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </h3>
                          {getStatusBadge(reimb.status)}
                        </div>
                        {isAdmin && reimb.user && (
                          <p className="text-slate-800 font-bold text-sm">ผู้ขอ: {reimb.user.full_name}</p>
                        )}
                        <p className="text-slate-600 font-medium text-sm">"{reimb.description}"</p>
                        <div className="flex items-center gap-4 text-slate-400 font-medium text-xs mt-2">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-slate-300" />
                            วันที่ใช้จ่าย: {format(new Date(reimb.expense_date), "d MMM yyyy", { locale: th })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-300" />
                            สร้างเมื่อ: {format(new Date(reimb.created_at), "d MMM yyyy", { locale: th })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isAdmin && reimb.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => {
                              if (confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอนี้?")) {
                                deleteMutation.mutate(reimb.id)
                              }
                            }}
                          >
                            <Trash2 size={20} />
                          </Button>
                        )}
                        {reimb.receipt_url && (
                          <a href={reimb.receipt_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 gap-2 font-bold">
                               <FileText size={16} /> ดูใบเสร็จ
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
