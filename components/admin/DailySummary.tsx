"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, addDays, subDays, parseISO } from "date-fns"
import { th } from "date-fns/locale"
import {
  CalendarDays,
  MapPin,
  School,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

export function DailySummary() {
  // 1. Selected Date State (Defaults to Today's local date)
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"))

  const handlePrevDay = () => {
    setSelectedDate(prev => format(subDays(parseISO(prev), 1), "yyyy-MM-dd"))
  }

  const handleNextDay = () => {
    setSelectedDate(prev => format(addDays(parseISO(prev), 1), "yyyy-MM-dd"))
  }

  const handleToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"))
  }

  // 2. Fetch all active assignments
  const { data: assignments, isLoading: isAssignmentsLoading } = useQuery<any[]>({
    queryKey: ["admin-assignments-all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignments?status=active")
      if (!res.ok) throw new Error("ดึงข้อมูลการมอบหมายงานล้มเหลว")
      return res.json()
    }
  })

  // 3. Fetch teaching logs for selected date
  const { data: teachingLogs, isLoading: isLogsLoading } = useQuery<any[]>({
    queryKey: ["admin-teaching-logs-date", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/teaching-logs?date=${selectedDate}`)
      if (!res.ok) throw new Error("ดึงข้อมูลบันทึกการสอนล้มเหลว")
      return res.json()
    }
  })

  // 4. Calculate dayOfWeek and filter active assignments for the selected date
  const dateObj = useMemo(() => parseISO(selectedDate), [selectedDate])
  const dayOfWeek = useMemo(() => {
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dateObj.getDay()]
  }, [dateObj])

  const activeAssignmentsForDate = useMemo(() => {
    if (!assignments) return []
    return assignments.filter((a: any) => {
      // Check date range boundary
      const start = a.start_date
      const end = a.end_date
      if (selectedDate < start) return false
      if (end && selectedDate > end) return false

      // Check specific dates array or recurring days array
      const matchesDate = (a.schedule_dates || []).includes(selectedDate)
      const matchesDay = (a.schedule_days || []).includes(dayOfWeek)
      return matchesDate || matchesDay
    })
  }, [assignments, selectedDate, dayOfWeek])

  // 5. Merge logs and assignments
  const mergedSessions = useMemo(() => {
    return activeAssignmentsForDate.map((assignment: any) => {
      const log = (teachingLogs || []).find((l: any) => l.assignment_id === assignment.id)
      return {
        assignment,
        log,
        id: assignment.id,
        schoolName: assignment.school?.name || "ไม่ทราบโรงเรียน",
        subjectName: assignment.subject?.name || "ไม่ทราบวิชา",
        subjectCode: assignment.subject?.code || "-",
        classLevel: assignment.class_level || "-",
        teacherName: assignment.teacher?.full_name || "ไม่ระบุครู",
        teacherAvatar: assignment.teacher?.avatar_url,
        timeStart: assignment.schedule_time_start || "--:--",
        timeEnd: assignment.schedule_time_end || "--:--",
        checkInTime: log?.check_in_time ? format(new Date(log.check_in_time), "HH:mm") : null,
        checkOutTime: log?.check_out_time ? format(new Date(log.check_out_time), "HH:mm") : null,
        lat: log?.check_in_lat,
        lng: log?.check_in_lng,
        status: log?.check_out_time ? "checked_out" : log?.check_in_time ? "checked_in" : "pending"
      }
    }).sort((a, b) => a.timeStart.localeCompare(b.timeStart))
  }, [activeAssignmentsForDate, teachingLogs])

  // 6. Calculate KPIs
  const kpis = useMemo(() => {
    const total = mergedSessions.length
    const checkedIn = mergedSessions.filter(s => s.status === 'checked_in' || s.status === 'checked_out').length
    const checkedOut = mergedSessions.filter(s => s.status === 'checked_out').length
    const pending = total - checkedIn
    return { total, checkedIn, checkedOut, pending }
  }, [mergedSessions])

  // 7. Group by Teacher for status card
  const teacherStatuses = useMemo(() => {
    const teachersMap: Record<string, {
      name: string;
      avatar: string;
      sessions: typeof mergedSessions;
      checkedInCount: number;
    }> = {}

    mergedSessions.forEach(session => {
      const teacherId = session.assignment.teacher_id
      if (!teachersMap[teacherId]) {
        teachersMap[teacherId] = {
          name: session.teacherName,
          avatar: session.teacherAvatar,
          sessions: [],
          checkedInCount: 0
        }
      }
      teachersMap[teacherId].sessions.push(session)
      if (session.status !== 'pending') {
        teachersMap[teacherId].checkedInCount++
      }
    })

    return Object.values(teachersMap)
  }, [mergedSessions])

  const isLoading = isAssignmentsLoading || isLogsLoading

  return (
    <div className="space-y-6">
      {/* Date Navigation & Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            สรุปข้อมูลรายวัน
          </h2>
          <p className="text-sm text-slate-500">
            {format(dateObj, "EEEE d MMMM yyyy", { locale: th })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-slate-50 dark:bg-slate-800">
            <Button variant="ghost" size="sm" onClick={handlePrevDay} className="h-10 px-3 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 border-r dark:border-slate-700">
              <ArrowLeft size={16} />
              <span className="ml-1 text-xs hidden sm:inline">เมื่อวาน</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="h-10 px-4 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 border-r dark:border-slate-700 font-bold text-xs">
              วันนี้
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNextDay} className="h-10 px-3 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700">
              <span className="mr-1 text-xs hidden sm:inline">พรุ่งนี้</span>
              <ArrowRight size={16} />
            </Button>
          </div>
          
          <Input
            type="date"
            value={selectedDate}
            onChange={e => e.target.value && setSelectedDate(e.target.value)}
            className="w-full sm:w-[160px] h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-sm font-medium"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-slate-900 rounded-3xl border shadow-sm">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <p className="text-slate-400 font-bold">กำลังประมวลผลข้อมูลประจำวัน...</p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">คาบสอนทั้งหมด</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{kpis.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <School size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">เช็คอินแล้ว</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{kpis.checkedIn}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">เช็คเอาท์เสร็จสิ้น</p>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{kpis.checkedOut}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-150 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">ยังไม่เช็คอิน</p>
                  <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{kpis.pending}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Scheduled Sessions List */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-black text-slate-950 dark:text-white flex items-center gap-2 text-base">
                    <School className="text-indigo-600" size={18} />
                    ตารางคาบสอนรายวัน
                  </h3>
                  <Badge variant="outline" className="font-bold border-indigo-100 text-indigo-700 bg-indigo-50/30">
                    {mergedSessions.length} คาบเรียน
                  </Badge>
                </div>
                <CardContent className="p-0">
                  {mergedSessions.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-medium">
                      ไม่มีตารางงานสอนที่เปิดใช้งานในวันที่เลือก
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                            <TableHead className="pl-6 font-bold text-xs uppercase tracking-wider">เวลา</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">วิชา & ชั้นเรียน</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">โรงเรียน</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">ครูผู้สอน</TableHead>
                            <TableHead className="pr-6 font-bold text-xs uppercase tracking-wider text-right">สถานะ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mergedSessions.map(session => (
                            <TableRow key={session.id} className="border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <TableCell className="pl-6 font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {session.timeStart} - {session.timeEnd}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-bold text-slate-900 dark:text-white text-sm">
                                  {session.subjectName}
                                </div>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 font-bold h-4 flex items-center">
                                    {session.subjectCode}
                                  </Badge>
                                  <span>ห้อง {session.classLevel}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                {session.schoolName}
                              </TableCell>
                              <TableCell className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                {session.teacherName}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                {session.status === "checked_out" ? (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 border font-bold text-[10px]">
                                    เช็คเอาท์แล้ว {session.checkOutTime}
                                  </Badge>
                                ) : session.status === "checked_in" ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 border font-bold text-[10px] animate-pulse">
                                    เช็คอินแล้ว {session.checkInTime}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 border font-bold text-[10px]">
                                    ยังไม่เข้าเรียน
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Teacher Status Details */}
            <div className="space-y-4">
              <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-black text-slate-950 dark:text-white flex items-center gap-2 text-base">
                    <Users className="text-indigo-600" size={18} />
                    สถานะวิทยากร / ครูผู้สอน
                  </h3>
                  <Badge variant="outline" className="font-bold border-indigo-100 text-indigo-700 bg-indigo-50/30">
                    {teacherStatuses.length} คน
                  </Badge>
                </div>
                <CardContent className="p-6 space-y-4">
                  {teacherStatuses.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium">
                      ไม่มีวิทยากรจัดตารางสอนในวันนี้
                    </div>
                  ) : (
                    teacherStatuses.map(t => (
                      <div key={t.name} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                เช็คอินสำเร็จ: {t.checkedInCount}/{t.sessions.length} คาบ
                              </p>
                            </div>
                          </div>
                          <Badge className={
                            t.checkedInCount === t.sessions.length ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            t.checkedInCount > 0 ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-amber-100 text-amber-700 border-amber-200"
                          }>
                            {t.checkedInCount === t.sessions.length ? "ครบถ้วน" : t.checkedInCount > 0 ? "กำลังดำเนินการ" : "รอดำเนินการ"}
                          </Badge>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50 border-t dark:border-slate-800 pt-2 text-xs space-y-2">
                          {t.sessions.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center pt-2">
                              <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{s.timeStart} | {s.schoolName}</span>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.subjectName} ({s.classLevel})</p>
                              </div>
                              <div className="text-right">
                                {s.status === "checked_out" ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-bold">ออก {s.checkOutTime}</span>
                                ) : s.status === "checked_in" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">เข้า {s.checkInTime}</span>
                                ) : (
                                  <span className="text-slate-400 font-medium">ยังไม่มา</span>
                                )}
                                
                                {s.lat && s.lng && (
                                  <div className="mt-1">
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      <MapPin size={10} /> แผนที่เช็คอิน
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
