"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Loader2, ClipboardList, Clock, X, CalendarPlus, Eye, Banknote } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

const assignmentFormSchema = z.object({
  teacher_id: z.string().min(1, "กรุณาเลือกครูผู้สอน"),
  school_id: z.string().min(1, "กรุณาเลือกโรงเรียน"),
  subject_id: z.string().min(1, "กรุณาเลือกวิชา"),
  class_level: z.string().optional(),
  academic_year: z.string().optional(),
  start_date: z.string().min(1, "กรุณาระบุวันเริ่มสอน"),
  end_date: z.string().optional(),
  schedule_days: z.array(z.string()).optional(),
  schedule_dates: z.array(z.string()).optional(),
  schedule_time_start: z.string().optional(),
  schedule_time_end: z.string().optional(),
  teaching_fee: z.string().optional(),
  periods_per_day: z.string().optional(),
  notes: z.string().optional(),
})

export function AssignmentsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [newDate, setNewDate] = useState("")

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["admin-assignments", statusFilter],
    queryFn: async () => {
      const url = statusFilter ? `/api/admin/assignments?status=${statusFilter}` : "/api/admin/assignments"
      const res = await fetch(url)
      const text = await res.text()
      if (!res.ok) throw new Error(text.substring(0, 100))
      return text ? JSON.parse(text) : []
    }
  })

  const { data: teachers } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users")
      const text = await res.text()
      const users = text ? JSON.parse(text) : []
      return users.filter((u: any) => u.role === 'outsource' || u.is_teacher === true)
    }
  })

  const { data: schools } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const res = await fetch("/api/admin/schools")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subjects")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  // Fetch students for class/year lookups
  const { data: students } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const res = await fetch("/api/admin/students")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    }
  })

  const form = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema) as any,
    defaultValues: {
      teacher_id: "", school_id: "", subject_id: "", class_level: "", academic_year: "",
      start_date: "", end_date: "", schedule_days: [], schedule_dates: [],
      schedule_time_start: "", schedule_time_end: "", teaching_fee: "0", periods_per_day: "1", notes: ""
    }
  })

  const watchSchool = form.watch("school_id")

  // Get unique class levels for selected school from students
  const classLevelsForSchool = useMemo(() => {
    if (!watchSchool || !students) return []
    const levels = new Set<string>()
    students.filter((s: any) => s.school_id === watchSchool).forEach((s: any) => { if (s.class_level) levels.add(s.class_level) })
    return [...levels].sort()
  }, [watchSchool, students])

  // Get unique academic years for selected school from students
  const academicYearsForSchool = useMemo(() => {
    if (!watchSchool || !students) return []
    const years = new Set<string>()
    students.filter((s: any) => s.school_id === watchSchool).forEach((s: any) => { if (s.academic_year) years.add(s.academic_year) })
    return [...years].sort().reverse()
  }, [watchSchool, students])

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingAssignment
      const payload = {
        ...values,
        org_id: '00000000-0000-0000-0000-000000000001',
        end_date: values.end_date || null,
        class_level: values.class_level || null,
        academic_year: values.academic_year || null,
        schedule_time_start: values.schedule_time_start || null,
        schedule_time_end: values.schedule_time_end || null,
        teaching_fee: values.teaching_fee ? parseFloat(values.teaching_fee) : 0,
        periods_per_day: values.periods_per_day ? parseInt(values.periods_per_day) : 1,
        notes: values.notes || null,
      }
      const res = await fetch(
        isEdit ? `/api/admin/assignments/${editingAssignment.id}` : "/api/admin/assignments",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      )
      const text = await res.text()
      let data
      try { data = text ? JSON.parse(text) : {} } catch { throw new Error(text.substring(0, 100)) }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-assignments"] }); setIsModalOpen(false); setEditingAssignment(null); form.reset() },
    onError: (error: any) => { alert(error.message) }
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/admin/assignments/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || "Error")
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-assignments"] }) }
  })

  function onSubmit(values: z.infer<typeof assignmentFormSchema>) { mutation.mutate(values) }

  function handleEdit(assignment: any) {
    setEditingAssignment(assignment)
    form.reset({
      teacher_id: assignment.teacher_id, school_id: assignment.school_id, subject_id: assignment.subject_id,
      class_level: assignment.class_level || "", academic_year: assignment.academic_year || "",
      start_date: assignment.start_date || "", end_date: assignment.end_date || "",
      schedule_days: assignment.schedule_days || [], schedule_dates: assignment.schedule_dates || [],
      schedule_time_start: assignment.schedule_time_start || "", schedule_time_end: assignment.schedule_time_end || "",
      teaching_fee: String(assignment.teaching_fee || 0),
      periods_per_day: String(assignment.periods_per_day || 1),
      notes: assignment.notes || "",
    })
    setIsModalOpen(true)
  }

  function addDate() {
    if (!newDate) return
    const current = form.getValues("schedule_dates") || []
    if (current.includes(newDate)) { setNewDate(""); return }
    const updated = [...current, newDate].sort()
    form.setValue("schedule_dates", updated)
    setNewDate("")
  }

  function removeDate(date: string) {
    const current = form.getValues("schedule_dates") || []
    form.setValue("schedule_dates", current.filter(d => d !== date))
  }

  const statusColors: Record<string, string> = { active: "bg-emerald-50 text-emerald-700 border-emerald-200", completed: "bg-blue-50 text-blue-700 border-blue-200", cancelled: "bg-red-50 text-red-600 border-red-200" }
  const statusLabels: Record<string, string> = { active: "กำลังสอน", completed: "เสร็จสิ้น", cancelled: "ยกเลิก" }

  const watchDates = form.watch("schedule_dates") || []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-800">มอบหมายงานสอน</h2>
          <div className="flex gap-1 ml-4">
            {["active", "completed", "cancelled", ""].map(s => (
              <Button key={s || "all"} variant={statusFilter === s ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setStatusFilter(s)}>
                {s ? statusLabels[s] : "ทั้งหมด"}
              </Button>
            ))}
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingAssignment(null); form.reset(); setNewDate("") } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingAssignment(null); form.reset() }}><Plus className="mr-2 h-4 w-4" /> มอบหมายงานใหม่</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                {editingAssignment ? 'แก้ไขงานมอบหมาย' : 'มอบหมายงานสอนใหม่'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Teacher */}
                <FormField control={form.control} name="teacher_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ครูผู้สอน *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="เลือกครู..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {teachers?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.full_name} ({t.email})</SelectItem>))}
                        {(!teachers || teachers.length === 0) && <div className="px-3 py-2 text-sm text-slate-400">ยังไม่มีครูผู้สอนในระบบ</div>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* School + Subject */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="school_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>โรงเรียน *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกโรงเรียน..." /></SelectTrigger></FormControl>
                        <SelectContent>{schools?.filter((s: any) => s.is_active).map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subject_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>วิชา *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกวิชา..." /></SelectTrigger></FormControl>
                        <SelectContent>{subjects?.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name} {s.code && `(${s.code})`}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Class Level + Academic Year (from students) */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="class_level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ระดับชั้น</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกระดับชั้น..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {classLevelsForSchool.length > 0 ? classLevelsForSchool.map((level) => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          )) : (
                            <div className="px-3 py-2 text-sm text-slate-400">
                              {watchSchool ? "ไม่พบนักเรียนในโรงเรียนนี้" : "กรุณาเลือกโรงเรียนก่อน"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="academic_year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ปีการศึกษา</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกปี..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {academicYearsForSchool.length > 0 ? academicYearsForSchool.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          )) : (
                            <div className="px-3 py-2 text-sm text-slate-400">
                              {watchSchool ? "ไม่พบข้อมูลปีการศึกษา" : "กรุณาเลือกโรงเรียนก่อน"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* Start/End Date */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem><FormLabel>วันเริ่มสัญญา *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem><FormLabel>วันสิ้นสุดสัญญา</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* Schedule Dates - Multi Date Picker */}
                <div className="space-y-2">
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4 text-blue-500" />
                    วันที่สอน (เลือกได้หลายวัน)
                  </FormLabel>
                  <div className="flex gap-2">
                    <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="flex-1" />
                    <Button type="button" variant="outline" onClick={addDate} disabled={!newDate} className="shrink-0">
                      <Plus className="h-4 w-4 mr-1" /> เพิ่มวัน
                    </Button>
                  </div>
                  {watchDates.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-500">เลือกแล้ว {watchDates.length} วัน</span>
                        <Button type="button" variant="ghost" size="sm" className="text-xs h-6 text-red-500" onClick={() => form.setValue("schedule_dates", [])}>
                          ล้างทั้งหมด
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {watchDates.map((date: string) => (
                          <Badge key={date} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 pr-1 gap-1 font-mono text-xs">
                            {date}
                            <button type="button" onClick={() => removeDate(date)} className="ml-0.5 hover:bg-blue-200 rounded p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Time */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="schedule_time_start" render={({ field }) => (
                    <FormItem><FormLabel>เวลาเริ่ม</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="schedule_time_end" render={({ field }) => (
                    <FormItem><FormLabel>เวลาจบ</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* Periods + Fee */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="periods_per_day" render={({ field }) => (
                    <FormItem>
                      <FormLabel>จำนวนคาบ/วัน</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "1"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} คาบ</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="teaching_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Banknote className="h-4 w-4 text-emerald-500" /> ค่าสอน/คาบ (บาท)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>หมายเหตุ</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAssignment ? 'บันทึกการแก้ไข' : 'มอบหมายงาน'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>ครูผู้สอน</TableHead>
              <TableHead>โรงเรียน</TableHead>
              <TableHead>วิชา</TableHead>
              <TableHead>ระดับชั้น</TableHead>
              <TableHead>ปีการศึกษา</TableHead>
              <TableHead>วันที่สอน</TableHead>
              <TableHead>เวลา</TableHead>
              <TableHead>คาบ / ค่าสอน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-[80px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">กำลังโหลด...</TableCell></TableRow>
            ) : assignments?.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">ไม่มีงานมอบหมาย</TableCell></TableRow>
            ) : assignments?.map((a: any) => {
              const dates = a.schedule_dates || []
              const upcomingDates = dates.filter((d: string) => d >= new Date().toISOString().split('T')[0]).slice(0, 3)
              const pastCount = dates.filter((d: string) => d < new Date().toISOString().split('T')[0]).length
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{a.teacher?.full_name || '-'}</span>
                      <span className="text-xs text-slate-400">{a.teacher?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{a.school?.name || '-'}</span>
                      {a.school?.district && <span className="text-xs text-slate-400">{a.school.district}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{a.subject?.name || '-'}</Badge>
                  </TableCell>
                  <TableCell>
                    {a.class_level ? (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200">{a.class_level}</Badge>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{a.academic_year || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {dates.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {upcomingDates.map((d: string) => (
                              <span key={d} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono">{d.slice(5)}</span>
                            ))}
                            {dates.length > 3 && <span className="text-[10px] text-slate-400 self-center">+{dates.length - 3} วัน</span>}
                          </div>
                          <span className="text-[10px] text-slate-400">ทั้งหมด {dates.length} วัน {pastCount > 0 && `(ผ่านไปแล้ว ${pastCount})`}</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {a.start_date} {a.end_date && `→ ${a.end_date}`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.schedule_time_start ? (
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Clock className="h-3 w-3" /> {a.schedule_time_start} - {a.schedule_time_end || '?'}
                      </div>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="text-slate-700">{a.periods_per_day || 1} คาบ</span>
                      {a.teaching_fee && parseFloat(a.teaching_fee) > 0 ? (
                        <span className="text-xs font-semibold text-emerald-700">฿{parseFloat(a.teaching_fee).toLocaleString()}/คาบ</span>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={a.status} onValueChange={(val) => statusMutation.mutate({ id: a.id, status: val })}>
                      <SelectTrigger className={`w-[110px] h-7 text-xs font-bold border ${statusColors[a.status] || ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">กำลังสอน</SelectItem>
                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/teaching/assignment/${a.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a)}><Edit2 className="h-4 w-4" /></Button>
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
