"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ClipboardList, AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function NewTicketPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Form states
  const [selectedTypeId, setSelectedTypeId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerContact, setCustomerContact] = useState("")
  const [priority, setPriority] = useState<string>("medium")
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})

  // 1. Fetch ticket types
  const { data: ticketTypes, isLoading: isTypesLoading } = useQuery<any[]>({
    queryKey: ["ticket-types"],
    queryFn: async () => {
      const res = await fetch("/api/tickets/types")
      if (!res.ok) throw new Error("โหลดข้อมูลประเภทตั๋วไม่สำเร็จ")
      return res.json()
    }
  })

  // Selected type details
  const selectedType = (ticketTypes || []).find(t => t.id === selectedTypeId)

  // 2. Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: async (vars: any) => {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars)
      })
      if (!res.ok) throw new Error((await res.json()).error || "เปิดตั๋วไม่สำเร็จ")
      return res.json()
    },
    onSuccess: () => {
      toast.success("เปิดตั๋วส่งงานใหม่เรียบร้อยแล้ว!")
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      router.push("/tickets")
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTypeId) {
      toast.error("กรุณาเลือกประเภทตั๋วส่งงาน")
      return
    }
    if (!title || !description || !customerName) {
      toast.error("กรุณากรอกข้อมูลหลักให้ครบถ้วน")
      return
    }

    // Validate custom answers
    if (selectedType?.custom_fields) {
      for (const field of selectedType.custom_fields) {
        if (field.required && !customAnswers[field.name]) {
          toast.error(`กรุณากรอกข้อมูล: ${field.label}`)
          return
        }
      }
    }

    createTicketMutation.mutate({
      ticket_type_id: selectedTypeId,
      title,
      description,
      customer_name: customerName,
      customer_contact: customerContact,
      priority,
      custom_answers: customAnswers
    })
  }

  const handleCustomAnswerChange = (fieldName: string, value: string) => {
    setCustomAnswers(prev => ({ ...prev, [fieldName]: value }))
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link href="/tickets">
          <Button variant="ghost" size="sm" className="rounded-lg h-9 gap-1 text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} /> ย้อนกลับ
          </Button>
        </Link>
      </div>

      <Card className="rounded-3xl border-slate-150 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
            <ClipboardList size={14} /> เปิดตั๋วส่งงานใหม่
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 mt-1">แจ้งคำร้องส่งตั๋วใหม่</CardTitle>
          <CardDescription>
            กรอกข้อมูลรายละเอียดของปัญหา เพื่อส่งต่อให้วิศวกรและพนักงานที่เกี่ยวข้องเข้าปฏิบัติงาน
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {isTypesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-400">กำลังโหลดเทมเพลตคำถาม...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Select Ticket Type */}
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs">ประเภทคำร้องส่งตั๋ว (Ticket Type) <span className="text-red-500">*</span></Label>
                <Select value={selectedTypeId} onValueChange={(val) => { setSelectedTypeId(val); setCustomAnswers({}); }}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white">
                    <SelectValue placeholder="เลือกประเภทตั๋วงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {(ticketTypes || []).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType?.description && (
                  <p className="text-[11px] text-slate-400 leading-normal italic pl-1">{selectedType.description}</p>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs" htmlFor="title">หัวข้อคำร้อง / ชื่องาน <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    placeholder="เช่น คอมพิวเตอร์บูตไม่ขึ้น, ต้องการให้เข้าไปติดตั้ง Switch 24 Port..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="rounded-xl border-slate-200 h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs" htmlFor="description">รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="description"
                    placeholder="กรุณาระบุอาการโดยละเอียด หรือระบุเนื้องานที่ต้องการให้ออกไปบริการ..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="rounded-xl border-slate-200"
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs" htmlFor="customer_name">ชื่อลูกค้า / พาร์ทเนอร์ปลายทาง <span className="text-red-500">*</span></Label>
                  <Input
                    id="customer_name"
                    placeholder="เช่น โรงเรียนสวนกุหลาบ นนทบุรี"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="rounded-xl border-slate-200 h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-xs" htmlFor="customer_contact">เบอร์โทรศัพท์ / ข้อมูลติดต่อ</Label>
                  <Input
                    id="customer_contact"
                    placeholder="เช่น 081-xxxxxxx (คุณสมชาย)"
                    value={customerContact}
                    onChange={e => setCustomerContact(e.target.value)}
                    className="rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>

              {/* Priority Select */}
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs">ระดับความเร่งด่วน</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white w-[200px]">
                    <SelectValue placeholder="ปานกลาง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">ต่ำ (Low)</SelectItem>
                    <SelectItem value="medium">ปานกลาง (Medium)</SelectItem>
                    <SelectItem value="high">สูง (High)</SelectItem>
                    <SelectItem value="urgent">เร่งด่วนที่สุด (Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic custom fields questions */}
              {selectedType?.custom_fields && selectedType.custom_fields.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm text-indigo-500 uppercase tracking-wider">ข้อมูลเพิ่มเติมของเทมเพลตนี้</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedType.custom_fields.map((field: any) => {
                      const value = customAnswers[field.name] || ""
                      
                      return (
                        <div key={field.name} className="space-y-2">
                          <Label className="font-bold text-slate-700 text-xs">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </Label>

                          {field.type === 'select' ? (
                            <Select value={value} onValueChange={(val) => handleCustomAnswerChange(field.name, val)}>
                              <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white">
                                <SelectValue placeholder={`เลือก${field.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options || []).map((opt: string) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'textarea' ? (
                            <Textarea
                              placeholder={`ระบุ${field.label}`}
                              value={value}
                              onChange={e => handleCustomAnswerChange(field.name, e.target.value)}
                              className="rounded-xl border-slate-200"
                              rows={3}
                              required={field.required}
                            />
                          ) : (
                            <Input
                              type={field.type || 'text'}
                              placeholder={`ระบุ${field.label}`}
                              value={value}
                              onChange={e => handleCustomAnswerChange(field.name, e.target.value)}
                              className="rounded-xl border-slate-200 h-11"
                              required={field.required}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <Link href="/tickets">
                  <Button type="button" variant="outline" className="rounded-xl h-11 px-6 border-slate-200">ยกเลิก</Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={createTicketMutation.isPending}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 gap-1.5 shadow-sm"
                >
                  {createTicketMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  เปิดคำร้อง / บันทึกตั๋ว
                </Button>
              </div>

            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
