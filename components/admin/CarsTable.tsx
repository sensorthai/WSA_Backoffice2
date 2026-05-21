"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Loader2, Car } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { FileIcon, User } from "lucide-react"

const carSchema = z.object({
  id: z.string().optional(),
  license_plate: z.string().min(1, "กรุณากรอกทะเบียนรถ"),
  model: z.string().min(1, "กรุณากรอกรุ่นรถ"),
  color: z.string().min(1, "กรุณากรอกสีรถ"),
  is_available: z.boolean().optional(),
  caretaker_id: z.string().optional().nullable(),
  tax_renewal_date: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  ctp_expiry_date: z.string().optional().nullable(),
  insurance_file_url: z.string().optional().nullable(),
  ctp_file_url: z.string().optional().nullable(),
})

export function CarsTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<any>(null)
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false)
  const [isUploadingCtp, setIsUploadingCtp] = useState(false)

  const { data: cars, isLoading } = useQuery({
    queryKey: ["admin-cars"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cars")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Error ${res.status}: ${text.substring(0, 50)}`)
      }
      return res.json()
    }
  })

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Error ${res.status}: ${text.substring(0, 50)}`)
      }
      return res.json()
    }
  })

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema) as any,
    defaultValues: { 
      license_plate: "", 
      model: "", 
      color: "", 
      is_available: true,
      caretaker_id: "",
      tax_renewal_date: "",
      insurance_expiry_date: "",
      ctp_expiry_date: "",
      insurance_file_url: "",
      ctp_file_url: ""
    }
  })

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "cars")
    formData.append("bucket", "car-documents")

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed to upload file")
    }

    const data = await res.json()
    return data.url
  }

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const isEdit = !!editingCar
      const res = await fetch(isEdit ? `/api/admin/cars/${editingCar.id}` : "/api/admin/cars", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
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
      queryClient.invalidateQueries({ queryKey: ["admin-cars"] })
      setIsModalOpen(false)
      form.reset()
    }
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string, is_available: boolean }) => {
      const res = await fetch(`/api/admin/cars/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available })
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
      queryClient.invalidateQueries({ queryKey: ["admin-cars"] })
    }
  })

  function onSubmit(values: z.infer<typeof carSchema>) {
    const data = {
      ...values,
      caretaker_id: !values.caretaker_id || values.caretaker_id === "none" ? null : values.caretaker_id,
      tax_renewal_date: values.tax_renewal_date || null,
      insurance_expiry_date: values.insurance_expiry_date || null,
      ctp_expiry_date: values.ctp_expiry_date || null,
      insurance_file_url: values.insurance_file_url || null,
      ctp_file_url: values.ctp_file_url || null,
    }
    mutation.mutate(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">รถยนต์ในระบบ</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { 
              setEditingCar(null); 
              form.reset({ 
                license_plate: "", 
                model: "", 
                color: "", 
                is_available: true,
                caretaker_id: "",
                tax_renewal_date: "",
                insurance_expiry_date: "",
                ctp_expiry_date: "",
                insurance_file_url: "",
                ctp_file_url: ""
              }); 
            }}>
              <Plus className="mr-2 h-4 w-4" /> เพิ่มรถใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingCar ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถยนต์ใหม่'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="license_plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เลขทะเบียน</FormLabel>
                      <FormControl><Input placeholder="เช่น กข 1234" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รุ่นรถ</FormLabel>
                        <FormControl><Input placeholder="เช่น Toyota Camry" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>สีรถ</     FormLabel>
                        <FormControl><Input placeholder="สีขาว" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="caretaker_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ผู้ดูแล</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกผู้ดูแล" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">ไม่มีผู้ดูแล</SelectItem>
                          {users?.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tax_renewal_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันต่อภาษี</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insurance_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประกันหมดอายุ</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ctp_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>พรบหมดอายุ</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>ไฟล์ประกัน (PDF/รูปภาพ)</FormLabel>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        accept=".pdf,image/*" 
                        disabled={isUploadingInsurance}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setIsUploadingInsurance(true)
                            try {
                              const url = await uploadFile(file)
                              form.setValue("insurance_file_url", url)
                            } catch (err: any) {
                              console.error(err)
                              alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์ประกัน: ${err.message}`)
                            } finally {
                              setIsUploadingInsurance(false)
                            }
                          }
                        }} 
                      />
                      {isUploadingInsurance && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      )}
                      {form.watch("insurance_file_url") && !isUploadingInsurance && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">อัปโหลดแล้ว</Badge>
                      )}
                    </div>
                  </FormItem>
                  <FormItem>
                    <FormLabel>ไฟล์ พรบ (PDF/รูปภาพ)</FormLabel>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        accept=".pdf,image/*" 
                        disabled={isUploadingCtp}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setIsUploadingCtp(true)
                            try {
                              const url = await uploadFile(file)
                              form.setValue("ctp_file_url", url)
                            } catch (err: any) {
                              console.error(err)
                              alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์ พรบ: ${err.message}`)
                            } finally {
                              setIsUploadingCtp(false)
                            }
                          }
                        }} 
                      />
                      {isUploadingCtp && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      )}
                      {form.watch("ctp_file_url") && !isUploadingCtp && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">อัปโหลดแล้ว</Badge>
                      )}
                    </div>
                  </FormItem>
                </div>

                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>พร้อมใช้งาน</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={mutation.isPending || isUploadingInsurance || isUploadingCtp}>
                  {(mutation.isPending || isUploadingInsurance || isUploadingCtp) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploadingInsurance || isUploadingCtp ? 'กำลังอัปโหลดไฟล์...' : (editingCar ? 'บันทึกการแก้ไข' : 'เพิ่มรถเข้าระบบ')}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">กำลังโหลด...</div>
        ) : cars?.map((car: any) => (
          <div key={car.id} className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <Badge variant={car.is_available ? "success" : "destructive"}>
                {car.is_available ? 'ว่าง' : 'ไม่ว่าง/ระงับ'}
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{car.license_plate}</h3>
              <p className="text-slate-500">{car.model} • {car.color}</p>
              
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>ผู้ดูแล: {users?.find((u: any) => u.id === car.caretaker_id)?.full_name || 'ไม่ได้ระบุ'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <p>วันต่อภาษี: <span className="font-medium text-slate-900">{car.tax_renewal_date || '-'}</span></p>
                  <p>ประกันหมดอายุ: <span className="font-medium text-slate-900">{car.insurance_expiry_date || '-'}</span></p>
                  <p>พรบหมดอายุ: <span className="font-medium text-slate-900">{car.ctp_expiry_date || '-'}</span></p>
                </div>
                <div className="flex gap-2 pt-1">
                  {car.insurance_file_url && (
                    <a href={car.insurance_file_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
                        <FileIcon className="h-3 w-3 mr-1" /> ประกัน
                      </Badge>
                    </a>
                  )}
                  {car.ctp_file_url && (
                    <a href={car.ctp_file_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
                        <FileIcon className="h-3 w-3 mr-1" /> พรบ
                      </Badge>
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => { setEditingCar(car); form.reset(car); setIsModalOpen(true); }}
              >
                <Edit2 className="h-4 w-4 mr-2" /> แก้ไข
              </Button>
              <Button 
                variant={car.is_available ? "destructive" : "secondary"} 
                size="sm" 
                className="flex-1 font-medium"
                onClick={() => toggleMutation.mutate({ id: car.id, is_available: !car.is_available })}
              >
                {car.is_available ? 'ระงับการใช้' : 'เปิดการใช้งาน'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
