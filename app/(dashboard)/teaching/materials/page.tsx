"use client"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2, BookOpen, Video, Presentation, FileText, Link2, Package,
  ExternalLink, FileSpreadsheet, School
} from "lucide-react"

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  manual:   { label: "📖 คู่มือ", icon: BookOpen, color: "bg-amber-50 text-amber-700 border-amber-200" },
  slide:    { label: "📊 Slide", icon: Presentation, color: "bg-blue-50 text-blue-700 border-blue-200" },
  video:    { label: "🎬 YouTube", icon: Video, color: "bg-red-50 text-red-700 border-red-200" },
  document: { label: "📄 เอกสาร", icon: FileText, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  link:     { label: "🔗 Link", icon: Link2, color: "bg-purple-50 text-purple-700 border-purple-200" },
  other:    { label: "📦 อื่นๆ", icon: Package, color: "bg-slate-50 text-slate-700 border-slate-200" },
}

export default function TeachingMaterialsPage() {
  // Fetch teacher's assignments
  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignments?status=active")
      return res.ok ? res.json() : []
    }
  })

  // Get unique material codes from assignments' subjects
  const materialCodes = [...new Set(
    (assignments || [])
      .map((a: any) => a.subject?.material_code)
      .filter(Boolean)
  )] as string[]

  // Fetch all materials
  const { data: allMaterials, isLoading: loadingMats } = useQuery({
    queryKey: ["my-materials"],
    queryFn: async () => {
      const res = await fetch("/api/admin/materials?")
      return res.ok ? res.json() : []
    },
    enabled: materialCodes.length > 0,
  })

  const isLoading = loadingAssignments || loadingMats

  // Group materials by assignment/subject
  const groupedBySubject = (assignments || [])
    .filter((a: any) => a.subject?.material_code)
    .map((a: any) => ({
      assignment: a,
      subject: a.subject,
      school: a.school,
      materials: (allMaterials || []).filter((m: any) => m.material_code === a.subject.material_code)
    }))
    .filter((g: any) => g.materials.length > 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-[3rem] p-10 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
            Teaching Materials
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
            <FileSpreadsheet size={48} className="text-purple-300" /> สื่อการสอน
          </h1>
          <p className="text-purple-200 text-lg">คู่มือ Slide YouTube และเอกสารสำหรับวิชาที่คุณได้รับมอบหมาย</p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px]" />
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400" /></div>
      ) : groupedBySubject.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-slate-500 font-medium">ยังไม่มีสื่อการสอนสำหรับวิชาที่คุณสอน</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedBySubject.map((group: any) => (
            <Card key={group.assignment.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-slate-50">
                <CardTitle className="flex items-center gap-3 text-base">
                  <BookOpen className="h-5 w-5 text-indigo-500" />
                  <div className="flex-1">
                    <span className="font-bold">{group.subject.name}</span>
                    {group.subject.code && <Badge variant="outline" className="ml-2 font-mono text-xs">{group.subject.code}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-normal">
                    <School className="h-4 w-4" />
                    {group.school?.name}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {group.materials.map((m: any) => {
                    const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other
                    const Icon = cfg.icon
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border">
                        <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{m.title}</p>
                          {m.description && <p className="text-xs text-slate-400 truncate">{m.description}</p>}
                        </div>
                        <Badge className={cfg.color + " text-[10px]"}>{cfg.label}</Badge>
                        {(m.file_url || m.youtube_url) && (
                          <a href={m.youtube_url || m.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <ExternalLink className="h-3 w-3" /> เปิด
                            </Button>
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
