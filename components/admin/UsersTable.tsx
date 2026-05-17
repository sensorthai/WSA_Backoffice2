"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  UserMinus, 
  UserCheck,
  Loader2,
  Clock,
  Trash2
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

// Zod Schema for User Form
const userFormSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  full_name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  google_id: z.string().optional().nullable(),
  role: z.string().min(1, "กรุณาเลือกสิทธิ์"),
  department_id: z.string().optional().nullable(),
  position_id: z.string().optional().nullable(),
  supervisor_id: z.string().optional().nullable(),
})

export function UsersTable() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch Users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    }
  })

  // Fetch Depts & Positions for Form
  const { data: depts } = useQuery({
    queryKey: ["admin-depts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/departments")
      const text = await res.text()
      if (!res.ok) throw new Error("Failed to fetch depts")
      return text ? JSON.parse(text) : []
    }
  })

  const { data: positions } = useQuery({
    queryKey: ["admin-positions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/positions")
      const text = await res.text()
      if (!res.ok) throw new Error("Failed to fetch positions")
      return text ? JSON.parse(text) : []
    }
  })

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      role: "employee",
    }
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setIsModalOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      alert("Error: " + error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updateData } = data
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      })
      const text = await res.text()
      let result
      try {
        result = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(`Server error: ${text.substring(0, 100)}`)
      }
      if (!res.ok) {
        throw new Error(result.error || "Failed")
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setIsModalOpen(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      alert("Error: " + error.message)
    }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE"
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      alert("ลบพนักงานเรียบร้อยแล้ว")
    },
    onError: (error: any) => {
      alert("Error: " + error.message)
    }
  })

  function onSubmit(values: z.infer<typeof userFormSchema>) {
    const payload = { ...values }
    // Normalize "none" and empty strings to null for nullable FK fields
    if (!payload.supervisor_id || payload.supervisor_id === "none") payload.supervisor_id = null
    if (!payload.department_id) payload.department_id = null
    if (!payload.position_id) payload.position_id = null
    
    if (editingUser) {
      updateMutation.mutate({ ...payload, id: editingUser.id })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleEdit(user: any) {
    setEditingUser(user)
    form.reset({
      full_name: user.full_name,
      email: user.email,
      google_id: user.google_id || null,
      role: user.role,
      department_id: user.department_id,
      position_id: user.position_id,
      supervisor_id: user.supervisor_id,
    })
    setIsModalOpen(true)
  }

  const filteredUsers = users?.filter((u: any) => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="ค้นหาพนักงาน..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) {
            setEditingUser(null)
            form.reset({ role: "employee", email: "", full_name: "", google_id: null, department_id: null, position_id: null, supervisor_id: null })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มพนักงาน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อ-นามสกุล</     FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>อีเมลพนักงาน (Google Email)</FormLabel>
                        <FormControl><Input placeholder="example@gmail.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>บทบาท (Role)</     FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกบทบาท" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="ceo">CEO</SelectItem>
                            <SelectItem value="outsource">Outsource</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>กลุ่มงาน (Dept)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกกลุ่มงาน" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {depts?.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="position_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ตำแหน่ง (Position)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกตำแหน่ง" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positions?.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="supervisor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หัวหน้างาน (Supervisor)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกหัวหน้างาน (ถ้ามี)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">--- ไม่มีหัวหน้างาน ---</SelectItem>
                            {users?.filter((u: any) => u.id !== editingUser?.id).map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingUser ? 'บันทึกการแก้ไข' : 'สร้างพนักงาน'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl bg-white overflow-x-auto custom-scrollbar shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>กลุ่มงาน / ตำแหน่ง</TableHead>
              <TableHead>สิทธิ์</TableHead>
              <TableHead>หัวหน้างาน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  กำลังโหลดข้อมูล...
                </TableCell>
              </TableRow>
            ) : filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  ไม่พบข้อมูลพนักงาน
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{user.full_name}</span>
                      <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-700">{user.departments?.name || '-'}</span>
                      <span className="text-xs text-slate-500 font-medium">{user.positions?.name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-slate-50">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.supervisor ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{user.supervisor.full_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Supervisor</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">ไม่มีหัวหน้า</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge className="rounded-full bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3">
                        <UserCheck size={12} className="mr-1" /> ปกติ
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-amber-50 text-amber-600 border-amber-100 font-bold px-3 animate-pulse">
                        <Clock size={12} className="mr-1" /> รออนุมัติ
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!user.is_active ? (
                        <>
                          <Button 
                            size="sm" 
                            className="h-8 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg shadow-lg shadow-amber-500/20"
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: true })}
                          >
                          อนุมัติ
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
                          onClick={() => {
                            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน ${user.full_name}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                              deleteMutation.mutate(user.id)
                            }
                          }}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> ลบ
                        </Button>
                      </>
                      ) : (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit2 className="mr-1.5 h-3.5 w-3.5" /> แก้ไข
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
                            onClick={() => {
                              if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน ${user.full_name}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                                deleteMutation.mutate(user.id)
                              }
                            }}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> ลบ
                          </Button>
                        </>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className={user.is_active ? "text-red-600" : "text-green-600"}
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })}
                          >
                            {user.is_active ? (
                              <>
                                <UserMinus className="mr-2 h-4 w-4" /> ระงับการใช้งาน
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" /> เปิดการใช้งาน
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
