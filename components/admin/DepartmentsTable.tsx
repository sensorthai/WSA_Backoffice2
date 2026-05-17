"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const deptSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "กรุณากรอกชื่อแผนก"),
})

export function DepartmentsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)

  const { data: depts, isLoading } = useQuery({
    queryKey: ["admin-depts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/departments")
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${text.substring(0, 50)}`)
      }
      return text ? JSON.parse(text) : []
    }
  })

  const form = useForm<z.infer<typeof deptSchema>>({
    resolver: zodResolver(deptSchema) as any,
    defaultValues: { 
      name: "",
    }
  })

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingDept
      const payload = {
        ...values,
        org_id: '00000000-0000-0000-0000-000000000001'
      }
      const res = await fetch(isEdit ? `/api/admin/departments/${editingDept.id}` : "/api/admin/departments", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      })
      
      const text = await res.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}`)
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: ${res.statusText}`)
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-depts"] })
      setIsModalOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      alert(error.message)
    }
  })

  function onSubmit(values: z.infer<typeof deptSchema>) {
    mutation.mutate(values)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">รายชื่อกลุ่มงาน</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingDept(null); form.reset(); }}>
              <Plus className="mr-2 h-4 w-4" /> เพิ่มกลุ่มงาน
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'แก้ไขกลุ่มงาน' : 'เพิ่มกลุ่มงานใหม่'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อกลุ่มงาน</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingDept ? 'บันทึกการแก้ไข' : 'สร้างกลุ่มงาน'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>ชื่อกลุ่มงาน</TableHead>
              <TableHead className="w-[100px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="text-center py-8">กำลังโหลด...</TableCell></TableRow>
            ) : depts?.map((dept: any) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingDept(dept); form.reset(dept); setIsModalOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
