"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { 
  Plus, 
  ShoppingBag, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  Trash2,
  FileText,
  UploadCloud,
  ChevronRight,
  Package,
  Wallet,
  Eye,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Search,
  ChevronDown,
  Printer
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export default function PurchasesPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  // --- States ---
  const [activeTab, setActiveTab] = useState("my-purchases")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // --- Form State ---
  const [purchaseForm, setPurchaseForm] = useState({
    title: "",
    category: "ค่าเดินทาง",
    purpose: "",
    items: [{ name: "", quantity: 1, unit_price: 0 }],
    file: null as File | null,
    receipt_url: "",
    payment_method: "petty_cash"
  })

  // --- Queries ---
  const { data: myPurchases, isLoading: isMyLoading } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases")
      return res.json()
    },
    enabled: !!session?.user
  })

  const { data: pendingPurchases, isLoading: isPendingLoading } = useQuery({
    queryKey: ["pending-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/pending")
      return res.json()
    },
    enabled: !!session?.user && (userRole !== 'employee')
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      // 1. Create Request
      const res = await fetch("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title,
          category: payload.category,
          purpose: payload.purpose,
          items: payload.items,
          payment_method: payload.payment_method
        }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error("Failed to create request")
      const purchase = await res.json()

      // 2. Upload Receipt if exists
      if (payload.file) {
        const formData = new FormData()
        formData.append("file", payload.file)
        const uploadRes = await fetch(`/api/purchases/${purchase.id}/upload-receipt`, {
          method: "POST",
          body: formData
        })
        if (!uploadRes.ok) throw new Error("Failed to upload receipt")
      }

      return purchase
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      setIsCreateModalOpen(false)
      resetForm()
      alert("ยื่นคำขอเบิกเงินเรียบร้อยแล้ว!")
    }
  })

  const approveMutation = useMutation({
    mutationFn: async ({ id, action, note, stage }: any) => {
      const res = await fetch(`/api/purchases/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ action, note, stage }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error("Action failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      alert("ดำเนินการเรียบร้อยแล้ว")
    }
  })

  // --- Helpers ---
  const resetForm = () => {
    setPurchaseForm({
      title: "",
      purpose: "",
      items: [{ name: "", quantity: 1, unit_price: 0 }],
      file: null,
      receipt_url: "",
      payment_method: "petty_cash"
    })
    setCurrentStep(1)
  }

  const totalAmount = useMemo(() => {
    return purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }, [purchaseForm.items])

  const addItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, { name: "", quantity: 1, unit_price: 0 }]
    })
  }

  const removeItem = (index: number) => {
    const newItems = [...purchaseForm.items]
    newItems.splice(index, 1)
    setPurchaseForm({ ...purchaseForm, items: newItems })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...purchaseForm.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setPurchaseForm({ ...purchaseForm, items: newItems })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-600 border-amber-200">รออนุมัติ</Badge>
      case 'supervisor_approved': return <Badge className="bg-blue-100 text-blue-600 border-blue-200">หัวหน้าอนุมัติแล้ว</Badge>
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200">อนุมัติแล้ว</Badge>
      case 'rejected': return <Badge className="bg-rose-100 text-rose-600 border-rose-200">ปฏิเสธ</Badge>
      case 'paid': return <Badge className="bg-slate-900 text-white border-0">จ่ายเงินแล้ว</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'credit_card': return 'ตัดบัตรเครดิต'
      case 'petty_cash': return 'เงินสดย่อย'
      case 'k_biz': return 'K BIZ (โอน)'
      default: return method
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[100px] rounded-full" />
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
               <div className="p-5 bg-blue-600 rounded-[2rem] shadow-lg shadow-blue-600/20">
                  <Wallet size={48} />
               </div>
               <div>
                  <h1 className="text-4xl font-black tracking-tight">ระบบเบิกจ่ายค่าใช้จ่าย</h1>
                  <p className="text-slate-400 font-medium mt-2">จัดการคำขอเบิกเงินและติดตามสถานะการจ่ายเงิน</p>
               </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
              setIsCreateModalOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl px-8 h-16 font-black text-lg shadow-xl transition-all active:scale-95">
                  <Plus className="mr-2 w-6 h-6" /> สร้างใบเบิกเงิน
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                 {/* Modal Header & Progress */}
                 <div className="bg-slate-900 p-8 text-white shrink-0">
                    <div className="flex items-center justify-between mb-6">
                       <DialogTitle className="text-2xl font-black">สร้างใบเบิกเงินใหม่</DialogTitle>
                       <div className="flex gap-2">
                          {[1, 2, 3, 4].map(step => (
                            <div key={step} className={cn(
                              "h-1.5 rounded-full transition-all duration-500",
                              currentStep >= step ? "bg-blue-500 w-8" : "bg-white/10 w-4"
                            )} />
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="p-10 bg-white flex-1 overflow-y-auto custom-scrollbar">
                    {currentStep === 1 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อรายการเบิก</Label>
                            <Input 
                               placeholder="เช่น ค่าเดินทางไปพบลูกค้า, ค่าวัสดุอุปกรณ์..."
                               className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                               value={purchaseForm.title}
                               onChange={(e) => setPurchaseForm({...purchaseForm, title: e.target.value})}
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการเบิก</Label>
                            <Select 
                              value={purchaseForm.category} 
                              onValueChange={(val) => setPurchaseForm({...purchaseForm, category: val})}
                            >
                               <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold">
                                  <SelectValue placeholder="เลือกประเภทการเบิก" />
                               </SelectTrigger>
                               <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                  <SelectItem value="ค่าเดินทาง" className="font-bold py-3">ค่าเดินทาง (Travel)</SelectItem>
                                  <SelectItem value="ค่าอาหาร/รับรองลูกค้า" className="font-bold py-3">ค่าอาหาร/รับรองลูกค้า (Meals & ENT)</SelectItem>
                                  <SelectItem value="อุปกรณ์สำนักงาน" className="font-bold py-3">อุปกรณ์สำนักงาน (Office Supplies)</SelectItem>
                                  <SelectItem value="ค่าซ่อมบำรุง" className="font-bold py-3">ค่าซ่อมบำรุง (Maintenance)</SelectItem>
                                  <SelectItem value="ค่าอินเทอร์เน็ต/โทรศัพท์" className="font-bold py-3">ค่าอินเทอร์เน็ต/โทรศัพท์ (Utilities)</SelectItem>
                                  <SelectItem value="อื่นๆ" className="font-bold py-3">อื่นๆ (Other)</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วิธีการจ่ายเงิน</Label>
                            <Select 
                              value={purchaseForm.payment_method} 
                              onValueChange={(val) => setPurchaseForm({...purchaseForm, payment_method: val})}
                            >
                               <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold">
                                  <SelectValue placeholder="เลือกวิธีการจ่ายเงิน" />
                               </SelectTrigger>
                               <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                  <SelectItem value="petty_cash" className="font-bold py-3">เงินสดย่อย (Petty Cash)</SelectItem>
                                  <SelectItem value="credit_card" className="font-bold py-3">ตัดบัตรเครดิต (Credit Card)</SelectItem>
                                  <SelectItem value="k_biz" className="font-bold py-3">K BIZ (โอนเงินเกิน 2,000 บาท)</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">จุดประสงค์ / รายละเอียดเพิ่มเติม</Label>
                            <Textarea 
                               placeholder="ระบุวัตถุประสงค์ในการเบิกจ่าย..."
                               className="min-h-[120px] rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 p-4 font-medium"
                               value={purchaseForm.purpose}
                               onChange={(e) => setPurchaseForm({...purchaseForm, purpose: e.target.value})}
                            />
                         </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                         <div className="flex items-center justify-between">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการสินค้า/บริการ</Label>
                            <Button variant="ghost" size="sm" onClick={addItem} className="text-blue-600 font-bold hover:bg-blue-50 rounded-xl">
                               <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                            </Button>
                         </div>
                         <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {purchaseForm.items.map((item, idx) => (
                               <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 group relative">
                                  <div className="md:col-span-6 space-y-2">
                                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">รายการ</Label>
                                     <Input 
                                        placeholder="รายการ" 
                                        className="h-12 rounded-xl border-slate-100 bg-white"
                                        value={item.name}
                                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                     />
                                  </div>
                                  <div className="md:col-span-2 space-y-2">
                                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">จำนวน</Label>
                                     <Input 
                                        type="number" 
                                        placeholder="จำนวน" 
                                        className="h-12 rounded-xl border-slate-100 bg-white"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                     />
                                  </div>
                                  <div className="md:col-span-3 space-y-2">
                                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">ราคา/หน่วย</Label>
                                     <Input 
                                        type="number" 
                                        placeholder="ราคา/หน่วย" 
                                        className="h-12 rounded-xl border-slate-100 bg-white text-right"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                     />
                                  </div>
                                  <div className="md:col-span-1 flex justify-end">
                                    {purchaseForm.items.length > 1 && (
                                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 rounded-xl h-12 w-12">
                                         <Trash2 size={18} />
                                      </Button>
                                    )}
                                  </div>
                               </div>
                            ))}
                         </div>
                         <div className="flex justify-between items-center p-6 bg-slate-900 rounded-3xl text-white">
                            <span className="font-bold text-slate-400">ยอดรวมทั้งสิ้น</span>
                            <span className="text-2xl font-black">{totalAmount.toLocaleString('th-TH')} ฿</span>
                         </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                         <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">แนบไฟล์ใบเสร็จ หรือ ถ่ายภาพ</Label>
                         <div 
                           className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-6 text-center hover:border-blue-200 hover:bg-blue-50/30 transition-all group cursor-pointer relative min-h-[300px] flex flex-col items-center justify-center"
                           onClick={() => document.getElementById('receipt-upload')?.click()}
                         >
                            <input 
                              id="receipt-upload" 
                              type="file" 
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  setPurchaseForm({
                                    ...purchaseForm, 
                                    file, 
                                    receipt_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : ""
                                  })
                                }
                              }} 
                            />
                            {purchaseForm.file ? (
                              <div className="flex flex-col items-center w-full">
                                 {purchaseForm.receipt_url ? (
                                   <div className="relative w-full max-w-[200px] aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-xl mb-4">
                                      <img src={purchaseForm.receipt_url} className="w-full h-full object-cover" alt="Preview" />
                                   </div>
                                 ) : (
                                   <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
                                      <CheckCircle2 size={32} />
                                   </div>
                                 )}
                                 <p className="font-bold text-slate-900 truncate max-w-[200px]">{purchaseForm.file.name}</p>
                                 <p className="text-slate-400 text-xs mt-1">{(purchaseForm.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                 <Button variant="ghost" className="mt-4 text-rose-500 font-bold" onClick={(e) => {
                                   e.stopPropagation();
                                   setPurchaseForm({...purchaseForm, file: null, receipt_url: ""});
                                 }}>ลบรูปภาพ</Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                 <div className="p-6 bg-slate-100 text-slate-400 rounded-full mb-6 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                                    <UploadCloud size={48} />
                                 </div>
                                 <h3 className="text-xl font-black text-slate-900">คลิกเพื่ออัปโหลด หรือ ถ่ายรูป</h3>
                                 <p className="text-slate-400 font-medium mt-2 px-8">หากใช้งานผ่านมือถือ ระบบจะเปิดกล้องให้โดยอัตโนมัติ</p>
                              </div>
                            )}
                         </div>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                         <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                            <div>
                               <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อรายการ</Label>
                               <div className="text-2xl font-black text-slate-900">{purchaseForm.title}</div>
                               <Badge className="mt-1 bg-blue-50 text-blue-600 border-blue-100">{purchaseForm.category}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                               <div>
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนรายการ</Label>
                                  <div className="text-lg font-bold text-slate-700">{purchaseForm.items.length} รายการ</div>
                               </div>
                               <div>
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วิธีการจ่ายเงิน</Label>
                                  <div className="text-lg font-bold text-slate-700">{getPaymentMethodLabel(purchaseForm.payment_method)}</div>
                               </div>
                               <div>
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยอดรวมสุทธิ</Label>
                                  <div className="text-2xl font-black text-blue-600">{totalAmount.toLocaleString('th-TH')} ฿</div>
                               </div>
                            </div>
                             {purchaseForm.file && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                   {purchaseForm.receipt_url ? (
                                     <img src={purchaseForm.receipt_url} className="w-12 h-12 rounded-lg object-cover" alt="Receipt Thumbnail" />
                                   ) : (
                                     <Receipt className="text-blue-500" />
                                   )}
                                   <span className="text-sm font-bold text-slate-600 truncate">{purchaseForm.file.name}</span>
                                </div>
                             )}
                         </div>
                         <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                            <Clock className="text-blue-500" />
                            <p className="text-sm font-bold text-blue-700">คำขอนี้จะถูกส่งไปยังหัวหน้างานของคุณเพื่อพิจารณา</p>
                         </div>
                      </div>
                    )}
                 </div>

                 <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-row gap-4 shrink-0">
                    {currentStep > 1 && (
                      <Button variant="ghost" onClick={() => setCurrentStep(s => s - 1)} className="h-14 px-8 rounded-2xl font-bold text-slate-400">
                         <ArrowLeft className="mr-2 w-4 h-4" /> ย้อนกลับ
                      </Button>
                    )}
                    {currentStep < 4 ? (
                      <Button 
                        className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-600/20"
                        onClick={() => setCurrentStep(s => s + 1)}
                        disabled={currentStep === 1 && !purchaseForm.title}
                      >
                         ถัดไป <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-lg shadow-xl shadow-slate-900/20"
                        onClick={() => createMutation.mutate(purchaseForm)}
                        disabled={createMutation.isPending}
                      >
                         {createMutation.isPending ? <Loader2 className="animate-spin" /> : "ส่งคำขอเบิกเงิน"}
                      </Button>
                    )}
                 </DialogFooter>
              </DialogContent>
            </Dialog>
         </div>
      </div>

      <Tabs defaultValue="my-purchases" className="w-full space-y-8">
        <TabsList className="bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 flex flex-nowrap overflow-x-auto custom-scrollbar shadow-sm">
          <TabsTrigger value="my-purchases" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 font-bold transition-all shrink-0">
            ใบเบิกของฉัน
          </TabsTrigger>
          {userRole !== 'employee' && (
            <TabsTrigger value="approve" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 font-bold transition-all shrink-0">
              พิจารณาอนุมัติ
              {pendingPurchases?.length > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white">{pendingPurchases.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-purchases" className="space-y-6">
           <Card className="rounded-[2.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                 <Table>
                 <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                       <TableHead className="py-6 pl-8 font-black text-slate-400 uppercase tracking-widest text-[10px]">วันที่</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">รายการ</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">ยอดรวม</TableHead>
                       <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px]">สถานะ</TableHead>
                       <TableHead className="pr-8 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">จัดการ</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {isMyLoading ? (
                      <TableRow>
                         <TableCell colSpan={5} className="py-20 text-center">
                            <Loader2 className="animate-spin inline-block text-blue-200 w-12 h-12" />
                         </TableCell>
                      </TableRow>
                    ) : myPurchases?.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={5} className="py-32 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-300">
                               <Package size={64} />
                               <p className="text-lg font-bold">ไม่พบรายการใบเบิกเงิน</p>
                            </div>
                         </TableCell>
                      </TableRow>
                    ) : myPurchases?.map((p: any) => (
                      <TableRow key={p.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group">
                         <TableCell className="py-6 pl-8 font-bold text-slate-500">
                            {format(new Date(p.created_at), "d MMM yy", { locale: th })}
                         </TableCell>
                         <TableCell>
                            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{p.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{p.items.length} รายการ</div>
                         </TableCell>
                         <TableCell className="font-black text-lg text-slate-900">
                            {Number(p.total_amount).toLocaleString('th-TH')} ฿
                         </TableCell>
                         <TableCell>
                            {getStatusBadge(p.status)}
                         </TableCell>
                         <TableCell className="pr-8 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-xl font-bold text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedPurchase(p)
                                setIsDetailDrawerOpen(true)
                              }}
                            >
                               รายละเอียด
                             </Button>
                          </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </div>
           </Card>
        </TabsContent>

        <TabsContent value="approve" className="space-y-6">
           {isPendingLoading ? (
             <div className="py-32 text-center">
                <Loader2 className="animate-spin inline-block text-blue-200 w-12 h-12" />
             </div>
           ) : !Array.isArray(pendingPurchases) || pendingPurchases.length === 0 ? (
             <Card className="py-32 text-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                <CheckCircle2 size={64} className="mx-auto text-emerald-200 mb-6" />
                <h3 className="text-xl font-black text-slate-900">ไม่มีรายการค้างคา</h3>
                <p className="text-slate-400 font-medium">{pendingPurchases?.error || "ทุกอย่างได้รับการจัดการเรียบร้อยแล้ว"}</p>
             </Card>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {pendingPurchases.map((p: any) => (
                  <Card key={p.id} className="rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 overflow-hidden">
                     <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                           <div className="flex-1 p-10 border-r border-slate-50">
                              <div className="flex items-center gap-5 mb-8">
                                 <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-2xl">
                                    {p.user?.full_name?.charAt(0)}
                                 </div>
                                 <div>
                                    <h3 className="text-2xl font-black text-slate-900">{p.user?.full_name}</h3>
                                    <p className="text-blue-600 font-bold text-xs tracking-widest uppercase">{p.user?.departments?.name}</p>
                                 </div>
                              </div>
                              <div className="space-y-6">
                                 <div>
                                    <h2 className="text-2xl font-black text-slate-900">{p.title}</h2>
                                    <p className="text-slate-500 font-medium mt-2 leading-relaxed italic">"{p.purpose}"</p>
                                 </div>
                                 
                                 {/* Expandable Items List */}
                                 <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                       <Package size={14} /> รายการเบิกจ่าย
                                    </div>
                                    <div className="space-y-3">
                                       {p.items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-700">
                                             <div className="flex gap-4">
                                                <span className="text-slate-400">x{item.quantity}</span>
                                                <span>{item.name}</span>
                                             </div>
                                             <div className="text-slate-900">{(item.quantity * item.unit_price).toLocaleString('th-TH')} ฿</div>
                                          </div>
                                       ))}
                                       <div className="pt-4 border-t border-slate-200 flex justify-between items-center font-black text-xl text-slate-900">
                                          <span>ยอดรวม</span>
                                          <span className="text-blue-600">{Number(p.total_amount).toLocaleString('th-TH')} ฿</span>
                                       </div>
                                    </div>
                                 </div>

                                 {p.receipt_url && (
                                   <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-600 gap-2" onClick={() => window.open(p.receipt_url, '_blank')}>
                                      <Receipt size={18} /> ดูไฟล์ใบเสร็จ
                                   </Button>
                                 )}
                              </div>
                           </div>
                           <div className="w-full lg:w-[350px] bg-slate-50/50 p-10 flex flex-col justify-center gap-8">
                              <div className="space-y-4">
                                 <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">หมายเหตุการพิจารณา</Label>
                                 <Textarea 
                                    id={`note-${p.id}`}
                                    placeholder="ระบุเหตุผลในการอนุมัติหรือปฏิเสธ..."
                                    className="min-h-[150px] rounded-3xl border-slate-100 bg-white shadow-inner p-5 focus:ring-blue-600/20 font-medium"
                                 />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <Button 
                                   variant="ghost" 
                                   className="h-16 rounded-2xl font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                   onClick={() => {
                                     const note = (document.getElementById(`note-${p.id}`) as HTMLTextAreaElement).value
                                     approveMutation.mutate({ id: p.id, action: 'reject', note, stage: userRole === 'ceo' ? 'ceo' : 'supervisor' })
                                   }}
                                 >
                                    <XCircle className="mr-2" /> ปฏิเสธ
                                 </Button>
                                 <Button 
                                   className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-600/20"
                                   onClick={() => {
                                     const note = (document.getElementById(`note-${p.id}`) as HTMLTextAreaElement).value
                                     approveMutation.mutate({ id: p.id, action: 'approve', note, stage: userRole === 'ceo' ? 'ceo' : 'supervisor' })
                                   }}
                                 >
                                    <CheckCircle2 className="mr-2" /> อนุมัติ
                                 </Button>
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
                ))}
             </div>
           )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
         <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {selectedPurchase && (
               <div className="flex flex-col h-full overflow-hidden">
                  <div className="bg-slate-900 p-10 text-white shrink-0">
                    <DialogHeader className="pb-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="p-4 bg-blue-600 rounded-3xl">
                                <Wallet className="text-white" size={32} />
                             </div>
                             <div className="text-left">
                                <DialogTitle className="text-3xl font-black text-white">{selectedPurchase.title}</DialogTitle>
                                <div className="flex items-center gap-3 mt-1">
                                   {getStatusBadge(selectedPurchase.status)}
                                   <span className="text-slate-400 font-bold text-sm">เลขที่ #{selectedPurchase.id.substring(0, 8)}</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-black text-slate-400 uppercase tracking-widest">ยอดเงินเบิก</div>
                             <div className="text-4xl font-black text-blue-400">{Number(selectedPurchase.total_amount).toLocaleString('th-TH')} ฿</div>
                          </div>
                       </div>
                    </DialogHeader>
                  </div>

                  <div className="p-10 space-y-10 bg-white flex-1 overflow-y-auto custom-scrollbar">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายละเอียดรายการ</h4>
                              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-3">
                                 {selectedPurchase.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center">
                                       <span className="font-bold text-slate-600">x{item.quantity} {item.name}</span>
                                       <span className="font-black text-slate-900">{(item.quantity * item.unit_price).toLocaleString('th-TH')} ฿</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วิธีการจ่ายเงิน</h4>
                              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 font-bold text-slate-700">
                                 {getPaymentMethodLabel(selectedPurchase.payment_method)}
                              </div>
                           </div>
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วัตถุประสงค์</h4>
                              <p className="bg-blue-50/30 p-6 rounded-3xl text-slate-700 font-medium italic">"{selectedPurchase.purpose}"</p>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หลักฐานใบเสร็จ</h4>
                           {selectedPurchase.receipt_url ? (
                             <div className="relative group overflow-hidden rounded-3xl border border-slate-100 shadow-sm aspect-square bg-slate-50">
                                <img 
                                  src={selectedPurchase.receipt_url} 
                                  alt="Receipt" 
                                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <Button className="bg-white text-slate-900 rounded-2xl font-bold" onClick={() => window.open(selectedPurchase.receipt_url, '_blank')}>
                                      <Eye className="mr-2" /> ดูรูปขนาดใหญ่
                                   </Button>
                                </div>
                             </div>
                           ) : (
                             <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                                <Receipt size={64} />
                                <p className="font-bold mt-4">ไม่มีไฟล์ใบเสร็จ</p>
                             </div>
                           )}
                        </div>
                     </div>

                     {/* Approval Timeline */}
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ไทม์ไลน์การอนุมัติ</h4>
                        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between gap-8 relative">
                           <div className="flex-1 space-y-2">
                              <div className="text-xs font-black text-blue-600 uppercase">1. ผู้ขอเบิก</div>
                              <div className="font-black text-slate-900">{session?.user?.name}</div>
                              <div className="text-xs text-slate-400 font-bold">{format(new Date(selectedPurchase.created_at), "d MMMM yyyy HH:mm", { locale: th })}</div>
                           </div>
                           <div className="flex-1 space-y-2">
                              <div className="text-xs font-black text-blue-600 uppercase">2. หัวหน้างาน</div>
                              <div className="font-black text-slate-900">
                                {selectedPurchase.supervisor_approved_at ? (
                                  <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={16} /> อนุมัติแล้ว</div>
                                ) : selectedPurchase.status === 'rejected' && selectedPurchase.supervisor_note ? (
                                  <div className="flex items-center gap-2 text-rose-600"><XCircle size={16} /> ปฏิเสธ</div>
                                ) : (
                                  <div className="flex items-center gap-2 text-amber-500"><Clock size={16} /> รอดำเนินการ</div>
                                )}
                              </div>
                              {selectedPurchase.supervisor_note && <p className="text-xs text-slate-500 italic">"{selectedPurchase.supervisor_note}"</p>}
                           </div>
                           <div className="flex-1 space-y-2">
                              <div className="text-xs font-black text-blue-600 uppercase">3. CEO / ผู้ดูแลสูงสุด</div>
                              <div className="font-black text-slate-900">
                                {selectedPurchase.ceo_approved_at ? (
                                  <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={16} /> อนุมัติแล้ว</div>
                                ) : selectedPurchase.status === 'supervisor_approved' ? (
                                  <div className="flex items-center gap-2 text-amber-500"><Clock size={16} /> รออนุมัติขั้นสุดท้าย</div>
                                ) : selectedPurchase.status === 'approved' ? (
                                  <div className="text-slate-300 italic font-medium">ไม่จำเป็น (อยู่ในวงเงิน)</div>
                                ) : (
                                  <div className="text-slate-300">-</div>
                                )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  <DialogFooter className="p-10 pt-0 bg-white no-print gap-4">
                     <Button variant="outline" className="h-14 rounded-2xl font-bold text-slate-600 gap-2 border-slate-200" onClick={handlePrint}>
                        <Printer size={18} /> ปริ้นท์เอกสารเบิก
                     </Button>
                     <Button variant="ghost" className="h-14 rounded-2xl font-bold text-slate-400" onClick={() => setIsDetailDrawerOpen(false)}>
                        ปิดหน้าต่าง
                     </Button>
                   </DialogFooter>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </div>
  )
}
