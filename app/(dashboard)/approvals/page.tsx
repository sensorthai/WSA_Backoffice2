"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toast } from "sonner"
import { 
  Search,
  CheckCircle2, 
  XCircle, 
  FileText, 
  Wallet, 
  Car, 
  ChevronRight,
  Loader2,
  History as HistoryIcon,
  Bell,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Banknote,
  AlertTriangle,
  Eye,
  Clock,
  Printer
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { TablePagination, useTablePagination } from "@/components/ui/TablePagination"

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

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role

  // --- States ---
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [activeView, setActiveView] = useState("pending")
  const [mounted, setMounted] = useState(false)

  // --- Finance Filter States ---
  const [finPaidStartDate, setFinPaidStartDate] = useState("")
  const [finPaidEndDate, setFinPaidEndDate] = useState("")
  const [finPaidRequester, setFinPaidRequester] = useState("all")
  const [finPaidStatus, setFinPaidStatus] = useState("paid")
  const [finPaidPage, setFinPaidPage] = useState(1)

  // --- Search & Filters for Tabs ---
  const [pendingSearch, setPendingSearch] = useState("")
  const [pendingTypeFilter, setPendingTypeFilter] = useState("all")

  const [historySearch, setHistorySearch] = useState("")
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all")
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all")

  const [finWaitingSearch, setFinWaitingSearch] = useState("")
  const [finPaidSearch, setFinPaidSearch] = useState("")
  const [nonFinPaidSearch, setNonFinPaidSearch] = useState("")
  const finItemsPerPage = 10

  useEffect(() => {
    setMounted(true)
  }, [])

  // --- Queries ---
  const { data: pendingItems, isLoading: isPendingLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending")
      return res.json()
    },
    refetchInterval: 30000 // 30 seconds
  })

  const { data: historyItems, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["approval-history"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/history")
      return res.json()
    }
  })

  // รายการที่จ่ายเงินแล้ว (purchase / reimbursement สถานะ paid)
  const rawPaidItems = Array.isArray(historyItems)
    ? historyItems.filter((it: any) => it.status === 'paid' && (it.type === 'purchase' || it.type === 'reimbursement'))
    : []

  // Filtered Pending
  const filteredPendingItems = useMemo(() => {
    if (!Array.isArray(pendingItems)) return []
    return pendingItems.filter((it: any) => {
      if (pendingTypeFilter !== "all" && it.type !== pendingTypeFilter) return false
      if (pendingSearch.trim()) {
        const q = pendingSearch.toLowerCase()
        const matchLabel = (it.label || "").toLowerCase().includes(q)
        const matchUser = (it.user?.full_name || "").toLowerCase().includes(q)
        const matchTitle = (it.title || it.description || it.destination || it.reason || "").toLowerCase().includes(q)
        if (!matchLabel && !matchUser && !matchTitle) return false
      }
      return true
    })
  }, [pendingItems, pendingTypeFilter, pendingSearch])

  const pendingPagination = useTablePagination(filteredPendingItems, 10, [10, 20, 30, 50, 100])

  // Filtered History
  const filteredHistoryItems = useMemo(() => {
    if (!Array.isArray(historyItems)) return []
    return historyItems.filter((it: any) => {
      if (historyTypeFilter !== "all" && it.type !== historyTypeFilter) return false
      if (historyStatusFilter !== "all" && it.status !== historyStatusFilter) return false
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase()
        const matchLabel = (it.label || "").toLowerCase().includes(q)
        const matchUser = (it.user?.full_name || "").toLowerCase().includes(q)
        const matchApprover = (it.approver_name || "").toLowerCase().includes(q)
        const matchTitle = (it.title || it.description || it.destination || it.reason || "").toLowerCase().includes(q)
        if (!matchLabel && !matchUser && !matchApprover && !matchTitle) return false
      }
      return true
    })
  }, [historyItems, historyTypeFilter, historyStatusFilter, historySearch])

  const historyPagination = useTablePagination(filteredHistoryItems, 10, [10, 20, 30, 50, 100])

  // Filtered Non-Finance Paid Items
  const filteredNonFinPaidItems = useMemo(() => {
    return rawPaidItems.filter((it: any) => {
      if (nonFinPaidSearch.trim()) {
        const q = nonFinPaidSearch.toLowerCase()
        const matchUser = (it.user?.full_name || "").toLowerCase().includes(q)
        const matchTitle = (it.title || it.description || it.vendor_name || it.vendor || "").toLowerCase().includes(q)
        if (!matchUser && !matchTitle) return false
      }
      return true
    })
  }, [rawPaidItems, nonFinPaidSearch])

  const nonFinPaidPagination = useTablePagination(filteredNonFinPaidItems, 10, [10, 20, 30, 50, 100])

  // --- Finance: User Profile & Permission ---
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

  // --- Finance: Approved Purchases Query ---
  const { data: approvedPurchases, isLoading: isApprovedLoading } = useQuery({
    queryKey: ["approved-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/approved?status=all")
      return res.json()
    },
    enabled: !!session?.user && isFinanceUser
  })

  const finWaitingItems = useMemo(() => (approvedPurchases || []).filter((r: any) => r.status === 'approved'), [approvedPurchases])

  const finUniqueRequesters = useMemo(() => {
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

  const filteredFinWaitingItems = useMemo(() => {
    return finWaitingItems.filter((p: any) => {
      if (finWaitingSearch.trim()) {
        const q = finWaitingSearch.toLowerCase()
        const matchTitle = (p.title || "").toLowerCase().includes(q)
        const matchVendor = (p.vendor_name || p.vendor || "").toLowerCase().includes(q)
        const matchUser = (p.user?.full_name || "").toLowerCase().includes(q)
        if (!matchTitle && !matchVendor && !matchUser) return false
      }
      return true
    })
  }, [finWaitingItems, finWaitingSearch])

  const finWaitingPagination = useTablePagination(filteredFinWaitingItems, 10, [10, 20, 30, 50, 100])

  const finFilteredPaidItems = useMemo(() => {
    return (approvedPurchases || []).filter((p: any) => {
      if (finPaidStatus !== "all" && p.status !== finPaidStatus) return false
      if (finPaidRequester !== "all" && p.user_id !== finPaidRequester) return false
      if (finPaidSearch.trim()) {
        const q = finPaidSearch.toLowerCase()
        const matchTitle = (p.title || "").toLowerCase().includes(q)
        const matchVendor = (p.vendor_name || p.vendor || "").toLowerCase().includes(q)
        const matchUser = (p.user?.full_name || "").toLowerCase().includes(q)
        if (!matchTitle && !matchVendor && !matchUser) return false
      }
      const payDateStr = p.paid_at || p.updated_at || p.created_at
      if (payDateStr) {
        const payDate = new Date(payDateStr)
        const checkDate = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate()).getTime()
        if (finPaidStartDate) {
          const start = new Date(finPaidStartDate)
          if (checkDate < new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) return false
        }
        if (finPaidEndDate) {
          const end = new Date(finPaidEndDate)
          if (checkDate > new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()) return false
        }
      } else if (finPaidStartDate || finPaidEndDate) {
        return false
      }
      return true
    })
  }, [approvedPurchases, finPaidStatus, finPaidRequester, finPaidStartDate, finPaidEndDate, finPaidSearch])

  const finPaidPagination = useTablePagination(finFilteredPaidItems, 10, [10, 20, 30, 50, 100])

  useEffect(() => { setFinPaidPage(1) }, [finPaidStatus, finPaidRequester, finPaidStartDate, finPaidEndDate])

  // --- Mutations ---
  const approveMutation = useMutation({
    mutationFn: async ({ id, type, action, note, itemStatus }: any) => {
      const stage = 
        type === 'reimbursement'
          ? (itemStatus === 'approved' ? 'ceo' : 'supervisor')
          : ((type === 'leave' || type === 'purchase') && userRole === 'ceo' ? 'ceo' : 'supervisor')
      const endpoint = `/api/${type === 'leave' ? 'leaves' : type === 'purchase' ? 'purchases' : type === 'reimbursement' ? 'reimbursements' : 'cars/bookings'}/${id}/approve`
      
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, note, stage }),
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) throw new Error((await res.json()).error || "Action failed")
      return res.json()
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["pending-approvals"] })
      await queryClient.cancelQueries({ queryKey: ["approval-history"] })

      const previousPending = queryClient.getQueryData<any[]>(["pending-approvals"]) || []
      const previousHistory = queryClient.getQueryData<any[]>(["approval-history"]) || []

      // Optimistically remove the item from the pending list cache
      queryClient.setQueryData<any[]>(["pending-approvals"], (old) => {
        if (!old) return []
        return old.filter(item => item.id !== id)
      })

      return { previousPending, previousHistory }
    },
    onError: (e: any, variables, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(["pending-approvals"], context.previousPending)
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(["approval-history"], context.previousHistory)
      }
      toast.error("ไม่สามารถดำเนินการได้: " + e.message)
    },
    onSuccess: (_data, variables: any) => {
      setSelectedItem(null)
      setRejectNote("")
      if (variables?.action === 'request_revision') {
        toast.success("ส่งคำขอให้แก้ไขหรือแนบเอกสารเพิ่มเติมเรียบร้อยแล้ว!")
      } else if (variables?.action === 'approve' && variables?.type === 'reimbursement' && variables?.itemStatus === 'approved') {
        toast.success("ยืนยันการโอนเงินเรียบร้อยแล้ว!")
      } else {
        toast.success("บันทึกการดำเนินการเรียบร้อยแล้ว!")
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] })
      queryClient.invalidateQueries({ queryKey: ["approval-history"] })
      queryClient.invalidateQueries({ queryKey: ["approved-purchases"] })
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
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] })
      queryClient.invalidateQueries({ queryKey: ["approval-history"] })
      toast.success("บันทึกการจ่ายเงินเรียบร้อยแล้ว!")
    },
    onError: (err: any) => {
      toast.error("การจ่ายเงินล้มเหลว: " + err.message)
    }
  })

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'petty_cash': return 'เงินสดสำรองจ่าย'
      case 'credit_card': return 'บัตรเครดิตบริษัท'
      case 'k_biz': return 'บัญชีธนาคาร (K-Biz)'
      default: return method || 'เงินสดสำรองจ่าย'
    }
  }

  const handlePrint = (purchaseItem: any) => {
    if (!purchaseItem) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อพิมพ์เอกสาร");
      return;
    }

    const docDate = purchaseItem.document_date ? format(new Date(purchaseItem.document_date), "d MMMM yyyy", { locale: th }) : (purchaseItem.created_at ? format(new Date(purchaseItem.created_at), "d MMMM yyyy", { locale: th }) : "-");
    
    const paymentLabels: Record<string, string> = { 
      petty_cash: 'เงินสดย่อย', 
      credit_card: 'ตัดบัตรเครดิต', 
      k_biz: 'K BIZ (โอน)' 
    };

    const items = purchaseItem.items || [];
    // คำนวณยอดสำหรับสรุป (fallback จากรายการ หากไม่มีค่าในฐานข้อมูล)
    const computedItemsTotal = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const printBeforeVat = Number(purchaseItem.amount_before_vat) > 0 ? Number(purchaseItem.amount_before_vat) : computedItemsTotal;
    const printVat = Number(purchaseItem.vat_amount) || 0;
    const printTotal = Number(purchaseItem.total_amount) || (printBeforeVat + printVat);

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
          <title>ใบรับรองแทนใบเสร็จรับเงิน - ${purchaseItem.document_number || 'TEMP'}</title>
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
            <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin: 0 10px; font-weight: bold; text-align: center; min-height: 20px;">บริษัท ไวร์เลส โซลูชั่น เอเชีย จำกัด</span>
            <span style="white-space: nowrap;">(ผู้ซื้อ / ผู้ใช้บริการ)</span>
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
              วิธีการชำระเงิน: ${paymentLabels[purchaseItem.payment_method] || purchaseItem.payment_method || '-'}
            </div>
            <div style="display: flex; align-items: center; font-size: 14px; font-weight: bold;">
              <span style="margin-right: 15px; white-space: nowrap;">รวมเป็นเงิน</span>
              <div style="border: 1px solid #000; padding: 12px 25px; min-width: 180px; text-align: right; background-color: #fafafa; font-size: 16px; font-weight: bold;">
                ${printTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; font-size: 14px; line-height: 2.2;">
            <div>ข้าพเจ้า <span style="border-bottom: 1px dotted #000; display: inline-block; width: 300px; text-align: center; font-weight: bold; padding: 0 5px;">${purchaseItem.user?.full_name || '-'}</span> (ผู้สั่งจ่าย) ตำแหน่ง <span style="border-bottom: 1px dotted #000; display: inline-block; width: 250px; text-align: center; font-weight: bold; padding: 0 5px;">${purchaseItem.user?.position || '-'}</span></div>
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

          ${purchaseItem.receipt_url ? (() => {
            const urls = getReceiptUrls(purchaseItem.receipt_url);
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
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'leave': return <FileText className="text-emerald-500" />
      case 'purchase': return <Wallet className="text-blue-500" />
      case 'car_booking': return <Car className="text-indigo-500" />
      case 'reimbursement': return <Wallet className="text-amber-500" />
      default: return <LayoutGrid />
    }
  }

  const getStatusBadge = (status: string, type?: string) => {
    if (type === 'reimbursement') {
      switch (status) {
        case 'pending': return <Badge className="bg-amber-100 text-amber-600 border-amber-200">รอผู้จัดการฝ่ายอบรม</Badge>
        case 'approved': return <Badge className="bg-blue-100 text-blue-600 border-blue-200">รอฝ่ายบัญชีโอนเงิน</Badge>
        case 'paid': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 font-bold">โอนเงินแล้ว</Badge>
        case 'rejected': return <Badge className="bg-rose-100 text-rose-600 border-rose-200">ปฏิเสธ</Badge>
        default: return <Badge>{status}</Badge>
      }
    }
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-600 border-amber-200">รอหัวหน้า</Badge>
      case 'need_revision': return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">รอการแก้ไข / ขอเอกสารเพิ่ม</Badge>
      case 'supervisor_approved': return <Badge className="bg-blue-100 text-blue-600 border-blue-200">รอ CEO</Badge>
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 font-bold">อนุมัติแล้ว</Badge>
      case 'rejected': return <Badge className="bg-rose-100 text-rose-600 border-rose-200">ปฏิเสธ</Badge>
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 font-bold">โอนเงินแล้ว</Badge>
      case 'returned': return <Badge className="bg-slate-900 text-white border-0">คืนรถแล้ว</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const renderDetail = (item: any) => {
    if (!item) return null
    return (
      <div className="space-y-8 py-4">
        <div className="flex items-center gap-4">
           <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
              <AvatarImage src={item.user?.avatar_url} />
              <AvatarFallback className="bg-slate-100 text-xl font-black">{item.user?.full_name?.charAt(0)}</AvatarFallback>
           </Avatar>
           <div>
              <h3 className="text-2xl font-black text-slate-900">{item.user?.full_name}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{item.label} • {format(new Date(item.created_at), "d MMMM yyyy", { locale: th })}</p>
           </div>
        </div>

        <div className="p-4 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 space-y-6">
           {item.type === 'leave' && (
             <>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภทการลา</Label>
                    <div className="text-lg font-black text-slate-900">{item.leave_type}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนวัน</Label>
                    <div className="text-lg font-black text-slate-900">{item.days_count} วัน</div>
                  </div>
               </div>
               <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ระยะเวลา</Label>
                  <div className="font-bold text-slate-600">{format(new Date(item.start_date), "d MMM yyyy", { locale: th })} - {format(new Date(item.end_date), "d MMM yyyy", { locale: th })}</div>
               </div>
             </>
           )}

           {item.type === 'purchase' && (
             <>
                <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการเบิก</Label>
                  <div className="text-2xl font-black text-slate-900 flex items-center gap-2 mt-1">
                    {item.title}
                    {item.document_type && (
                      <Badge className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-50/80 font-bold ml-2">
                        {item.document_type}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หมวดหมู่</Label>
                    <div className="font-bold text-slate-700 text-sm mt-1 bg-white p-3 rounded-xl border border-slate-100">{item.category || "อื่นๆ"}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ช่องทางชำระเงิน</Label>
                    <div className="font-bold text-slate-700 text-sm mt-1 bg-white p-3 rounded-xl border border-slate-100">
                      {item.payment_method === 'petty_cash' ? 'เงินสดสำรองจ่าย' :
                       item.payment_method === 'credit_card' ? 'บัตรเครดิตบริษัท' :
                       item.payment_method === 'k_biz' ? 'บัญชีธนาคาร (K-Biz)' : item.payment_method || 'เงินสดสำรองจ่าย'}
                    </div>
                  </div>
                </div>

                {item.purpose && (
                  <div>
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วัตถุประสงค์</Label>
                    <div className="font-bold text-slate-700 mt-1 bg-white p-4 rounded-2xl border border-slate-100 text-sm leading-relaxed">{item.purpose}</div>
                  </div>
                )}

                {/* Items Table */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">รายการสินค้าที่ขอเบิก</Label>
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="font-bold text-slate-500 text-xs py-3 pl-6">รายการ</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs text-center py-3">จำนวน</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs text-right py-3">ราคา/หน่วย</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs text-right py-3 pr-6">รวม</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(item.items) && item.items.length > 0 ? (
                          item.items.map((prod: any, idx: number) => (
                            <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/20">
                              <TableCell className="font-semibold text-slate-700 py-3 pl-6">{prod.name}</TableCell>
                              <TableCell className="text-center text-slate-600 py-3">{prod.quantity}</TableCell>
                              <TableCell className="text-right text-slate-600 py-3">{Number(prod.unit_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</TableCell>
                              <TableCell className="text-right font-bold text-slate-900 py-3 pr-6">{(Math.round((Number(prod.quantity) || 0) * (Number(prod.unit_price) || 0) * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-slate-400 text-sm">ไม่มีข้อมูลรายการสินค้า</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                 {/* VAT Breakdown */}
                 {(() => {
                    const computedItemsTotal = (item.items || []).reduce(
                       (sum: number, it: any) => sum + Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * 100) / 100,
                       0
                    )
                    const beforeVat = Number(item.amount_before_vat) > 0
                       ? Number(item.amount_before_vat)
                       : computedItemsTotal
                    const vat = Number(item.vat_amount) || 0
                    const totalAfterVat = Number(item.total_amount) || (beforeVat + vat)
                    return (
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-3 shadow-sm">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-bold">ยอดก่อน VAT</span>
                            <span className="font-bold text-slate-600">{beforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-bold">VAT 7%</span>
                            <span className="font-bold text-slate-600">{vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                         </div>
                         <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                            <span className="font-black text-slate-900 text-sm">ยอดรวมหลัง VAT</span>
                            <span className="font-black text-blue-600 text-2xl">{totalAfterVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                         </div>
                      </div>
                    )
                 })()}

                <div className="pt-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full h-12 rounded-2xl font-bold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
                    onClick={() => handlePrint(item)}
                  >
                    <Printer size={16} className="text-blue-600" /> พิมพ์เอกสารเบิก / ใบรับรองแทนใบเสร็จรับเงิน (Print)
                  </Button>
                </div>

                {item.receipt_url && (() => {
                  const urls = getReceiptUrls(item.receipt_url);
                  return urls.map((url, i) => (
                    <div key={i} className="pt-2">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-blue-600 border-blue-100 hover:bg-blue-50/50 flex items-center justify-center gap-2">
                          <FileText size={16} /> ดูไฟล์หลักฐานใบเสร็จรับเงิน {urls.length > 1 ? `#${i + 1}` : ''}
                        </Button>
                      </a>
                    </div>
                  ));
                })()}
                {false && (
                  <div className="pt-2">
                    <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-blue-600 border-blue-100 hover:bg-blue-50/50 flex items-center justify-center gap-2">
                        <FileText size={16} /> ดูไฟล์หลักฐานใบเสร็จรับเงิน
                      </Button>
                    </a>
                  </div>
                )}

                {item.manifest_text && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เอกสารคุมสั่งจ่าย (AI Voucher Manifest)</Label>
                    <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-slate-900 shadow-inner max-h-[160px] scrollbar-thin leading-relaxed">
                      {item.manifest_text}
                    </pre>
                  </div>
                )}
             </>
           )}

           {item.type === 'reimbursement' && (
              <>
                 <div>
                   <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายละเอียดการเบิก</Label>
                   <div className="text-2xl font-black text-slate-900">"{item.description}"</div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                   <div>
                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนเงิน</Label>
                     <div className="text-3xl font-black text-blue-600 mt-1">฿{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                   </div>
                   <div>
                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันที่เกิดค่าใช้จ่าย</Label>
                     <div className="text-lg font-black text-slate-900">{item.expense_date ? format(new Date(item.expense_date), "d MMMM yyyy", { locale: th }) : "-"}</div>
                   </div>
                 </div>

                  {item.receipt_url && (() => {
                    const urls = getReceiptUrls(item.receipt_url);
                    return urls.map((url, i) => (
                      <div key={i} className="pt-2">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-blue-600 border-blue-100 hover:bg-blue-50/50 flex items-center justify-center gap-2">
                            <FileText size={16} /> ดูใบเสร็จ / สลิป {urls.length > 1 ? `#${i + 1}` : ''}
                          </Button>
                        </a>
                      </div>
                    ));
                  })()}
                  {false && (
                   <div className="pt-2">
                     <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
                       <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-blue-600 border-blue-100 hover:bg-blue-50/50 flex items-center justify-center gap-2">
                         <FileText size={16} /> ดูใบเสร็จ / สลิป
                       </Button>
                     </a>
                   </div>
                 )}
              </>
           )}

           {item.type === 'car_booking' && (
             <>
                <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จุดหมายปลายทาง</Label>
                  <div className="text-2xl font-black text-slate-900">{item.destination}</div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันเวลาใช้งาน</Label>
                   <div className="font-bold text-slate-600">{format(new Date(item.start_datetime), "d MMM yyyy HH:mm", { locale: th })}</div>
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ArrowRight size={14} />
                      {format(new Date(item.end_datetime), "d MMM yyyy HH:mm", { locale: th })}
                   </div>
                </div>
             </>
           )}
        </div>

        {item.status === 'pending' || item.status === 'supervisor_approved' || (item.type === 'reimbursement' && item.status === 'approved') ? (
          item.user_id === session?.user?.id ? (
             <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-amber-800 font-bold text-center text-sm flex flex-col items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <span>คำขอของคุณเอง</span>
                <span className="text-xs text-amber-600 font-normal">รอการพิจารณาอนุมัติจากผู้บังคับบัญชา หรือ CEO</span>
             </div>
          ) : (
             <div className="space-y-6">
                <div className="space-y-2">
                   <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">หมายเหตุการพิจารณา</Label>
                   <Textarea 
                      placeholder="ใส่ข้อความแจ้งพนักงาน..."
                      className="rounded-3xl border-slate-100 bg-slate-50/50 p-5 focus:ring-blue-600/20"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                   />
                </div>
                <div className={cn("grid gap-3", item.type === 'purchase' ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
                   <Button 
                      variant="ghost" 
                      className="h-16 rounded-2xl font-black text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                      onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'reject', note: rejectNote, itemStatus: item.status })}
                      disabled={approveMutation.isPending}
                   >
                      <XCircle className="mr-2" /> ปฏิเสธ
                   </Button>

                   {item.type === 'purchase' && (
                     <Button 
                        variant="outline"
                        className="h-16 rounded-2xl font-black text-amber-700 bg-amber-50/60 hover:bg-amber-100 border-amber-200 hover:border-amber-300 shadow-sm"
                        onClick={() => {
                          if (!rejectNote.trim()) {
                            toast.error("กรุณาระบุสิ่งที่ต้องการให้แก้ไขหรือเอกสารที่ขอเพิ่มในช่องหมายเหตุ")
                            return
                          }
                          approveMutation.mutate({ id: item.id, type: item.type, action: 'request_revision', note: rejectNote, itemStatus: item.status })
                        }}
                        disabled={approveMutation.isPending}
                     >
                        <AlertTriangle className="mr-2 text-amber-600" /> ขอเอกสารเพิ่ม/แก้ไข
                     </Button>
                   )}

                   {item.type === 'reimbursement' && item.status === 'approved' ? (
                     <Button 
                        className="h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl"
                        onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'approve', note: rejectNote, itemStatus: item.status })}
                        disabled={approveMutation.isPending}
                     >
                        <Banknote className="mr-2" /> ยืนยันการโอนเงิน
                     </Button>
                   ) : (
                     <Button 
                        className="h-16 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800"
                        onClick={() => approveMutation.mutate({ id: item.id, type: item.type, action: 'approve', note: rejectNote, itemStatus: item.status })}
                        disabled={approveMutation.isPending}
                     >
                        <CheckCircle2 className="mr-2" /> อนุมัติคำขอ
                     </Button>
                   )}
                </div>
             </div>
          )
        ) : (
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">สถานะปัจจุบัน</Label>
             <div className="flex items-center justify-between">
                {getStatusBadge(item.status, item.type)}
                <div className="text-xs text-slate-400 font-bold">{format(new Date(item.updated_at || item.created_at), "d MMM yyyy HH:mm", { locale: th })}</div>
             </div>
          </div>
        )}
      </div>
    )
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
         <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">ศูนย์กลางการอนุมัติ</h1>
            <p className="text-slate-400 font-medium mt-1 md:mt-2 text-sm md:text-base">พิจารณาคำขอลา ใบเบิกเงิน และการจองรถในที่เดียว</p>
         </div>
         <div className="flex gap-4">
            <div className="h-14 px-6 bg-white rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
               <Bell size={20} className="text-blue-500" />
               <span className="font-black text-slate-900">{pendingItems?.length || 0} รายการที่รอดำเนินการ</span>
            </div>
         </div>
      </div>

      {selectedItem ? (
        /* ===== IN-PAGE DETAIL PANEL (แทนที่ Dialog modal) ===== */
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Button 
              variant="ghost" 
              onClick={() => { setSelectedItem(null); setRejectNote(''); }} 
              className="rounded-xl text-slate-500 hover:text-slate-700 font-bold"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> กลับไปรายการ
            </Button>
            {selectedItem.type === 'purchase' && (
              <Button 
                variant="outline" 
                className="h-10 rounded-2xl font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm gap-2"
                onClick={() => handlePrint(selectedItem)}
              >
                <Printer size={16} className="text-blue-600" /> พิมพ์เอกสาร (Print)
              </Button>
            )}
          </div>
          <Card className="rounded-[2rem] md:rounded-[3rem] border-0 shadow-xl overflow-hidden">
            <CardContent className="p-6 md:p-10">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h3 className="text-slate-400 font-black text-xs uppercase tracking-widest">รายละเอียดคำขอ</h3>
                {selectedItem.type === 'purchase' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 gap-2 text-xs"
                    onClick={() => handlePrint(selectedItem)}
                  >
                    <Printer size={14} className="text-blue-600" /> พิมพ์เอกสารเบิก (Print)
                  </Button>
                )}
              </div>
              {renderDetail(selectedItem)}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===== NORMAL PAGE CONTENT (Tabs + Tables) ===== */
        <>
          {/* Sub Menu Navigation */}
          <div className="flex border-b border-slate-200 gap-8 mb-8 pb-1">
            <button 
              onClick={() => setActiveView("pending")}
              className={cn(
                "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
                activeView === "pending" ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span>รายการรอ</span>
              {pendingItems?.length > 0 && (
                <Badge className="bg-blue-600 text-white shrink-0 text-[10px] px-1.5 py-0.5 rounded-full">{pendingItems.length}</Badge>
              )}
              {activeView === "pending" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
            <button 
              onClick={() => setActiveView("history")}
              className={cn(
                "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
                activeView === "history" ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <HistoryIcon className="w-4 h-4" />
              <span>ประวัติ</span>
              {activeView === "history" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
            <button 
              onClick={() => setActiveView("paid")}
              className={cn(
                "pb-3 text-base font-bold transition-all relative flex items-center gap-2",
                activeView === "paid" ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Banknote className="w-4 h-4" />
              <span>การเงิน / จ่ายเงิน</span>
              {isFinanceUser && finWaitingItems.length > 0 && (
                <Badge className="bg-emerald-600 text-white shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border-0 shadow-sm">{finWaitingItems.length}</Badge>
              )}
              {activeView === "paid" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
          </div>

          {activeView === "pending" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
               {/* Search & Filter Bar */}
               <div className="bg-white/80 backdrop-blur-xl p-4 md:p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                 <div className="relative flex-1">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                   <Input
                     placeholder="ค้นหาตามประเภท, ผู้ขอ, หรือรายละเอียดคำขอ..."
                     value={pendingSearch}
                     onChange={(e) => {
                       setPendingSearch(e.target.value)
                       pendingPagination.setCurrentPage(1)
                     }}
                     className="pl-11 h-11 bg-slate-50 border-slate-200 rounded-2xl text-sm focus:bg-white transition-all font-medium"
                   />
                 </div>
                 <Select
                   value={pendingTypeFilter}
                   onValueChange={(val) => {
                     setPendingTypeFilter(val)
                     pendingPagination.setCurrentPage(1)
                   }}
                 >
                   <SelectTrigger className="w-[180px] h-11 rounded-2xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                     <SelectValue placeholder="ประเภททั้งหมด" />
                   </SelectTrigger>
                   <SelectContent className="rounded-2xl">
                     <SelectItem value="all">ประเภททั้งหมด</SelectItem>
                     <SelectItem value="leave">ใบลา</SelectItem>
                     <SelectItem value="purchase">ใบเบิกเงิน</SelectItem>
                     <SelectItem value="reimbursement">เบิกเงินสดย่อย</SelectItem>
                     <SelectItem value="car">จองรถยนต์</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <Card className="rounded-[2rem] md:rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                  <Table className="min-w-[700px]">
                     <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                           <TableHead className="py-8 pl-10 font-black text-slate-400 uppercase tracking-widest text-[11px]">ประเภท</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ผู้ขอ</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">รายละเอียด</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">วันที่ส่ง</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">สถานะ</TableHead>
                           <TableHead className="pr-10 text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">จัดการ</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {isPendingLoading ? (
                          <TableRow><TableCell colSpan={6} className="py-24 text-center"><Loader2 className="animate-spin inline-block text-blue-200 w-12 h-12" /></TableCell></TableRow>
                        ) : filteredPendingItems.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="py-40 text-center text-slate-300 font-bold text-lg">ไม่มีรายการรอดำเนินการในขณะนี้</TableCell></TableRow>
                        ) : pendingPagination.paginatedItems.map((item: any) => (
                          <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group cursor-pointer" role="button" tabIndex={0} onClick={() => setSelectedItem(item)}>
                             <TableCell className="py-8 pl-10">
                                <div className="flex items-center gap-3">
                                   <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", item.color)}>
                                      {getIcon(item.type)}
                                   </div>
                                   <span className="font-black text-slate-700">{item.label}</span>
                                </div>
                             </TableCell>
                             <TableCell>
                                <div className="flex items-center gap-3">
                                   <Avatar className="h-8 w-8">
                                      <AvatarImage src={item.user?.avatar_url} />
                                      <AvatarFallback>{item.user?.full_name?.charAt(0)}</AvatarFallback>
                                   </Avatar>
                                   <span className="font-bold text-slate-900">{item.user?.full_name}</span>
                                </div>
                             </TableCell>
                             <TableCell className="max-w-[200px] truncate font-medium text-slate-500">
                                 {item.type === 'leave' ? `ลา${item.leave_type} ${item.days_count} วัน` : item.type === 'purchase' ? item.title : item.type === 'reimbursement' ? `฿${Number(item.amount).toLocaleString()} - ${item.description}` : item.destination}
                             </TableCell>
                             <TableCell className="text-slate-400 font-medium">
                                {format(new Date(item.created_at), "d MMM HH:mm", { locale: th })}
                             </TableCell>
                             <TableCell>
                                {getStatusBadge(item.status, item.type)}
                             </TableCell>
                             <TableCell className="pr-10 text-right">
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-lg">
                                   <ChevronRight size={20} />
                                </Button>
                             </TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                  </Table>
                  </div>
                  <div className="p-4 border-t border-slate-50">
                    <TablePagination
                      currentPage={pendingPagination.currentPage}
                      totalPages={pendingPagination.totalPages}
                      totalItems={pendingPagination.totalItems}
                      pageSize={pendingPagination.pageSize}
                      pageSizeOptions={[10, 20, 30, 50, 100]}
                      onPageChange={pendingPagination.setCurrentPage}
                      onPageSizeChange={pendingPagination.setPageSize}
                      itemLabel="รายการ"
                    />
                  </div>
               </Card>
            </div>
          )}

          {activeView === "history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
               {/* Search & Filter Bar */}
               <div className="bg-white/80 backdrop-blur-xl p-4 md:p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                 <div className="relative flex-1">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                   <Input
                     placeholder="ค้นหาตามประเภท, ผู้ขอ, ผู้อนุมัติ, รายละเอียด..."
                     value={historySearch}
                     onChange={(e) => {
                       setHistorySearch(e.target.value)
                       historyPagination.setCurrentPage(1)
                     }}
                     className="pl-11 h-11 bg-slate-50 border-slate-200 rounded-2xl text-sm focus:bg-white transition-all font-medium"
                   />
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                   <Select
                     value={historyTypeFilter}
                     onValueChange={(val) => {
                       setHistoryTypeFilter(val)
                       historyPagination.setCurrentPage(1)
                     }}
                   >
                     <SelectTrigger className="w-[150px] h-11 rounded-2xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                       <SelectValue placeholder="ประเภททั้งหมด" />
                     </SelectTrigger>
                     <SelectContent className="rounded-2xl">
                       <SelectItem value="all">ประเภททั้งหมด</SelectItem>
                       <SelectItem value="leave">ใบลา</SelectItem>
                       <SelectItem value="purchase">ใบเบิกเงิน</SelectItem>
                       <SelectItem value="reimbursement">เบิกเงินสดย่อย</SelectItem>
                       <SelectItem value="car">จองรถยนต์</SelectItem>
                     </SelectContent>
                   </Select>

                   <Select
                     value={historyStatusFilter}
                     onValueChange={(val) => {
                       setHistoryStatusFilter(val)
                       historyPagination.setCurrentPage(1)
                     }}
                   >
                     <SelectTrigger className="w-[150px] h-11 rounded-2xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                       <SelectValue placeholder="สถานะทั้งหมด" />
                     </SelectTrigger>
                     <SelectContent className="rounded-2xl">
                       <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                       <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                       <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                       <SelectItem value="paid">จ่ายเงินแล้ว</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               <Card className="rounded-[2rem] md:rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                  <Table className="min-w-[600px]">
                     <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100">
                           <TableHead className="py-8 pl-10 font-black text-slate-400 uppercase tracking-widest text-[11px]">ประเภท</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ผู้ขอ</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">รายละเอียด</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ผู้อนุมัติ</TableHead>
                           <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">สถานะสุดท้าย</TableHead>
                           <TableHead className="pr-10 text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">วันที่อัปเดต</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {isHistoryLoading ? (
                          <TableRow><TableCell colSpan={6} className="py-24 text-center"><Loader2 className="animate-spin inline-block text-blue-200" /></TableCell></TableRow>
                        ) : filteredHistoryItems.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="py-40 text-center text-slate-300 font-bold text-lg">ไม่มีประวัติการอนุมัติ</TableCell></TableRow>
                        ) : historyPagination.paginatedItems.map((item: any) => (
                          <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group cursor-pointer" role="button" tabIndex={0} onClick={() => setSelectedItem(item)}>
                             <TableCell className="py-8 pl-10">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400">
                                      {getIcon(item.type)}
                                   </div>
                                   <span className="font-bold text-slate-500">{item.label}</span>
                                </div>
                             </TableCell>
                             <TableCell className="font-bold text-slate-900">{item.user?.full_name}</TableCell>
                             <TableCell className="font-medium text-slate-500">{item.type === 'purchase' ? `${Number(item.total_amount).toLocaleString()} ฿` : item.type === 'leave' ? `${item.days_count} วัน` : item.type === 'reimbursement' ? `${Number(item.amount).toLocaleString()} ฿` : item.destination}</TableCell>
                             <TableCell className="font-bold text-slate-700 text-xs">{item.approver_name || "—"}</TableCell>
                             <TableCell>{getStatusBadge(item.status, item.type)}</TableCell>
                             <TableCell className="pr-10 text-right text-slate-400 font-medium">
                                {format(new Date(item.updated_at || item.created_at), "d MMM yy", { locale: th })}
                             </TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                  </Table>
                  </div>
                  <div className="p-4 border-t border-slate-50">
                    <TablePagination
                      currentPage={historyPagination.currentPage}
                      totalPages={historyPagination.totalPages}
                      totalItems={historyPagination.totalItems}
                      pageSize={historyPagination.pageSize}
                      pageSizeOptions={[10, 20, 30, 50, 100]}
                      onPageChange={historyPagination.setCurrentPage}
                      onPageSizeChange={historyPagination.setPageSize}
                      itemLabel="รายการ"
                    />
                  </div>
               </Card>
            </div>
          )}

          {activeView === "paid" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              {isFinanceUser ? (
                /* ===== FINANCE MANAGER VIEW ===== */
                isApprovedLoading ? (
                  <div className="py-32 text-center">
                    <Loader2 className="animate-spin inline-block text-emerald-300 w-12 h-12" />
                  </div>
                ) : (() => {
                  const waitingItems = finWaitingItems
                  const paidItemsFin = (approvedPurchases || []).filter((r: any) => r.status === 'paid')
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
                          <div className="text-3xl font-black text-emerald-700">{paidItemsFin.length} <span className="text-base font-bold text-emerald-400">รายการ</span></div>
                          <div className="text-sm font-bold text-emerald-600">
                            {paidItemsFin.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0).toLocaleString('th-TH')} ฿
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
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
                                <Clock size={20} />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900">รอดำเนินการจ่ายเงิน</h3>
                                <p className="text-xs text-slate-400 font-medium">รายการที่ผ่านการอนุมัติแล้ว รอฝ่ายการเงินกดยืนยันจ่ายเงิน</p>
                              </div>
                            </div>
                            <div className="relative w-full sm:w-72">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                              <Input
                                placeholder="ค้นหารายการ, ผู้เบิก..."
                                value={finWaitingSearch}
                                onChange={(e) => {
                                  setFinWaitingSearch(e.target.value)
                                  finWaitingPagination.setCurrentPage(1)
                                }}
                                className="pl-9 h-9 bg-white border-slate-200 rounded-xl text-xs font-medium"
                              />
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
                                  {finWaitingPagination.paginatedItems.map((p: any) => (
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
                                            onClick={() => setSelectedItem({ ...p, type: 'purchase', label: 'ใบเบิกเงิน' })}
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
                            {finWaitingPagination.paginatedItems.map((p: any) => (
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
                                    onClick={() => setSelectedItem({ ...p, type: 'purchase', label: 'ใบเบิกเงิน' })}
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

                          <div className="pt-2 no-print">
                            <TablePagination
                              currentPage={finWaitingPagination.currentPage}
                              totalPages={finWaitingPagination.totalPages}
                              totalItems={finWaitingPagination.totalItems}
                              pageSize={finWaitingPagination.pageSize}
                              pageSizeOptions={[10, 20, 30, 50, 100]}
                              onPageChange={finWaitingPagination.setCurrentPage}
                              onPageSizeChange={finWaitingPagination.setPageSize}
                              itemLabel="รายการ"
                            />
                          </div>
                        </div>
                      )}

                      {/* Already Paid Section — with Filters */}
                      {(approvedPurchases || []).length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-900">จ่ายเงินแล้ว</h3>
                              <p className="text-xs text-slate-400 font-medium">รายการที่ดำเนินการจ่ายเงินเรียบร้อยแล้ว</p>
                            </div>
                          </div>

                          {/* Filters */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white/80 p-5 rounded-3xl border border-slate-100 shadow-sm no-print">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่จ่าย (เริ่มต้น)</Label>
                              <Input type="date" value={finPaidStartDate} onChange={(e) => setFinPaidStartDate(e.target.value)} className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่จ่าย (สิ้นสุด)</Label>
                              <Input type="date" value={finPaidEndDate} onChange={(e) => setFinPaidEndDate(e.target.value)} className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ผู้ขอเบิก</Label>
                              <Select value={finPaidRequester} onValueChange={setFinPaidRequester}>
                                <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white font-medium text-sm">
                                  <SelectValue placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="all">ทั้งหมด</SelectItem>
                                  {finUniqueRequesters.map((req) => (
                                    <SelectItem key={req.id} value={req.id}>{req.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะ</Label>
                              <Select value={finPaidStatus} onValueChange={setFinPaidStatus}>
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

                          {finFilteredPaidItems.length === 0 ? (
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
                                      {finPaidPagination.paginatedItems.map((p: any) => (
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
                                              onClick={() => setSelectedItem({ ...p, type: 'purchase', label: 'ใบเบิกเงิน' })}
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
                                {finPaidPagination.paginatedItems.map((p: any) => (
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
                                      onClick={() => setSelectedItem({ ...p, type: 'purchase', label: 'ใบเบิกเงิน' })}
                                    >
                                      <Eye size={16} className="mr-1.5" /> ดูรายละเอียด
                                    </Button>
                                  </Card>
                                ))}
                              </div>

                              {/* Pagination */}
                              <div className="pt-2 no-print">
                                <TablePagination
                                  currentPage={finPaidPagination.currentPage}
                                  totalPages={finPaidPagination.totalPages}
                                  totalItems={finPaidPagination.totalItems}
                                  pageSize={finPaidPagination.pageSize}
                                  pageSizeOptions={[10, 20, 30, 50, 100]}
                                  onPageChange={finPaidPagination.setCurrentPage}
                                  onPageSizeChange={finPaidPagination.setPageSize}
                                  itemLabel="รายการ"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Empty State */}
                      {waitingItems.length === 0 && paidItemsFin.length === 0 && (
                        <Card className="py-32 text-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                          <Wallet size={64} className="mx-auto text-slate-200 mb-6" />
                          <h3 className="text-xl font-black text-slate-900">ไม่มีรายการ</h3>
                          <p className="text-slate-400 font-medium">ยังไม่มีรายการเบิกเงินที่ผ่านการอนุมัติ</p>
                        </Card>
                      )}
                    </div>
                  )
                })()
              ) : (
                /* ===== NON-FINANCE USER: Show paid items from history ===== */
                <div className="space-y-4">
                  <div className="bg-white/80 backdrop-blur-xl p-4 md:p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="ค้นหาตามผู้ขอ, รายการ หรือร้านค้า..."
                        value={nonFinPaidSearch}
                        onChange={(e) => {
                          setNonFinPaidSearch(e.target.value)
                          nonFinPaidPagination.setCurrentPage(1)
                        }}
                        className="pl-11 h-11 bg-slate-50 border-slate-200 rounded-2xl text-sm focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <Card className="rounded-[2rem] md:rounded-[3rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                     <div className="overflow-x-auto custom-scrollbar">
                     <Table className="min-w-[700px]">
                      <TableHeader className="bg-slate-50/50">
                         <TableRow className="border-slate-100 hover:bg-transparent">
                            <TableHead className="py-8 pl-10 font-black text-slate-400 uppercase tracking-widest text-[11px]">วันที่จ่าย</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">ผู้ขอเบิก</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">รายการ</TableHead>
                            <TableHead className="text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">ยอดจ่าย</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[11px]">สถานะ</TableHead>
                            <TableHead className="pr-10 text-right font-black text-slate-400 uppercase tracking-widest text-[11px]">จัดการ</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {isHistoryLoading ? (
                           <TableRow><TableCell colSpan={6} className="py-24 text-center"><Loader2 className="animate-spin inline-block text-blue-200 w-12 h-12" /></TableCell></TableRow>
                         ) : filteredNonFinPaidItems.length === 0 ? (
                           <TableRow><TableCell colSpan={6} className="py-40 text-center text-slate-300 font-bold text-lg">ยังไม่มีรายการที่จ่ายเงินแล้ว</TableCell></TableRow>
                         ) : nonFinPaidPagination.paginatedItems.map((item: any) => {
                           const amount = item.type === 'purchase' ? Number(item.total_amount || 0) : Number(item.amount || 0)
                           const vendor = item.vendor_name || item.vendor || ""
                           const paidDate = item.paid_at || item.updated_at || item.created_at
                           return (
                           <TableRow key={`${item.type}-${item.id}`} className="border-slate-50 hover:bg-slate-50/30 transition-colors group cursor-pointer" role="button" tabIndex={0} onClick={() => setSelectedItem(item)}>
                              <TableCell className="py-6 pl-10 font-bold text-slate-500 text-sm whitespace-nowrap">
                                 {format(new Date(paidDate), "d MMM yy", { locale: th })}
                              </TableCell>
                              <TableCell>
                                 <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                       <AvatarImage src={item.user?.avatar_url} />
                                       <AvatarFallback>{item.user?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-slate-900 whitespace-nowrap">{item.user?.full_name}</span>
                                 </div>
                              </TableCell>
                              <TableCell className="max-w-[280px]">
                                 <div className="font-bold text-slate-700 text-sm truncate">{item.title || item.description || item.document_type || "-"}</div>
                                 {vendor && <div className="text-xs text-slate-400 font-medium truncate">{vendor}</div>}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">
                                 {amount.toLocaleString('th-TH', { minimumFractionDigits: 0 })} ฿
                              </TableCell>
                              <TableCell>
                                 <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">จ่ายเงินแล้ว</Badge>
                              </TableCell>
                              <TableCell className="pr-10 text-right">
                                 <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-lg">
                                    <ChevronRight size={20} />
                                 </Button>
                              </TableCell>
                           </TableRow>
                           )
                         })}
                      </TableBody>
                   </Table>
                   </div>
                   <div className="p-4 border-t border-slate-50">
                     <TablePagination
                       currentPage={nonFinPaidPagination.currentPage}
                       totalPages={nonFinPaidPagination.totalPages}
                       totalItems={nonFinPaidPagination.totalItems}
                       pageSize={nonFinPaidPagination.pageSize}
                       pageSizeOptions={[10, 20, 30, 50, 100]}
                       onPageChange={nonFinPaidPagination.setCurrentPage}
                       onPageSizeChange={nonFinPaidPagination.setPageSize}
                       itemLabel="รายการ"
                     />
                   </div>
                </Card>
               </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
