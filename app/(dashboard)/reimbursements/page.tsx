"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Plus, 
  Wallet, 
  Clock, 
  FileText,
  Loader2,
  Trash2,
  Receipt,
  CalendarDays,
  ArrowLeft
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function ReimbursementsPage() {
  const queryClient = useQueryClient()
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Form State
  const [amount, setAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [description, setDescription] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
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
      setIsNewClaimOpen(false)
      resetForm()
      alert("ยื่นคำขอเบิกเงินเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      alert(err.message)
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
      alert("ยกเลิกคำขอเรียบร้อยแล้ว")
    },
    onError: (err: any) => {
        alert(err.message)
    }
  })

  const resetForm = () => {
    setAmount("")
    setExpenseDate("")
    setDescription("")
    setAttachment(null)
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "receipts")

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">รออนุมัติ</Badge>
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">อนุมัติแล้ว (เตรียมโอน)</Badge>
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">ปฏิเสธ</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-12">
      {isNewClaimOpen ? (
        /* ===== IN-PAGE FORM (แทนที่ Dialog modal) ===== */
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <Button 
            variant="ghost" 
            onClick={() => { setIsNewClaimOpen(false); resetForm(); }} 
            className="mb-4 rounded-xl text-slate-500 hover:text-slate-700 font-bold"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> กลับไปรายการ
          </Button>
          <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden">
            <div className="bg-blue-600 p-8 text-white">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <Receipt size={28} /> แบบฟอร์มเบิกเงิน
              </h2>
              <p className="text-blue-100 opacity-80 mt-1">กรอกรายละเอียดค่าใช้จ่ายที่คุณได้สำรองจ่ายไปก่อน</p>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    className="rounded-2xl h-12 border-slate-100 bg-slate-50/50" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันที่เกิดค่าใช้จ่าย</Label>
                  <Input 
                    type="date" 
                    className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียด/เหตุผลการเบิก</Label>
                <Textarea 
                  placeholder="เช่น ค่าเดินทางไปพบลูกค้าบริษัท ABC..."
                  className="rounded-2xl min-h-[100px] border-slate-100 bg-slate-50/50 focus:ring-blue-500/20 p-4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FileText size={14} className="text-amber-500" /> แนบสลิป/ใบเสร็จรับเงิน (ถ้ามี)
                </Label>
                <Input 
                  type="file" 
                  accept="image/*,.pdf"
                  className="rounded-2xl h-12 border-slate-100 bg-blue-50/30 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => { setIsNewClaimOpen(false); resetForm(); }}
                  className="rounded-2xl h-14 font-bold text-slate-400 hover:text-slate-600"
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      setIsUploading(true)
                      let url = null
                      if (attachment) {
                        url = await handleFileUpload(attachment)
                      }
                      createMutation.mutate({ 
                        amount: Number(amount), 
                        expense_date: expenseDate,
                        description,
                        receipt_url: url
                      })
                    } catch {
                      alert("การอัปโหลดไฟล์ล้มเหลว")
                    } finally {
                      setIsUploading(false)
                    }
                  }}
                  disabled={!amount || !expenseDate || !description || createMutation.isPending || isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-8 font-black shadow-lg shadow-blue-600/20"
                >
                  {(createMutation.isPending || isUploading) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  บันทึกคำขอ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===== NORMAL PAGE CONTENT ===== */
        <>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-500 text-white rounded-3xl shadow-xl shadow-blue-500/20">
                <Wallet size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">ระบบเบิกค่าใช้จ่าย</h1>
                <p className="text-slate-400 font-medium mt-0.5">เบิกค่าเดินทาง, ค่าอาหาร, หรือค่าใช้จ่ายสำรองจ่าย (Petty Cash)</p>
              </div>
            </div>

            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              onClick={() => setIsNewClaimOpen(true)}
            >
              <Plus className="mr-2 w-5 h-5" /> สร้างคำขอเบิกเงิน
            </Button>
          </div>

          {/* Filters & Content */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3 font-black text-slate-900 uppercase tracking-widest text-sm">
                <Wallet size={18} className="text-slate-400" /> ประวัติการเบิกเงินของคุณ
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="ทุกสถานะ" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="pending">รออนุมัติ</SelectItem>
                  <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
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
                <Button 
                   variant="outline" 
                   className="rounded-xl border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                   onClick={() => setIsNewClaimOpen(true)}
                >
                   เริ่มสร้างคำขอเบิกเงิน
                </Button>
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
                          reimb.status === 'approved' ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        
                        <div className="flex-1 p-6 flex flex-col md:flex-row items-center gap-6">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-xl text-slate-900 tracking-tight text-blue-600">
                                ฿{Number(reimb.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </h3>
                              {getStatusBadge(reimb.status)}
                            </div>
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
                            {reimb.status === 'pending' && (
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
        </>
      )}
    </div>
  )
}
