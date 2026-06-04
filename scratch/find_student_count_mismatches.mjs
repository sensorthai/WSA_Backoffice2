import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    const key = match[1]
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1)
    }
    env[key] = value.trim()
  }
})

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findMismatches() {
  console.log('--- Checking for student count mismatches in teaching logs ---\n')

  // 1. Fetch all teaching logs
  const { data: logs, error: logsError } = await supabase
    .from('teaching_logs')
    .select('id, teach_date, school_id, class_level, student_count')
    .order('teach_date', { ascending: false })

  if (logsError) {
    console.error('Error fetching teaching logs:', logsError)
    return
  }

  // 2. Fetch schools to resolve names
  const { data: schools, error: schoolsError } = await supabase
    .from('schools')
    .select('id, name')

  if (schoolsError) {
    console.error('Error fetching schools:', schoolsError)
    return
  }

  const schoolMap = {}
  schools.forEach(s => {
    schoolMap[s.id] = s.name
  })

  // 3. Fetch all active student counts grouped by school and class_level
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('school_id, class_level')
    .eq('is_active', true)

  if (studentsError) {
    console.error('Error fetching students:', studentsError)
    return
  }

  // Group students count
  const studentCountMap = {}
  students.forEach((s) => {
    const key = `${s.school_id}_${s.class_level}`
    studentCountMap[key] = (studentCountMap[key] || 0) + 1
  })

  // 4. Find and output mismatches
  let mismatchCount = 0
  const mismatches = []

  for (const log of logs || []) {
    const classLevel = log.class_level
    const schoolId = log.school_id
    const key = `${schoolId}_${classLevel}`

    // Actual count from the students table
    const actualCount = studentCountMap[key] || 0
    const loggedCount = log.student_count || 0

    if (loggedCount !== actualCount) {
      mismatchCount++
      mismatches.push({
        id: log.id,
        date: log.teach_date,
        school: schoolMap[schoolId] || 'Unknown',
        classLevel: classLevel || 'Not specified',
        loggedCount,
        actualCount
      })
    }
  }

  console.log(`Found ${logs?.length || 0} total teaching logs.`)
  console.log(`Found ${mismatchCount} logs with student count mismatches.\n`)

  if (mismatches.length > 0) {
    console.log('Date'.padEnd(12) + 'School'.padEnd(30) + 'Class'.padEnd(15) + 'Logged Count   Actual Classroom Count')
    console.log('----------------------------------------------------------------------------------------')
    
    mismatches.forEach(m => {
      console.log(
        (m.date || '').padEnd(12),
        (m.school || '').substring(0, 29).padEnd(30),
        (m.classLevel || '').padEnd(15),
        String(m.loggedCount).padStart(8),
        '      ',
        String(m.actualCount).padStart(8)
      )
    })
  } else {
    console.log('All teaching logs student counts match classroom data!')
  }
}

findMismatches()
