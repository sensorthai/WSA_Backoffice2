"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Edit2, Loader2, BookOpen,
  ChevronDown, ChevronRight, Trash2, Video, Presentation, FileText, Link2, Package, ExternalLink
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const subjectFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อวิชา"),
  code: z.string().optional(),
  description: z.string().optional(),
  material_code: z.string().optional(),
})

const materialFormSchema = z.object({
  material_code: z.string().min(1),
  title: z.string().min(1, "กรุณากรอกชื่อสื่อ"),
  type: z.string().min(1, "กรุณาเลือกประเภท"),
  description: z.string().optional(),
  file_url: z.string().optional(),
  youtube_url: z.string().optional(),
})

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  manual:   { label: "📖 คู่มือ", icon: BookOpen, color: "bg-amber-50 text-amber-700 border-amber-200" },
  slide:    { label: "📊 Slide", icon: Presentation, color: "bg-blue-50 text-blue-700 border-blue-200" },
  video:    { label: "🎬 YouTube", icon: Video, color: "bg-red-50 text-red-700 border-red-200" },
  document: { label: "📄 เอกสาร", icon: FileText, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  link:     { label: "🔗 Link", icon: Link2, color: "bg-purple-50 text-purple-700 border-purple-200" },
  other:    { label: "📦 อื่นๆ", icon: Package, color: "bg-slate-50 text-slate-700 border-slate-200" },
}

