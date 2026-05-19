"use client"

import { useState, useRef, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit2, Loader2, Users, Trash2, UserPlus, School, Filter, GraduationCap, Download, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const studentFormSchema = z.object({
  student_number: z.string().min(1, "กรุณากรอกเลขที่"),
  prefix: z.string().optional(),
  first_name: z.string().min(1, "กรุณากรอกชื่อ"),
  last_name: z.string().min(1, "กรุณากรอกนามสกุล"),
  nickname: z.string().optional(),
  class_level: z.string().min(1, "กรุณากรอกระดับชั้น"),
  school_id: z.string().min(1, "กรุณาเลือกโรงเรียน"),
  academic_year: z.string().optional(),
  notes: z.string().optional(),
})

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export function StudentsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [filterSchool, setFilterSchool] = useState<string>("all")
  const [filterClass, setFilterClass] = useState("")
  const [filterYear, setFilterYear] = useState<string>("all")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Fetch schools for dropdown
  const { data: schools } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const res = await fetch("/api/admin/schools")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // Fetch students with filters
  const { data: rawStudents, isLoading } = useQuery({
    queryKey: ["admin-students", filterSchool, filterClass, filterYear],
    queryFn: async () => {
      let url = "/api/admin/students?"
      if (filterSchool && filterSchool !== "all") url += `school_id=${filterSchool}&`
      if (filterClass) url += `class_level=${filterClass}&`
      if (filterYear && filterYear !== "all") url += `academic_year=${filterYear}&`
      const res = await fetch(url)
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // Sort: school name → academic_year (desc) → class_level → student_number
  const students = useMemo(() => {
    if (!rawStudents) return []
    return [...rawStudents].sort((a: any, b: any) => {
      // 1. School name
      const schoolA = a.school?.name || ""
      const schoolB = b.school?.name || ""
      if (schoolA !== schoolB) return schoolA.localeCompare(schoolB, "th")
      // 2. Academic year (desc — latest first)
      const yearA = a.academic_year || ""
      const yearB = b.academic_year || ""
      if (yearA !== yearB) return yearB.localeCompare(yearA)
      // 3. Class level
      const classA = a.class_level || ""
      const classB = b.class_level || ""
      if (classA !== classB) return classA.localeCompare(classB, "th")
      // 4. Student number
      return (a.student_number || 0) - (b.student_number || 0)
    })
  }, [rawStudents])

  // Unique academic years from ALL students (not filtered)
  const { data: allStudents } = useQuery({
    queryKey: ["admin-students-all-years"],
    queryFn: async () => {
      const res = await fetch("/api/admin/students")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    },
    staleTime: 60_000, // cache 1 min
  })

  const academicYears = useMemo(() => {
    const years = new Set<string>()
    ;(allStudents || []).forEach((s: any) => { if (s.academic_year) years.add(s.academic_year) })
    return [...years].sort().reverse()
  }, [allStudents])

  // Pagination
  const totalItems = students.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedStudents = students.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIdx = Math.min(currentPage * pageSize, totalItems)

  // Reset page when filters change
  function handleFilterChange(setter: (v: any) => void, value: any) {
    setter(value)
    setCurrentPage(1)
  }

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema) as any,
    defaultValues: {
      student_number: "", prefix: "", first_name: "", last_name: "",
      nickname: "", class_level: "", school_id: "", academic_year: "", notes: ""
    }
  })

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingStudent
      const payload = {
        ...values,
        student_number: parseInt(values.student_number),
        org_id: '00000000-0000-0000-0000-000000000001',
        prefix: values.prefix || null,
        nickname: values.nickname || null,
        academic_year: values.academic_year || null,
        notes: values.notes || null,
      }
      const res = await fetch(isEdit ? `/api/admin/students/${editingStudent.id}` : "/api/admin/students", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data
      try { data = text ? JSON.parse(text) : {} } catch { throw new Error(`Server error: ${text.substring(0, 100)}`) }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-students"] }); setIsModalOpen(false); form.reset(); setEditingStudent(null) },
    onError: (error: any) => { alert(error.message) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Error") }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-students"] }),
    onError: (error: any) => alert(error.message)
  })

  function onSubmit(values: z.infer<typeof studentFormSchema>) { mutation.mutate(values) }

  function handleEdit(student: any) {
    setEditingStudent(student)
    form.reset({
      student_number: String(student.student_number || ""),
      prefix: student.prefix || "", first_name: student.first_name || "",
      last_name: student.last_name || "", nickname: student.nickname || "",
      class_level: student.class_level || "", school_id: student.school_id || "",
      academic_year: student.academic_year || "", notes: student.notes || "",
    })
    setIsModalOpen(true)
  }

  function handleAddNew() {
    setEditingStudent(null)
    form.reset({
      student_number: "", prefix: "", first_name: "", last_name: "",
      nickname: "", class_level: filterClass || "", school_id: filterSchool !== "all" ? filterSchool : "",
      academic_year: filterYear !== "all" ? filterYear : "", notes: ""
    })
    setIsModalOpen(true)
  }

  async function handleUploadExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (filterSchool === "all") {
      alert("กรุณาเลือกโรงเรียนก่อน Upload")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("school_id", filterSchool)
      const res = await fetch("/api/admin/students/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        alert(`ผิดพลาด: ${data.error}${data.errors ? "\n" + data.errors.join("\n") : ""}`)
      } else {
        alert(data.message)
        queryClient.invalidateQueries({ queryKey: ["admin-students"] })
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาด")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" /> รายชื่อนักเรียน
          {students && <Badge variant="secondary" className="ml-1">{totalItems} คน</Badge>}
        </h2>
        <div className="flex items-center gap-2">
          {/* Download Template */}
          <a href="/api/admin/students/template" download>
            <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <Download className="mr-1.5 h-4 w-4" /> Template Excel
            </Button>
          </a>
          {/* Upload */}
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleUploadExcel} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
            className="text-blue-700 border-blue-200 hover:bg-blue-50">
            {isUploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Upload Excel
          </Button>
          {/* Add single */}
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingStudent(null); form.reset() } }}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}><UserPlus className="mr-2 h-4 w-4" /> เพิ่มนักเรียน</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                {/* School + Class */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="school_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>โรงเรียน *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกโรงเรียน..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(schools || []).filter((s: any) => s.is_active).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="class_level" render={({ field }) => (
                    <FormItem><FormLabel>ระดับชั้น *</FormLabel><FormControl><Input placeholder="ม.4/1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                {/* Number + Year */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="student_number" render={({ field }) => (
                    <FormItem><FormLabel>เลขที่ *</FormLabel><FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="academic_year" render={({ field }) => (
                    <FormItem><FormLabel>ปีการศึกษา</FormLabel><FormControl><Input placeholder="2569" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* Prefix + Name */}
                <div className="grid grid-cols-5 gap-4">
                  <FormField control={form.control} name="prefix" render={({ field }) => (
                    <FormItem>
                      <FormLabel>คำนำหน้า</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="ด.ช.">ด.ช.</SelectItem>
                          <SelectItem value="ด.ญ.">ด.ญ.</SelectItem>
                          <SelectItem value="นาย">นาย</SelectItem>
                          <SelectItem value="นางสาว">นางสาว</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <div className="col-span-2">
                    <FormField control={form.control} name="first_name" render={({ field }) => (
                      <FormItem><FormLabel>ชื่อ *</FormLabel><FormControl><Input placeholder="ชื่อจริง" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <FormField control={form.control} name="last_name" render={({ field }) => (
                      <FormItem><FormLabel>นามสกุล *</FormLabel><FormControl><Input placeholder="นามสกุล" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                {/* Student ID */}
                <FormField control={form.control} name="nickname" render={({ field }) => (
                  <FormItem><FormLabel>เลขประจำตัว</FormLabel><FormControl><Input placeholder="เลขประจำตัวนักเรียน" {...field} /></FormControl></FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStudent ? 'บันทึกการแก้ไข' : 'เพิ่มนักเรียน'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={filterSchool} onValueChange={(v) => handleFilterChange(setFilterSchool, v)}>
          <SelectTrigger className="w-[250px] bg-white"><SelectValue placeholder="ทุกโรงเรียน" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกโรงเรียน</SelectItem>
            {(schools || []).filter((s: any) => s.is_active).map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={(v) => handleFilterChange(setFilterYear, v)}>
          <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="ทุกปีการศึกษา" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกปีการศึกษา</SelectItem>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="กรองระดับชั้น เช่น ม.1/2"
          value={filterClass}
          onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1) }}
          className="w-[180px] bg-white"
        />
        {(filterSchool !== "all" || filterClass || filterYear !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterSchool("all"); setFilterClass(""); setFilterYear("all"); setCurrentPage(1) }} className="text-xs">ล้างตัวกรอง</Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[60px]">เลขที่</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>เลขประจำตัว</TableHead>
              <TableHead>โรงเรียน</TableHead>
              <TableHead>ระดับชั้น</TableHead>
              <TableHead>ปีการศึกษา</TableHead>
              <TableHead className="w-[100px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : !students || students.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12">
                <div className="text-4xl mb-3">🎓</div>
                <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลนักเรียน</p>
                <p className="text-sm text-slate-400 mt-1">กดปุ่ม "เพิ่มนักเรียน" เพื่อเริ่มต้น</p>
              </TableCell></TableRow>
            ) : paginatedStudents.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">{s.student_number}</Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{s.prefix}{s.first_name} {s.last_name}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-500">{s.nickname || '-'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    <School className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-slate-700 truncate max-w-[150px]">{s.school?.name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200">{s.class_level}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-500">{s.academic_year || '-'}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => { if (confirm(`ลบ ${s.first_name} ${s.last_name}?`)) deleteMutation.mutate(s.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>แสดง {startIdx}-{endIdx} จาก {totalItems} รายการ</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                <SelectTrigger className="w-[80px] h-8 bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <SelectItem key={n} value={String(n)}>{n} แถว</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number
                  if (totalPages <= 5) {
                    page = i + 1
                  } else if (currentPage <= 3) {
                    page = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i
                  } else {
                    page = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 text-xs ${page === currentPage ? '' : 'text-slate-600'}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
