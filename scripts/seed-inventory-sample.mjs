import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0];
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding sample inventory items...");

  // 1. Fetch product catalog IDs
  const { data: products, error: prodErr } = await supabase.from('product_catalog').select('*');
  if (prodErr || !products || products.length === 0) {
    console.error("Error fetching product catalog:", prodErr);
    process.exit(1);
  }

  const ctrlProduct = products.find(p => p.sku === 'AP-CTRL');
  const portProduct = products.find(p => p.sku === 'AP-8PORT');
  const sensorProduct = products.find(p => p.sku === 'SN-PM25');

  if (!ctrlProduct || !portProduct || !sensorProduct) {
    console.error("Missing required product catalog entries (AP-CTRL, AP-8PORT, SN-PM25)");
    process.exit(1);
  }

  const items = [];

  // 1. ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5 25 ชุด สภาพใหม่ กรรมสิทธิ์ YIP
  for (let i = 1; i <= 25; i++) {
    items.push({
      product_id: ctrlProduct.id,
      serial_number: `APC-YIP-NEW-${String(i).padStart(4, '0')}`,
      ownership_type: 'customer_consignment',
      owner_company_name: 'YIP (Yip In Tsoi)',
      condition: 'new',
      status: 'in_stock',
      notes: 'ชุดควบคุมระบบเติมอากาศ สภาพใหม่ สต็อกฝาก YIP',
    });
  }

  // 2. ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5 10 ชุด สภาพใหม่ กรรมสิทธิ์ WSA
  for (let i = 1; i <= 10; i++) {
    items.push({
      product_id: ctrlProduct.id,
      serial_number: `APC-WSA-NEW-${String(i).padStart(4, '0')}`,
      ownership_type: 'company_owned',
      owner_company_name: 'WSA',
      condition: 'new',
      status: 'in_stock',
      notes: 'ชุดควบคุมระบบเติมอากาศ สภาพใหม่ สต็อกบริษัท WSA',
    });
  }

  // 3. Air Plus 8 Port Extension 25 ชุด สภาพใหม่ กรรมสิทธิ์ YIP
  for (let i = 1; i <= 25; i++) {
    items.push({
      product_id: portProduct.id,
      serial_number: `AP8-YIP-NEW-${String(i).padStart(4, '0')}`,
      ownership_type: 'customer_consignment',
      owner_company_name: 'YIP (Yip In Tsoi)',
      condition: 'new',
      status: 'in_stock',
      notes: 'Air Plus 8 Port Extension สภาพใหม่ สต็อกฝาก YIP',
    });
  }

  // 4. Air Plus 8 Port Extension 15 ชุด สภาพใหม่ กรรมสิทธิ์ WSA
  for (let i = 1; i <= 15; i++) {
    items.push({
      product_id: portProduct.id,
      serial_number: `AP8-WSA-NEW-${String(i).padStart(4, '0')}`,
      ownership_type: 'company_owned',
      owner_company_name: 'WSA',
      condition: 'new',
      status: 'in_stock',
      notes: 'Air Plus 8 Port Extension สภาพใหม่ สต็อกบริษัท WSA',
    });
  }

  // 5. เซ็นเซอร์ 25 ชุด สภาพใหม่ กรรมสิทธิ์ YIP
  for (let i = 1; i <= 25; i++) {
    items.push({
      product_id: sensorProduct.id,
      serial_number: `SN-YIP-NEW-${String(i).padStart(4, '0')}`,
      ownership_type: 'customer_consignment',
      owner_company_name: 'YIP (Yip In Tsoi)',
      condition: 'new',
      status: 'in_stock',
      notes: 'เซ็นเซอร์ PM 2.5 สภาพใหม่ สต็อกฝาก YIP',
    });
  }

  // 6. เซ็นเซอร์ 25 ชุด สภาพใหม่ กรรมสิทธิ์ WSA
  for (let i = 1; i <= 25; i++) {
    items.push({
      product_id: sensorProduct.id,
      serial_number: `SN-WSA-NEW-${String(i).padStart(4, '0')}`,
      ownership_type: 'company_owned',
      owner_company_name: 'WSA',
      condition: 'new',
      status: 'in_stock',
      notes: 'เซ็นเซอร์ PM 2.5 สภาพใหม่ สต็อกบริษัท WSA',
    });
  }

  // 7. ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5 10 ชุด สภาพ refurbished กรรมสิทธิ์ WSA
  for (let i = 1; i <= 10; i++) {
    items.push({
      product_id: ctrlProduct.id,
      serial_number: `APC-WSA-RF-${String(i).padStart(4, '0')}`,
      ownership_type: 'company_owned',
      owner_company_name: 'WSA',
      condition: 'repaired_refurbished',
      status: 'in_stock',
      notes: 'ชุดควบคุมระบบเติมอากาศ สภาพ Refurbished ซ่อมเสร็จผ่าน QC สต็อก WSA',
    });
  }

  // 8. Air Plus 8 Port Extension 15 ชุด สภาพ refurbished กรรมสิทธิ์ WSA
  for (let i = 1; i <= 15; i++) {
    items.push({
      product_id: portProduct.id,
      serial_number: `AP8-WSA-RF-${String(i).padStart(4, '0')}`,
      ownership_type: 'company_owned',
      owner_company_name: 'WSA',
      condition: 'repaired_refurbished',
      status: 'in_stock',
      notes: 'Air Plus 8 Port Extension สภาพ Refurbished ซ่อมเสร็จผ่าน QC สต็อก WSA',
    });
  }

  console.log(`Prepared total ${items.length} device items.`);

  // Insert in chunks of 50
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    const { error: insErr } = await supabase
      .from('device_items')
      .upsert(chunk, { onConflict: 'serial_number' });

    if (insErr) {
      console.error(`Error inserting chunk ${i}-${i + chunk.length}:`, insErr.message);
    } else {
      console.log(`Inserted chunk ${i + 1} to ${i + chunk.length}`);
    }
  }

  // Count total in DB
  const { count } = await supabase.from('device_items').select('*', { count: 'exact', head: true });
  console.log(`Finished! Total devices in DB: ${count}`);
}

seed();
