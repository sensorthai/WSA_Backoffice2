import { auth } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, format } from "date-fns"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userRole = (session.user as any).role
  if (userRole !== 'ceo' && userRole !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const month = searchParams.get('month') || format(new Date(), "yyyy-MM")
  const acceptHeader = req.headers.get('accept')
  const isCsv = acceptHeader === 'text/csv'

  const supabase = createSupabaseServerClient()
  const start = startOfMonth(new Date(`${month}-01`))
  const end = endOfMonth(start)
  const startDateStr = format(start, "yyyy-MM-dd")
  const endDateStr = format(end, "yyyy-MM-dd")

  let data: any[] = []
  let csvHeaders: string[] = []

  // --- Type 1: WFH Report ---
  if (type === 'wfh') {
    const { data: users } = await supabase.from('users').select('id, full_name, role').eq('is_active', true)
    const { data: checkins } = await supabase.from('wfh_checkins').select('*').gte('check_date', startDateStr).lte('check_date', endDateStr)

    const workingDays = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length

    data = (users || []).map(u => {
      const uCheckins = checkins?.filter(c => c.user_id === u.id) || []
      const office = uCheckins.filter(c => c.status === 'office').length
      const home = uCheckins.filter(c => c.status === 'home').length
      const onsite = uCheckins.filter(c => c.status === 'onsite').length
      const absent = workingDays - (office + home + onsite)
      return { 
        name: u.full_name, 
        office_days: office, 
        wfh_days: home, 
        onsite_days: onsite,
        absent_days: absent > 0 ? absent : 0,
        total_working_days: workingDays
      }
    })
    csvHeaders = ['Name', 'Office Days', 'WFH Days', 'Onsite Days', 'Absent Days', 'Total Working Days']
  }

  // --- Type 2: Leave Report ---
  else if (type === 'leave') {
    const year = month.split('-')[0]
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    const { data: users } = await supabase.from('users')
      .select('id, full_name, sick_quota, personal_quota, vacation_quota')
      .eq('is_active', true)
      
    const { data: leaves } = await supabase.from('leave_requests')
      .select('*')
      .eq('status', 'approved')
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd)

    data = (users || []).map(u => {
      const uLeaves = leaves?.filter(l => l.user_id === u.id) || []
      const sickUsed = uLeaves.filter(l => l.leave_type === 'sick').reduce((acc, l) => acc + l.days_count, 0)
      const personalUsed = uLeaves.filter(l => l.leave_type === 'personal').reduce((acc, l) => acc + l.days_count, 0)
      const vacationUsed = uLeaves.filter(l => l.leave_type === 'vacation').reduce((acc, l) => acc + l.days_count, 0)
      
      return {
        name: u.full_name,
        sick_quota: u.sick_quota || 30,
        sick_used: sickUsed,
        sick_remaining: (u.sick_quota || 30) - sickUsed,
        personal_quota: u.personal_quota || 3,
        personal_used: personalUsed,
        personal_remaining: (u.personal_quota || 3) - personalUsed,
        vacation_quota: u.vacation_quota || 6,
        vacation_used: vacationUsed,
        vacation_remaining: (u.vacation_quota || 6) - vacationUsed
      }
    })
    csvHeaders = [
      'Name', 
      'Sick Quota', 'Sick Used', 'Sick Remaining', 
      'Personal Quota', 'Personal Used', 'Personal Remaining', 
      'Vacation Quota', 'Vacation Used', 'Vacation Remaining'
    ]
  }

  // --- Type 3: Purchase Report (Full Accounting) ---
  else if (type === 'purchase') {
    const { data: purchases } = await supabase.from('purchase_requests')
      .select('*, user:users!user_id(full_name, role, email)')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr + 'T23:59:59.999Z')
      .order('created_at', { ascending: true })

    // Also fetch reimbursements for the same period
    const { data: reimbursements } = await supabase.from('reimbursements')
      .select('*, user:users!user_id(full_name, role, email)')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr + 'T23:59:59.999Z')
      .order('created_at', { ascending: true })

    // Map reimbursements to match purchase data format
    const mappedReimbursements = (reimbursements || []).map((r: any) => ({
      ...r,
      title: r.description,
      total_amount: r.amount,
      amount_before_vat: r.amount,
      vat_amount: 0,
      document_type: 'เบิกค่าใช้จ่าย (Petty Cash)',
      document_number: null,
      document_date: r.expense_date,
      payment_method: 'petty_cash',
      category: 'เบิกค่าใช้จ่าย',
      vendor: null,
      vendor_address: null,
      vendor_tax_id: null,
      customer_name: null,
      customer_tax_id: null,
      project_name: null,
      items: [],
      purpose: r.description,
      supervisor_note: null,
      ceo_note: null,
      source: 'reimbursement'
    }))

    // Merge and sort by created_at
    const allPurchases = [
      ...(purchases || []).map((p: any) => ({ ...p, source: 'purchase' })),
      ...mappedReimbursements
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    data = allPurchases
    csvHeaders = [
      'ลำดับ','วันที่เอกสาร','เลขที่เอกสาร','ประเภทเอกสาร','รายการ','หมวดหมู่',
      'ชื่อคู่ค้า','ที่อยู่คู่ค้า','Tax ID คู่ค้า',
      'ชื่อลูกค้า','Tax ID ลูกค้า',
      'ชื่องาน/โครงการ',
      'รายการสินค้า',
      'วิธีชำระเงิน','ยอดก่อน VAT','VAT','ยอดรวมหลัง VAT',
      'สถานะ','ผู้ขอเบิก','ตำแหน่ง','วันที่ขอเบิก',
      'หมายเหตุหัวหน้า','หมายเหตุ CEO'
    ]
    if (isCsv) {
      data = data.map((p: any, idx: number) => {
        const itemsText = (p.items || []).map((item: any, i: number) =>
          `${i + 1}. ${item.name} x${item.quantity} @${item.unit_price}`
        ).join(' | ')
        const paymentLabels: Record<string, string> = { petty_cash: 'เงินสดย่อย', credit_card: 'บัตรเครดิต', k_biz: 'K-Biz' }
        const statusLabels: Record<string, string> = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ถูกปฏิเสธ' }
        return {
          'ลำดับ': idx + 1,
          'วันที่เอกสาร': p.document_date || (p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd') : '-'),
          'เลขที่เอกสาร': p.document_number || '-',
          'ประเภทเอกสาร': p.document_type || '-',
          'รายการ': p.title || '-',
          'หมวดหมู่': p.category || '-',
          'ชื่อคู่ค้า': p.vendor || '-',
          'ที่อยู่คู่ค้า': p.vendor_address || '-',
          'Tax ID คู่ค้า': p.vendor_tax_id || '-',
          'ชื่อลูกค้า': p.customer_name || '-',
          'Tax ID ลูกค้า': p.customer_tax_id || '-',
          'ชื่องาน/โครงการ': p.project_name || '-',
          'รายการสินค้า': itemsText || '-',
          'วิธีชำระเงิน': paymentLabels[p.payment_method] || p.payment_method || '-',
          'ยอดก่อน VAT': p.amount_before_vat || 0,
          'VAT': p.vat_amount || 0,
          'ยอดรวมหลัง VAT': p.total_amount || 0,
          'สถานะ': statusLabels[p.status] || p.status || '-',
          'ผู้ขอเบิก': p.user?.full_name || '-',
          'ตำแหน่ง': p.user?.role || '-',
          'วันที่ขอเบิก': p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd HH:mm') : '-',
          'หมายเหตุหัวหน้า': p.supervisor_note || '-',
          'หมายเหตุ CEO': p.ceo_note || '-'
        }
      })
    }
  }

  // --- Type 4: Car Report ---
  else if (type === 'car') {
    const { data: cars } = await supabase.from('company_cars').select('*')
    const { data: bookings } = await supabase.from('car_bookings')
      .select('*')
      .eq('status', 'approved') // Only count approved utilization
      .gte('start_datetime', startDateStr)
      .lte('start_datetime', endDateStr + 'T23:59:59.999Z')

    const totalDays = eachDayOfInterval({ start, end }).length

    data = (cars || []).map(car => {
      const carBookings = bookings?.filter(b => b.car_id === car.id) || []
      const daysUsed = carBookings.length // Simplified: one booking = one day (or logic can be more complex)
      const mileage = carBookings.reduce((sum, b) => {
        const diff = (b.odometer_end || 0) - (b.odometer_start || 0)
        return sum + (diff > 0 ? diff : 0)
      }, 0)

      return {
        license_plate: car.license_plate,
        model: car.model,
        utilization_rate: ((daysUsed / totalDays) * 100).toFixed(2) + '%',
        total_mileage: mileage,
        bookings_count: carBookings.length
      }
    })
    csvHeaders = ['License Plate', 'Model', 'Utilization Rate', 'Total Mileage', 'Bookings Count']
  }

  // --- CSV Export Logic ---
  if (isCsv) {
    const headerRow = csvHeaders.join(',')
    const bodyRows = data.map(row => 
      Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n')
    
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${type}-${month}.csv"`
      }
    })
  }

  return NextResponse.json(data)
}
