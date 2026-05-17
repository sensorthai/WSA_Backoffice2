"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Edit2, Loader2, Trash2, BookOpen, FileText, Presentation,
  Video, FileSpreadsheet, Link2, Package, ExternalLink, Filter
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  manual:   { label: "📖 คู่มือสอน", icon: BookOpen, color: "bg-amber-50 text-amber-700 border-amber-200" },
  slide:    { label: "📊 Slide", icon: Presentation, color: "bg-blue-50 text-blue-700 border-blue-200" },
  video:    { label: "🎬 YouTube", icon: Video, color: "bg-red-50 text-red-700 border-red-200" },
  document: { label: "📄 เอกสาร", icon: FileText, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  link:     { label: "🔗 Link", icon: Link2, color: "bg-purple-50 text-purple-700 border-purple-200" },
  other:    { label: "📦 อื่นๆ", icon: Package, color: "bg-slate-50 text-slate-700 border-slate-200" },
}

const materialFormSchema = z.object({
  material_code: z.string().min(1, "กรุณาระบุรหัสสื่อ"),
  title: z.string().min(1, "กรุณากรอกชื่อสื่อ"),
  type: z.string().min(1, "กรุณาเลือกประเภท"),
  description: z.string().optional(),
  file_url: z.string().optional(),
  youtube_url: z.string().optional(),
})

export function MaterialsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [filterCode, setFilterCode] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")

  // Fetch materials
  const { data: materials, isLoading } = useQuery({
    queryKey: ["admin-materials", filterCode],
    queryFn: async () => {
      let url = "/api/admin/materials?"
      if (filterCode && filterCode !== "all") url += `material_code=${filterCode}&`
      const res = await fetch(url)
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // Get unique material codes from materials themselves
  const materialCodes = useMemo(() => {
    const codes = new Set<string>()
    ;(materials || []).forEach((m: any) => { if (m.material_code) codes.add(m.material_code) })
    return [...codes].sort()
  }, [materials])

  const form = useForm<z.infer<typeof materialFormSchema>>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: { material_code: "", title: "", type: "", description: "", file_url: "", youtube_url: "" }
  })

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingMaterial
      const payload = {
        ...values,
        org_id: '00000000-0000-0000-0000-000000000001',
        description: values.description || null,
        file_url: values.file_url || null,
        youtube_url: values.youtube_url || null,
      }
      const res = await fetch(isEdit ? `/api/admin/materials/${editingMaterial.id}` : "/api/admin/materials", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data
      try { data = text ? JSON.parse(text) : {} } catch { throw new Error(`Server error`) }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-materials"] }); setIsModalOpen(false); form.reset(); setEditingMaterial(null) },
    onError: (error: any) => alert(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/materials/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("ลบไม่สำเร็จ")
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-materials"] }),
    onError: (error: any) => alert(error.message)
  })

  const watchType = form.watch("type")

  function onSubmit(values: z.infer<typeof materialFormSchema>) { mutation.mutate(values) }

  function handleEdit(m: any) {
    setEditingMaterial(m)
    form.reset({
      material_code: m.material_code || "", title: m.title || "", type: m.type || "",
      description: m.description || "", file_url: m.file_url || "", youtube_url: m.youtube_url || "",
    })
    setIsModalOpen(true)
  }

  function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const filteredMaterials = (materials || []).filter((m: any) =>
    filterType === "all" || m.type === filterType
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-indigo-500" /> คลังสื่อการสอน
          {materials && <Badge variant="secondary" className="ml-1">{filteredMaterials.length} รายการ</Badge>}
        </h2>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingMaterial(null); form.reset() } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingMaterial(null); form.reset({ material_code: filterCode !== "all" ? filterCode : "" }) }}>
              <Plus className="mr-2 h-4 w-4" /> เพิ่มสื่อการสอน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                {editingMaterial ? 'แก้ไขสื่อ' : 'เพิ่มสื่อการสอนใหม่'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 overflow-y-auto max-h-[65vh] pr-2">
                {/* Subject Code */}
                <FormField control={form.control} name="material_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสสื่อ *</FormLabel>
                    <FormControl><Input placeholder="เช่น MAT-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Type + Title */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประเภท *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl><SelectTrigger><SelectValue placeholder="เลือก..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="col-span-3">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>ชื่อสื่อ *</FormLabel><FormControl><Input placeholder="เช่น คู่มือครู บทที่ 1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                {/* Description */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>คำอธิบาย</FormLabel><FormControl><Textarea rows={2} placeholder="รายละเอียดสื่อ..." {...field} /></FormControl></FormItem>
                )} />

                {/* URL fields */}
                {watchType === "video" ? (
                  <FormField control={form.control} name="youtube_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>🎬 YouTube URL</FormLabel>
                      <FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl>
                      {field.value && getYouTubeId(field.value) && (
                        <div className="mt-2 rounded-lg overflow-hidden border">
                          <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${getYouTubeId(field.value)}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="block" />
                        </div>
                      )}
                    </FormItem>
                  )} />
                ) : (
                  <FormField control={form.control} name="file_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>🔗 URL ไฟล์ / ลิงก์</FormLabel>
                      <FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                )}

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMaterial ? 'บันทึกการแก้ไข' : 'เพิ่มสื่อการสอน'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={filterCode} onValueChange={setFilterCode}>
          <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="ทุกรหัสสื่อ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกรหัสสื่อ</SelectItem>
            {materialCodes.map((code) => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="ทุกประเภท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterCode !== "all" || filterType !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterCode("all"); setFilterType("all") }} className="text-xs">ล้างตัวกรอง</Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>ชื่อสื่อ</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>รหัสสื่อ</TableHead>
              <TableHead>ลิงก์</TableHead>
              <TableHead className="w-[100px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredMaterials.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-slate-500 font-medium">ยังไม่มีสื่อการสอน</p>
                <p className="text-sm text-slate-400 mt-1">เพิ่ม คู่มือ, Slide, YouTube หรือเอกสาร</p>
              </TableCell></TableRow>
            ) : filteredMaterials.map((m: any, idx: number) => {
              const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other
              const Icon = cfg.icon
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-slate-400 text-sm">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{m.title}</span>
                      {m.description && <span className="text-xs text-slate-400 truncate max-w-[200px]">{m.description}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cfg.color + " gap-1"}><Icon className="h-3 w-3" /> {cfg.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-indigo-700 border-indigo-200 bg-indigo-50">
                      {m.material_code || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.type === 'video' && m.youtube_url ? (
                      <a href={m.youtube_url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-sm flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" /> ดูวิดีโอ <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : m.file_url ? (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" /> เปิดลิงก์ <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(m)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { if (confirm(`ลบ "${m.title}"?`)) deleteMutation.mutate(m.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
