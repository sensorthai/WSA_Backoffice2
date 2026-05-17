"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Clock, LogOut, ShieldAlert } from "lucide-react"

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 text-center">
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner animate-pulse">
            <Clock size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            รอการอนุมัติบัญชี
          </h2>
          <p className="mt-4 text-slate-500 font-medium leading-relaxed">
            บัญชีของคุณถูกสร้างเรียบร้อยแล้ว <br/>
            ขณะนี้กำลังรอผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติการเข้าใช้งาน
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-start gap-4 text-left">
          <ShieldAlert className="text-slate-400 shrink-0" size={20} />
          <p className="text-xs text-slate-400 font-bold leading-normal">
            หากคุณคิดว่านี่คือข้อผิดพลาด หรือรอการอนุมัตินานเกินไป กรุณาติดต่อฝ่ายไอทีหรือผู้ดูแลระบบของบริษัท
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-14 rounded-2xl border-slate-200 font-black gap-2 hover:bg-slate-50 transition-all"
          >
            <LogOut size={18} /> ออกจากระบบ
          </Button>
        </div>
      </div>
    </div>
  )
}
