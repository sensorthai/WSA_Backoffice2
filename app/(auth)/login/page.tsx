"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"


export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50/50 px-4 py-12 sm:px-6 lg:px-8">
      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-[-20%] left-[-15%] h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-15%] right-[-10%] h-[550px] w-[550px] rounded-full bg-purple-200/35 blur-[120px] pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] h-[350px] w-[350px] rounded-full bg-blue-100/30 blur-[90px] pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <div className="relative w-full max-w-md bg-white/75 backdrop-blur-xl border border-white/60 p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(99,102,241,0.06)] z-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center">
          {/* Glowing Brand Logo Mark */}
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group hover:scale-105 transition-transform duration-300">
            <span className="text-white text-xl font-black tracking-wider select-none">SME</span>
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 -z-10 group-hover:opacity-40 transition duration-300" />
          </div>

          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-sans">
            Sign In or Create account
          </h2>
          <p className="mt-2 text-center text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed font-thai">
            ระบบจัดการหลังบ้าน SME Backoffice
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 py-6 text-base font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 hover:border-slate-300 rounded-2xl transition-all hover:scale-[1.01] active:scale-98 shadow-sm hover:shadow-md duration-300"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-sans">Sign in or Sign up with Google</span>
          </Button>

          <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">
            * New users will be automatically registered
          </p>
        </div>

        <div className="mt-8 border-t border-slate-100/80 pt-5">
          <p className="text-center text-xs text-slate-400 font-semibold tracking-wide font-thai leading-relaxed">
            เฉพาะบุคลากรภายในองค์กรเท่านั้น
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 pt-6 border-t border-slate-150/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Developer Quick Login (Bypass)
              </h3>
              <span className="text-[9px] bg-indigo-55/70 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-200/40 uppercase tracking-wider scale-90">
                Dev Mode
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("credentials", { email: "tin@wirelesssolution.asia", callbackUrl: "/dashboard" })}
                className="justify-start font-bold h-10 px-3 border-slate-200/60 bg-white/50 hover:bg-slate-50/80 text-slate-700 rounded-xl text-[11px] gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
              >
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-thai">คุณตฤณ (CEO)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("credentials", { email: "narumon.i@wirelesssolution.asia", callbackUrl: "/dashboard" })}
                className="justify-start font-bold h-10 px-3 border-slate-200/60 bg-white/50 hover:bg-slate-50/80 text-slate-700 rounded-xl text-[11px] gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
              >
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-thai">คุณนฤมล (Admin)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("credentials", { email: "aunchalee@wirelesssolution.asia", callbackUrl: "/dashboard" })}
                className="justify-start font-bold h-10 px-3 border-slate-200/60 bg-white/50 hover:bg-slate-50/80 text-slate-700 rounded-xl text-[11px] gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
              >
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-thai">คุณอัญชลี (Super)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("credentials", { email: "nattapon@wirelesssolution.asia", callbackUrl: "/dashboard" })}
                className="justify-start font-bold h-10 px-3 border-slate-200/60 bg-white/50 hover:bg-slate-50/80 text-slate-700 rounded-xl text-[11px] gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
              >
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-thai">คุณณัฐพล (Staff)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("credentials", { email: "ratchakornworks@gmail.com", callbackUrl: "/teaching" })}
                className="justify-start font-bold h-10 px-3 border-slate-200/60 bg-white/50 hover:bg-slate-50/80 text-slate-700 rounded-xl text-[11px] col-span-2 gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-sm"
              >
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="font-thai">คุณรัชกร (Teacher / Outsource)</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
