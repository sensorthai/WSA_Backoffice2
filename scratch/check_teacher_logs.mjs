import { createClient } from '@supabase/supabase-js'

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTeacherLogs() {
  // Find the teacher
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, full_name, role')
    .ilike('full_name', '%นฤพนาถ%')

  if (userError) {
    console.error('Error fetching user:', userError)
    return
  }

  console.log('Found users:', users)

  if (users && users.length > 0) {
    for (const user of users) {
      console.log(`\nFetching teaching logs for ${user.full_name} (${user.id}):`)
      const { data: logs, error: logsError } = await supabase
        .from('teaching_logs')
        .select(`
          *,
          assignment:teaching_assignments(
            *,
            school:schools(name),
            subject:subjects(name)
          )
        `)
        .eq('teacher_id', user.id)

      if (logsError) {
        console.error('Error fetching logs:', logsError)
      } else {
        console.log(`Found ${logs?.length || 0} logs for ${user.full_name}:`)
        for (const log of logs || []) {
          console.log(`\nLog ID: ${log.id}`)
          console.log(`Date: ${log.teach_date}`)
          console.log(`School: ${log.assignment?.school?.name}`)
          console.log(`Subject: ${log.assignment?.subject?.name}`)
          
          const classLevel = log.class_level || log.assignment?.class_level || 'N/A'
          const academicYear = log.assignment?.academic_year || 'N/A'
          
          console.log(`Class Level: ${classLevel}`)
          console.log(`Academic Year: ${academicYear}`)
          
          if (classLevel !== 'N/A' && log.assignment?.school_id) {
            const { data: students } = await supabase
              .from('students')
              .select('id, prefix, first_name, last_name, student_number, class_level')
              .eq('school_id', log.assignment.school_id)
              .eq('class_level', classLevel)
              .eq('academic_year', academicYear)
              .order('student_number', { ascending: true })
              
            console.log(`Students in this class: ${students?.length || 0}`)
            if (students && students.length > 0) {
              console.log(students.map(s => `เลขที่ ${s.student_number || '-'} ${s.prefix || ''}${s.first_name || ''} ${s.last_name || ''}`).join('\n'))
            }
          }
        }
      }
    }
  }
}

checkTeacherLogs()
