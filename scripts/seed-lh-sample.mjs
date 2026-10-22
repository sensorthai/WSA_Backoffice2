import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleTsv = `name\ttype\tlabel\thouse_number\taccount_code\tland_plot\thome_series\tproject_code\tproject\taddress\tรหัสใบสั่งซื้อ\tวันที่สั่งซื้อ (ค.ศ.)\tocc_id\tส่งมอบในระบบ\tวันที่ PO เพิ่มใหม่ (ค.ศ.)\tLOT\tแหล่งชีต\tสถานะส่งมอบ
LH372-02B01-210PW334T\tHouse\t90/109 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/109\tLH372\t02B01\t210PW334T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/109 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726300837\t27/09/2020\t90/109 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02B01\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02C03-210PW334T\tHouse\t90/119 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/119\tLH372\t02C03\t210PW334T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/119 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726300870\t29/09/2020\t90/119 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02C03\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02C09-150PW324T\tHouse\t90/124 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/124\tLH372\t02C09\t150PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/124 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301134\t23/10/2020\t90/124 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02C09\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02D07-177PW324T\tHouse\t90/132 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/132\tLH372\t02D07\t177PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/132 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301354\t18/11/2020\t90/132 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02D07\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02D08-210PW334T\tHouse\t90/131 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/131\tLH372\t02D08\t210PW334T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/131 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301229\t29/10/2020\t90/131 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02D08\t\t\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH372-02L07-177PW324T\tHouse\t90/139 มัณฑนา ราชพฤกษ์-นครอินทร์\t90/139\tLH372\t02L07\t177PW324T\tMRI\tมัณฑนา ราชพฤกษ์-นครอินทร์\t90/139 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140\tLH3726301472\t21/11/2020\t90/139 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02L07\t\t29/09/2021\tPM 2.5\tAsset_House 1,500\tยังไม่ส่งมอบ
LH354-01B01-103SI115C\tHouse\t168/402 Villaggio บางใหญ่\t168/402\tLH354\t01B01\t103SI115C\tVY\tVillaggio บางใหญ่\t168/402 หมู่ 9 ต.บ้านใหม่ อ.บางใหญ่ จ.นนทบุรี 11140\tLH3546504727\t10/11/2022\t168/402 Villaggio บางใหญ่ - VY 01B01\t\t10/11/2022\tLot 1,500\tAsset_House 1,500\tยังไม่ส่งมอบ
LA030-00N16-236OW236B\tHouse\t456/167 มัณฑนา บางนา กม.15\t456/167\tLA030\t00N16\t236OW236B\tM15\tมัณฑนา บางนา กม.15\t456/167 หมู่ 3 ถ.บางนาตราด กม.15 ต.บางโฉลง อ.บางพลี จ.สมุทรปราการ 10540\tLA0306503596\t10/11/2022\t456/167 มัณฑนา บางนา กม.15 - M15 00N16\t\t10/11/2022\tLot 1,500\tAsset_House 1,500\tยังไม่ส่งมอบ
LH380-00K01-155FD127B\tHouse\t468/106 CHAIYAPRUEK บางนา กม.13\t468/106\tLH380\t00K01\t155FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/106 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603750\t28/12/2023\t468/106 CHAIYAPRUEK บางนา กม.13 - C13 00K01\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ
LH380-00K02-155FD127B\tHouse\t468/107 CHAIYAPRUEK บางนา กม.13\t468/107\tLH380\t00K02\t155FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/107 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603752\t28/12/2023\t468/107 CHAIYAPRUEK บางนา กม.13 - C13 00K02\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ
LH380-00K03-155FD127B\tHouse\t468/108 CHAIYAPRUEK บางนา กม.13\t468/108\tLH380\t00K03\t155FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/108 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603753\t28/12/2023\t468/108 CHAIYAPRUEK บางนา กม.13 - C13 00K03\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ
LH380-00K04-131FD127B\tHouse\t468/109 CHAIYAPRUEK บางนา กม.13\t468/109\tLH380\t00K04\t131FD127B\tC13\tCHAIYAPRUEK บางนา กม.13\t468/109 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540\tLH3806603853\t29/12/2023\t468/109 CHAIYAPRUEK บางนา กม.13 - C13 00K04\t\t06/01/2024\tLot 1,000\tAsset_House 1,000\tยังไม่ส่งมอบ`;

function parseThaiDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[/.-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

async function run() {
  console.log("Checking Supabase connection and tables...");
  const { data: testData, error: testErr } = await supabase.from('lh_projects').select('count');
  if (testErr) {
    console.error("Error reading lh_projects:", testErr.message);
    process.exit(1);
  }
  console.log("lh_projects table exists!");

  const lines = sampleTsv.trim().split(/\r?\n/);
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx]?.trim() || '';
    });
    rows.push(obj);
  }

  // 1. Insert projects
  const projectMap = new Map();
  for (const r of rows) {
    const key = `${r.account_code}_${r.project_code}`;
    if (!projectMap.has(key)) {
      const { data: existing } = await supabase
        .from('lh_projects')
        .select('id')
        .eq('account_code', r.account_code)
        .eq('project_code', r.project_code)
        .maybeSingle();

      if (existing) {
        projectMap.set(key, existing.id);
      } else {
        const { data: created, error: pErr } = await supabase
          .from('lh_projects')
          .insert({
            account_code: r.account_code,
            project_code: r.project_code,
            project_name: r.project,
            developer_name: 'Land and Houses',
          })
          .select('id')
          .single();

        if (pErr) {
          console.error("Error creating project:", pErr.message);
        } else {
          projectMap.set(key, created.id);
        }
      }
    }
  }

  console.log(`Created/Resolved ${projectMap.size} projects.`);

  // 2. Insert plots
  const plotsData = rows.map(r => ({
    project_id: projectMap.get(`${r.account_code}_${r.project_code}`),
    plot_code: r.name,
    occ_id: r.occ_id || null,
    land_plot: r.land_plot,
    house_number: r.house_number,
    home_series: r.home_series,
    label: r.label,
    full_address: r.address,
    po_number: r['รหัสใบสั่งซื้อ'],
    po_date: parseThaiDate(r['วันที่สั่งซื้อ (ค.ศ.)']),
    po_new_date: parseThaiDate(r['วันที่ PO เพิ่มใหม่ (ค.ศ.)']),
    lot_name: r.LOT,
    sheet_source: r['แหล่งชีต'],
    delivery_status: 'pending',
  }));

  const { data: insertedPlots, error: plotErr } = await supabase
    .from('lh_house_plots')
    .upsert(plotsData, { onConflict: 'plot_code' })
    .select('plot_code');

  if (plotErr) {
    console.error("Error inserting plots:", plotErr.message);
  } else {
    console.log(`Successfully seeded ${insertedPlots.length} sample plots into lh_house_plots!`);
  }
}

run();
