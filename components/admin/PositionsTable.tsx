"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const posSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "กรุณากรอกชื่อตำแหน่ง"),
  approval_limit: z.coerce.number().min(0, "วงเงินต้องไม่ติดลบ"),
})

export function PositionsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPos, setEditingPos] = useState<any>(null)

  const { data: positions, isLoading } = useQuery({
    queryKey: ["admin-positions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/positions")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Error ${res.status}: ${text.substring(0, 50)}`)
      }
      return res.json()
    }
  })

  const form = useForm<z.infer<typeof posSchema>>({
    resolver: zodResolver(posSchema) as any,
    defaultValues: { 
      name: "", 
      approval_limit: 0,
    }
  })

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingPos
      const payload = {
        ...values,
        org_id: '00000000-0000-0000-0000-000000000001'
      }
      const res = await fetch(isEdit ? `/api/admin/positions/${editingPos.id}` : "/api/admin/positions", {
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
      } catch {
        throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}`)
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: ${res.statusText}`)
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-positions"] })
      setIsModalOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      alert(error.message)
    }
  })

  function onSubmit(values: z.infer<typeof posSchema>) {
    mutation.mutate(values)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">รายชื่อตำแหน่งงาน</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPos(null); form.reset(); }}>
              <Plus className="mr-2 h-4 w-4" /> เพิ่มตำแหน่ง
            </Button>
          </DialogTrigger>
          <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingPos ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อตำแหน่ง</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="approval_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วงเงินอนุมัติ (บาท)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPos ? 'บันทึกการแก้ไข' : 'สร้างตำแหน่ง'}
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
              <TableHead>ชื่อตำแหน่ง</TableHead>
              <TableHead>วงเงินอนุมัติ</TableHead>
              <TableHead className="w-[100px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8">กำลังโหลด...</TableCell></TableRow>
            ) : positions?.map((pos: any) => (
              <TableRow key={pos.id}>
                <TableCell className="font-medium text-slate-900">{pos.name}</TableCell>
                <TableCell className="font-semibold text-blue-600">
                  {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(pos.approval_limit)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPos(pos); form.reset(pos); setIsModalOpen(true); }}>
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
