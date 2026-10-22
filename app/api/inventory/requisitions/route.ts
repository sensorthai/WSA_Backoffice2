import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get("plot_id");

    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("inventory_requisitions")
      .select(`
        *,
        plot:lh_house_plots (
          id,
          plot_code,
          land_plot,
          house_number,
          home_series,
          po_number,
          project:lh_projects (
            account_code,
            project_code,
            project_name
          )
        ),
        items:inventory_requisition_items (
          id,
          item_status,
          device:device_items (
            id,
            serial_number,
            ownership_type,
            condition,
            status,
            product:product_catalog (sku, name)
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (plotId) {
      query = query.eq("plot_id", plotId);
    }

    const { data, error } = await query;
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
    const { plot_id, purpose_type, device_ids, requester_name, requester_phone, notes } = body;

    if (!plot_id || !Array.isArray(device_ids) || device_ids.length === 0) {
      return NextResponse.json({ error: "Missing required fields (plot_id, device_ids)" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const reqNo = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Insert requisition
    const { data: requisition, error: reqErr } = await supabase
      .from("inventory_requisitions")
      .insert({
        requisition_no: reqNo,
        requested_by: (session.user as any)?.id || null,
        requester_name: requester_name || (session.user as any)?.name || "ช่างติดตั้ง",
        requester_phone: requester_phone || null,
        purpose_type: purpose_type || "installation_new",
        plot_id: plot_id,
        status: "issued",
        notes: notes || null,
      })
      .select()
      .single();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

    // 2. Insert items and update device status to 'with_technician'
    const itemsData = device_ids.map((devId: string) => ({
      requisition_id: requisition.id,
      device_item_id: devId,
      item_status: "with_technician",
    }));

    const { error: itemsErr } = await supabase
      .from("inventory_requisition_items")
      .insert(itemsData);

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    // Update devices status
    await supabase
      .from("device_items")
      .update({
        status: "with_technician",
        current_plot_id: plot_id,
      })
      .in("id", device_ids);

    return NextResponse.json({ requisition });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