export function SubjectsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subjects")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  const { data: allMaterials } = useQuery({
    queryKey: ["admin-materials"],
    queryFn: async () => {
      const res = await fetch("/api/admin/materials?")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  function getMaterialsForSubject(materialCode: string) {
    if (!materialCode || !allMaterials) return []
    return allMaterials.filter((m: any) => m.material_code === materialCode)
  }

  // Subject form
  const form = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: "", code: "", description: "", material_code: "" }
  })

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingSubject
      const payload = {
        ...values, org_id: '00000000-0000-0000-0000-000000000001',
        description: values.description || null,
        code: values.code || null,
        material_code: values.material_code || null,
      }
      const res = await fetch(isEdit ? `/api/admin/subjects/${editingSubject.id}` : "/api/admin/subjects", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data; try { data = text ? JSON.parse(text) : {} } catch { throw new Error(`Server error`) }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-subjects"] }); setIsModalOpen(false); form.reset(); setEditingSubject(null) },
    onError: (error: any) => alert(error.message)
  })

  // Material form
  const matForm = useForm<z.infer<typeof materialFormSchema>>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: { material_code: "", title: "", type: "", description: "", file_url: "", youtube_url: "" }
  })

  const matMutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingMaterial
      const payload = { ...values, org_id: '00000000-0000-0000-0000-000000000001', description: values.description || null, file_url: values.file_url || null, youtube_url: values.youtube_url || null }
      const res = await fetch(isEdit ? `/api/admin/materials/${editingMaterial.id}` : "/api/admin/materials", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data; try { data = text ? JSON.parse(text) : {} } catch { throw new Error(`Server error`) }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-materials"] }); setIsMaterialModalOpen(false); matForm.reset(); setEditingMaterial(null) },
    onError: (error: any) => alert(error.message)
  })

  const matDeleteMutation = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/admin/materials/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("ลบไม่สำเร็จ") },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-materials"] }),
    onError: (error: any) => alert(error.message)
  })

  function handleEdit(subject: any) {
    setEditingSubject(subject)
    form.reset({ name: subject.name || "", code: subject.code || "", description: subject.description || "", material_code: subject.material_code || "" })
    setIsModalOpen(true)
  }

  function openAddMaterial(materialCode: string) {
    setEditingMaterial(null)
    matForm.reset({ material_code: materialCode, title: "", type: "", description: "", file_url: "", youtube_url: "" })
    setIsMaterialModalOpen(true)
  }

  function openEditMaterial(m: any) {
    setEditingMaterial(m)
    matForm.reset({ material_code: m.material_code || "", title: m.title || "", type: m.type || "", description: m.description || "", file_url: m.file_url || "", youtube_url: m.youtube_url || "" })
    setIsMaterialModalOpen(true)
  }

  const watchMatType = matForm.watch("type")

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" /> วิชาและสื่อการสอน
        </h2>
        {/* Subject Dialog */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingSubject(null); form.reset() } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSubject(null); form.reset() }}><Plus className="mr-2 h-4 w-4" /> เพิ่มวิชา</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-500" /> {editingSubject ? 'แก้ไขวิชา' : 'เพิ่มวิชาใหม่'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>ชื่อวิชา *</FormLabel><FormControl><Input placeholder="เช่น หุ่นยนต์เบื้องต้น" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>รหัสวิชา</FormLabel><FormControl><Input placeholder="ROB101" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>คำอธิบาย</FormLabel><FormControl><Textarea rows={2} placeholder="รายละเอียดวิชา..." {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="material_code" render={({ field }) => (
                  <FormItem><FormLabel>📦 รหัสสื่อการสอน</FormLabel><FormControl><Input placeholder="MAT-001" {...field} /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSubject ? 'บันทึกการแก้ไข' : 'เพิ่มวิชา'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Material Dialog */}
      <Dialog open={isMaterialModalOpen} onOpenChange={(open) => { setIsMaterialModalOpen(open); if (!open) { setEditingMaterial(null); matForm.reset() } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>{editingMaterial ? 'แก้ไขสื่อ' : 'เพิ่มสื่อการสอน'}</DialogTitle></DialogHeader>
          <Form {...matForm}>
            <form onSubmit={matForm.handleSubmit((v) => matMutation.mutate(v))} className="space-y-4 pt-2">
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <FormField control={matForm.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>ประเภท *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="เลือก..." /></SelectTrigger></FormControl>
                        <SelectContent>{Object.entries(TYPE_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>)} />
                </div>
                <div className="col-span-3">
                  <FormField control={matForm.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>ชื่อสื่อ *</FormLabel><FormControl><Input placeholder="คู่มือครู บทที่ 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
              <FormField control={matForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>คำอธิบาย</FormLabel><FormControl><Textarea rows={2} placeholder="รายละเอียด..." {...field} /></FormControl></FormItem>)} />
              {watchMatType === "video" ? (
                <FormField control={matForm.control} name="youtube_url" render={({ field }) => (
                  <FormItem><FormLabel>🎬 YouTube URL</FormLabel><FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl></FormItem>)} />
              ) : (
                <FormField control={matForm.control} name="file_url" render={({ field }) => (
                  <FormItem><FormLabel>🔗 URL ไฟล์/ลิงก์</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl></FormItem>)} />
              )}
              <Button type="submit" className="w-full" disabled={matMutation.isPending}>
                {matMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingMaterial ? 'บันทึก' : 'เพิ่มสื่อ'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Subjects Table */}
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>วิชา</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>สื่อการสอน</TableHead>
              <TableHead className="w-[80px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : subjects?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">ยังไม่มีรายวิชา</TableCell></TableRow>
            ) : subjects?.map((s: any) => {
              const isExpanded = expandedSubject === s.id
              const mats = getMaterialsForSubject(s.material_code)
              return (
                <>
                  <TableRow key={s.id} className={isExpanded ? "bg-indigo-50/30" : ""}>
                    <TableCell>
                      {s.material_code && (
                        <button onClick={() => setExpandedSubject(isExpanded ? null : s.id)} className="p-1 hover:bg-slate-100 rounded">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-indigo-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          {s.code && <span className="text-xs text-slate-400 font-mono">{s.code}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 truncate max-w-[250px] block">{s.description || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {s.material_code ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-indigo-700 border-indigo-200 bg-indigo-50 text-xs">{s.material_code}</Badge>
                          <Badge variant="secondary" className="text-xs">{mats.length} รายการ</Badge>
                        </div>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                  {/* Expanded Materials */}
                  {isExpanded && (
                    <TableRow key={`${s.id}-materials`}>
                      <TableCell colSpan={5} className="bg-indigo-50/20 p-0">
                        <div className="px-6 py-4 ml-8 border-l-2 border-indigo-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-indigo-700 flex items-center gap-2">📦 สื่อการสอน — {s.material_code}</h4>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddMaterial(s.material_code)}>
                              <Plus className="h-3 w-3 mr-1" /> เพิ่มสื่อ
                            </Button>
                          </div>
                          {mats.length === 0 ? (
                            <p className="text-sm text-slate-400 py-3">ยังไม่มีสื่อการสอน — กดปุ่ม "เพิ่มสื่อ" เพื่อเริ่มต้น</p>
                          ) : (
                            <div className="space-y-1.5">
                              {mats.map((m: any) => {
                                const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other
                                const Icon = cfg.icon
                                return (
                                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border hover:shadow-sm transition-all">
                                    <div className="w-7 h-7 rounded-md bg-slate-50 border flex items-center justify-center shrink-0">
                                      <Icon className="h-3.5 w-3.5 text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{m.title}</p>
                                      {m.description && <p className="text-xs text-slate-400 truncate">{m.description}</p>}
                                    </div>
                                    <Badge className={cfg.color + " text-[10px]"}>{cfg.label}</Badge>
                                    {(m.file_url || m.youtube_url) && (
                                      <a href={m.youtube_url || m.file_url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 px-2"><ExternalLink className="h-3 w-3" /></Button>
                                      </a>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditMaterial(m)}><Edit2 className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => { if (confirm(`ลบ "${m.title}"?`)) matDeleteMutation.mutate(m.id) }}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
