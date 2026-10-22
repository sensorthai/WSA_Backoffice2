import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedReq() {
  console.log("Creating sample requisition...");

  // 1. Get plot 02B01
  const { data: plot } = await supabase
    .from('lh_house_plots')
    .select('id, plot_code, land_plot')
    .eq('land_plot', '02B01')
    .single();

  if (!plot) {
    console.error("Plot 02B01 not found");
    process.exit(1);
  }

  // 2. Pick 4 items from in_stock
  const { data: ctrl } = await supabase.from('device_items').select('id, serial_number').eq('serial_number', 'APC-YIP-NEW-0001').single();
  const { data: port } = await supabase.from('device_items').select('id, serial_number').eq('serial_number', 'AP8-YIP-NEW-0001').single();
  const { data: s1 } = await supabase.from('device_items').select('id, serial_number').eq('serial_number', 'SN-YIP-NEW-0001').single();
  const { data: s2 } = await supabase.from('device_items').select('id, serial_number').eq('serial_number', 'SN-YIP-NEW-0002').single();

  if (!ctrl || !port || !s1 || !s2) {
    console.error("Items not found");
    process.exit(1);
  }

  // 3. Create requisition
  const reqNo = `REQ-202610-0001`;
  const { data: req, error: reqErr } = await supabase
    .from('inventory_requisitions')
    .upsert({
      requisition_no: reqNo,
      requester_name: "นายสมชาย ช่างทอง",
      requester_phone: "081-234-5678",
      purpose_type: "installation_new",
      plot_id: plot.id,
      status: "issued",
      notes: "เบิกอุปกรณ์ 1 ชุด สำหรับติดตั้งแปลง 02B01 มัณฑนา ราชพฤกษ์",
    }, { onConflict: 'requisition_no' })
    .select()
    .single();

  if (reqErr) {
    console.error("Error creating requisition:", reqErr.message);
    process.exit(1);
  }

  // 4. Insert requisition items
  const deviceIds = [ctrl.id, port.id, s1.id, s2.id];
  const items = deviceIds.map(devId => ({
    requisition_id: req.id,
    device_item_id: devId,
    item_status: 'with_technician'
  }));

  // Clean old items if re-running
  await supabase.from('inventory_requisition_items').delete().eq('requisition_id', req.id);
  const { error: itemsErr } = await supabase.from('inventory_requisition_items').insert(items);

  if (itemsErr) {
    console.error("Error inserting requisition items:", itemsErr.message);
  } else {
    console.log(`Requisition ${reqNo} created with ${items.length} items!`);
  }

  // Update these devices status to 'with_technician'
  await supabase.from('device_items').update({ status: 'with_technician', current_plot_id: plot.id }).in('id', deviceIds);
  console.log("Updated 4 devices to 'with_technician' status.");
}

seedReq();
