"use client"

export const dynamic = 'force-dynamic'

import { useMemo, useState, type FormEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MonitorSmartphone, Loader2, Plus, CircleDashed } from "lucide-react"

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
  { value: "IT", label: "IT" },
  { value: "Office", label: "Office" },
  { value: "Furniture", label: "Furniture" },
  { value: "Vehicle", label: "Vehicle" },
  { value: "Other", label: "Other" },
]

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
]

const statusBadge = (status: string) => {
  switch (status) {
    case "available":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Available</Badge>
    case "in_use":
      return <Badge className="bg-sky-100 text-sky-700 border-sky-200">In Use</Badge>
    case "maintenance":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Maintenance</Badge>
    case "retired":
      return <Badge className="bg-slate-900 text-white border-0">Retired</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function AssetsPage() {
  const [form, setForm] = useState({
    name: "",
    asset_tag: "",
    category: "IT",
    status: "available",
    purchase_date: "",
    notes: "",
  })

  const queryClient = useQueryClient()

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets")
      if (!res.ok) {
        const error = await res.text()
        throw new Error(error || "Unable to load assets")
      }
      return res.json()
    },
  })

  const createAssetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch((): null => null)
        throw new Error(data?.error || "Unable to create asset")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      setForm({ name: "", asset_tag: "", category: "IT", status: "available", purchase_date: "", notes: "" })
      toast.success("เพิ่มทรัพย์สินเรียบร้อยแล้ว")
    },
    onError: (error: any) => {
      toast.error("ไม่สามารถเพิ่มทรัพย์สินได้: " + error.message)
    },
  })

  const summary = useMemo(() => {
    const list = assets || []
    return {
      available: list.filter((item: any) => item.status === "available").length,
      in_use: list.filter((item: any) => item.status === "in_use").length,
      maintenance: list.filter((item: any) => item.status === "maintenance").length,
      retired: list.filter((item: any) => item.status === "retired").length,
      total: list.length,
    }
  }, [assets])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim() || !form.asset_tag.trim() || !form.category.trim()) {
      toast.warning("กรุณากรอกชื่อ, หมายเลขทรัพย์สิน, และหมวดหมู่")
      return
    }

    createAssetMutation.mutate(form)
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      <Card className="overflow-hidden bg-slate-900 text-white shadow-2xl">
        <CardContent className="relative overflow-hidden p-10">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-800 opacity-95" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-700/80 shadow-xl">
                <MonitorSmartphone className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">ระบบจัดการทรัพย์สิน</h1>
                <p className="mt-2 max-w-2xl text-slate-300">
                  ลงทะเบียนทรัพย์สินใหม่ ติดตามสถานะ และดูรายการทรัพย์สินทั้งหมด
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-right shadow-xl shadow-slate-900/20">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Asset Inventory</p>
              <p className="mt-2 text-lg font-semibold text-white">จัดการสถานะทรัพย์สินได้รวดเร็ว</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 text-slate-500">
              <CircleDashed className="h-5 w-5" />
              <p className="text-sm">รวมทั้งหมด</p>
            </div>
            <p className="text-3xl font-black">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 text-slate-500">
              <p className="text-sm">พร้อมใช้งาน</p>
            </div>
            <p className="text-3xl font-black">{summary.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 text-slate-500">
              <p className="text-sm">ใช้งานอยู่</p>
            </div>
            <p className="text-3xl font-black">{summary.in_use}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 text-slate-500">
              <p className="text-sm">กำลังซ่อม</p>
            </div>
            <p className="text-3xl font-black">{summary.maintenance}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>ลงทะเบียนทรัพย์สินใหม่</CardTitle>
            <CardDescription>เพิ่มทรัพย์สินในระบบด้วยข้อมูลพื้นฐาน</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อทรัพย์สิน</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="เช่น โน้ตบุ๊ก Dell XPS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_tag">Asset Tag</Label>
                  <Input
                    id="asset_tag"
                    value={form.asset_tag}
                    onChange={(event) => setForm({ ...form, asset_tag: event.target.value })}
                    placeholder="เช่น ASSET-00123"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="status">สถานะ</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
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
                  <Label htmlFor="purchase_date">วันที่ซื้อ</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={form.purchase_date}
                    onChange={(event) => setForm({ ...form, purchase_date: event.target.value })}
                  />
                </div>
                <div className="space-y-2" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="ระบุรายละเอียดเพิ่มเติม เช่น เลขซีเรียลหรือสภาพปัจจุบัน"
                  rows={5}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มทรัพย์สินได้</p>
                <Button type="submit" className="rounded-3xl" disabled={createAssetMutation.isPending}>
                  {createAssetMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> เพิ่มทรัพย์สิน</span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สถานะสำคัญ</CardTitle>
            <CardDescription>ดูสรุปจำนวนทรัพย์สินตามสถานะ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">ทั้งหมด</p>
                <p className="mt-2 text-3xl font-black">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">พร้อมใช้งาน</p>
                <p className="mt-2 text-3xl font-black">{summary.available}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">กำลังใช้งาน</p>
                <p className="mt-2 text-3xl font-black">{summary.in_use}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการทรัพย์สิน</CardTitle>
          <CardDescription>กรองและตรวจสอบสถานะทรัพย์สินทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : !assets?.length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              ยังไม่มีทรัพย์สินในระบบ ลองเพิ่มรายการใหม่ได้เลย
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อทรัพย์สิน</TableHead>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่ซื้อ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset: any) => (
                    <TableRow key={asset.id}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.asset_tag}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{statusBadge(asset.status)}</TableCell>
                      <TableCell>
                        {asset.purchase_date
                          ? new Date(asset.purchase_date).toLocaleDateString("th-TH", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
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
