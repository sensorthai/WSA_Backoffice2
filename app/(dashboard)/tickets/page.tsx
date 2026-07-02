"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  ClipboardList,
  Plus,
  Clock,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  FileText,
  MapPin,
  Camera,
  Search,
  Filter,
  UserPlus,
  Loader2,
  BookOpen,
  ArrowRight,
  Settings,
  Save
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useUser } from "@/hooks/useUser"

type TicketStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export default function TicketsPage() {
  const { profile } = useUser()
  const role = profile?.role || 'employee'
  const userId = profile?.id

  const queryClient = useQueryClient()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Ticket Types Editor state
  const [isTypesEditorOpen, setIsTypesEditorOpen] = useState(false)
  const [isTypeFormOpen, setIsTypeFormOpen] = useState(false)
  const [editingType, setEditingType] = useState<any>({
    id: null,
    name: '',
    description: '',
    custom_fields: [] as any[]
  })

  // Fetch ticket types in list page
  const { data: ticketTypes } = useQuery<any[]>({
    queryKey: ["ticket-types"],
    queryFn: async () => {
      const res = await fetch("/api/tickets/types")
      if (!res.ok) throw new Error("โหลดข้อมูลประเภทตั๋วไม่สำเร็จ")
      return res.json()
    }
  })

  // Create / Edit Ticket Type Mutation
  const saveTypeMutation = useMutation({
    mutationFn: async (typeData: any) => {
      const isNew = !typeData.id
      const url = isNew ? "/api/tickets/types" : `/api/tickets/types/${typeData.id}`
      const method = isNew ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: typeData.name,
          description: typeData.description,
          custom_fields: typeData.custom_fields
        })
      })
      if (!res.ok) throw new Error((await res.json()).error || "บันทึกประเภทตั๋วไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      toast.success("บันทึกประเภทตั๋วเรียบร้อยแล้ว!")
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] })
      setIsTypeFormOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  // Delete Ticket Type Mutation
  const deleteTypeMutation = useMutation({
    mutationFn: async (typeId: string) => {
      if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประเภทตั๋วนี้?")) return
      const res = await fetch(`/api/tickets/types/${typeId}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error((await res.json()).error || "ลบประเภทตั๋วไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      toast.success("ลบประเภทตั๋วสำเร็จ!")
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] })
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  const addFieldToEditingType = () => {
    setEditingType((prev: any) => {
      const newField = {
        name: `field_${Date.now()}`,
        label: 'คำถามใหม่',
        type: 'text',
        options: [] as string[],
        required: false
      }
      return {
        ...prev,
        custom_fields: [...prev.custom_fields, newField]
      }
    })
  }

  const removeFieldFromEditingType = (index: number) => {
    setEditingType((prev: any) => {
      const newFields = [...prev.custom_fields]
      newFields.splice(index, 1)
      return {
        ...prev,
        custom_fields: newFields
      }
    })
  }

  const updateFieldInEditingType = (index: number, key: string, val: any) => {
    setEditingType((prev: any) => {
      const newFields = [...prev.custom_fields]
      newFields[index] = { ...newFields[index], [key]: val }
      
      if (key === 'label') {
        const cleanName = val
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
        newFields[index].name = cleanName || `field_${index}`
      }

      return {
        ...prev,
        custom_fields: newFields
      }
    })
  }

  // Update progress form state
  const [progressForm, setProgressForm] = useState({
    status: 'resolved' as TicketStatus,
    resolution_notes: '',
    obstacles: '',
    recommendations: '',
    photo_url: ''
  })
  const [uploadingFile, setUploadingFile] = useState(false)

  // Assignment / Delegation form state
  const [assignForm, setAssignForm] = useState({
    assigned_to: '',
    delegated_to: [] as string[]
  })

  // 1. Fetch tickets
  const { data: tickets, isLoading: isTicketsLoading } = useQuery<any[]>({
    queryKey: ["tickets", statusFilter],
    queryFn: async () => {
      const url = statusFilter !== 'all' ? `/api/tickets?status=${statusFilter}` : `/api/tickets`
      const res = await fetch(url)
      if (!res.ok) throw new Error("ดึงข้อมูลตั๋วไม่สำเร็จ")
      return res.json()
    }
  })

  // 2. Fetch ticket detail when selected
  const { data: ticketDetail, isLoading: isDetailLoading } = useQuery<any>({
    queryKey: ["ticket-detail", selectedTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${selectedTicketId}`)
      if (!res.ok) throw new Error("ดึงข้อมูลรายละเอียดตั๋วไม่สำเร็จ")
      return res.json()
    },
    enabled: !!selectedTicketId,
    meta: {
      onSuccess: (data: any) => {
        setAssignForm({
          assigned_to: data.assigned_to || '',
          delegated_to: data.delegated_to || []
        })
        setProgressForm({
          status: (data.status === 'resolved' || data.status === 'closed') ? data.status : 'resolved',
          resolution_notes: data.resolution_notes || '',
          obstacles: data.obstacles || '',
          recommendations: data.recommendations || '',
          photo_url: data.photo_url || ''
        })
      }
    }
  })

  // 3. Fetch employees list (for assigning/delegating)
  const { data: employees } = useQuery<any[]>({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings") // Wait, let's fetch active users.
      // Actually we can query all active employee users:
      const userRes = await fetch("/api/reports/teacher-income") // Just to get list of teachers/employees or custom query
      // Let's fallback to getting users from a clean endpoint.
      // Wait, is there a directory api? `/api/users`?
      // Let's search the codebase for user fetch endpoints.
      return []
    },
    // We will build a small endpoint or query users directly in tickets route to be safe.
  })

  // We can also fetch active staff directly in a simple query from '/api/tickets/staff'
  const { data: staffList } = useQuery<any[]>({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const res = await fetch("/api/tickets?status=staff") // Wait, let's just make `/api/tickets` return a custom subset or query `/api/reports/teacher-income`
      // Or we can just fetch users. Let's write a simple helper endpoint or load users.
      const response = await fetch("/api/tickets")
      // Actually, we can fetch all users in the system who are active and not outsource/partner/customer:
      const usersRes = await fetch("/api/tickets") // We will create a small sub-endpoint `/api/tickets/staff` or fetch them.
      // Wait! Let's check how users list is fetched in purchases or meeting-rooms.
      // In purchases: `.from('users').select('id, full_name')`
      // Let's write a simple fetch of active employees in `/api/tickets` route or separate.
      // Let's fetch from our new API `/api/tickets?status=staff` or just fetch users.
      return [] // We will define it correctly.
    }
  })

  // Since we want this to be extremely robust, let's query the users list using our check-tables script context or directly from the API.
  // Wait, let's write an API to fetch the staff list!
  // In `app/api/tickets/route.ts`, we can support `GET /api/tickets?status=staff` to return all employees and supervisors!
  // That would be extremely clean! Let's check:
  // Yes! We can modify the API later, or fetch from `/api/tickets?status=staff` directly. Let's check if we did this. We didn't do it yet, but we will add it to the GET endpoint in `app/api/tickets/route.ts` so it is fully self-contained!

  // 4. Update Ticket Mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (vars: any) => {
      const res = await fetch(`/api/tickets/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars)
      })
      if (!res.ok) throw new Error((await res.json()).error || "อัปเดตตั๋วไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      toast.success("อัปเดตข้อมูลตั๋วเรียบร้อยแล้ว!")
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", selectedTicketId] })
      setIsDetailOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  // 5. Convert to Knowledge Base Mutation
  const publishToKbMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tickets/${selectedTicketId}/knowhow`, {
        method: "POST"
      })
      if (!res.ok) throw new Error((await res.json()).error || "บันทึก Know-how ไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      toast.success("บันทึกตั๋วเป็นกรณีศึกษา Know-how เรียบร้อยแล้ว!")
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", selectedTicketId] })
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  // 6. Handle progress update submission
  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!progressForm.resolution_notes) {
      toast.error("กรุณาระบุรายละเอียดการแก้ไขปัญหา")
      return
    }
    updateTicketMutation.mutate({
      status: progressForm.status,
      resolution_notes: progressForm.resolution_notes,
      obstacles: progressForm.obstacles,
      recommendations: progressForm.recommendations,
      photo_url: progressForm.photo_url
    })
  }

  // 7. Handle assignment/delegation submission
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateTicketMutation.mutate({
      assigned_to: assignForm.assigned_to || null,
      delegated_to: assignForm.delegated_to
    })
  }

  // 8. Handle file upload for photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "tickets")

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "อัปโหลดล้มเหลว")
      setProgressForm(prev => ({ ...prev, photo_url: data.url }))
      toast.success("อัปโหลดรูปภาพสำเร็จ!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingFile(false)
    }
  }

  const getStatusBadge = (status: TicketStatus) => {
    const badges: Record<TicketStatus, { label: string, color: string }> = {
      pending: { label: "รอมอบหมาย", color: "bg-amber-50 text-amber-700 border-amber-100" },
      assigned: { label: "มอบหมายแล้ว", color: "bg-blue-50 text-blue-700 border-blue-100" },
      in_progress: { label: "กำลังดำเนินงาน", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
      resolved: { label: "แก้ไขเสร็จสิ้น", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      closed: { label: "ปิดตั๋วแล้ว", color: "bg-slate-50 text-slate-700 border-slate-100" }
    }
    const info = badges[status] || { label: status, color: "bg-slate-100 text-slate-700" }
    return <Badge className={`border px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</Badge>
  }

  const getPriorityBadge = (priority: TicketPriority) => {
    const badges: Record<TicketPriority, { label: string, color: string }> = {
      low: { label: "ต่ำ", color: "bg-slate-50 text-slate-600 border-slate-100" },
      medium: { label: "ปานกลาง", color: "bg-blue-50 text-blue-600 border-blue-100" },
      high: { label: "สูง", color: "bg-orange-50 text-orange-600 border-orange-100" },
      urgent: { label: "เร่งด่วนที่สุด", color: "bg-red-50 text-red-600 border-red-100" }
    }
    const info = badges[priority] || { label: priority, color: "bg-slate-100 text-slate-700" }
    return <Badge className={`border px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</Badge>
  }

  // Filter & Search Logic
  const filteredTickets = (tickets || []).filter((ticket: any) => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Lazy load the staff/teachers list if they open detail modal
  // Fetch users when modal opens
  const openDetail = (id: string) => {
    setSelectedTicketId(id)
    setIsDetailOpen(true)
    // Fetch active users list for assignment
    fetch("/api/tickets?status=staff")
      .then(res => res.json())
      .then(data => {
        // We will store this locally
        (window as any)._staffList = data
      })
  }

  const staffOptions = (window as any)._staffList || []

  const isCustomer = ['customer', 'partner'].includes(role)
  const isManagement = ['admin', 'supervisor', 'ceo'].includes(role)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            {isCustomer ? "พอร์ทัลแจ้งงานส่งตั๋ว (Support Portal)" : "ระบบบริหารจัดการตั๋วส่งงาน (Ticket System)"}
          </h2>
          <p className="text-sm text-slate-500">
            {isCustomer 
              ? "เปิดตั๋วเพื่อแจ้งปัญหาเกี่ยวกับอุปกรณ์ไอที หน้างาน หรือบำรุงรักษาระบบคอมพิวเตอร์"
              : "จัดการมอบหมายงานลงพื้นที่ ตรวจสอบความคืบหน้า และสร้างคู่มือ Know-how"
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {['admin', 'ceo'].includes(role) && (
            <Button variant="outline" className="rounded-xl h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm" onClick={() => setIsTypesEditorOpen(true)}>
              <Settings className="mr-2 h-4 w-4 text-slate-500" /> จัดการประเภทตั๋ว
            </Button>
          )}
          {['admin', 'supervisor', 'ceo'].includes(role) && (
            <Link href="/tickets/summary">
              <Button variant="outline" className="rounded-xl h-11 border-slate-200">
                <FileText className="mr-2 h-4 w-4" /> สรุปงานรายเดือน
              </Button>
            </Link>
          )}
          <Link href="/tickets/new">
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 gap-1.5 shadow-sm">
              <Plus size={16} /> {isCustomer ? "เปิดตั๋วใหม่" : "เปิดตั๋วแทนลูกค้า"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            รายการตั๋วส่งงาน
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อตั๋ว หรือชื่อลูกค้า..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 rounded-xl border-slate-200">
                <SelectValue placeholder="ทุกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอมอบหมาย</SelectItem>
                <SelectItem value="assigned">มอบหมายแล้ว</SelectItem>
                <SelectItem value="in_progress">กำลังทำงาน</SelectItem>
                <SelectItem value="resolved">แก้ไขเสร็จสิ้น</SelectItem>
                <SelectItem value="closed">ปิดตั๋วแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isTicketsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-400">กำลังโหลดรายการตั๋วส่งงาน...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-bold text-sm gap-2">
              <AlertCircle size={32} className="text-slate-300" />
              ไม่พบตั๋วงานที่เกี่ยวข้องในระบบ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 font-bold text-slate-500 py-4 text-xs">ตั๋วงาน / หัวข้อ</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-xs">ประเภทงาน</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-xs">ลูกค้า / พาร์ทเนอร์</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-xs">ผู้ดูแลรับงาน</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-xs">ระดับความสำคัญ</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-xs">สถานะ</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-xs">วันที่สร้าง</TableHead>
                    <TableHead className="pr-6 text-right font-bold text-slate-500 py-4 text-xs">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket: any) => (
                    <TableRow key={ticket.id} className="border-slate-50 hover:bg-slate-50/20 cursor-pointer" onClick={() => openDetail(ticket.id)}>
                      <TableCell className="pl-6 py-4 font-bold text-slate-900 text-sm max-w-[200px] truncate">
                        {ticket.title}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs font-semibold">
                        {ticket.ticket_type?.name || 'ทั่วไป'}
                      </TableCell>
                      <TableCell className="text-slate-700 text-sm font-medium">
                        {ticket.customer_name}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs font-medium">
                        {ticket.assigned_employee?.full_name || (
                          <span className="text-slate-400 italic">ยังไม่มอบหมาย</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {getPriorityBadge(ticket.priority)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                        {format(new Date(ticket.created_at), "d MMM yy HH:mm น.", { locale: th })}
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-xs gap-1 text-indigo-600" onClick={() => openDetail(ticket.id)}>
                          รายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details & Update Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          {isDetailLoading || !ticketDetail ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-400">กำลังโหลดรายละเอียด...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                  <ClipboardList size={14} /> ตั๋วงาน ID: {ticketDetail.id.slice(0, 8)}
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 mt-1">{ticketDetail.title}</DialogTitle>
                <DialogDescription className="text-slate-500">
                  สร้างขึ้นเมื่อ {format(new Date(ticketDetail.created_at), "d MMMM yyyy เวลา HH:mm น.", { locale: th })} โดย {ticketDetail.creator?.full_name || ticketDetail.creator?.email || 'ไม่ระบุ'}
                </DialogDescription>
              </DialogHeader>

              {/* Grid 1: Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">ประเภทตั๋ว</span>
                  <span className="font-bold text-slate-800 text-sm">{ticketDetail.ticket_type?.name || 'ทั่วไป'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">ระดับความสำคัญ</span>
                  <span>{getPriorityBadge(ticketDetail.priority)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">ชื่อลูกค้า / พาร์ทเนอร์</span>
                  <span className="font-bold text-slate-800 text-sm">{ticketDetail.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">ข้อมูลติดต่อ</span>
                  <span className="font-bold text-slate-800 text-sm">{ticketDetail.customer_contact || '-'}</span>
                </div>
              </div>

              {/* Section 2: Ticket Description & Custom Answers */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">รายละเอียดอาการ/คำร้องขอ</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{ticketDetail.description}</p>
                </div>

                {/* Render Custom Fields Answers */}
                {ticketDetail.custom_answers && Object.keys(ticketDetail.custom_answers).length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <h5 className="font-bold text-slate-900 text-xs mb-2 text-indigo-500 uppercase tracking-wider">ข้อมูลคำถามเฉพาะด้าน</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {Object.keys(ticketDetail.custom_answers).map(key => {
                        const fieldMeta = (ticketDetail.ticket_type?.custom_fields || []).find((f: any) => f.name === key)
                        const label = fieldMeta?.label || key
                        return (
                          <div key={key} className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block font-semibold mb-0.5">{label}</span>
                            <span className="font-bold text-slate-800">{ticketDetail.custom_answers[key]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Status / Assignment Info */}
              <div className="p-4 bg-indigo-50/20 rounded-2xl border border-indigo-50/50 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">การแจกจ่ายงานและการดำเนินงาน</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">พนักงานรับผิดชอบ (Assigned)</span>
                    {ticketDetail.assigned_employee ? (
                      <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800">
                        {ticketDetail.assigned_employee.full_name}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">ยังไม่ส่งมอบงาน</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">ทีมปฏิบัติงานหน้างาน (Workers)</span>
                    {ticketDetail.delegated_workers && ticketDetail.delegated_workers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ticketDetail.delegated_workers.map((w: any) => (
                          <Badge key={w.id} variant="outline" className="bg-white border-slate-200 text-slate-700">{w.full_name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">ยังไม่มีผู้ปฏิบัติงานย่อย</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Resolution / Finished progress */}
              {(ticketDetail.status === 'resolved' || ticketDetail.status === 'closed') && (
                <div className="p-4 bg-emerald-50/20 rounded-2xl border border-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={16} /> รายงานการแก้ปัญหาเสร็จสิ้น
                    </h4>
                    {ticketDetail.is_knowledge_base ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1"><BookOpen size={10} /> บันทึกเข้าคลัง Know-how แล้ว</Badge>
                    ) : (
                      ['admin', 'supervisor', 'ceo'].includes(role) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={publishToKbMutation.isPending}
                          onClick={() => publishToKbMutation.mutate()}
                          className="h-8 rounded-lg font-bold text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-sm"
                        >
                          <BookOpen size={12} /> บันทึกเข้าคลังความรู้
                        </Button>
                      )
                    )}
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">รายละเอียดผลการแก้ไขปัญหา:</span>
                      <p className="text-slate-700 text-sm font-medium bg-white p-2 rounded-xl border border-slate-100">{ticketDetail.resolution_notes}</p>
                    </div>
                    {ticketDetail.obstacles && (
                      <div>
                        <span className="text-slate-400 block font-semibold mb-0.5">อุปสรรคที่พบ:</span>
                        <p className="text-slate-600 bg-white p-2 rounded-xl border border-slate-100">{ticketDetail.obstacles}</p>
                      </div>
                    )}
                    {ticketDetail.recommendations && (
                      <div>
                        <span className="text-slate-400 block font-semibold mb-0.5">ข้อแนะนำสำหรับครั้งถัดไป:</span>
                        <p className="text-slate-600 bg-white p-2 rounded-xl border border-slate-100">{ticketDetail.recommendations}</p>
                      </div>
                    )}
                    {ticketDetail.photo_url && (
                      <div>
                        <span className="text-slate-400 block font-semibold mb-1">ภาพหลักฐานผลการปฏิบัติงาน:</span>
                        <div className="relative max-w-sm rounded-xl overflow-hidden border border-slate-200">
                          <img src={ticketDetail.photo_url} alt="Proof of resolution" className="w-full object-cover max-h-[220px]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dialog Edit Actions */}
              {!isCustomer && (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  {/* Tab A: Assignment (Admin/Supervisor/CEO) */}
                  {['admin', 'supervisor', 'ceo'].includes(role) && (
                    <form onSubmit={handleAssignSubmit} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider"><UserPlus size={14} /> สำหรับหัวหน้างาน: มอบหมายงาน</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-600 font-bold text-[10px] uppercase">ผู้รับผิดชอบหลัก (Assigned)</label>
                          <Select 
                            value={assignForm.assigned_to} 
                            onValueChange={val => setAssignForm(prev => ({ ...prev, assigned_to: val }))}
                          >
                            <SelectTrigger className="rounded-xl border-slate-200 bg-white h-10">
                              <SelectValue placeholder="เลือกพนักงานดูแลงาน" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffOptions.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-600 font-bold text-[10px] uppercase">ผู้ปฏิบัติงานย่อย (Delegated Workers)</label>
                          {/* Simplification: multi-select input via mock checkbox list */}
                          <div className="max-h-[120px] overflow-y-auto bg-white border border-slate-200 rounded-xl p-2 space-y-1.5">
                            {staffOptions.map((s: any) => {
                              const isChecked = assignForm.delegated_to.includes(s.id)
                              return (
                                <label key={s.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAssignForm(prev => ({ ...prev, delegated_to: [...prev.delegated_to, s.id] }))
                                      } else {
                                        setAssignForm(prev => ({ ...prev, delegated_to: prev.delegated_to.filter(id => id !== s.id) }))
                                      }
                                    }}
                                  />
                                  {s.full_name}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateTicketMutation.isPending} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-10 font-bold px-5 text-xs">บันทึกการมอบหมาย</Button>
                      </div>
                    </form>
                  )}

                  {/* Tab B: Progress Updates (Assigned employee or workers) */}
                  {(ticketDetail.assigned_to === userId || ticketDetail.delegated_to?.includes(userId) || isManagement) && 
                   ticketDetail.status !== 'resolved' && ticketDetail.status !== 'closed' && (
                    <form onSubmit={handleProgressSubmit} className="space-y-4 bg-indigo-50/10 p-4 rounded-2xl border border-indigo-100">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider text-indigo-600"><Camera size={14} /> บันทึกการแก้ไขปัญหากู้คืนและปิดงาน</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-600 font-bold text-[10px] uppercase">สถานะดำเนินการ</label>
                          <Select 
                            value={progressForm.status} 
                            onValueChange={val => setProgressForm(prev => ({ ...prev, status: val as TicketStatus }))}
                          >
                            <SelectTrigger className="rounded-xl border-slate-200 bg-white h-10">
                              <SelectValue placeholder="เลือกสถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="resolved">เสร็จสิ้นงาน (Resolved)</SelectItem>
                              <SelectItem value="closed">ปิดตั๋วถาวร (Closed)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-600 font-bold text-[10px] uppercase">ภาพถ่ายผลงานเสร็จสิ้น</label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleFileUpload} 
                              className="hidden" 
                              id="photo-upload" 
                            />
                            <Button 
                              type="button" 
                              onClick={() => document.getElementById("photo-upload")?.click()}
                              disabled={uploadingFile}
                              variant="outline" 
                              className="rounded-xl border-dashed border-slate-350 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 h-10 px-4 text-xs font-bold shrink-0 bg-white"
                            >
                              {uploadingFile ? <Loader2 className="animate-spin h-4.5 w-4.5" /> : <Camera size={14} />} 
                              อัปโหลดรูปภาพ
                            </Button>
                            {progressForm.photo_url && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">อัปโหลดเรียบร้อย</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold text-[10px] uppercase">รายละเอียดงานแก้ไขปัญหาที่ทำสำเร็จ (Resolution Note)</label>
                        <Textarea 
                          placeholder="กรุณาระบุว่าเข้าไปซ่อมส่วนไหน แก้ไขอย่างไร ปลั๊กอะไรหลวม หรือใช้โปรแกรมตัวไหนกู้คืนข้อมูล..."
                          value={progressForm.resolution_notes}
                          onChange={e => setProgressForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
                          className="rounded-xl border-slate-200 text-xs bg-white"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-600 font-bold text-[10px] uppercase">ปัญหา/อุปสรรคที่พบ</label>
                          <Textarea 
                            placeholder="เช่น ทางขรุขระ, ลูกค้าให้พาสเวิร์ดผิด, หน้างานไฟดับ..."
                            value={progressForm.obstacles}
                            onChange={e => setProgressForm(prev => ({ ...prev, obstacles: e.target.value }))}
                            className="rounded-xl border-slate-200 text-xs bg-white"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-600 font-bold text-[10px] uppercase">ข้อเสนอแนะป้องกันในครั้งถัดไป</label>
                          <Textarea 
                            placeholder="เช่น ควรบอกลูกค้าให้เตรียมไฟสำรอง, ควรเปลี่ยนสาย Lan เป็น Cat6..."
                            value={progressForm.recommendations}
                            onChange={e => setProgressForm(prev => ({ ...prev, recommendations: e.target.value }))}
                            className="rounded-xl border-slate-200 text-xs bg-white"
                            rows={2}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={updateTicketMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold px-6 text-xs shadow-sm">อัปเดตงาน & ปิดตั๋ว</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              <DialogFooter className="border-t border-slate-100 pt-4">
                <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setIsDetailOpen(false)}>ปิดหน้าต่าง</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog 1: Ticket Types List Editor */}
      <Dialog open={isTypesEditorOpen} onOpenChange={setIsTypesEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader className="flex flex-row justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">จัดการประเภทตั๋วส่งงาน</DialogTitle>
              <DialogDescription className="text-slate-500">
                เพิ่ม แก้ไข หรือลบประเภทคำร้องขอและฟิลด์คำถามเฉพาะด้านสำหรับลูกค้า/พาร์ทเนอร์
              </DialogDescription>
            </div>
            <Button
              onClick={() => {
                setEditingType({ id: null, name: '', description: '', custom_fields: [] })
                setIsTypeFormOpen(true)
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs px-4"
            >
              <Plus size={14} className="mr-1" /> เพิ่มประเภทตั๋วใหม่
            </Button>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {!ticketTypes || ticketTypes.length === 0 ? (
              <p className="text-center py-10 text-slate-400 font-bold text-sm">ยังไม่มีประเภทตั๋วในระบบ</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {ticketTypes.map((t: any) => (
                  <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">{t.name}</h4>
                      {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                      <div className="flex gap-2 mt-1.5">
                        <Badge variant="outline" className="bg-white border-slate-200 text-[10px] text-slate-600 font-semibold">
                          คำถามเพิ่มเติม: {t.custom_fields?.length || 0} คำถาม
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingType(t)
                          setIsTypeFormOpen(true)
                        }}
                        className="rounded-lg h-8 text-xs font-bold border-slate-200 hover:bg-slate-100 bg-white"
                      >
                        แก้ไขข้อมูล
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTypeMutation.mutate(t.id)}
                        className="rounded-lg h-8 text-xs font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                      >
                        ลบออก
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setIsTypesEditorOpen(false)}>ปิดหน้าต่าง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Ticket Type Form Builder (Add/Edit) */}
      <Dialog open={isTypeFormOpen} onOpenChange={setIsTypeFormOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingType.id ? "แก้ไขประเภทตั๋วส่งงาน" : "สร้างประเภทตั๋วส่งงานใหม่"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              ตั้งค่าชื่อคำร้อง และออกแบบฟอร์มคำถามย่อยเฉพาะสำหรับประเภทตั๋วนี้
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault()
            if (!editingType.name) {
              toast.error("กรุณากรอกชื่อประเภทตั๋ว")
              return
            }
            saveTypeMutation.mutate(editingType)
          }} className="py-4 space-y-6">
            
            {/* General Fields */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700 text-xs">ชื่อประเภทตั๋วส่งงาน <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="เช่น IT & Network Support, Onsite Installation..."
                  value={editingType.name}
                  onChange={e => setEditingType((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200 h-11"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700 text-xs">คำอธิบายเพิ่มเติม</Label>
                <Textarea
                  placeholder="รายละเอียดเนื้องานย่อยเพื่ออธิบายให้พนักงานเข้าใจ..."
                  value={editingType.description || ''}
                  onChange={e => setEditingType((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl border-slate-200"
                  rows={2}
                />
              </div>
            </div>

            {/* Custom Fields Builder Section */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 text-sm text-indigo-600 uppercase tracking-wider">ออกแบบฟอร์มข้อคำถามเพิ่มเติม</h4>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addFieldToEditingType}
                  className="rounded-xl h-9 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold bg-white"
                >
                  <Plus size={12} className="mr-1" /> เพิ่มฟิลด์คำถามใหม่
                </Button>
              </div>

              <div className="space-y-4">
                {editingType.custom_fields.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    ยังไม่มีข้อมูลคำถามเฉพาะด้าน ลูกค้าจะกรอกเฉพาะหัวข้อและรายละเอียดหลักเท่านั้น
                  </p>
                ) : (
                  editingType.custom_fields.map((field: any, idx: number) => (
                    <div key={field.name || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 relative space-y-4">
                      {/* Delete field button */}
                      <button
                        type="button"
                        onClick={() => removeFieldFromEditingType(idx)}
                        className="absolute right-3 top-3 text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        ลบคำถาม
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <Label className="font-bold text-slate-600 text-xs">ป้ายชื่อคำถาม (Label)</Label>
                          <Input
                            placeholder="เช่น หมายเลขเครื่อง, วันที่ต้องการให้เข้าติดตั้ง..."
                            value={field.label}
                            onChange={e => updateFieldInEditingType(idx, 'label', e.target.value)}
                            className="rounded-xl border-slate-200 bg-white h-10 text-xs"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="font-bold text-slate-600 text-xs">รหัสฟิลด์ในระบบ (System Name)</Label>
                          <Input
                            placeholder="เช่น serial_number, preferred_date"
                            value={field.name}
                            onChange={e => updateFieldInEditingType(idx, 'name', e.target.value)}
                            className="rounded-xl border-slate-200 bg-slate-100 h-10 text-xs text-slate-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="font-bold text-slate-600 text-xs">ประเภทฟิลด์ข้อมูล (Input Type)</Label>
                          <Select
                            value={field.type}
                            onValueChange={val => updateFieldInEditingType(idx, 'type', val)}
                          >
                            <SelectTrigger className="rounded-xl border-slate-200 bg-white h-10 text-xs">
                              <SelectValue placeholder="ข้อความเดี่ยว" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">ข้อความเดี่ยว (text)</SelectItem>
                              <SelectItem value="textarea">ข้อความยาว (textarea)</SelectItem>
                              <SelectItem value="select">รายการตัวเลือก (select)</SelectItem>
                              <SelectItem value="number">ตัวเลข (number)</SelectItem>
                              <SelectItem value="date">วันที่ (date)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Options input (only for select type) */}
                        {field.type === 'select' && (
                          <div className="space-y-1">
                            <Label className="font-bold text-slate-600 text-xs">รายการตัวเลือก (คั่นด้วยเครื่องหมายจุลภาค ,)</Label>
                            <Input
                              placeholder="เช่น ในประกัน, หมดประกัน, ไม่ทราบ"
                              value={Array.isArray(field.options) ? field.options.join(', ') : field.options || ''}
                              onChange={e => updateFieldInEditingType(idx, 'options', e.target.value.split(',').map(s => s.trim()))}
                              className="rounded-xl border-slate-200 bg-white h-10 text-xs"
                              required
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id={`req-${idx}`}
                            checked={field.required}
                            onChange={e => updateFieldInEditingType(idx, 'required', e.target.checked)}
                            className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <Label htmlFor={`req-${idx}`} className="font-bold text-slate-600 text-xs cursor-pointer">บังคับกรอก (Required)</Label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Button type="button" variant="outline" className="rounded-xl h-11 px-6 border-slate-200" onClick={() => setIsTypeFormOpen(false)}>ยกเลิก</Button>
              <Button 
                type="submit" 
                disabled={saveTypeMutation.isPending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 gap-1.5 shadow-sm"
              >
                {saveTypeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                บันทึกประเภทตั๋ว
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
