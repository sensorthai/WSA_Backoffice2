import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { format } from "date-fns"
import { redirect } from "next/navigation"
import { 
  UserCheck, 
  CalendarRange, 
  ShoppingBag, 
  Car, 
  ArrowRight,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const role = (session.user as any).role || 'employee'
  
  const supabase = createSupabaseServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // 1. Fetch Today's Checkin
  const { data: checkin } = await supabase
    .from('wfh_checkins')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('check_date', today)
    .single()

  // 2. Fetch Used Vacation Days
  const thisYear = format(new Date(), 'yyyy')
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('days_count')
    .eq('user_id', session.user.id)
    .eq('status', 'approved')
    .eq('leave_type', 'vacation')
    .gte('start_date', `${thisYear}-01-01`)
    .lte('start_date', `${thisYear}-12-31`)
    
  const usedVacation = leaves?.reduce((acc, l) => acc + Number(l.days_count), 0) || 0
  const maxVacation = 10 // Setting base quota to 10 for vacation
  
  // 3. Fetch Pending Purchases
  const { data: pendingPurchases } = await supabase
    .from('purchase_requests')
    .select('id')
    .eq('user_id', session.user.id)
    .in('status', ['pending', 'supervisor_approved'])
    
  const pendingPurchasesCount = pendingPurchases?.length || 0

  const quickActions = [
    { label: "เช็คอินเข้างาน", href: "/checkin", icon: UserCheck, color: "bg-blue-500", desc: "บันทึกสถานะการทำงานรายวัน" },
    { label: "ยื่นใบลา", href: "/leaves", icon: CalendarRange, color: "bg-emerald-500", desc: "ลางาน ป่วย หรือพักผ่อน" },
    { label: "เบิกค่าใช้จ่าย", href: "/purchases", icon: ShoppingBag, color: "bg-amber-500", desc: "แจ้งเบิกอุปกรณ์หรือค่าใช้จ่าย" },
    { label: "จองรถบริษัท", href: "/cars", icon: Car, color: "bg-indigo-500", desc: "ขอใช้รถเพื่อไปติดต่องาน" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-200">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-widest">
            ยินดีต้อนรับกลับมา
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            สวัสดี, {session.user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            เริ่มต้นวันใหม่ด้วยการจัดการงานหลังบ้านให้ง่ายขึ้น คุณล็อกอินในบทบาท 
            <span className="text-blue-400 font-bold uppercase mx-1.5">{role}</span>
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/checkin">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl px-8 h-14 shadow-lg shadow-blue-600/20">
                เช็คอินวันนี้ <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[80px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Actions */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">จัดการด่วน</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Card className="group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border-slate-100 rounded-[2rem] h-full hover:-translate-y-1 border-0 bg-white shadow-sm ring-1 ring-slate-100">
                    <CardHeader className="flex flex-row items-center gap-5 p-6">
                      <div className={`${action.color} p-4 rounded-2xl text-white shadow-lg shadow-inherit/20`}>
                        <action.icon size={28} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-black text-slate-900">{action.label}</CardTitle>
                        <CardDescription className="font-medium mt-0.5">{action.desc}</CardDescription>
                      </div>
                      <ArrowRight className="text-slate-200 group-hover:text-slate-400 transition-colors" />
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick News / Updates (Placeholder) */}
          <section>
             <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6 px-1">ประกาศและอัปเดต</h2>
             <Card className="rounded-[2.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 p-8">
                <div className="flex gap-6">
                   <div className="w-16 h-16 shrink-0 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <TrendingUp size={32} />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">อัปเดตระบบลาใหม่</h3>
                      <p className="text-slate-500 leading-relaxed">
                         ตอนนี้คุณสามารถดูสถานะการอนุมัติใบลาแบบ Real-time ได้แล้วผ่านทางอีเมลและการแจ้งเตือนในระบบ
                      </p>
                      <Link href="/leaves" className="inline-flex items-center text-blue-600 font-bold text-sm hover:underline mt-2">
                         ดูข้อมูลเพิ่มเติม <ArrowRight size={14} className="ml-1" />
                      </Link>
                   </div>
                </div>
             </Card>
          </section>
        </div>

        {/* Sidebar Status / Info */}
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-0 bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black text-slate-900">สถานะวันนี้</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className={cn("flex items-center justify-between p-4 rounded-2xl border", checkin ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", checkin ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500")}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เวลาเข้างาน</div>
                    <div className="font-bold text-slate-900">
                      {checkin ? format(new Date(checkin.created_at), 'HH:mm น.') : 'ยังไม่เช็คอิน'}
                    </div>
                  </div>
                </div>
                {checkin && (
                  <div className="text-[10px] font-bold px-2 py-1 bg-emerald-500 text-white rounded-md uppercase">
                    {checkin.status}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <CalendarRange size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">วันพักร้อนสะสมที่ใช้ไป</div>
                    <div className="font-bold text-slate-900">{usedVacation} / {maxVacation} วัน</div>
                  </div>
                </div>
              </div>
              
              {pendingPurchasesCount > 0 && (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 flex items-start gap-4">
                   <AlertCircle className="shrink-0 mt-1" size={20} />
                   <div className="text-sm">
                      <div className="font-black mb-1">แจ้งเตือน</div>
                      คุณมีใบเบิกค่าใช้จ่าย {pendingPurchasesCount} รายการที่ยังไม่ได้รับการอนุมัติ
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
