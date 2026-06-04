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

async function fixMismatches() {
  console.log('--- Syncing student counts in teaching logs with classroom data ---\n')

  // 1. Fetch all teaching logs
  const { data: logs, error: logsError } = await supabase
    .from('teaching_logs')
    .select('id, teach_date, school_id, class_level, student_count')

  if (logsError) {
    console.error('Error fetching teaching logs:', logsError)
    return
  }

  // 2. Fetch all active student counts grouped by school and class_level
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

  // 3. Find and update mismatches
  let updateCount = 0

  for (const log of logs || []) {
    const classLevel = log.class_level
    const schoolId = log.school_id
    const key = `${schoolId}_${classLevel}`

    // Actual count from the students table
    const actualCount = studentCountMap[key] || 0
    const loggedCount = log.student_count || 0

    if (loggedCount !== actualCount) {
      console.log(`Updating log ID: ${log.id} (${log.teach_date}) | Class: ${classLevel} | Changing count: ${loggedCount} -> ${actualCount}`)
      
      const { error: updateError } = await supabase
        .from('teaching_logs')
        .update({ student_count: actualCount })
        .eq('id', log.id)

      if (updateError) {
        console.error(`Error updating log ${log.id}:`, updateError)
      } else {
        updateCount++
      }
    }
  }

  console.log(`\nSuccessfully updated ${updateCount} teaching logs.`)
}

fixMismatches()
