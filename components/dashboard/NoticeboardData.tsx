import { Megaphone, CalendarDays, FileText, Newspaper, PartyPopper, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const HOLIDAY_TYPE_ICON: Record<string, React.ReactNode> = {
  news: <Newspaper className="h-5 w-5" />,
  holiday: <PartyPopper className="h-5 w-5" />,
  policy: <FileText className="h-5 w-5" />,
}

export const HOLIDAY_TYPE_LABEL: Record<string, string> = {
  news: "ข่าวสาร",
  holiday: "วันหยุด",
  policy: "นโยบาย",
}

export const HOLIDAY_TYPE_COLOR: Record<string, string> = {
  news: "bg-blue-100 text-blue-700 border-blue-200",
  holiday: "bg-red-100 text-red-700 border-red-200",
  policy: "bg-amber-100 text-amber-700 border-amber-200",
}

// Bank of Thailand 2026 financial institution holidays
// Source: https://www.bot.or.th/th/financial-institutions-holiday.html
export const BOT_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่", nameEn: "New Year's Day" },
  { date: "2026-01-02", name: "วันหยุดทำการเพิ่มเป็นกรณีพิเศษ", nameEn: "Special Holiday" },
  { date: "2026-03-03", name: "วันมาฆบูชา", nameEn: "Makha Bucha Day" },
  { date: "2026-04-06", name: "วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์", nameEn: "Chakri Memorial Day" },
  { date: "2026-04-13", name: "วันสงกรานต์", nameEn: "Songkran Festival" },
  { date: "2026-04-14", name: "วันสงกรานต์", nameEn: "Songkran Festival" },
  { date: "2026-04-15", name: "วันสงกรานต์", nameEn: "Songkran Festival" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", nameEn: "National Labour Day" },
  { date: "2026-05-04", name: "วันฉัตรมงคล", nameEn: "Coronation Day" },
  { date: "2026-06-01", name: "ชดเชยวันวิสาขบูชา", nameEn: "Visakha Bucha Day (substitution)" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา พัชรสุธาพิมลลักษณ พระบรมราชินี", nameEn: "H.M. Queen Suthida's Birthday" },
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว", nameEn: "H.M. King Maha Vajiralongkorn's Birthday" },
  { date: "2026-07-29", name: "วันอาสาฬหบูชา", nameEn: "Asarnha Bucha Day" },
  { date: "2026-08-12", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์ พระบรมราชินีนาถ พระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ", nameEn: "H.M. Queen Sirikit's Birthday / Mother's Day" },
  { date: "2026-10-13", name: "วันนวมินทรมหาราช", nameEn: "King Rama IX Memorial Day" },
  { date: "2026-10-16", name: "วันหยุดทำการเพิ่มเป็นกรณีพิเศษในพื้นที่กรุงเทพมหานคร", nameEn: "Special Holiday (Bangkok only)" },
  { date: "2026-10-23", name: "วันปิยมหาราช", nameEn: "Chulalongkorn Day" },
  { date: "2026-12-07", name: "ชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ", nameEn: "King Rama IX Birthday / Father's Day (substitution)" },
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ", nameEn: "Constitution Day" },
  { date: "2026-12-31", name: "วันสิ้นปี", nameEn: "New Year's Eve" },
]

// Group holidays by month for display
export function getHolidaysByMonth() {
  const months: Record<number, typeof BOT_HOLIDAYS_2026> = {}
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ]

  BOT_HOLIDAYS_2026.forEach(h => {
    const month = new Date(h.date).getMonth() // 0-based
    if (!months[month]) months[month] = []
    months[month].push(h)
  })

  return { months, thaiMonths }
}

export function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr)
  const thaiDays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ]
  const buddhistYear = d.getFullYear() + 543
  return `วัน${thaiDays[d.getDay()]}ที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} พ.ศ. ${buddhistYear}`
}
