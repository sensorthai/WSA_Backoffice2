"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toast } from "sonner"
import { 
  Plus, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  UploadCloud,
  Package,
  Wallet,
  Eye,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Printer,
  FileText,
  Copy,
  Check,
  Download,
  AlertTriangle
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
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  "ค่าใช้จ่ายเดินทาง/ ค่าทางด่วน",
  "ค่าเติมน้ำมันรถบริษัท",
  "ค่าเดินทางไปไซด์งาน-ช่าง",
  "ค่าเดินทางไปสอน-อาจารย์",
  "ค่าอุปกรณ์การสอน",
  "ค่าส่งไปรษณีย์",
  "ค่าโทรศัพท์",
  "ค่าอาหารพนักงาน",
  "ค่าเลี้ยงรับรอง",
  "ค่าทำความสะอาด",
  "ค่าเครื่องใช้สำนักงาน",
  "ค่าวัสดุสิ้นเปลือง",
  "ค่าเครื่องมือช่าง",
  "ค่าภาษีอื่นๆ",
  "อื่นๆ"
]

export default function PurchasesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <PurchasesContent />
    </Suspense>
  )
}

function PurchasesContent() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role
  const isCEOOrAdmin = userRole === 'ceo' || userRole === 'admin'
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get("tab")

  // --- States ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState(tabParam || "my-purchases")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (tabParam) {
      setActiveView(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    setMounted(true)
  }, [])

  const getReceiptUrls = (receiptUrl: string | null | undefined): string[] => {
    if (!receiptUrl) return []
    const trimmed = receiptUrl.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return [receiptUrl]
      }
    }
    return [receiptUrl]
  }

  // --- Form State ---
  const [purchaseForm, setPurchaseForm] = useState({
    title: "",
    category: "ค่าใช้จ่ายเดินทาง/ ค่าทางด่วน",
    purpose: "",
    items: [{ name: "", quantity: 1, unit_price: 0 }],
    file: null as File | null,
    receipt_url: "",
    files: [] as File[],
    receipt_urls: [] as string[],
    payment_method: "petty_cash",
    document_type: "" as string | null,
    manifest_text: "",
    document_number: "",
    document_date: format(new Date(), "yyyy-MM-dd"),
    subtotal: 0,
    vat_amount: 0,
    vat_enabled: false,
    vat_type: "exclusive", // "exclusive" or "inclusive"
    vendor: "",
    vendor_address: "",
    vendor_tax_id: "",
    customer_name: "",
    customer_tax_id: "",
    customer_address: "",
    project_name: "",
  })

  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)

  // --- Filters & Pagination for Paid Table ---
  const [paidStartDate, setPaidStartDate] = useState("")
  const [paidEndDate, setPaidEndDate] = useState("")
  const [paidRequester, setPaidRequester] = useState("all")
  const [paidStatus, setPaidStatus] = useState("paid")
  const [paidPage, setPaidPage] = useState(1)
  const itemsPerPage = 10

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

  // Fetch current user details with department and position names
  const { data: userProfile } = useQuery({
    queryKey: ["currentUserProfile", session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null
      const { data, error } = await supabase
        .from('users')
        .select('*, department:departments(name), position:positions(name)')
        .eq('email', session.user.email)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!session?.user?.email
  })

  const isFinanceUser = useMemo(() => {
    if (!session?.user) return false
    const role = (session.user as any).role
    const isCEOOrAdmin = role === 'ceo' || role === 'admin'
    const isFinManager = (userProfile as any)?.department?.name === 'ฝ่ายบัญชีและการเงิน' && (userProfile as any)?.position?.name === 'ผู้จัดการ'
    return isCEOOrAdmin || isFinManager
  }, [session?.user, userProfile])

  const canModifySelected = useMemo(() => {
    if (!selectedPurchase || !session?.user) return false
    const role = (session.user as any).role
    const isCEOOrAdmin = role === 'ceo' || role === 'admin'
    const isOwner = selectedPurchase.user_id === session.user.id
    return isCEOOrAdmin || 
           (isFinanceUser && selectedPurchase.status !== 'paid') ||
           (isOwner && selectedPurchase.status === 'pending')
  }, [selectedPurchase, session?.user, isFinanceUser])

  const { data: approvedPurchases, isLoading: isApprovedLoading } = useQuery({
    queryKey: ["approved-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/approved?status=all")
      return res.json()
    },
    enabled: !!session?.user && isFinanceUser
  })

  const uniqueRequesters = useMemo(() => {
    const map = new Map<string, string>()
    if (approvedPurchases) {
      approvedPurchases.forEach((p: any) => {
        if (p.user?.full_name && p.user_id) {
          map.set(p.user_id, p.user.full_name)
        }
      })
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [approvedPurchases])

  const filteredPaidItems = useMemo(() => {
    return (approvedPurchases || []).filter((p: any) => {
      // 1. Status Filter
      if (paidStatus !== "all" && p.status !== paidStatus) {
        return false
      }
      
      // 2. Requester Filter
      if (paidRequester !== "all" && p.user_id !== paidRequester) {
        return false
      }

      // 3. Date Filter (วันที่จ่าย / paid_at)
      const payDateStr = p.paid_at || p.updated_at || p.created_at
      if (payDateStr) {
        const payDate = new Date(payDateStr)
        const checkDate = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate()).getTime()
        
        if (paidStartDate) {
          const start = new Date(paidStartDate)
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
          if (checkDate < startDate) return false
        }
        
        if (paidEndDate) {
          const end = new Date(paidEndDate)
          const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
          if (checkDate > endDate) return false
        }
      } else if (paidStartDate || paidEndDate) {
        return false
      }

      return true
    })
  }, [approvedPurchases, paidStatus, paidRequester, paidStartDate, paidEndDate])

  const totalPages = Math.ceil(filteredPaidItems.length / itemsPerPage)

  const paginatedPaidItems = useMemo(() => {
    const startIdx = (paidPage - 1) * itemsPerPage
    return filteredPaidItems.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredPaidItems, paidPage])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPaidPage(1)
  }, [paidStatus, paidRequester, paidStartDate, paidEndDate])

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
          items: payload.items.map((item: any) => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0
          })),
          payment_method: payload.payment_method,
          document_type: payload.document_type,
          manifest_text: payload.manifest_text,
          document_number: payload.document_number,
          document_date: payload.document_date,
          subtotal: parseFloat(payload.subtotal) || 0,
          vat_amount: parseFloat(payload.vat_amount) || 0,
          total_amount: parseFloat(payload.total_amount) || 0,
          vendor_name: payload.vendor,
          vendor_address: payload.vendor_address,
          vendor_tax_id: payload.vendor_tax_id,
          customer_name: payload.customer_name,
          customer_tax_id: payload.customer_tax_id,
          customer_address: payload.customer_address,
          project_name: payload.project_name
        }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to create request");
      }
      const purchase = await res.json()

      // 2. Upload Receipt if exists
      if (payload.files && payload.files.length > 0) {
        const formData = new FormData()
        payload.files.forEach((file: File) => {
          formData.append("file", file)
        })
        const uploadRes = await fetch(`/api/purchases/${purchase.id}/upload-receipt`, {
          method: "POST",
          body: formData
        })
        if (!uploadRes.ok) throw new Error("Failed to upload receipts")
      } else if (payload.file) {
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
      setIsSuccess(true)
      toast.success("ยื่นคำขอเบิกเงินเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      console.error("Submit Error:", err);
      toast.error("เกิดข้อผิดพลาด: " + err.message);
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
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
      toast.success("ดำเนินการเรียบร้อยแล้ว")
    }
  })

  const payMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await fetch(`/api/purchases/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      })
      if (!res.ok) throw new Error((await res.json()).error || "Payment action failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pending-purchases"] })
      toast.success("บันทึกการจ่ายเงินเรียบร้อยแล้ว!")
      setIsDetailDrawerOpen(false)
    },
    onError: (err: any) => {
      toast.error("การจ่ายเงินล้มเหลว: " + err.message)
    }
  })

  const editMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...body } = payload
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to edit request")
      return res.json()
    },
    onSuccess: (updatedPurchase) => {
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pending-purchases"] })
      toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว!")
      setIsEditModalOpen(false)
      setSelectedPurchase(updatedPurchase)
    },
    onError: (err: any) => {
      toast.error("การแก้ไขล้มเหลว: " + err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete request")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pending-purchases"] })
      toast.success("ลบรายการเรียบร้อยแล้ว!")
      setIsDetailDrawerOpen(false)
    },
    onError: (err: any) => {
      toast.error("การลบล้มเหลว: " + err.message)
    }
  })

  const handleAddAttachment = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedPurchase) return
    setIsUploadingAttachment(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("file", file)
      })
      const res = await fetch(`/api/purchases/${selectedPurchase.id}/upload-receipt`, {
        method: "POST",
        body: formData
      })
      if (!res.ok) throw new Error("Failed to upload receipt")
      
      const getRes = await fetch(`/api/purchases/${selectedPurchase.id}`)
      if (getRes.ok) {
        const updated = await getRes.json()
        setSelectedPurchase(updated)
      }
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pending-purchases"] })
      toast.success("เพิ่มไฟล์แนบเรียบร้อยแล้ว!")
    } catch (err: any) {
      toast.error("การอัปโหลดล้มเหลว: " + err.message)
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  const handleDeleteAttachment = async (urlToDelete: string) => {
    if (!selectedPurchase) return
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบไฟล์แนบนี้?")) return
    
    try {
      const urls = getReceiptUrls(selectedPurchase.receipt_url)
      const updatedUrls = urls.filter(url => url !== urlToDelete)
      
      const res = await fetch(`/api/purchases/${selectedPurchase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_url: JSON.stringify(updatedUrls) })
      })
      if (!res.ok) throw new Error("Failed to update attachments")
      const updated = await res.json()
      setSelectedPurchase(updated)
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pending-purchases"] })
      toast.success("ลบไฟล์แนบเรียบร้อยแล้ว!")
    } catch (err: any) {
      toast.error("การลบล้มเหลว: " + err.message)
    }
  }

  // --- Helpers ---
  const resetForm = () => {
    setPurchaseForm({
      title: "",
      category: "ค่าใช้จ่ายเดินทาง/ ค่าทางด่วน",
      purpose: "",
      items: [{ name: "", quantity: 1, unit_price: 0 }],
      file: null,
      receipt_url: "",
      files: [],
      receipt_urls: [],
      payment_method: "petty_cash",
      document_type: "",
      manifest_text: "",
      document_number: "",
      document_date: format(new Date(), "yyyy-MM-dd"),
      subtotal: 0,
      vat_amount: 0,
      vat_enabled: false,
      vat_type: "exclusive",
      vendor: "",
      vendor_address: "",
      vendor_tax_id: "",
      customer_name: "",
      customer_tax_id: "",
      customer_address: "",
      project_name: "",
    } as any)
    setCurrentStep(1)
    setIsScanning(false)
    setScanStatus("")
    setCustomCategory("")
    setShowCustomCategory(false)
    setIsSuccess(false)
  }

  // ผลรวมดิบของรายการทั้งหมด
  const itemsTotal = useMemo(() => {
    return purchaseForm.items.reduce((sum, item) => sum + Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100, 0)
  }, [purchaseForm.items])

  // คำนวณ VAT 7% ตามโหมด
  const vatAmount = useMemo(() => {
    if (!(purchaseForm as any).vat_enabled) return 0
    let amount = 0
    if ((purchaseForm as any).vat_type === "inclusive") {
      amount = itemsTotal * 0.07 / 1.07
    } else {
      amount = itemsTotal * 0.07
    }
    return Math.round(amount * 100) / 100
  }, [itemsTotal, (purchaseForm as any).vat_enabled, (purchaseForm as any).vat_type])

  // คำนวณยอดก่อน VAT ตามโหมด
  const beforeVatAmount = useMemo(() => {
    if (!(purchaseForm as any).vat_enabled) return Math.round(itemsTotal * 100) / 100
    let amount = 0
    if ((purchaseForm as any).vat_type === "inclusive") {
      amount = itemsTotal - vatAmount
    } else {
      amount = itemsTotal
    }
    return Math.round(amount * 100) / 100
  }, [itemsTotal, vatAmount, (purchaseForm as any).vat_enabled, (purchaseForm as any).vat_type])

  // คำนวณยอดรวมหลัง VAT ตามโหมด
  const grandTotal = useMemo(() => {
    if (!(purchaseForm as any).vat_enabled) return Math.round(itemsTotal * 100) / 100
    let amount = 0
    if ((purchaseForm as any).vat_type === "inclusive") {
      amount = itemsTotal
    } else {
      amount = itemsTotal + vatAmount
    }
    return Math.round(amount * 100) / 100
  }, [itemsTotal, vatAmount, (purchaseForm as any).vat_enabled, (purchaseForm as any).vat_type])

  // sync subtotal / vat_amount / total_amount เข้า form state
  useEffect(() => {
    setPurchaseForm((prev: any) => {
      if (
        Number(prev.subtotal) === beforeVatAmount && 
        Number(prev.vat_amount) === vatAmount && 
        Number(prev.total_amount) === grandTotal
      ) return prev
      return { 
        ...prev, 
        subtotal: beforeVatAmount, 
        vat_amount: vatAmount,
        total_amount: grandTotal
      }
    })
  }, [beforeVatAmount, vatAmount, grandTotal])

  // sync subtotal / vat_amount / total_amount เข้า editForm state
  useEffect(() => {
    if (!editForm) return
    const itemsTotalVal = editForm.items.reduce((sum: number, item: any) => sum + Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100, 0)
    let vatVal = 0
    if (editForm.vat_enabled) {
      if (editForm.vat_type === "inclusive") {
        vatVal = Math.round((itemsTotalVal * 0.07 / 1.07) * 100) / 100
      } else {
        vatVal = Math.round((itemsTotalVal * 0.07) * 100) / 100
      }
    }
    const beforeVatVal = Math.round((editForm.vat_enabled && editForm.vat_type === "inclusive" ? itemsTotalVal - vatVal : itemsTotalVal) * 100) / 100
    const totalVal = Math.round((editForm.vat_enabled && editForm.vat_type === "exclusive" ? itemsTotalVal + vatVal : itemsTotalVal) * 100) / 100

    if (
      Number(editForm.subtotal) === beforeVatVal && 
      Number(editForm.vat_amount) === vatVal && 
      Number(editForm.total_amount) === totalVal
    ) return

    setEditForm((prev: any) => {
      if (!prev) return prev
      return { 
        ...prev, 
        subtotal: beforeVatVal, 
        vat_amount: vatVal,
        total_amount: totalVal
      }
    })
  }, [editForm?.items, editForm?.vat_enabled, editForm?.vat_type])

  const generateManifestText = (form: any, total: number) => {
    const todayStr = format(new Date(), "d MMMM yyyy HH:mm", { locale: th })
    const employeeName = selectedPurchase?.user?.full_name || session?.user?.name || "พนักงาน"
    const deptName = selectedPurchase?.user?.department || (session?.user as any)?.department || "สำนักงานใหญ่"
    
    // Calculate values directly from items and VAT settings to avoid stale state/async race bugs
    const itemsTotalVal = form.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
    let vatVal = 0
    if (form.vat_enabled) {
      if (form.vat_type === "inclusive") {
        vatVal = itemsTotalVal * 0.07 / 1.07
      } else {
        vatVal = itemsTotalVal * 0.07
      }
    }
    const beforeVatVal = form.vat_enabled && form.vat_type === "inclusive" ? itemsTotalVal - vatVal : itemsTotalVal
    const totalVal = form.vat_enabled && form.vat_type === "exclusive" ? itemsTotalVal + vatVal : itemsTotalVal

    const itemsList = form.items.map((item: any, idx: number) => {
      const lineTotal = (item.quantity * item.unit_price).toLocaleString('th-TH')
      return `  ${idx + 1}. [x${item.quantity}] ${item.name} - ${lineTotal} ฿`
    }).join("\n")

    return `==================================================
        ใบเบิกเงินจ่าย / เอกสารขออนุมัติเบิกเงินจ่าย (AI Generated)
==================================================
วันที่จัดทำเอกสาร: ${todayStr}
ผู้ขอเบิกเงิน: ${employeeName}
แผนก/ฝ่าย: ${deptName}

--------------------------------------------------
ข้อมูลการวิเคราะห์ประเภทเอกสารโดย AI:
--------------------------------------------------
ชนิดของเอกสาร: ${form.document_type || "ไม่ระบุ"}
เลขที่เอกสาร: ${form.document_number || "ไม่ระบุ"}
วันที่เอกสาร: ${form.document_date || "ไม่ระบุ"}
ร้านค้า/ผู้ให้บริการ: ${form.vendor || form.vendor_name || "ไม่ระบุ"}
ที่อยู่คู่ค้า: ${form.vendor_address || "-"}
เลขประจำตัวผู้เสียภาษี (คู่ค้า): ${form.vendor_tax_id || "-"}
ลูกค้า (ผู้ซื้อ): ${form.customer_name || "-"}
ที่อยู่ลูกค้า: ${form.customer_address || "-"}
เลขประจำตัวผู้เสียภาษี (ลูกค้า): ${form.customer_tax_id || "-"}
ชื่องาน/โครงการ: ${form.project_name || "-"}
วิธีการชำระเงินต้นทาง: ${getPaymentMethodLabel(form.payment_method)}
ประเภทบัญชีค่าใช้จ่าย: ${form.category}

--------------------------------------------------
รายการสินค้า / บริการที่ระบุตามใบเสร็จ:
--------------------------------------------------
${itemsList}

ยอดก่อน VAT: ${beforeVatVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
VAT 7%: ${form.vat_enabled ? vatVal.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " บาท" : "-"}
ยอดรวมหลัง VAT: ${totalVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท

--------------------------------------------------
วัตถุประสงค์ในการเบิกจ่าย:
${form.purpose || "-"}

--------------------------------------------------
ลงนามผู้ตรวจสอบและรับรองเอกสาร:

ลงชื่อ................................................ (ผู้ขอเบิก)
    ( ${employeeName} )

ลงชื่อ................................................ (หัวหน้างานผู้อนุมัติ)
ลงชื่อ................................................ (CEO ผู้อนุมัติขั้นสูงสุด)
==================================================`
  }

  const handleAIAnalyze = async (file: File) => {
    setIsScanning(true)
    setScanStatus("กำลังอัปโหลดและเชื่อมต่อระบบ AI...")
    
    try {
      const formData = new FormData()
      formData.append("file", file)

      const timer1 = setTimeout(() => setScanStatus("กำลังวิเคราะห์ความคมชัดและประเภทเอกสารด้วย AI..."), 800)
      const timer2 = setTimeout(() => setScanStatus("กำลังประมวลผลข้อความและยอดรวมรายการสินค้า..."), 1600)

      const res = await fetch("/api/purchases/analyze", {
        method: "POST",
        body: formData
      })

      clearTimeout(timer1)
      clearTimeout(timer2)

      if (!res.ok) throw new Error("AI analysis failed")
      const data = await res.json()

      const finalCategory = data.category || "ค่าใช้จ่ายเดินทาง/ ค่าทางด่วน"
      const isPredefined = CATEGORIES.includes(finalCategory)

      const tempItems = data.items && data.items.length > 0 ? data.items : [{ name: "", quantity: 1, unit_price: 0 }]
      const tempItemsTotal = tempItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
      const detectedVatType = (Number(data.subtotal) > 0 && Math.abs(Number(data.subtotal) - tempItemsTotal) > 5) ? "inclusive" : "exclusive"

      const updatedForm = {
        ...purchaseForm,
        title: data.title || "ซื้อของ",
        category: finalCategory,
        payment_method: data.paymentMethod || "petty_cash",
        purpose: data.purpose || "",
        items: tempItems,
        document_type: data.documentType || "ใบเสร็จรับเงิน",
        document_number: data.documentNumber || "",
        document_date: data.documentDate || format(new Date(), "yyyy-MM-dd"),
        subtotal: data.subtotal || 0,
        vat_amount: data.vatAmount || 0,
        vat_enabled: Number(data.vatAmount) > 0,
        vat_type: detectedVatType,
        total_amount: data.totalAmount || tempItemsTotal,
        vendor_address: data.vendorAddress || "",
        vendor_tax_id: data.vendorTaxId || "",
        vendor: data.vendor || "",
        customer_name: data.customerName || "",
        customer_tax_id: data.customerTaxId || "",
        customer_address: data.customerAddress || "",
        project_name: data.projectName || "",
        file,
        receipt_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : "",
        files: [file],
        receipt_urls: file.type.startsWith('image/') ? [URL.createObjectURL(file)] : []
      }

      if (!isPredefined && data.category) {
        setShowCustomCategory(true)
        setCustomCategory(data.category)
      } else {
        setShowCustomCategory(false)
        setCustomCategory("")
      }

      // Calculate total for manifest
      const total = updatedForm.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
      updatedForm.manifest_text = generateManifestText(updatedForm, total)

      setPurchaseForm(updatedForm)
      setIsScanning(false)
      setCurrentStep(2) // Go directly to review step!
    } catch (err) {
      console.error(err)
      setIsScanning(false)
      // fallback
      setPurchaseForm({
        ...purchaseForm,
        file,
        receipt_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : "",
        files: [file],
        receipt_urls: file.type.startsWith('image/') ? [URL.createObjectURL(file)] : []
      })
      toast.error("ไม่สามารถวิเคราะห์ใบเสร็จด้วย AI ได้ ระบบจะเปลี่ยนเป็นโหมดกรอกข้อมูลด้วยตนเอง")
      setCurrentStep(2)
    }
  }

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
    
    // Update manifest if items changed
    const newForm = { ...purchaseForm, items: newItems }
    const total = newItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    newForm.manifest_text = generateManifestText(newForm, total)

    setPurchaseForm(newForm)
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
    if (!selectedPurchase) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const docDate = selectedPurchase.document_date ? format(new Date(selectedPurchase.document_date), "d MMMM yyyy", { locale: th }) : "-";
    
    const paymentLabels: Record<string, string> = { 
      petty_cash: 'เงินสดย่อย', 
      credit_card: 'ตัดบัตรเครดิต', 
      k_biz: 'K BIZ (โอน)' 
    };

    const items = selectedPurchase.items || [];
    // คำนวณยอดสำหรับสรุป (fallback จากรายการ หากไม่มีค่าในฐานข้อมูล)
    const computedItemsTotal = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const printBeforeVat = Number(selectedPurchase.amount_before_vat) > 0 ? Number(selectedPurchase.amount_before_vat) : computedItemsTotal;
    const printVat = Number(selectedPurchase.vat_amount) || 0;
    const printTotal = Number(selectedPurchase.total_amount) || (printBeforeVat + printVat);

    // Render minimum 5 rows to match physical form
    const minRows = 5;
    const rowsToRender = Math.max(items.length, minRows);
    let rowsHtml = '';
    for (let i = 0; i < rowsToRender; i++) {
      const item = items[i];
      if (item) {
        rowsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 10px; text-align: center; font-size: 14px;">${docDate}</td>
            <td style="border: 1px solid #000; padding: 10px; font-size: 14px;">${item.name} (จำนวน: ${item.quantity} x ${Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿)</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: right; font-size: 14px;">${(item.quantity * item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: center; font-size: 14px;">-</td>
          </tr>
        `;
      } else {
        rowsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 10px; height: 35px;"></td>
            <td style="border: 1px solid #000; padding: 10px; height: 35px;"></td>
            <td style="border: 1px solid #000; padding: 10px; height: 35px;"></td>
            <td style="border: 1px solid #000; padding: 10px; height: 35px;"></td>
          </tr>
        `;
      }
    }

    const html = `
      <html>
        <head>
          <title>ใบรับรองแทนใบเสร็จรับเงิน - ${selectedPurchase.document_number || 'TEMP'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Sarabun', sans-serif; color: #000; padding: 40px; line-height: 1.6; max-width: 850px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 25px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
              .attachment-page { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-family: 'Sarabun', sans-serif;">พิมพ์เอกสาร (Print)</button>
          </div>
          <div class="header" style="margin-top: 20px;">
            <h1 style="font-size: 22px; font-weight: bold; margin: 0;">ใบรับรองแทนใบเสร็จรับเงิน</h1>
          </div>
          
          <div style="display: flex; align-items: center; margin-bottom: 25px; font-size: 14px;">
            <span style="white-space: nowrap;">บจ. / หจก.</span>
            <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin: 0 10px; font-weight: bold; text-align: center; min-height: 20px;">${selectedPurchase.vendor_name || selectedPurchase.vendor || '-'}</span>
            <span style="white-space: nowrap;">(ผู้ขาย / ผู้ให้บริการ)</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; width: 15%; background-color: #f5f5f5;">วัน เดือน ปี</th>
                <th style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; width: 55%; background-color: #f5f5f5;">รายละเอียดรายจ่าย</th>
                <th style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; width: 15%; background-color: #f5f5f5;">จำนวนเงิน</th>
                <th style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; width: 15%; background-color: #f5f5f5;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 30px; gap: 20px;">
            <div style="border: 1px solid #000; padding: 15px; font-size: 14px; font-weight: bold; width: 350px; display: flex; flex-direction: column; justify-content: center;">
              วิธีการชำระเงิน: ${paymentLabels[selectedPurchase.payment_method] || selectedPurchase.payment_method || '-'}
            </div>
            <div style="display: flex; align-items: center; font-size: 14px; font-weight: bold;">
              <span style="margin-right: 15px; white-space: nowrap;">รวมเป็นเงิน</span>
              <div style="border: 1px solid #000; padding: 12px 25px; min-width: 180px; text-align: right; background-color: #fafafa; font-size: 16px; font-weight: bold;">
                ${printTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; font-size: 14px; line-height: 2.2;">
            <div>ข้าพเจ้า <span style="border-bottom: 1px dotted #000; display: inline-block; width: 300px; text-align: center; font-weight: bold; padding: 0 5px;">${selectedPurchase.user?.full_name || '-'}</span> (ผู้สั่งจ่าย) ตำแหน่ง <span style="border-bottom: 1px dotted #000; display: inline-block; width: 250px; text-align: center; font-weight: bold; padding: 0 5px;">${selectedPurchase.user?.position || '-'}</span></div>
            <div>ขอรับรองว่า รายจ่ายข้างต้นนี้ไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับได้ และได้จ่ายไปเพื่องานของ</div>
            <div><strong>บริษัท ไวร์เลส โซลูชั่น เอเชีย จำกัด</strong> ตั้งแต่วันที่ <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px; text-align: center; font-weight: bold; padding: 0 5px;">${docDate}</span> ถึงวันที่ <span style="border-bottom: 1px dotted #000; display: inline-block; width: 150px; text-align: center; font-weight: bold; padding: 0 5px;">${docDate}</span></div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; margin-top: 45px; gap: 20px; padding-right: 20px; font-size: 14px; line-height: 1.8;">
            <div>
              ลงชื่อ <span style="border-bottom: 1px dotted #000; display: inline-block; width: 200px; margin: 0 10px;"></span> (ผู้จ่ายเงิน)
            </div>
            <div>
              ลงชื่อ <span style="border-bottom: 1px dotted #000; display: inline-block; width: 200px; margin: 0 10px;"></span> (ผู้อนุมัติ)
            </div>
          </div>

          ${selectedPurchase.receipt_url ? (() => {
            const urls = getReceiptUrls(selectedPurchase.receipt_url);
            return urls.map((url, i) => `
              <div class="attachment-page" style="margin-top: 40px; text-align: center;">
                <h2 style="font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 5px; color: #555; text-align: left;">เอกสารแนบ (Attachment) ${urls.length > 1 ? `#${i + 1}` : ''}</h2>
                <div style="text-align: center; margin-top: 20px;">
                  <img src="${url}" style="max-width: 100%; max-height: 800px; object-fit: contain; border: 1px solid #ccc; padding: 10px; border-radius: 8px;" />
                </div>
              </div>
            `).join('');
          })() : ''}
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="relative rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 overflow-hidden shadow-sm border border-white/60 bg-white/60 backdrop-blur-2xl">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />
         
         <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
            <div className="flex items-center gap-4 md:gap-6">
               <div className="p-3 md:p-5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl md:rounded-[2rem] shadow-xl shadow-blue-600/20 ring-1 ring-white/50">
                  <Wallet size={32} className="md:hidden" />
                  <Wallet size={44} className="hidden md:block" />
               </div>
               <div>
                  <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">ระบบเบิกจ่ายค่าใช้จ่าย</h1>
                  <p className="text-slate-500 font-medium mt-1 md:mt-2 text-sm md:text-base leading-relaxed">จัดการคำขอเบิกเงินและติดตามสถานะ</p>
               </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
              setIsCreateModalOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 md:px-8 h-12 md:h-14 font-bold text-base md:text-lg shadow-lg shadow-blue-600/20 transition-all active:scale-95 w-full md:w-auto border-0">
                  <Plus className="mr-2 w-5 h-5" /> สร้างใบเบิกเงิน
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl md:rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[100vh] h-[100vh] md:h-auto md:max-h-[90vh] w-full sm:rounded-none">
                 {/* Modal Header & Progress */}
                 <div className="bg-slate-900 p-6 md:p-8 text-white shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

                 {!isSuccess ? (
                    <>
                      <div className="p-6 md:p-10 bg-white flex-1 overflow-y-auto custom-scrollbar">
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
                                 <div className="absolute -inset-2 rounded-[3rem] border-4 border-dashed border-blue-500/50 animate-spin duration-10000" />
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black tracking-tight">AI กำลังวิเคราะห์เอกสารเบิกจ่าย</h3>
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
                           <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-4">
                              <h2 className="text-xl font-black text-slate-900">อัปโหลดใบเสร็จเพื่อใช้ AI ช่วยกรอกข้อมูล</h2>
                              <p className="text-slate-500 font-medium text-sm">ระบบรองรับไฟล์ PDF, JPEG, PNG หรือถ่ายรูปจากกล้องมือถือได้ทันที</p>
                           </div>
                           <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 md:p-12 text-center bg-white space-y-6 flex flex-col items-center justify-center min-h-[280px]">
                              <input 
                                id="receipt-upload-camera" 
                                type="file" 
                                accept="image/*"
                                capture="environment"
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  if (file) {
                                    handleAIAnalyze(file)
                                  }
                                }} 
                              />
                              <input 
                                id="receipt-upload-file" 
                                type="file" 
                                accept="image/*,application/pdf"
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  if (file) {
                                    handleAIAnalyze(file)
                                  }
                                }} 
                              />
                              <div className="p-6 bg-slate-50 text-slate-400 rounded-[2rem] mb-2">
                                 <UploadCloud size={48} className="text-blue-500 animate-pulse" />
                              </div>
                              <h3 className="text-lg font-black text-slate-900">กรุณาเลือกวิธีการเพิ่มไฟล์ใบเสร็จ</h3>
                              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                 <Button 
                                    type="button"
                                    className="flex-1 h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg shadow-blue-600/20 gap-2 border-0"
                                    onClick={() => document.getElementById('receipt-upload-camera')?.click()}
                                 >
                                    📷 ถ่ายรูปใบเสร็จ
                                 </Button>
                                 <Button 
                                    type="button"
                                    className="flex-1 h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-base shadow-lg gap-2 border-0"
                                    onClick={() => document.getElementById('receipt-upload-file')?.click()}
                                 >
                                    📁 เลือกจากคลังภาพ / ไฟล์
                                 </Button>
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

                    {currentStep === 2 && (
                      <div className="space-y-8 animate-in slide-in-from-right-4">
                         {/* Prominent Category and Payment Method Confirmation Card */}
                         <div className="p-6 bg-blue-50/40 rounded-3xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-2 text-blue-800 font-extrabold text-sm">
                               <AlertTriangle className="w-5 h-5 text-blue-500 animate-pulse" />
                               <span>กรุณาตรวจสอบและยืนยันข้อมูลสำคัญ (Required Confirmation)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ประเภทการเบิก (Category)</Label>
                                  <Select 
                                    value={CATEGORIES.includes(purchaseForm.category) ? purchaseForm.category : "อื่นๆ"} 
                                    onValueChange={(val) => {
                                       const newForm = { ...purchaseForm }
                                       if (val === "อื่นๆ") {
                                          setShowCustomCategory(true)
                                          newForm.category = customCategory || "อื่นๆ"
                                       } else {
                                          setShowCustomCategory(false)
                                          setCustomCategory("")
                                          newForm.category = val
                                       }
                                       const total = newForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
                                       newForm.manifest_text = generateManifestText(newForm, total)
                                       setPurchaseForm(newForm)
                                    }}
                                  >
                                     <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold shadow-sm">
                                        <SelectValue placeholder="เลือกประเภทการเบิก" />
                                     </SelectTrigger>
                                     <SelectContent className="rounded-2xl border-slate-100 shadow-2xl max-h-[300px]">
                                        {CATEGORIES.map((cat) => (
                                           <SelectItem key={cat} value={cat} className="font-bold py-3">
                                              {cat}
                                           </SelectItem>
                                        ))}
                                     </SelectContent>
                                  </Select>
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">วิธีการจ่ายเงิน (Payment Method)</Label>
                                  <Select 
                                    value={purchaseForm.payment_method} 
                                    onValueChange={(val) => {
                                       const newForm = { ...purchaseForm, payment_method: val }
                                       const total = newForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
                                       newForm.manifest_text = generateManifestText(newForm, total)
                                       setPurchaseForm(newForm)
                                    }}
                                  >
                                     <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold shadow-sm">
                                        <SelectValue placeholder="เลือกวิธีการจ่ายเงิน" />
                                     </SelectTrigger>
                                     <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                        <SelectItem value="petty_cash" className="font-bold py-3">เงินสดย่อย (Petty Cash)</SelectItem>
                                        <SelectItem value="credit_card" className="font-bold py-3">ตัดบัตรเครดิต (Credit Card)</SelectItem>
                                        <SelectItem value="k_biz" className="font-bold py-3">K BIZ (โอนเงินเกิน 2,000 บาท)</SelectItem>
                                     </SelectContent>
                                  </Select>
                               </div>
                            </div>
                            {showCustomCategory && (
                               <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ระบุประเภทการเบิกอื่น ๆ</Label>
                                  <Input 
                                     placeholder="พิมพ์ประเภทการเบิก..."
                                     className="h-14 rounded-2xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold shadow-sm"
                                     value={customCategory}
                                     onChange={(e) => {
                                        setCustomCategory(e.target.value)
                                        const newForm = { ...purchaseForm, category: e.target.value || "อื่นๆ" }
                                        const total = newForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
                                        newForm.manifest_text = generateManifestText(newForm, total)
                                        setPurchaseForm(newForm)
                                     }}
                                  />
                               </div>
                            )}
                         </div>

                         {purchaseForm.document_type && (
                           <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="p-3 bg-blue-500 rounded-2xl text-white">
                                    <CheckCircle2 size={20} />
                                 </div>
                                 <div>
                                    <div className="text-xs font-black text-blue-500 uppercase tracking-wider">วิเคราะห์ด้วยระบบ AI สำเร็จ</div>
                                    <div className="text-sm font-black text-slate-900">ประเภทเอกสาร: {purchaseForm.document_type}</div>
                                 </div>
                              </div>
                              <Badge className="bg-blue-500 text-white font-bold px-3 py-1">วิเคราะห์โดย AI</Badge>
                           </div>
                         )}

                         {/* Document Number & Date */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เลขที่เอกสาร</Label>
                               <Input 
                                  placeholder="เช่น INV-2025-001234"
                                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                  value={(purchaseForm as any).document_number || ""}
                                  onChange={(e) => setPurchaseForm({ ...purchaseForm, document_number: e.target.value } as any)}
                               />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันที่เอกสาร</Label>
                               <Input 
                                  type="date"
                                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                  value={(purchaseForm as any).document_date || ""}
                                  onChange={(e) => setPurchaseForm({ ...purchaseForm, document_date: e.target.value } as any)}
                               />
                            </div>
                         </div>

                         {/* Vendor / Customer / Project */}
                         <div className="p-5 md:p-6 bg-slate-50/70 rounded-3xl border border-slate-100 space-y-5">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">ข้อมูลคู่ค้า / ลูกค้า</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                               <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อคู่ค้า (ผู้ขาย)</Label>
                                  <Input 
                                     placeholder="ชื่อบริษัท/ร้านค้า"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm"
                                     value={(purchaseForm as any).vendor || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor: e.target.value } as any)}
                                  />
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขประจำตัวผู้เสียภาษี (คู่ค้า)</Label>
                                  <Input 
                                     placeholder="เช่น 0105548091234"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm font-mono"
                                     value={(purchaseForm as any).vendor_tax_id || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor_tax_id: e.target.value } as any)}
                                  />
                               </div>
                               <div className="md:col-span-2 space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ที่อยู่คู่ค้า</Label>
                                  <Input 
                                     placeholder="ที่อยู่ตามใบกำกับภาษี"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm"
                                     value={(purchaseForm as any).vendor_address || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor_address: e.target.value } as any)}
                                  />
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อลูกค้า (ผู้ซื้อ)</Label>
                                  <Input 
                                     placeholder="ชื่อบริษัท/ผู้ซื้อ"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm"
                                     value={(purchaseForm as any).customer_name || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, customer_name: e.target.value } as any)}
                                  />
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขประจำตัวผู้เสียภาษี (ลูกค้า)</Label>
                                  <Input 
                                     placeholder="เช่น 0105565012345"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm font-mono"
                                     value={(purchaseForm as any).customer_tax_id || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, customer_tax_id: e.target.value } as any)}
                                  />
                               </div>
                               <div className="md:col-span-2 space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ที่อยู่ลูกค้า</Label>
                                  <Input 
                                     placeholder="ที่อยู่ลูกค้า (ผู้ซื้อ)"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm"
                                     value={(purchaseForm as any).customer_address || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, customer_address: e.target.value } as any)}
                                  />
                               </div>

                               <div className="md:col-span-2 space-y-2">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่องาน / โครงการ</Label>
                                  <Input 
                                     placeholder="ระบุชื่องานหรือโครงการที่เกี่ยวข้อง"
                                     className="h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-600/20 font-bold text-sm"
                                     value={(purchaseForm as any).project_name || ""}
                                     onChange={(e) => setPurchaseForm({ ...purchaseForm, project_name: e.target.value } as any)}
                                  />
                               </div>
                            </div>
                         </div>
                         
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อรายการเบิก</Label>
                                <Input 
                                   placeholder="เช่น ค่าเดินทางไปพบลูกค้า, ค่าวัสดุอุปกรณ์..."
                                   className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                   value={purchaseForm.title}
                                   onChange={(e) => {
                                      const newForm = { ...purchaseForm, title: e.target.value }
                                      const total = newForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
                                      newForm.manifest_text = generateManifestText(newForm, total)
                                      setPurchaseForm(newForm)
                                   }}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">จุดประสงค์ / รายละเอียดเพิ่มเติม</Label>
                                <Input 
                                   placeholder="ระบุวัตถุประสงค์ในการเบิกจ่าย..."
                                   className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                   value={purchaseForm.purpose}
                                   onChange={(e) => {
                                      const newForm = { ...purchaseForm, purpose: e.target.value }
                                      const total = newForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
                                      newForm.manifest_text = generateManifestText(newForm, total)
                                      setPurchaseForm(newForm)
                                   }}
                                />
                             </div>
                          </div>

                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                               <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการสินค้า/บริการ</Label>
                               <Button variant="ghost" size="sm" onClick={addItem} className="text-blue-600 font-bold hover:bg-blue-50 rounded-xl">
                                  <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                               </Button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                               {purchaseForm.items.map((item, idx) => (
                                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 group relative">
                                     <div className="md:col-span-6 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">รายการ</Label>
                                        <Input 
                                           placeholder="รายการ" 
                                           className="h-11 rounded-xl border-slate-100 bg-white"
                                           value={item.name}
                                           onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                        />
                                     </div>
                                     <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">จำนวน</Label>
                                        <Input 
                                           type="number" 
                                           step="0.01" placeholder="จำนวน" 
                                           className="h-11 rounded-xl border-slate-100 bg-white"
                                           value={item.quantity}
                                           onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                        />
                                     </div>
                                     <div className="md:col-span-3 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">ราคา/หน่วย</Label>
                                        <Input 
                                           type="number" 
                                           placeholder="ราคา/หน่วย" 
                                           className="h-11 rounded-xl border-slate-100 bg-white text-right"
                                           value={item.unit_price}
                                           onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                        />
                                     </div>
                                     <div className="md:col-span-1 flex items-end justify-between gap-2">
                                       <div className="text-xs font-bold text-emerald-600 whitespace-nowrap pb-2.5 md:hidden">
                                         = {(Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                                       </div>
                                       {purchaseForm.items.length > 1 && (
                                         <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 rounded-xl h-11 w-11">
                                            <Trash2 size={16} />
                                         </Button>
                                       )}
                                     </div>
                                     <div className="hidden md:flex md:col-span-12 justify-end -mt-2 mb-1 pr-1">
                                       <span className="text-xs font-bold text-emerald-600">ยอดรวม: {(Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                            {/* VAT Breakdown */}
                            <div className="rounded-3xl overflow-hidden border border-slate-200">
                               {/* ยอดก่อน VAT = ผลรวมของทุกรายการ (คำนวณอัตโนมัติ) */}
                               <div className="flex justify-between items-center px-6 py-4 bg-slate-50">
                                  <span className="font-bold text-slate-500 text-sm">ยอดก่อน VAT</span>
                                  <span className="font-black text-slate-700 text-sm tabular-nums">
                                     {beforeVatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                                  </span>
                                </div>
                                {/* VAT 7% เป็น checkbox */}
                                <div className="flex flex-col gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
                                   <div className="flex justify-between items-center">
                                      <label className="flex items-center gap-3 cursor-pointer select-none">
                                         <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600/30 cursor-pointer accent-blue-600"
                                            checked={!!(purchaseForm as any).vat_enabled}
                                            onChange={(e) => setPurchaseForm({ ...purchaseForm, vat_enabled: e.target.checked } as any)}
                                         />
                                         <span className="font-bold text-slate-500 text-sm">VAT 7%</span>
                                      </label>
                                      <span className={cn(
                                         "font-black text-sm tabular-nums",
                                         (purchaseForm as any).vat_enabled ? "text-slate-700" : "text-slate-300"
                                      )}>
                                         {vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                                      </span>
                                   </div>
                                   {!!(purchaseForm as any).vat_enabled && (
                                      <div className="flex justify-end gap-3 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                         <button
                                            type="button"
                                            onClick={() => setPurchaseForm({ ...purchaseForm, vat_type: "exclusive" } as any)}
                                            className={cn(
                                               "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
                                               (purchaseForm as any).vat_type === "exclusive"
                                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10"
                                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                            )}
                                         >
                                            แยกนอก (Exclusive)
                                         </button>
                                         <button
                                            type="button"
                                            onClick={() => setPurchaseForm({ ...purchaseForm, vat_type: "inclusive" } as any)}
                                            className={cn(
                                               "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
                                               (purchaseForm as any).vat_type === "inclusive"
                                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10"
                                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                            )}
                                         >
                                            รวมใน (Inclusive)
                                         </button>
                                      </div>
                                   )}
                                </div>
                               <div className="flex justify-between items-center px-6 py-5 bg-slate-900 text-white">
                                  <span className="font-bold text-slate-400">ยอดรวมหลัง VAT</span>
                                  <span className="text-2xl font-black">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                               </div>
                            </div>

                          {/* Attachments Section */}
                          <div className="p-5 md:p-6 bg-slate-50/70 rounded-3xl border border-slate-100 space-y-4">
                             <div className="flex items-center justify-between">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เอกสารแนบ (Attachments)</Label>
                                <Button 
                                   type="button"
                                   variant="ghost" 
                                   size="sm" 
                                   onClick={() => document.getElementById('attachments-upload')?.click()} 
                                   className="text-blue-600 font-bold hover:bg-blue-50 rounded-xl"
                                >
                                   <Plus className="w-4 h-4 mr-1" /> เพิ่มไฟล์แนบ
                                </Button>
                             </div>
                             <input 
                               id="attachments-upload" 
                               type="file" 
                               multiple 
                               accept="image/*,application/pdf"
                               className="hidden" 
                               onChange={(e) => {
                                 const newFiles = Array.from(e.target.files || []);
                                 if (newFiles.length > 0) {
                                   const updatedFiles = [...(purchaseForm.files || []), ...newFiles];
                                   const updatedUrls = [
                                     ...(purchaseForm.receipt_urls || []),
                                     ...newFiles.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : "")
                                   ];
                                   setPurchaseForm({
                                     ...purchaseForm,
                                     files: updatedFiles,
                                     receipt_urls: updatedUrls
                                   } as any);
                                 }
                               }} 
                             />
                             
                             {(purchaseForm.files && purchaseForm.files.length > 0) ? (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                  {purchaseForm.files.map((file: File, idx: number) => {
                                     const previewUrl = purchaseForm.receipt_urls?.[idx];
                                     return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm relative group">
                                           <div className="flex items-center gap-3 min-w-0 flex-1">
                                              {previewUrl ? (
                                                <img src={previewUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="Thumbnail" />
                                              ) : (
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                                                   <Receipt size={20} />
                                                 </div>
                                              )}
                                              <span className="text-xs font-bold text-slate-600 truncate flex-1">{file.name}</span>
                                           </div>
                                           <Button 
                                              type="button"
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                              onClick={() => {
                                                 const updatedFiles = (purchaseForm.files || []).filter((_, i) => i !== idx);
                                                 const updatedUrls = (purchaseForm.receipt_urls || []).filter((_, i) => i !== idx);
                                                 setPurchaseForm({
                                                   ...purchaseForm,
                                                   files: updatedFiles,
                                                   receipt_urls: updatedUrls
                                                 } as any);
                                              }}
                                           >
                                              <Trash2 size={14} />
                                           </Button>
                                        </div>
                                     );
                                  })}
                               </div>
                             ) : (
                               <div className="text-center py-6 text-slate-400 font-medium text-sm border-2 border-dashed border-slate-200/60 rounded-2xl bg-white/50">
                                  ยังไม่มีการอัปโหลดเอกสารแนบ (สามารถอัปโหลดได้หลายไฟล์)
                               </div>
                             )}
                          </div>
                         </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                         <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                            <h3 className="text-lg font-black text-slate-900">สรุปไฟล์ข้อความส่งขออนุมัติ (Manifest Text File)</h3>
                            <p className="text-slate-500 font-medium text-sm mt-1">ไฟล์ข้อความนี้จะแนบไปกับใบเสร็จในฐานข้อมูลเพื่อส่งให้ผู้อนุมัติตรวจสอบได้สะดวกรวดเร็ว</p>
                         </div>
                         
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เนื้อหาไฟล์ข้อความ (แก้ไขปรับแต่งได้)</Label>
                            <Textarea 
                               className="min-h-[300px] rounded-3xl bg-slate-950 text-slate-100 font-mono text-xs p-6 focus:ring-blue-600/20 leading-relaxed border-0 shadow-inner"
                               value={purchaseForm.manifest_text}
                               onChange={(e) => setPurchaseForm({ ...purchaseForm, manifest_text: e.target.value })}
                            />
                         </div>
                         
                         <div className="flex justify-end">
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="rounded-2xl h-12 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 gap-2"
                              onClick={() => {
                                 const element = document.createElement("a");
                                 const file = new Blob([purchaseForm.manifest_text], {type: 'text/plain'});
                                 element.href = URL.createObjectURL(file);
                                 element.download = "Purchase-Request-Manifest.txt";
                                 document.body.appendChild(element);
                                 element.click();
                                 document.body.removeChild(element);
                              }}
                            >
                               <Printer size={16} /> ดาวน์โหลดเป็นไฟล์ข้อความ (.txt)
                            </Button>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
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
                                  <div className="text-2xl font-black text-blue-600">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</div>
                               </div>
                               {purchaseForm.document_type && (
                                 <div>
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">การวิเคราะห์โดย AI</Label>
                                    <div className="text-sm font-black text-blue-500">{purchaseForm.document_type}</div>
                                 </div>
                               )}
                            </div>
                             {((purchaseForm.files && purchaseForm.files.length > 0) || purchaseForm.file) && (
                                <div className="space-y-2">
                                   <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">เอกสารแนบ (Attachments)</Label>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {purchaseForm.files && purchaseForm.files.length > 0 ? (
                                        purchaseForm.files.map((file: File, idx: number) => {
                                           const previewUrl = purchaseForm.receipt_urls?.[idx];
                                           return (
                                              <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                 {previewUrl ? (
                                                   <img src={previewUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="Receipt Thumbnail" />
                                                 ) : (
                                                   <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                                                      <Receipt size={20} />
                                                   </div>
                                                 )}
                                                 <span className="text-xs font-bold text-slate-600 truncate flex-1">{file.name}</span>
                                              </div>
                                           );
                                        })
                                      ) : (
                                        purchaseForm.file && (
                                           <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                              {purchaseForm.receipt_url ? (
                                                <img src={purchaseForm.receipt_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="Receipt Thumbnail" />
                                              ) : (
                                                <Receipt className="text-blue-500" />
                                              )}
                                              <span className="text-xs font-bold text-slate-600 truncate flex-1">{purchaseForm.file.name}</span>
                                           </div>
                                        )
                                      )}
                                   </div>
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
                    </>
                  ) : (
                     <div className="p-8 md:p-12 bg-white flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-300 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-lg border border-emerald-100 animate-bounce mx-auto">
                           <CheckCircle2 size={48} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900">ส่งคำขอเบิกเงินสำเร็จ!</h3>
                           <p className="text-slate-400 font-bold mt-2">คำขอเบิกเงินของคุณได้รับการส่งเข้าสู่ระบบ และรอหัวหน้างานอนุมัติเรียบร้อยแล้ว</p>
                        </div>
                        
                        <div className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left space-y-4 shadow-inner">
                           <div>
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อรายการ</Label>
                              <div className="text-lg font-black text-slate-900">{purchaseForm.title}</div>
                              <Badge className="mt-1 bg-blue-50 text-blue-600 border-blue-100">{purchaseForm.category}</Badge>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วิธีการจ่ายเงิน</Label>
                                 <div className="text-sm font-bold text-slate-700">{getPaymentMethodLabel(purchaseForm.payment_method)}</div>
                              </div>
                              <div>
                                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยอดรวมสุทธิ</Label>
                                 <div className="text-sm font-bold text-blue-600">{Number(purchaseForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0) + Number(purchaseForm.vat_amount || 0)).toLocaleString()} ฿</div>
                              </div>
                           </div>
                        </div>

                        <div className="w-full max-w-sm pt-4">
                           <Button 
                             size="lg" 
                             className="bg-slate-900 hover:bg-black text-white rounded-2xl h-14 font-black shadow-xl w-full border-0"
                             onClick={() => {
                               setIsCreateModalOpen(false)
                               resetForm()
                             }}
                           >
                             ตกลง (ปิดหน้าต่าง)
                           </Button>
                        </div>
                     </div>
                  )}
              </DialogContent>
            </Dialog>
         </div>
      </div>

      {/* Sub Menu Navigation */}
      <div className="flex p-1.5 bg-slate-100/60 backdrop-blur-xl rounded-2xl md:rounded-[2rem] gap-2 mb-8 md:w-max mx-auto shadow-sm ring-1 ring-slate-200/50 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setActiveView("my-purchases")}
          className={cn(
            "px-5 md:px-8 py-3 text-sm md:text-base font-bold transition-all relative rounded-xl md:rounded-3xl flex-1 md:flex-none text-center whitespace-nowrap",
            activeView === "my-purchases" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          )}
        >
          ใบเบิกของฉัน
        </button>
        {userRole !== 'employee' && (
          <button 
            onClick={() => setActiveView("approve")}
            className={cn(
              "px-5 md:px-8 py-3 text-sm md:text-base font-bold transition-all relative rounded-xl md:rounded-3xl flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap",
              activeView === "approve" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            <span>พิจารณาอนุมัติ</span>
            {Array.isArray(pendingPurchases) && pendingPurchases.length > 0 && (
              <Badge className="bg-rose-500 text-white shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border-0 shadow-sm">{pendingPurchases.length}</Badge>
            )}
          </button>
        )}
        {isFinanceUser && (
          <button 
            onClick={() => setActiveView("finance")}
            className={cn(
              "px-5 md:px-8 py-3 text-sm md:text-base font-bold transition-all relative rounded-xl md:rounded-3xl flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap",
              activeView === "finance" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            <span>การเงิน / จ่ายเงิน</span>
            {Array.isArray(approvedPurchases) && approvedPurchases.filter((r: any) => r.status === 'approved').length > 0 && (
              <Badge className="bg-emerald-600 text-white shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border-0 shadow-sm">
                {approvedPurchases.filter((r: any) => r.status === 'approved').length}
              </Badge>
            )}
          </button>
        )}
      </div>

      {activeView === "my-purchases" && (
        <div className="space-y-6">
           {/* Desktop View: Table */}
           <Card className="hidden md:block rounded-[2.5rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                 <Table className="min-w-[600px]">
                 <TableHeader className="bg-slate-50/80 backdrop-blur-md">
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
                            <Loader2 className="animate-spin inline-block text-blue-400 w-10 h-10" />
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
                      <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                         <TableCell className="py-6 pl-8 font-bold text-slate-500">
                            {format(new Date(p.created_at), "d MMM yy", { locale: th })}
                         </TableCell>
                         <TableCell>
                            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{p.title}</div>
                            <div className="text-[11px] text-slate-400 font-medium mt-1">{p.vendor_name && <span className="text-slate-500">{p.vendor_name} · </span>}{p.items.length} รายการ</div>
                         </TableCell>
                         <TableCell className="font-black text-lg text-slate-900">
                            {Number(p.total_amount).toLocaleString('th-TH')} <span className="text-sm text-slate-400">฿</span>
                         </TableCell>
                         <TableCell>
                            {getStatusBadge(p.status)}
                         </TableCell>
                         <TableCell className="pr-8 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-xl font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
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

           {/* Mobile View: Stacked Cards */}
           <div className="grid md:hidden gap-4">
              {isMyLoading ? (
                 <div className="py-20 text-center"><Loader2 className="animate-spin inline-block text-blue-400 w-10 h-10" /></div>
              ) : myPurchases?.length === 0 ? (
                 <Card className="py-20 text-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-md">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="font-bold text-slate-500">ไม่พบรายการใบเบิกเงิน</p>
                 </Card>
              ) : myPurchases?.map((p: any) => (
                 <Card key={p.id} className="rounded-[2rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-slate-200 p-5 space-y-5">
                    <div className="flex justify-between items-start gap-4">
                       <div className="flex-1">
                          <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">{format(new Date(p.created_at), "d MMM yyyy", { locale: th })}</div>
                          <div className="font-black text-slate-900 text-base leading-tight">{p.title}</div>
                          <div className="text-xs text-slate-500 mt-1.5 line-clamp-1">{p.vendor_name && <span>{p.vendor_name} · </span>}{p.items.length} รายการ</div>
                       </div>
                       <div className="text-right shrink-0">
                          <div className="font-black text-blue-600 text-lg">{Number(p.total_amount).toLocaleString('th-TH')} <span className="text-sm">฿</span></div>
                          <div className="mt-2 flex justify-end">{getStatusBadge(p.status)}</div>
                       </div>
                    </div>
                    <Button 
                       variant="outline" 
                       className="w-full h-12 rounded-2xl font-bold text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                       onClick={() => {
                         setSelectedPurchase(p)
                         setIsDetailDrawerOpen(true)
                       }}
                    >
                       ดูรายละเอียด
                    </Button>
                 </Card>
              ))}
           </div>
        </div>
      )}

      {activeView === "approve" && (
        <div className="space-y-6">
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
                  <Card key={p.id} className="rounded-[2.5rem] md:rounded-[3rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-slate-200 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 overflow-hidden">
                     <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row">
                           <div className="flex-1 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-slate-200">
                              <div className="flex items-center gap-5 mb-6 md:mb-8">
                                 <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-2xl">
                                    {p.user?.full_name?.charAt(0)}
                                 </div>
                                 <div>
                                    <h3 className="text-2xl font-black text-slate-900">{p.user?.full_name}</h3>
                                    <p className="text-blue-600 font-bold text-xs tracking-widest uppercase">{p.user?.departments?.name}</p>
                                 </div>
                              </div>
                              <div className="space-y-6">
                                 <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                       <h2 className="text-2xl font-black text-slate-900">{p.title}</h2>
                                       {p.document_type && (
                                         <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50 font-bold py-1 px-3 rounded-xl gap-1 shrink-0">
                                            <Receipt size={12} />
                                            <span>AI: {p.document_type}</span>
                                         </Badge>
                                       )}
                                    </div>
                                    <p className="text-slate-500 font-medium leading-relaxed italic">"{p.purpose}"</p>
                                 </div>

                                 {/* Vendor / Customer Info */}
                                 {(p.vendor_name || p.customer_name || p.customer_address) && (
                                   <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                      {p.vendor_name && (
                                        <div><span className="text-slate-400 font-bold">คู่ค้า:</span> <span className="font-bold text-slate-700">{p.vendor_name}</span></div>
                                      )}
                                      {p.customer_name && (
                                        <div><span className="text-slate-400 font-bold">ลูกค้า:</span> <span className="font-bold text-slate-700">{p.customer_name}</span></div>
                                      )}
                                      {p.customer_address && (
                                        <div><span className="text-slate-400 font-bold">ที่อยู่ลูกค้า:</span> <span className="font-bold text-slate-700">{p.customer_address}</span></div>
                                      )}
                                   </div>
                                 )}
                                 
                                 {/* Expandable Items List */}
                                 <div className="bg-slate-50/80 backdrop-blur-md rounded-3xl p-5 md:p-6 space-y-4">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                       <Package size={14} /> รายการเบิกจ่าย
                                    </div>
                                    <div className="space-y-3">
                                       {p.items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex justify-between items-start text-sm font-bold text-slate-700 gap-4">
                                             <div className="flex gap-3 md:gap-4 leading-tight">
                                                <span className="text-slate-400 shrink-0">x{item.quantity}</span>
                                                <span className="line-clamp-2">{item.name}</span>
                                             </div>
                                             <div className="text-slate-900 shrink-0">{(Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400">฿</span></div>
                                          </div>
                                       ))}
                                       {(() => {
                                          const computedItemsTotal = (p.items || []).reduce(
                                             (sum: number, it: any) => sum + Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * 100) / 100,
                                             0
                                          )
                                          const beforeVat = Number(p.amount_before_vat) > 0 ? Number(p.amount_before_vat) : computedItemsTotal
                                          const vat = Number(p.vat_amount) || 0
                                          const totalAfterVat = Number(p.total_amount) || (beforeVat + vat)
                                          return (
                                          <div className="pt-4 border-t border-slate-200 space-y-2">
                                             <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                                <span>ยอดก่อน VAT</span>
                                                <span>{beforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400">฿</span></span>
                                             </div>
                                             <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                                <span>VAT 7%</span>
                                                <span>{vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400">฿</span></span>
                                             </div>
                                             <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center font-black text-lg md:text-xl text-slate-900">
                                                <span>ยอดรวมหลัง VAT</span>
                                                <span className="text-blue-600">{totalAfterVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm">฿</span></span>
                                             </div>
                                          </div>
                                          )
                                       })()}
                                    </div>
                                 </div>

                                  {p.receipt_url && (() => {
                                    const urls = getReceiptUrls(p.receipt_url);
                                    if (urls.length === 0) return null;
                                    return (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                        {urls.map((url, i) => (
                                          <Button 
                                            key={i} 
                                            variant="outline" 
                                            className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-600 gap-2" 
                                            onClick={() => window.open(url, '_blank')}
                                          >
                                             <Receipt size={18} /> ดูไฟล์ใบเสร็จ {urls.length > 1 ? `#${i + 1}` : ''}
                                          </Button>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                  {false && (
                                   <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-600 gap-2" onClick={() => window.open(p.receipt_url, '_blank')}>
                                      <Receipt size={18} /> ดูไฟล์ใบเสร็จ
                                   </Button>
                                 )}

                                 {/* AI Manifest Text collapsible block */}
                                 {p.manifest_text && (
                                   <div className="space-y-3">
                                     <Button 
                                       variant="outline" 
                                       size="sm" 
                                       className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-600 gap-2 bg-slate-50/50 hover:bg-slate-50"
                                       onClick={() => {
                                         const el = document.getElementById(`manifest-collapse-${p.id}`)
                                         if (el) {
                                           el.classList.toggle('hidden')
                                         }
                                       }}
                                     >
                                       <FileText size={18} /> 
                                       <span>ดูเอกสารคุมสั่งจ่าย (AI Manifest)</span>
                                     </Button>
                                     <div id={`manifest-collapse-${p.id}`} className="hidden space-y-3 border border-slate-100 p-6 rounded-3xl bg-slate-50/30">
                                       <div className="flex justify-between items-center">
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                           AI-Generated Voucher Manifest
                                         </span>
                                         <div className="flex gap-2">
                                           <Button 
                                             variant="outline" 
                                             size="sm" 
                                             className="h-8 rounded-xl font-bold text-[10px] gap-1 border-slate-200 bg-white"
                                             onClick={() => {
                                               navigator.clipboard.writeText(p.manifest_text)
                                               setCopiedId(p.id)
                                               setTimeout(() => setCopiedId(null), 2000)
                                             }}
                                           >
                                             {copiedId === p.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                             <span>{copiedId === p.id ? "คัดลอกแล้ว!" : "คัดลอก"}</span>
                                           </Button>
                                           <Button 
                                             variant="outline" 
                                             size="sm" 
                                             className="h-8 rounded-xl font-bold text-[10px] gap-1 border-slate-200 bg-white"
                                             onClick={() => {
                                               const file = new Blob([p.manifest_text], {type: 'text/plain'});
                                               const element = document.createElement("a");
                                               element.href = URL.createObjectURL(file);
                                               element.download = `purchase_voucher_${p.id.substring(0, 8)}.txt`;
                                               document.body.appendChild(element);
                                               element.click();
                                               document.body.removeChild(element);
                                             }}
                                           >
                                             <Download size={10} />
                                             <span>ดาวน์โหลด</span>
                                           </Button>
                                         </div>
                                       </div>
                                       <pre className="bg-slate-900 text-slate-100 p-6 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner max-h-[250px] custom-scrollbar text-left whitespace-pre">
                                         {p.manifest_text}
                                       </pre>
                                     </div>
                                   </div>
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
       )}

      {activeView === "finance" && (
        <div className="space-y-6">
          {isApprovedLoading ? (
            <div className="py-32 text-center">
               <Loader2 className="animate-spin inline-block text-emerald-300 w-12 h-12" />
            </div>
          ) : (() => {
            const waitingItems = (approvedPurchases || []).filter((r: any) => r.status === 'approved')
            const paidItems = (approvedPurchases || []).filter((r: any) => r.status === 'paid')
            return (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-[2rem] border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/40 p-6 space-y-2">
                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">รอจ่ายเงิน</div>
                    <div className="text-3xl font-black text-amber-700">{waitingItems.length} <span className="text-base font-bold text-amber-400">รายการ</span></div>
                    <div className="text-sm font-bold text-amber-600">
                      {waitingItems.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0).toLocaleString('th-TH')} ฿
                    </div>
                  </div>
                  <div className="rounded-[2rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-6 space-y-2">
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">จ่ายเงินแล้ว</div>
                    <div className="text-3xl font-black text-emerald-700">{paidItems.length} <span className="text-base font-bold text-emerald-400">รายการ</span></div>
                    <div className="text-sm font-bold text-emerald-600">
                      {paidItems.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0).toLocaleString('th-TH')} ฿
                    </div>
                  </div>
                  <div className="rounded-[2rem] border border-blue-200/60 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-6 space-y-2">
                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">รวมทั้งหมด</div>
                    <div className="text-3xl font-black text-blue-700">{(approvedPurchases || []).length} <span className="text-base font-bold text-blue-400">รายการ</span></div>
                    <div className="text-sm font-bold text-blue-600">
                      {(approvedPurchases || []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0).toLocaleString('th-TH')} ฿
                    </div>
                  </div>
                </div>

                {/* Waiting for Payment Section */}
                {waitingItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">รอดำเนินการจ่ายเงิน</h3>
                        <p className="text-xs text-slate-400 font-medium">รายการที่ผ่านการอนุมัติแล้ว รอฝ่ายการเงินกดยืนยันจ่ายเงิน</p>
                      </div>
                    </div>

                    {/* Desktop Table */}
                    <Card className="hidden md:block rounded-[2.5rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-amber-200/40 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[700px]">
                          <TableHeader className="bg-amber-50/80 backdrop-blur-md">
                            <TableRow className="border-amber-100 hover:bg-transparent">
                              <TableHead className="py-5 pl-8 font-black text-amber-500/80 uppercase tracking-widest text-[10px]">วันที่</TableHead>
                              <TableHead className="font-black text-amber-500/80 uppercase tracking-widest text-[10px]">ผู้ขอเบิก</TableHead>
                              <TableHead className="font-black text-amber-500/80 uppercase tracking-widest text-[10px]">รายการ</TableHead>
                              <TableHead className="font-black text-amber-500/80 uppercase tracking-widest text-[10px]">ยอดรวม</TableHead>
                              <TableHead className="font-black text-amber-500/80 uppercase tracking-widest text-[10px]">วิธีจ่าย</TableHead>
                              <TableHead className="pr-8 text-right font-black text-amber-500/80 uppercase tracking-widest text-[10px]">ดำเนินการ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {waitingItems.map((p: any) => (
                              <TableRow key={p.id} className="border-amber-100/50 hover:bg-amber-50/30 transition-colors group">
                                <TableCell className="py-5 pl-8 font-bold text-slate-500 text-sm">
                                  {format(new Date(p.created_at), "d MMM yy", { locale: th })}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black text-sm">
                                      {p.user?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-800 text-sm">{p.user?.full_name || '-'}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">{p.user?.departments?.name || ''}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight text-sm">{p.title}</div>
                                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">{p.vendor_name && <span>{p.vendor_name} · </span>}{p.items?.length || 0} รายการ</div>
                                </TableCell>
                                <TableCell className="font-black text-lg text-slate-900">
                                  {Number(p.total_amount).toLocaleString('th-TH')} <span className="text-sm text-slate-400">฿</span>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-bold text-[10px]">
                                    {getPaymentMethodLabel(p.payment_method)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="rounded-xl font-bold text-blue-600 hover:bg-blue-50 text-xs"
                                      onClick={() => {
                                        setSelectedPurchase(p)
                                        setIsDetailDrawerOpen(true)
                                      }}
                                    >
                                      <Eye size={14} className="mr-1" /> ดูข้อมูล
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          size="sm"
                                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 h-9 px-4"
                                        >
                                          <Wallet size={14} className="mr-1.5" /> จ่ายเงินแล้ว
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md rounded-[2.5rem] border-0 shadow-2xl p-0 overflow-hidden">
                                        <div className="bg-emerald-600 p-6 text-white">
                                          <DialogHeader>
                                            <DialogTitle className="text-xl font-black text-white">ยืนยันการจ่ายเงิน</DialogTitle>
                                          </DialogHeader>
                                          <p className="text-emerald-100 text-sm mt-2 font-medium">คุณกำลังยืนยันว่าได้จ่ายเงินให้กับรายการนี้แล้ว</p>
                                        </div>
                                        <div className="p-6 space-y-5">
                                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-bold text-slate-500">รายการ</span>
                                              <span className="text-sm font-black text-slate-900">{p.title}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-bold text-slate-500">ผู้เบิก</span>
                                              <span className="text-sm font-bold text-slate-700">{p.user?.full_name || '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                              <span className="text-sm font-bold text-slate-500">ยอดจ่าย</span>
                                              <span className="text-xl font-black text-emerald-600">{Number(p.total_amount).toLocaleString('th-TH')} ฿</span>
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุการจ่ายเงิน (ไม่บังคับ)</Label>
                                            <Textarea
                                              id={`pay-note-${p.id}`}
                                              placeholder="เช่น โอนผ่าน K-BIZ เลขที่อ้างอิง..."
                                              className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50 p-4 focus:ring-emerald-600/20 font-medium"
                                            />
                                          </div>
                                          <Button
                                            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg shadow-emerald-600/20"
                                            disabled={payMutation.isPending}
                                            onClick={() => {
                                              const note = (document.getElementById(`pay-note-${p.id}`) as HTMLTextAreaElement)?.value || ''
                                              payMutation.mutate({ id: p.id, note })
                                            }}
                                          >
                                            {payMutation.isPending ? <Loader2 className="animate-spin" /> : (
                                              <><CheckCircle2 className="mr-2" size={20} /> ยืนยัน — จ่ายเงินแล้ว</>
                                            )}
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>

                    {/* Mobile Cards */}
                    <div className="grid md:hidden gap-4">
                      {waitingItems.map((p: any) => (
                        <Card key={p.id} className="rounded-[2rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-amber-200/40 p-5 space-y-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-xs">
                                  {p.user?.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-700">{p.user?.full_name || '-'}</div>
                                  <div className="text-[10px] text-slate-400">{p.user?.departments?.name || ''}</div>
                                </div>
                              </div>
                              <div className="font-black text-slate-900 text-base leading-tight">{p.title}</div>
                              <div className="text-[10px] text-slate-400 font-medium mt-1">{format(new Date(p.created_at), "d MMM yyyy", { locale: th })} · {p.items?.length || 0} รายการ</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-black text-blue-600 text-lg">{Number(p.total_amount).toLocaleString('th-TH')} <span className="text-sm">฿</span></div>
                              <Badge className="mt-1 bg-slate-100 text-slate-600 border-slate-200 font-bold text-[10px]">
                                {getPaymentMethodLabel(p.payment_method)}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Button 
                              variant="outline"
                              className="h-12 rounded-2xl font-bold text-slate-600 border-slate-200 text-sm"
                              onClick={() => {
                                setSelectedPurchase(p)
                                setIsDetailDrawerOpen(true)
                              }}
                            >
                              <Eye size={16} className="mr-1.5" /> ดูข้อมูล
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/20">
                                  <Wallet size={16} className="mr-1.5" /> จ่ายเงิน
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md rounded-[2.5rem] border-0 shadow-2xl p-0 overflow-hidden">
                                <div className="bg-emerald-600 p-6 text-white">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-black text-white">ยืนยันการจ่ายเงิน</DialogTitle>
                                  </DialogHeader>
                                  <p className="text-emerald-100 text-sm mt-2 font-medium">ยืนยันว่าได้จ่ายเงินให้กับรายการนี้แล้ว</p>
                                </div>
                                <div className="p-6 space-y-5">
                                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-bold text-slate-500">รายการ</span>
                                      <span className="text-sm font-black text-slate-900 text-right max-w-[60%]">{p.title}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-bold text-slate-500">ผู้เบิก</span>
                                      <span className="text-sm font-bold text-slate-700">{p.user?.full_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                      <span className="text-sm font-bold text-slate-500">ยอดจ่าย</span>
                                      <span className="text-xl font-black text-emerald-600">{Number(p.total_amount).toLocaleString('th-TH')} ฿</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุ (ไม่บังคับ)</Label>
                                    <Textarea
                                      id={`pay-note-m-${p.id}`}
                                      placeholder="เช่น โอนผ่าน K-BIZ เลขที่อ้างอิง..."
                                      className="min-h-[80px] rounded-2xl border-slate-100 bg-slate-50 p-4 focus:ring-emerald-600/20 font-medium"
                                    />
                                  </div>
                                  <Button
                                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg shadow-emerald-600/20"
                                    disabled={payMutation.isPending}
                                    onClick={() => {
                                      const note = (document.getElementById(`pay-note-m-${p.id}`) as HTMLTextAreaElement)?.value || ''
                                      payMutation.mutate({ id: p.id, note })
                                    }}
                                  >
                                    {payMutation.isPending ? <Loader2 className="animate-spin" /> : (
                                      <><CheckCircle2 className="mr-2" size={20} /> ยืนยัน — จ่ายเงินแล้ว</>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Already Paid Section */}
                {(approvedPurchases || []).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900">จ่ายเงินแล้ว</h3>
                          <p className="text-xs text-slate-400 font-medium">รายการที่ดำเนินการจ่ายเงินเรียบร้อยแล้ว</p>
                        </div>
                      </div>
                    </div>

                    {/* Filters Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white/80 p-5 rounded-3xl border border-slate-100 shadow-sm no-print">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่จ่าย (เริ่มต้น)</Label>
                        <Input
                          type="date"
                          value={paidStartDate}
                          onChange={(e) => setPaidStartDate(e.target.value)}
                          className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่จ่าย (สิ้นสุด)</Label>
                        <Input
                          type="date"
                          value={paidEndDate}
                          onChange={(e) => setPaidEndDate(e.target.value)}
                          className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ผู้ขอเบิก</Label>
                        <Select value={paidRequester} onValueChange={setPaidRequester}>
                          <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm">
                            <SelectValue placeholder="ทั้งหมด" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            {uniqueRequesters.map((req) => (
                              <SelectItem key={req.id} value={req.id}>{req.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะ</Label>
                        <Select value={paidStatus} onValueChange={setPaidStatus}>
                          <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm">
                            <SelectValue placeholder="จ่ายเงินแล้ว" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">ทั้งหมด (All)</SelectItem>
                            <SelectItem value="paid">จ่ายเงินแล้ว (Paid)</SelectItem>
                            <SelectItem value="approved">รอจ่ายเงิน (Approved)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {filteredPaidItems.length === 0 ? (
                      <Card className="py-20 text-center rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/20">
                        <p className="text-slate-400 font-bold text-sm">ไม่พบรายการเบิกจ่ายเงินที่ตรงกับตัวกรอง</p>
                      </Card>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <Card className="hidden md:block rounded-[2.5rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-emerald-200/30 overflow-hidden">
                          <div className="overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[700px]">
                              <TableHeader className="bg-emerald-50/60 backdrop-blur-md">
                                <TableRow className="border-emerald-100 hover:bg-transparent">
                                  <TableHead className="py-5 pl-8 font-black text-emerald-500/80 uppercase tracking-widest text-[10px]">วันที่จ่าย</TableHead>
                                  <TableHead className="font-black text-emerald-500/80 uppercase tracking-widest text-[10px]">ผู้ขอเบิก</TableHead>
                                  <TableHead className="font-black text-emerald-500/80 uppercase tracking-widest text-[10px]">รายการ</TableHead>
                                  <TableHead className="font-black text-emerald-500/80 uppercase tracking-widest text-[10px]">ยอดจ่าย</TableHead>
                                  <TableHead className="font-black text-emerald-500/80 uppercase tracking-widest text-[10px]">สถานะ</TableHead>
                                  <TableHead className="pr-8 text-right font-black text-emerald-500/80 uppercase tracking-widest text-[10px]">จัดการ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedPaidItems.map((p: any) => (
                                  <TableRow key={p.id} className="border-emerald-100/30 hover:bg-emerald-50/20 transition-colors">
                                    <TableCell className="py-5 pl-8 font-bold text-slate-500 text-sm">
                                      {p.paid_at ? format(new Date(p.paid_at), "d MMM yy", { locale: th }) : format(new Date(p.updated_at || p.created_at), "d MMM yy", { locale: th })}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 font-black text-sm">
                                          {p.user?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-800 text-sm">{p.user?.full_name || '-'}</div>
                                          <div className="text-[10px] text-slate-400 font-medium">{p.user?.departments?.name || ''}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-bold text-slate-700 leading-tight text-sm">{p.title}</div>
                                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{p.vendor_name && <span>{p.vendor_name}</span>}</div>
                                    </TableCell>
                                    <TableCell className="font-black text-lg text-slate-900">
                                      {Number(p.total_amount).toLocaleString('th-TH')} <span className="text-sm text-slate-400">฿</span>
                                    </TableCell>
                                    <TableCell>
                                      {getStatusBadge(p.status)}
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="rounded-xl font-bold text-blue-600 hover:bg-blue-50 text-xs"
                                        onClick={() => {
                                          setSelectedPurchase(p)
                                          setIsDetailDrawerOpen(true)
                                        }}
                                      >
                                        <Eye size={14} className="mr-1" /> ดูข้อมูล
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </Card>

                        {/* Mobile Cards */}
                        <div className="grid md:hidden gap-4">
                          {paginatedPaidItems.map((p: any) => (
                            <Card key={p.id} className="rounded-[2rem] border-0 bg-white/80 backdrop-blur-xl shadow-sm ring-1 ring-emerald-200/30 p-5 space-y-4">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 font-black text-xs">
                                      {p.user?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-700">{p.user?.full_name || '-'}</div>
                                      <div className="text-[10px] text-slate-400">{p.user?.departments?.name || ''}</div>
                                    </div>
                                  </div>
                                  <div className="font-black text-slate-900 text-base leading-tight">{p.title}</div>
                                  <div className="text-[10px] text-slate-400 font-medium mt-1">{p.paid_at ? format(new Date(p.paid_at), "d MMM yyyy", { locale: th }) : format(new Date(p.updated_at || p.created_at), "d MMM yyyy", { locale: th })}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-black text-emerald-600 text-lg">{Number(p.total_amount).toLocaleString('th-TH')} <span className="text-sm">฿</span></div>
                                  <div className="mt-1">{getStatusBadge(p.status)}</div>
                                </div>
                              </div>
                              <Button 
                                variant="outline"
                                className="w-full h-12 rounded-2xl font-bold text-slate-600 border-slate-200 text-sm"
                                onClick={() => {
                                  setSelectedPurchase(p)
                                  setIsDetailDrawerOpen(true)
                                }}
                              >
                                <Eye size={16} className="mr-1.5" /> ดูรายละเอียด
                              </Button>
                            </Card>
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white/50 border border-slate-100 rounded-3xl shadow-sm mt-4 no-print">
                            <div className="text-xs font-bold text-slate-500">
                              แสดง {((paidPage - 1) * itemsPerPage) + 1} - {Math.min(paidPage * itemsPerPage, filteredPaidItems.length)} จากทั้งหมด {filteredPaidItems.length} รายการ
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl font-bold border-slate-200 text-xs h-9"
                                disabled={paidPage === 1}
                                onClick={() => setPaidPage(p => Math.max(1, p - 1))}
                              >
                                ก่อนหน้า
                              </Button>
                              {Array.from({ length: totalPages }).map((_, i) => (
                                <Button
                                  key={i}
                                  variant={paidPage === i + 1 ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "rounded-xl font-bold w-9 h-9 p-0 text-xs",
                                    paidPage === i + 1 ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : "border-slate-200 text-slate-600"
                                  )}
                                  onClick={() => setPaidPage(i + 1)}
                                >
                                  {i + 1}
                                </Button>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl font-bold border-slate-200 text-xs h-9"
                                disabled={paidPage === totalPages}
                                onClick={() => setPaidPage(p => Math.min(totalPages, p + 1))}
                              >
                                ถัดไป
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {waitingItems.length === 0 && paidItems.length === 0 && (
                  <Card className="py-32 text-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <Wallet size={64} className="mx-auto text-slate-200 mb-6" />
                    <h3 className="text-xl font-black text-slate-900">ไม่มีรายการ</h3>
                    <p className="text-slate-400 font-medium">ยังไม่มีรายการเบิกเงินที่ผ่านการอนุมัติ</p>
                  </Card>
                )}
              </div>
            )
          })()}
        </div>
      )}

       {/* Detail Dialog */}
      <Dialog open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
         <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {selectedPurchase && (
               <div className="flex flex-col h-full overflow-hidden">
                  <div className="bg-slate-900 p-6 md:p-10 text-white shrink-0">
                    <DialogHeader className="pb-4">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                  <div className="p-6 md:p-10 space-y-10 bg-white flex-1 overflow-y-auto custom-scrollbar">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           {selectedPurchase.document_type && (
                              <div className="space-y-4">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภทเอกสาร (AI วิเคราะห์)</h4>
                                 <div className="bg-blue-50/50 text-blue-700 rounded-3xl p-6 border border-blue-100 font-bold flex items-center gap-2">
                                    <Receipt size={16} />
                                    <span>{selectedPurchase.document_type}</span>
                                 </div>
                              </div>
                           )}
                           {/* Document Number & Date */}
                           {(selectedPurchase.document_number || selectedPurchase.document_date) && (
                              <div className="grid grid-cols-2 gap-4">
                                 {selectedPurchase.document_number && (
                                    <div className="space-y-2">
                                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขที่เอกสาร</h4>
                                       <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 font-bold text-slate-800 text-sm">{selectedPurchase.document_number}</div>
                                    </div>
                                 )}
                                 {selectedPurchase.document_date && (
                                    <div className="space-y-2">
                                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันที่เอกสาร</h4>
                                       <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 font-bold text-slate-800 text-sm">{selectedPurchase.document_date}</div>
                                    </div>
                                 )}
                              </div>
                           )}
                           {/* Vendor / Customer / Project */}
                           {(selectedPurchase.vendor_name || selectedPurchase.vendor_address || selectedPurchase.vendor_tax_id || selectedPurchase.customer_name || selectedPurchase.customer_address || selectedPurchase.project_name) && (
                              <div className="space-y-4">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลคู่ค้า / ลูกค้า</h4>
                                 <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-3 text-sm">
                                    {selectedPurchase.vendor_name && (
                                       <div><span className="text-slate-400 font-bold">ชื่อคู่ค้า:</span> <span className="font-bold text-slate-700">{selectedPurchase.vendor_name}</span></div>
                                    )}
                                    {selectedPurchase.vendor_address && (
                                       <div><span className="text-slate-400 font-bold">ที่อยู่คู่ค้า:</span> <span className="font-bold text-slate-700">{selectedPurchase.vendor_address}</span></div>
                                    )}
                                    {selectedPurchase.vendor_tax_id && (
                                       <div><span className="text-slate-400 font-bold">Tax ID (คู่ค้า):</span> <span className="font-mono font-bold text-slate-700">{selectedPurchase.vendor_tax_id}</span></div>
                                    )}
                                    {selectedPurchase.customer_name && (
                                       <div><span className="text-slate-400 font-bold">ลูกค้า:</span> <span className="font-bold text-slate-700">{selectedPurchase.customer_name}</span></div>
                                    )}
                                    {selectedPurchase.customer_tax_id && (
                                       <div><span className="text-slate-400 font-bold">Tax ID (ลูกค้า):</span> <span className="font-mono font-bold text-slate-700">{selectedPurchase.customer_tax_id}</span></div>
                                    )}
                                    {selectedPurchase.customer_address && (
                                       <div><span className="text-slate-400 font-bold">ที่อยู่ลูกค้า:</span> <span className="font-bold text-slate-700">{selectedPurchase.customer_address}</span></div>
                                    )}
                                    {selectedPurchase.project_name && (
                                       <div><span className="text-slate-400 font-bold">ชื่องาน:</span> <span className="font-bold text-slate-700">{selectedPurchase.project_name}</span></div>
                                    )}
                                 </div>
                              </div>
                           )}
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายละเอียดรายการ</h4>
                              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-3">
                                 {selectedPurchase.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center">
                                       <span className="font-bold text-slate-600">x{item.quantity} {item.name}</span>
                                       <span className="font-black text-slate-900">{(Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                    </div>
                                 ))}
                                 {/* VAT Breakdown */}
                                 {(() => {
                                    const computedItemsTotal = (selectedPurchase.items || []).reduce(
                                       (sum: number, it: any) => sum + Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * 100) / 100,
                                       0
                                    )
                                    const beforeVat = Number(selectedPurchase.amount_before_vat) > 0
                                       ? Number(selectedPurchase.amount_before_vat)
                                       : computedItemsTotal
                                    const vat = Number(selectedPurchase.vat_amount) || 0
                                    const totalAfterVat = Number(selectedPurchase.total_amount) || (beforeVat + vat)
                                    return (
                                 <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                       <span className="text-slate-400 font-bold">ยอดก่อน VAT</span>
                                       <span className="font-bold text-slate-600">{beforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                       <span className="text-slate-400 font-bold">VAT 7%</span>
                                       <span className="font-bold text-slate-600">{vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
                                       <span className="font-black text-slate-900 text-sm">ยอดรวมหลัง VAT</span>
                                       <span className="font-black text-slate-900 text-lg">{totalAfterVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                    </div>
                                 </div>
                                    )
                                 })()}
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
                           {selectedPurchase.receipt_url ? (() => {
                              const urls = getReceiptUrls(selectedPurchase.receipt_url);
                              if (urls.length === 0) {
                                return (
                                  <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                                     <Receipt size={64} />
                                     <p className="font-bold mt-4">ไม่มีไฟล์ใบเสร็จ</p>
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-4">
                                  {urls.map((url, i) => (
                                    <div key={i} className="relative group overflow-hidden rounded-3xl border border-slate-100 shadow-sm aspect-square bg-slate-50">
                                       <img 
                                         src={url} 
                                         alt={`Receipt #${i+1}`} 
                                         className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                         onError={(e) => {
                                           (e.target as any).style.display = 'none';
                                         }}
                                       />
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                          <div className="text-white text-xs font-bold mb-2">เอกสารแนบ #{i+1}</div>
                                          <Button className="bg-white text-slate-900 rounded-2xl font-bold" onClick={() => window.open(url, '_blank')}>
                                             <Eye className="mr-2" size={16} /> ดูไฟล์ขนาดใหญ่
                                          </Button>
                                          {canModifySelected && (
                                            <Button 
                                              variant="destructive"
                                              className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold gap-1 mt-1 border-0"
                                              onClick={() => handleDeleteAttachment(url)}
                                            >
                                               <Trash2 size={16} /> ลบไฟล์แนบ
                                            </Button>
                                          )}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })() : (
                              <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                                 <Receipt size={64} />
                                 <p className="font-bold mt-4">ไม่มีไฟล์ใบเสร็จ</p>
                              </div>
                            )}

                           {canModifySelected && (
                             <div className="pt-2">
                               <input 
                                 id="detail-receipt-upload" 
                                 type="file" 
                                 multiple 
                                 accept="image/*,application/pdf"
                                 className="hidden" 
                                 onChange={(e) => handleAddAttachment(e.target.files)} 
                               />
                               <Button 
                                 type="button" 
                                 variant="outline"
                                 className="w-full h-14 rounded-2xl font-bold border-dashed border-2 hover:bg-slate-50 gap-2 border-slate-200"
                                 disabled={isUploadingAttachment}
                                 onClick={() => document.getElementById('detail-receipt-upload')?.click()}
                                >
                                 {isUploadingAttachment ? (
                                   <Loader2 className="animate-spin text-slate-400" size={18} />
                                 ) : (
                                   <>+ เพิ่มไฟล์แนบ (Add Attachment)</>
                                 )}
                               </Button>
                             </div>
                           )}
                        </div>
                     </div>

                     {/* Manifest segment if exists */}
                     {selectedPurchase.manifest_text && (
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                 <FileText size={14} /> เอกสารคุมสั่งจ่าย (AI Manifest Voucher)
                              </h4>
                              <div className="flex gap-2">
                                 <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-xl font-bold text-xs gap-1 border-slate-200"
                                    onClick={() => {
                                       navigator.clipboard.writeText(selectedPurchase.manifest_text)
                                       setCopiedId('selected')
                                       setTimeout(() => setCopiedId(null), 2000)
                                    }}
                                 >
                                    {copiedId === 'selected' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                    <span>{copiedId === 'selected' ? "คัดลอกแล้ว!" : "คัดลอกข้อความ"}</span>
                                 </Button>
                                 <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-xl font-bold text-xs gap-1 border-slate-200"
                                    onClick={() => {
                                       const file = new Blob([selectedPurchase.manifest_text], {type: 'text/plain'});
                                       const element = document.createElement("a");
                                       element.href = URL.createObjectURL(file);
                                       element.download = `purchase_voucher_${selectedPurchase.id.substring(0, 8)}.txt`;
                                       document.body.appendChild(element);
                                       element.click();
                                       document.body.removeChild(element);
                                    }}
                                 >
                                    <Download size={12} />
                                    <span>ดาวน์โหลด .txt</span>
                                 </Button>
                              </div>
                           </div>
                           <pre className="bg-slate-900 text-slate-100 p-6 rounded-3xl font-mono text-sm leading-relaxed overflow-x-auto border border-slate-800 shadow-inner max-h-[300px] custom-scrollbar text-left whitespace-pre">
                              {selectedPurchase.manifest_text}
                           </pre>
                        </div>
                     )}

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
                            {canModifySelected && (
                       <>
                         <Button 
                           variant="outline" 
                           className="h-14 rounded-2xl font-bold text-blue-600 border-blue-200 hover:bg-blue-50 gap-2 mr-auto"
                           onClick={() => {
                              setEditForm({
                                 id: selectedPurchase.id,
                                 title: selectedPurchase.title,
                                 category: selectedPurchase.category,
                                 purpose: selectedPurchase.purpose,
                                 items: selectedPurchase.items || [{ name: "", quantity: 1, unit_price: 0 }],
                                 payment_method: selectedPurchase.payment_method,
                                 document_type: selectedPurchase.document_type || "",
                                 document_number: selectedPurchase.document_number || "",
                                 document_date: selectedPurchase.document_date || "",
                                 subtotal: selectedPurchase.amount_before_vat || 0,
                                 vat_amount: selectedPurchase.vat_amount || 0,
                                 vat_enabled: Number(selectedPurchase.vat_amount) > 0,
                                 vat_type: (Number(selectedPurchase.amount_before_vat) > 0 && Math.abs(Number(selectedPurchase.amount_before_vat) - (selectedPurchase.items || []).reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0)) > 5) ? "inclusive" : "exclusive",
                                 total_amount: selectedPurchase.total_amount || 0,
                                 vendor_name: selectedPurchase.vendor_name || "",
                                 vendor_address: selectedPurchase.vendor_address || "",
                                 vendor_tax_id: selectedPurchase.vendor_tax_id || "",
                                 customer_name: selectedPurchase.customer_name || "",
                                 customer_tax_id: selectedPurchase.customer_tax_id || "",
                                 customer_address: selectedPurchase.customer_address || "",
                                 project_name: selectedPurchase.project_name || "",
                              })
                              setIsEditModalOpen(true)
                           }}
                         >
                            แก้ไขข้อมูล
                         </Button>
                         <Button 
                           variant="destructive" 
                           className="h-14 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 gap-2 border-0"
                           disabled={deleteMutation.isPending}
                           onClick={() => {
                              if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบคำขอเบิกเงินนี้ถาวร?")) {
                                 deleteMutation.mutate(selectedPurchase.id)
                              }
                           }}
                         >
                            <Trash2 size={18} /> ลบรายการ
                         </Button>
                       </>
                     )}
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

      {/* Edit Purchase Request Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
         <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {editForm && (
               <div className="flex flex-col h-full overflow-hidden">
                  <div className="bg-slate-900 p-6 md:p-10 text-white shrink-0">
                     <DialogHeader>
                        <DialogTitle className="text-3xl font-black text-white">แก้ไขใบเบิกเงิน</DialogTitle>
                        <p className="text-slate-400 font-medium text-sm mt-1">แก้ไขรายละเอียดของคำขอเบิกเงิน</p>
                     </DialogHeader>
                  </div>

                  <div className="p-6 md:p-10 space-y-8 bg-white flex-1 overflow-y-auto custom-scrollbar">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อรายการเบิก</Label>
                           <Input 
                              placeholder="เช่น ค่าเดินทางไปพบลูกค้า, ค่าวัสดุอุปกรณ์..."
                              className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการเบิก</Label>
                           <Select 
                             value={CATEGORIES.includes(editForm.category) ? editForm.category : "อื่นๆ"} 
                             onValueChange={(val) => {
                                if (val === "อื่นๆ") {
                                   setEditForm({ ...editForm, category: "อื่นๆ" })
                                } else {
                                   setEditForm({ ...editForm, category: val })
                                }
                             }}
                           >
                              <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold">
                                 <SelectValue placeholder="เลือกประเภทการเบิก" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl max-h-[300px]">
                                 {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat} className="font-bold py-3">
                                       {cat}
                                    </SelectItem>
                                 ))}
                                 <SelectItem value="อื่นๆ" className="font-bold py-3">อื่นๆ</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>

                        {editForm.category === "อื่นๆ" && (
                           <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ระบุประเภทการเบิกอื่น ๆ</Label>
                              <Input 
                                 placeholder="พิมพ์ประเภทการเบิก..."
                                 className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                 value={editForm.customCategory || ""}
                                 onChange={(e) => setEditForm({ ...editForm, customCategory: e.target.value })}
                              />
                           </div>
                        )}

                        <div className="space-y-2">
                           <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วิธีการจ่ายเงิน</Label>
                           <Select 
                             value={editForm.payment_method} 
                             onValueChange={(val) => setEditForm({ ...editForm, payment_method: val })}
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
                           <Input 
                              placeholder="ระบุวัตถุประสงค์ในการเบิกจ่าย..."
                              className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                              value={editForm.purpose}
                              onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                           />
                        </div>
                     </div>

                     {/* Document number & Vendor Details */}
                     <div className="border-t border-slate-100 pt-6 space-y-6">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">ข้อมูลคู่ค้าและเอกสาร (ไม่บังคับ)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">เลขที่เอกสาร</Label>
                              <Input 
                                 placeholder="ระบุเลขที่เอกสาร/ใบเสร็จ..."
                                 className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                 value={editForm.document_number}
                                 onChange={(e) => setEditForm({ ...editForm, document_number: e.target.value })}
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">วันที่เอกสาร</Label>
                              <Input 
                                 type="date"
                                 className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                 value={editForm.document_date}
                                 onChange={(e) => setEditForm({ ...editForm, document_date: e.target.value })}
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อร้านค้า / คู่ค้า</Label>
                              <Input 
                                 placeholder="ชื่อผู้ขาย/ผู้ให้บริการ..."
                                 className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                 value={editForm.vendor_name}
                                 onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID ร้านค้า</Label>
                              <Input 
                                 placeholder="เลขประจำตัวผู้เสียภาษี..."
                                 className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                 value={editForm.vendor_tax_id}
                                 onChange={(e) => setEditForm({ ...editForm, vendor_tax_id: e.target.value })}
                              />
                           </div>
                           <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ที่อยู่ร้านค้า</Label>
                              <Input 
                                 placeholder="ที่อยู่ร้านค้าคู่ค้า..."
                                 className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-blue-600/20 font-bold"
                                 value={editForm.vendor_address}
                                 onChange={(e) => setEditForm({ ...editForm, vendor_address: e.target.value })}
                              />
                           </div>
                        </div>
                     </div>

                     {/* Items Section */}
                     <div className="border-t border-slate-100 pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                           <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการสินค้า/บริการ</Label>
                           <Button 
                             type="button" 
                             variant="outline" 
                             size="sm"
                             className="rounded-xl font-bold text-xs border-slate-200"
                             onClick={() => {
                                const items = [...editForm.items, { name: "", quantity: 1, unit_price: 0 }]
                                setEditForm({ ...editForm, items })
                             }}
                           >
                              + เพิ่มแถวรายการ
                           </Button>
                        </div>
                        <div className="space-y-3">
                           {editForm.items.map((item: any, index: number) => (
                              <div key={index} className="flex gap-3 items-center">
                                 <div className="flex-[4]">
                                    <Input 
                                      placeholder="ชื่อรายการ เช่น ชานมไข่มุก" 
                                      className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-sm"
                                      value={item.name}
                                      onChange={(e) => {
                                         const items = [...editForm.items]
                                         items[index].name = e.target.value
                                         setEditForm({ ...editForm, items })
                                      }}
                                    />
                                 </div>
                                 <div className="flex-[1]">
                                    <Input 
                                      type="number"
                                      step="0.01" placeholder="จำนวน" 
                                      className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-sm"
                                      value={item.quantity}
                                      onChange={(e) => {
                                         const items = [...editForm.items]
                                         items[index].quantity = parseFloat(e.target.value) || 0
                                         setEditForm({ ...editForm, items })
                                      }}
                                    />
                                 </div>
                                 <div className="flex-[2]">
                                    <Input 
                                      type="number"
                                      placeholder="ราคาต่อหน่วย" 
                                      className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-sm"
                                      value={item.unit_price}
                                      onChange={(e) => {
                                         const items = [...editForm.items]
                                         items[index].unit_price = parseFloat(e.target.value) || 0
                                         setEditForm({ ...editForm, items })
                                      }}
                                    />
                                 </div>
                                 {editForm.items.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="text-rose-500 hover:text-rose-700 p-2"
                                      onClick={() => {
                                         const items = editForm.items.filter((_: any, i: number) => i !== index)
                                         setEditForm({ ...editForm, items })
                                      }}
                                    >
                                       <Trash2 size={16} />
                                    </Button>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* VAT Section */}
                     <div className="border-t border-slate-100 pt-6 space-y-4">
                        <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                 <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600/30 cursor-pointer accent-blue-600"
                                    checked={!!editForm.vat_enabled}
                                    onChange={(e) => setEditForm({ ...editForm, vat_enabled: e.target.checked })}
                                 />
                                 <Label className="text-xs font-black text-slate-800 cursor-pointer">ภาษีมูลค่าเพิ่ม (VAT 7%)</Label>
                              </label>
                              <span className={cn(
                                 "font-black text-sm tabular-nums",
                                 editForm.vat_enabled ? "text-slate-700" : "text-slate-300"
                              )}>
                                 {(editForm.vat_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                              </span>
                           </div>
                           {!!editForm.vat_enabled && (
                              <div className="flex justify-end gap-3 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                 <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, vat_type: "exclusive" })}
                                    className={cn(
                                       "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
                                       editForm.vat_type === "exclusive"
                                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10"
                                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                    )}
                                 >
                                    แยกนอก (Exclusive)
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, vat_type: "inclusive" })}
                                    className={cn(
                                       "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
                                       editForm.vat_type === "inclusive"
                                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10"
                                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                     )}
                                  >
                                     รวมใน (Inclusive)
                                  </button>
                               </div>
                            )}
                         </div>

                         {/* Computed Summary inside Edit Dialog */}
                         <div className="rounded-2xl overflow-hidden border border-slate-200 text-sm">
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50">
                               <span className="font-bold text-slate-500 text-xs">ยอดก่อน VAT</span>
                               <span className="font-bold text-slate-700 tabular-nums">
                                  {(editForm.subtotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                               </span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-t border-slate-200">
                               <span className="font-bold text-slate-500 text-xs">VAT 7%</span>
                               <span className="font-bold text-slate-700 tabular-nums">
                                  {(editForm.vat_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                               </span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-4 bg-slate-900 text-white">
                               <span className="font-bold text-slate-400 text-xs">ยอดรวมหลัง VAT</span>
                               <span className="text-base font-black">{(editForm.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                            </div>
                         </div>
                      </div>
                  </div>

                  <DialogFooter className="p-10 pt-4 bg-white border-t border-slate-100 gap-4">
                     <Button 
                       variant="outline" 
                       className="h-14 rounded-2xl font-bold text-slate-500 border-slate-200"
                       onClick={() => setIsEditModalOpen(false)}
                     >
                        ยกเลิก
                     </Button>
                     <Button 
                       className="h-14 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 border-0"
                       disabled={editMutation.isPending}
                       onClick={() => {
                          const payload = { ...editForm }
                          if (payload.category === "อื่นๆ" && payload.customCategory) {
                             payload.category = payload.customCategory
                          }
                          delete payload.customCategory

                          // Regenerate manifest text with updated values!
                          const total = payload.items.reduce((sum: number, item: any) => sum + Math.round((Number(item.quantity) * Number(item.unit_price)) * 100) / 100, 0)
                          payload.manifest_text = generateManifestText(payload, total)

                          editMutation.mutate(payload)
                       }}
                     >
                        {editMutation.isPending ? <Loader2 className="animate-spin" /> : "บันทึกการแก้ไข"}
                     </Button>
                  </DialogFooter>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </div>
  )
}
