"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Loader2, School, X, CalendarOff, Landmark, CalendarPlus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

const schoolFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อโรงเรียน"),
  address: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  district: z.string().optional(),
  province: z.string().optional(),
  holidays: z.array(z.string()).optional(),
  finance_contact_name: z.string().optional(),
  finance_contact_phone: z.string().optional(),
  finance_contact_email: z.string().optional(),
  notes: z.string().optional(),
})

export function SchoolsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<any>(null)
  const [newHoliday, setNewHoliday] = useState("")

  const { data: schools, isLoading } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const res = await fetch("/api/admin/schools")
      const text = await res.text()
      if (!res.ok) throw new Error(`Error ${res.status}: ${text.substring(0, 50)}`)
      return text ? JSON.parse(text) : []
    }
  })

  const form = useForm<z.infer<typeof schoolFormSchema>>({
    resolver: zodResolver(schoolFormSchema) as any,
    defaultValues: {
      name: "", address: "", contact_name: "", contact_phone: "", contact_email: "",
      district: "", province: "", holidays: [],
      finance_contact_name: "", finance_contact_phone: "", finance_contact_email: "",
      notes: ""
    }
  })

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingSchool
      const payload = { ...values, org_id: '00000000-0000-0000-0000-000000000001' }
      const res = await fetch(isEdit ? `/api/admin/schools/${editingSchool.id}` : "/api/admin/schools", {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-schools"] }); setIsModalOpen(false); form.reset(); setEditingSchool(null) },
    onError: (error: any) => { alert(error.message) }
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const res = await fetch(`/api/admin/schools/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || "Error")
      return data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-schools"] }) }
  })

  function onSubmit(values: z.infer<typeof schoolFormSchema>) { mutation.mutate(values) }

  function handleEdit(school: any) {
    setEditingSchool(school)
    form.reset({
      name: school.name || "", address: school.address || "",
      contact_name: school.contact_name || "", contact_phone: school.contact_phone || "",
      contact_email: school.contact_email || "", district: school.district || "",
      province: school.province || "", holidays: school.holidays || [],
      finance_contact_name: school.finance_contact_name || "",
      finance_contact_phone: school.finance_contact_phone || "",
      finance_contact_email: school.finance_contact_email || "",
      notes: school.notes || "",
    })
    setIsModalOpen(true)
  }

  function addHoliday() {
    if (!newHoliday) return
    const current = form.getValues("holidays") || []
    if (current.includes(newHoliday)) { setNewHoliday(""); return }
    form.setValue("holidays", [...current, newHoliday].sort())
    setNewHoliday("")
  }

  function removeHoliday(date: string) {
    const current = form.getValues("holidays") || []
    form.setValue("holidays", current.filter(d => d !== date))
  }

  const watchHolidays = form.watch("holidays") || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">รายชื่อโรงเรียน</h2>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingSchool(null); form.reset(); setNewHoliday("") } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSchool(null); form.reset() }}><Plus className="mr-2 h-4 w-4" /> เพิ่มโรงเรียน</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[680px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-blue-500" />
                {editingSchool ? 'แก้ไขข้อมูลโรงเรียน' : 'เพิ่มโรงเรียนใหม่'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4 overflow-y-auto max-h-[70vh] pr-2">
                {/* School Name */}
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>ชื่อโรงเรียน *</FormLabel><FormControl><Input placeholder="เช่น โรงเรียนสาธิตแห่งมหาวิทยาลัย..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* Address */}
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>ที่อยู่</FormLabel><FormControl><Textarea placeholder="ที่อยู่โรงเรียน..." rows={2} {...field} /></FormControl></FormItem>
                )} />

                {/* District + Province */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="district" render={({ field }) => (
                    <FormItem><FormLabel>เขต/อำเภอ</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="province" render={({ field }) => (
                    <FormItem><FormLabel>จังหวัด</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* ─── Contact ─── */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">👤 ผู้ประสานงาน</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="contact_name" render={({ field }) => (
                      <FormItem><FormLabel>ชื่อ</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="contact_phone" render={({ field }) => (
                      <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="contact_email" render={({ field }) => (
                    <FormItem className="mt-3"><FormLabel>อีเมล</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* ─── Finance Contact ─── */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-emerald-500" /> ฝ่ายการเงิน
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="finance_contact_name" render={({ field }) => (
                      <FormItem><FormLabel>ชื่อ</FormLabel><FormControl><Input placeholder="ชื่อผู้ติดต่อฝ่ายการเงิน" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="finance_contact_phone" render={({ field }) => (
                      <FormItem><FormLabel>เบอร์โทร</FormLabel><FormControl><Input placeholder="0xx-xxx-xxxx" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="finance_contact_email" render={({ field }) => (
                    <FormItem className="mt-3"><FormLabel>อีเมล</FormLabel><FormControl><Input type="email" placeholder="finance@school.ac.th" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* ─── Holidays ─── */}
                <div className="border-t pt-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CalendarOff className="h-4 w-4 text-red-500" /> วันหยุดโรงเรียน
                  </h3>
                  <div className="flex gap-2">
                    <Input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} className="flex-1" />
                    <Button type="button" variant="outline" onClick={addHoliday} disabled={!newHoliday} className="shrink-0">
                      <CalendarPlus className="h-4 w-4 mr-1" /> เพิ่มวันหยุด
                    </Button>
                  </div>
                  {watchHolidays.length > 0 && (
                    <div className="bg-red-50/50 rounded-xl p-3 space-y-1.5 max-h-[180px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-red-600">{watchHolidays.length} วันหยุด</span>
                        <Button type="button" variant="ghost" size="sm" className="text-xs h-6 text-red-500" onClick={() => form.setValue("holidays", [])}>
                          ล้างทั้งหมด
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {watchHolidays.map((date: string) => (
                          <Badge key={date} variant="secondary" className="bg-red-100 text-red-700 border-red-200 pr-1 gap-1 font-mono text-xs">
                            {date}
                            <button type="button" onClick={() => removeHoliday(date)} className="ml-0.5 hover:bg-red-200 rounded p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>หมายเหตุ</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSchool ? 'บันทึกการแก้ไข' : 'เพิ่มโรงเรียน'}
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
              <TableHead>ชื่อโรงเรียน</TableHead>
              <TableHead>ที่อยู่</TableHead>
              <TableHead>ผู้ประสานงาน</TableHead>
              <TableHead>การเงิน</TableHead>
              <TableHead>วันหยุด</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-[80px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">กำลังโหลด...</TableCell></TableRow>
            ) : schools?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูลโรงเรียน</TableCell></TableRow>
            ) : schools?.map((school: any) => {
              const holidays = school.holidays || []
              const today = new Date().toISOString().split('T')[0]
              const upcomingHolidays = holidays.filter((d: string) => d >= today).slice(0, 2)
              return (
                <TableRow key={school.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{school.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600">
                      {school.district && school.province ? `${school.district}, ${school.province}` : school.address?.substring(0, 40) || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      {school.contact_name && <span className="font-medium">{school.contact_name}</span>}
                      {school.contact_phone && <span className="text-xs text-slate-500">{school.contact_phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      {school.finance_contact_name ? (
                        <>
                          <span className="font-medium text-emerald-700">{school.finance_contact_name}</span>
                          {school.finance_contact_phone && <span className="text-xs text-slate-500">{school.finance_contact_phone}</span>}
                        </>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {holidays.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex gap-1 flex-wrap">
                          {upcomingHolidays.map((d: string) => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-mono">{d.slice(5)}</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">ทั้งหมด {holidays.length} วัน</span>
                      </div>
                    ) : <span className="text-xs text-slate-400">-</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => toggleMutation.mutate({ id: school.id, is_active: !school.is_active })}>
                      {school.is_active ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 cursor-pointer hover:bg-emerald-100">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-50 text-slate-400 border-slate-100 cursor-pointer hover:bg-slate-100">Inactive</Badge>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(school)}><Edit2 className="h-4 w-4" /></Button>
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
