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
      .from("installation_site_reports")
      .select(`
        *,
        plot:lh_house_plots (
          id,
          plot_code,
          land_plot,
          house_number,
          home_series,
          label,
          full_address,
          po_number,
          delivery_status,
          project:lh_projects (
            account_code,
            project_code,
            project_name
          )
        ),
        technicians:installation_technicians (
          id,
          technician_name,
          commission_earned,
          payout_status
        )
      `)
      .order("created_at", { ascending: false });

    if (plotId) query = query.eq("plot_id", plotId);

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
    const {
      plot_id,
      requisition_id,
      technician_names, // string[]: e.g. ["สมชาย", "วิชัย"]
      lead_technician_name,
      // Checklist
      led_status_ok,
      app_connect_controller_ok,
      app_connect_ext_ok,
      sensor1_living_room_ok,
      sensor2_garage_ok,
      fan_filter_control_ok,
      fan_airplus_count,
      marker_cable_ok,
      lan_signal_note,
      controller_screw_tight,
      technician_notes,
      // Customer sign
      customer_sign_name,
      customer_sign_phone,
      // 5 Mandatory Photos
      photo_controller_led,
      photo_sensor_living_room,
      photo_sensor_garage,
      photo_app_screen,
      photo_signed_sheet,
    } = body;

    if (!plot_id) {
      return NextResponse.json({ error: "Missing plot_id" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    // 1. Insert installation report
    const { data: report, error: repErr } = await supabase
      .from("installation_site_reports")
      .insert({
        plot_id,
        requisition_id: requisition_id || null,
        lead_technician_name: lead_technician_name || technician_names?.[0] || "ช่างติดตั้ง",
        assigned_date: new Date().toISOString().slice(0, 10),
        completed_at: new Date().toISOString(),
        status: "completed",
        led_status_ok: !!led_status_ok,
        app_connect_controller_ok: !!app_connect_controller_ok,
        app_connect_ext_ok: !!app_connect_ext_ok,
        sensor1_living_room_ok: !!sensor1_living_room_ok,
        sensor2_garage_ok: !!sensor2_garage_ok,
        fan_filter_control_ok: !!fan_filter_control_ok,
        fan_airplus_count: Number(fan_airplus_count) || 0,
        marker_cable_ok: !!marker_cable_ok,
        lan_signal_note: lan_signal_note || null,
        controller_screw_tight: !!controller_screw_tight,
        technician_notes: technician_notes || null,
        customer_sign_name: customer_sign_name || null,
        customer_sign_phone: customer_sign_phone || null,
        signed_at: new Date().toISOString(),
        photo_controller_led: photo_controller_led || null,
        photo_sensor_living_room: photo_sensor_living_room || null,
        photo_sensor_garage: photo_sensor_garage || null,
        photo_app_screen: photo_app_screen || null,
        photo_signed_sheet: photo_signed_sheet || null,
      })
      .select()
      .single();

    if (repErr) return NextResponse.json({ error: repErr.message }, { status: 500 });

    // 2. Calculate and insert technician commissions
    // Rule: 50 THB total per house, split equally among technicians
    const names = Array.isArray(technician_names) && technician_names.length > 0
      ? technician_names
      : [lead_technician_name || "ช่างติดตั้ง"];
    
    const techCount = names.length;
    const commissionPerTech = Math.round((50.0 / techCount) * 100) / 100;
    const currentCycle = new Date().toISOString().slice(0, 7); // e.g. '2026-10'

    const techRows = names.map((name: string) => ({
      report_id: report.id,
      technician_name: name.trim(),
      base_rate_per_house: 50.0,
      technician_count: techCount,
      commission_earned: commissionPerTech,
      payout_status: "pending",
      payment_cycle: currentCycle,
    }));

    await supabase.from("installation_technicians").insert(techRows);

    // 3. Update house plot delivery status to 'delivered'
    await supabase
      .from("lh_house_plots")
      .update({
        delivery_status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", plot_id);

    // 4. Update assigned devices in current plot to 'installed'
    await supabase
      .from("device_items")
      .update({
        status: "installed",
        installed_at: new Date().toISOString(),
      })
      .eq("current_plot_id", plot_id);

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
