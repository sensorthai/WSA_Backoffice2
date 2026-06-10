// Seed BOT 2026 financial institution holidays into announcements table
// Usage: node scratch/seed_bot_holidays_2026.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve('.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) {
    let val = rest.join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key.trim()] = val
  }
})

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Bank of Thailand 2026 financial institution holidays
// Source: https://www.bot.or.th/th/financial-institutions-holiday.html
const BOT_HOLIDAYS_2026 = [
  {
    date: "2026-01-01",
    title: "วันขึ้นปีใหม่ (New Year's Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันขึ้นปีใหม่\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-01-02",
    title: "วันหยุดทำการเพิ่มเป็นกรณีพิเศษ",
    content: "วันหยุดทำการของสถาบันการเงินและสถาบันการเงินเฉพาะกิจเพิ่มเป็นกรณีพิเศษ\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-03-03",
    title: "วันมาฆบูชา (Makha Bucha Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันมาฆบูชา\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-04-06",
    title: "วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (Chakri Memorial Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันจักรี\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-04-13",
    title: "วันสงกรานต์ (Songkran Festival)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันสงกรานต์ วันที่ 1\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-04-14",
    title: "วันสงกรานต์ (Songkran Festival)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันสงกรานต์ วันที่ 2\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-04-15",
    title: "วันสงกรานต์ (Songkran Festival)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันสงกรานต์ วันที่ 3\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-05-01",
    title: "วันแรงงานแห่งชาติ (National Labour Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันแรงงานแห่งชาติ\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-05-04",
    title: "วันฉัตรมงคล (Coronation Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันฉัตรมงคล\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-06-01",
    title: "ชดเชยวันวิสาขบูชา (Visakha Bucha Day - Substitution)",
    content: "วันหยุดชดเชยวันวิสาขบูชา (วันอาทิตย์ที่ 31 พฤษภาคม 2569)\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-06-03",
    title: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา พัชรสุธาพิมลลักษณ พระบรมราชินี",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา พัชรสุธาพิมลลักษณ พระบรมราชินี\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-07-28",
    title: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (H.M. King's Birthday)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-07-29",
    title: "วันอาสาฬหบูชา (Asarnha Bucha Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันอาสาฬหบูชา\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-08-12",
    title: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์ฯ และวันแม่แห่งชาติ",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์ พระบรมราชินีนาถ พระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-10-13",
    title: "วันนวมินทรมหาราช (King Rama IX Memorial Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันนวมินทรมหาราช (วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร)\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-10-16",
    title: "วันหยุดทำการเพิ่มเป็นกรณีพิเศษในพื้นที่กรุงเทพมหานคร",
    content: "วันหยุดทำการของสถาบันการเงินและสถาบันการเงินเฉพาะกิจเพิ่มเป็นกรณีพิเศษในพื้นที่กรุงเทพมหานคร\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ที่ 26/2569"
  },
  {
    date: "2026-10-23",
    title: "วันปิยมหาราช (Chulalongkorn Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันปิยมหาราช (วันคล้ายวันสวรรคตพระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว)\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-12-07",
    title: "ชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ",
    content: "วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร วันชาติ และวันพ่อแห่งชาติ (วันเสาร์ที่ 5 ธันวาคม 2569)\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-12-10",
    title: "วันรัฐธรรมนูญ (Constitution Day)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันรัฐธรรมนูญ\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
  {
    date: "2026-12-31",
    title: "วันสิ้นปี (New Year's Eve)",
    content: "วันหยุดตามประเพณีของสถาบันการเงิน — วันสิ้นปี\n\nอ้างอิงจากประกาศธนาคารแห่งประเทศไทย (ธปท.) ประจำปี พ.ศ. 2569"
  },
]

async function seed() {
  console.log('--- Seeding BOT 2026 Financial Institution Holidays ---\n')

  // First, find a system user to set as created_by (or use a known admin id)
  const { data: admins } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('role', ['admin', 'ceo'])
    .limit(1)

  const createdBy = admins?.[0]?.id
  if (!createdBy) {
    console.warn('⚠️  No admin user found. Holidays will have null created_by. You can update later.')
  } else {
    console.log(`✅ Using ${admins[0].full_name} (${admins[0].role}) as creator\n`)
  }

  // Check existing holidays to avoid duplicates
  const { data: existing } = await supabase
    .from('announcements')
    .select('title, start_date')
    .eq('type', 'holiday')

  const existingKeys = new Set(
    (existing || []).map(e => `${e.title}|${e.start_date?.split('T')[0]}`)
  )

  let inserted = 0
  let skipped = 0

  for (const holiday of BOT_HOLIDAYS_2026) {
    const key = `${holiday.title}|${holiday.date}`
    if (existingKeys.has(key)) {
      console.log(`⏭️  SKIP: ${holiday.title} (${holiday.date}) — already exists`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: holiday.title,
        content: holiday.content,
        type: 'holiday',
        start_date: `${holiday.date}T00:00:00+07:00`,
        end_date: `${holiday.date}T23:59:59+07:00`,
        is_active: true,
        created_by: createdBy || null,
      })

    if (error) {
      console.error(`❌ ERROR inserting "${holiday.title}":`, error.message)
    } else {
      console.log(`✅ INSERTED: ${holiday.title} (${holiday.date})`)
      inserted++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`✅ Inserted: ${inserted}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`📊 Total: ${BOT_HOLIDAYS_2026.length}`)
}

seed().catch(console.error)
