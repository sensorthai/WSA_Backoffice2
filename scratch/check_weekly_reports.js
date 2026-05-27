const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { startOfWeek, endOfWeek, format, parseISO } = require('date-fns');
const { th } = require('date-fns/locale');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key) env[key.trim()] = value.join('=').trim();
});

let supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSync() {
  const userId = '44252f1e-93a4-4255-9fa6-402e07c99d96';
  const today = '2026-05-26';
  const work_done = 'อัปเดต - ทดสอบบันทึกเนื้องานซิงค์โดยอัตโนมัติ';

  console.log('Testing syncCheckinToWeeklyReport UPDATE path...');
  try {
    const dateObj = parseISO(today);
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const weekLabel = `${format(weekStart, 'd')}-${format(weekEnd, 'd MMM', { locale: th })}`;

    console.log('weekStartStr:', weekStartStr);
    console.log('weekEndStr:', weekEndStr);
    console.log('weekLabel:', weekLabel);

    // 1. Check if weekly report already exists
    const { data: existingReport, error: reportError } = await supabase
      .from('weekly_reports')
      .select('id, status')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    if (reportError) {
      console.error('Error finding weekly report:', reportError);
      return;
    }

    console.log('Existing report found:', existingReport);

    let reportId = existingReport?.id;

    if (!existingReport) {
      // Create a new draft
      const { data: newReport, error: createReportError } = await supabase
        .from('weekly_reports')
        .insert({
          user_id: userId,
          week_start: weekStartStr,
          week_end: weekEndStr,
          week_label: weekLabel,
          status: 'draft'
        })
        .select()
        .single();

      if (createReportError) {
        console.error('Error creating weekly report:', createReportError);
        return;
      }
      reportId = newReport.id;
      console.log('Created new report:', reportId);
    } else if (existingReport.status !== 'draft') {
      console.log('Report is not draft, skipping.');
      return;
    }

    // 3. Fetch current items in this weekly report
    const { data: items, error: itemsError } = await supabase
      .from('weekly_report_items')
      .select('id, plan, sort_order')
      .eq('report_id', reportId);

    if (itemsError) {
      console.error('Error fetching weekly report items:', itemsError);
      return;
    }

    const datePrefix = `[บันทึกรายวัน ${format(parseISO(today), 'dd/MM/yyyy')}]:`;
    const existingItem = items?.find((item) => item.plan.startsWith(datePrefix));

    if (existingItem) {
      console.log('Updating existing item:', existingItem.id);
      const { error: updateItemError } = await supabase
        .from('weekly_report_items')
        .update({
          plan: `${datePrefix} ${work_done}`
        })
        .eq('id', existingItem.id);

      if (updateItemError) {
        console.error('Error updating weekly report item:', updateItemError);
      }
    } else {
      console.log('Inserting new item...');
      const maxSortOrder = items && items.length > 0
        ? Math.max(...items.map((i) => i.sort_order))
        : -1;

      const { error: insertItemError } = await supabase
        .from('weekly_report_items')
        .insert({
          report_id: reportId,
          plan: `${datePrefix} ${work_done}`,
          progress: 'completed',
          is_completed: true,
          sort_order: maxSortOrder + 1
        });

      if (insertItemError) {
        console.error('Error inserting weekly report item:', insertItemError);
      }
    }

    console.log('Sync completed successfully!');
  } catch (err) {
    console.error('Crash in testSync:', err);
  }
}

testSync();
