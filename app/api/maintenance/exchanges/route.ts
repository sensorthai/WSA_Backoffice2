import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("maintenance_exchanges")
      .select(`
        *,
        items:maintenance_exchange_items (
          id,
          product_sku,
          product_name,
          defect_notes,
          quantity,
          refurbished_device_id,
          refurbished_sn,
          defective_received_sn
        )
      `)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const body = await req.json();
    const {
      sakol_doc_no,
      sakol_doc_date,
      partner_name,
      pdf_file_url,
      pdf_filename,
      notes,
      received_by,
      issued_by,
      items, // array of { product_sku, product_name, defect_notes, quantity, refurbished_sn, refurbished_device_id }
    } = body;

    if (!sakol_doc_no) {
      return NextResponse.json({ error: "Missing sakol_doc_no (เลขที่ใบขอเปลี่ยน)" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const exchangeNo = `EXC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Insert maintenance exchange record
    const { data: exchange, error: excErr } = await supabase
      .from("maintenance_exchanges")
      .insert({
        exchange_no: exchangeNo,
        sakol_doc_no: sakol_doc_no.trim(),
        sakol_doc_date: sakol_doc_date || new Date().toISOString().slice(0, 10),
        partner_name: partner_name || "บริษัท สากลเวิร์ค จำกัด",
        recipient_company: "บริษัท ยิบอินซอย จำกัด",
        pdf_file_url: pdf_file_url || null,
        pdf_filename: pdf_filename || null,
        status: "completed",
        notes: notes || null,
        received_by: received_by || null,
        issued_by: issued_by || (session.user as any)?.name || "เจ้าหน้าที่คลัง WSA",
      })
      .select()
      .single();

    if (excErr) return NextResponse.json({ error: excErr.message }, { status: 500 });

    // 2. Insert items and update device items
    if (Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        exchange_id: exchange.id,
        product_sku: item.product_sku,
        product_name: item.product_name,
        defect_notes: item.defect_notes || null,
        quantity: item.quantity || 1,
        refurbished_device_id: item.refurbished_device_id || null,
        refurbished_sn: item.refurbished_sn || null,
        defective_received_sn: item.defective_received_sn || null,
      }));

      const { error: itemsErr } = await supabase
        .from("maintenance_exchange_items")
        .insert(itemsToInsert);

      if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

      // If refurbished devices were assigned, update their status to 'with_technician'
      const assignedDeviceIds = items
        .map((i) => i.refurbished_device_id)
        .filter(Boolean);

      const assignedSns = items
        .map((i) => i.refurbished_sn?.trim())
        .filter(Boolean);

      if (assignedDeviceIds.length > 0) {
        await supabase
          .from("device_items")
          .update({
            status: "with_technician",
            notes: `เปลี่ยนให้กับ สากลเวิร์ค (Sakon) อ้างอิงเอกสาร: ${sakol_doc_no}`,
          })
          .in("id", assignedDeviceIds);
      }

      if (assignedSns.length > 0) {
        await supabase
          .from("device_items")
          .update({
            status: "with_technician",
            notes: `เปลี่ยนให้กับ สากลเวิร์ค (Sakon) อ้างอิงเอกสาร: ${sakol_doc_no}`,
          })
          .in("serial_number", assignedSns);
      }
    }

    // Fetch the complete exchange with items for immediate printing
    const { data: fullExchange } = await supabase
      .from("maintenance_exchanges")
      .select(`
        *,
        items:maintenance_exchange_items (
          id,
          product_sku,
          product_name,
          defect_notes,
          quantity,
          refurbished_device_id,
          refurbished_sn,
          defective_received_sn
        )
      `)
      .eq("id", exchange.id)
      .single();

    return NextResponse.json({ success: true, exchange: fullExchange || exchange });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
