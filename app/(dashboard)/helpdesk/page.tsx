"use client"

export const dynamic = 'force-dynamic'

import { useState, type FormEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Headset, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

const categoryOptions = [
  { value: "it", label: "IT Support" },
  { value: "facility", label: "Facility" },
  { value: "hr", label: "HR" },
  { value: "other", label: "Other" },
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Open</Badge>
    case "in_progress":
      return <Badge className="bg-sky-100 text-sky-700 border-sky-200">In Progress</Badge>
    case "resolved":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolved</Badge>
    case "closed":
      return <Badge className="bg-slate-900 text-white border-0">Closed</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function HelpdeskPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "it",
    priority: "medium",
  })
  const queryClient = useQueryClient()

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["helpdesk-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/helpdesk")
      if (!res.ok) {
        const error = await res.text()
        throw new Error(error || "Unable to load helpdesk tickets")
      }
      return res.json()
    },
  })

  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/helpdesk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch((): null => null)
        throw new Error(data?.error || "Unable to submit ticket")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] })
      setForm({ title: "", description: "", category: "it", priority: "medium" })
      toast.success("ส่งคำแจ้งซ่อมเรียบร้อยแล้ว")
    },
    onError: (error: any) => {
      toast.error("ไม่สามารถส่งคำแจ้งซ่อมได้: " + error.message)
    },
  })

  const openCount = tickets?.filter((ticket: any) => ticket.status === "open").length ?? 0
  const inProgressCount = tickets?.filter((ticket: any) => ticket.status === "in_progress").length ?? 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.title.trim() || !form.description.trim()) {
      toast.warning("กรุณากรอกหัวข้อและรายละเอียดปัญหา")
      return
    }

    createTicketMutation.mutate(form)
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      <Card className="overflow-hidden bg-slate-900 text-white shadow-2xl">
        <CardContent className="relative overflow-hidden p-10">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-800 opacity-95" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-700/80 shadow-xl">
                <Headset className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">ระบบแจ้งซ่อม</h1>
                <p className="mt-2 max-w-2xl text-slate-300">
                  ส่งคำแจ้งปัญหาง่าย ๆ แล้วทีมงานจะติดตามสถานะให้คุณ
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-right shadow-xl shadow-slate-900/20">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">คำแนะนำ</p>
              <p className="mt-2 text-lg font-semibold text-white">
                รายละเอียดครบ ยิ่งตอบโจทย์เร็ว
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>แจ้งปัญหาใหม่</CardTitle>
            <CardDescription>กรอกหัวข้อและรายละเอียดเพื่อส่งคำแจ้งซ่อม</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">หัวข้อปัญหา</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="เช่น เครื่องพิมพ์ไม่ทำงาน"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">หมวดหมู่</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority">ความสำคัญ</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) => setForm({ ...form, priority: value })}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue placeholder="เลือกความสำคัญ" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="บอกพฤติกรรมหรือขั้นตอนที่เกิดปัญหาให้ชัดเจน"
                  rows={6}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  ข้อมูลจะถูกบันทึกและแสดงในรายการคำแจ้งของคุณ
                </p>
                <Button type="submit" className="rounded-3xl" disabled={createTicketMutation.isPending}>
                  {createTicketMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังส่ง...
                    </span>
                  ) : (
                    "ส่งคำแจ้งซ่อม"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สถานะคำแจ้งของคุณ</CardTitle>
            <CardDescription>ดูคำแจ้งล่าสุดและสถานะปัจจุบัน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Open</p>
                <p className="mt-2 text-2xl font-semibold">{openCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="mt-2 text-2xl font-semibold">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>คำแจ้งซ่อมของฉัน</CardTitle>
          <CardDescription>รายการคำแจ้งที่คุณส่งแล้ว</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : !tickets?.length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              ยังไม่มีคำแจ้งซ่อม กรุณาส่งคำแจ้งใหม่เพื่อเริ่มต้น
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>หัวข้อ</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>ความสำคัญ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ส่งเมื่อ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>{ticket.category}</TableCell>
                      <TableCell>{ticket.priority}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
