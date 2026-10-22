import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim(); // 'pending', 'delivered', 'all'
    const projectId = searchParams.get("project_id")?.trim();
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("lh_house_plots")
      .select(`
        *,
        project:lh_projects (
          id,
          account_code,
          project_code,
          project_name,
          developer_name
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("delivery_status", status);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (search) {
      query = query.or(
        `plot_code.ilike.%${search}%,land_plot.ilike.%${search}%,house_number.ilike.%${search}%,po_number.ilike.%${search}%,label.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      plots: data || [],
      total: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const body = await req.json();
    const supabase = createSupabaseServerClient();

    // 1. Resolve or create project
    let projectId = body.project_id;
    if (!projectId && body.account_code && body.project_code) {
      const { data: existingProject } = await supabase
        .from("lh_projects")
        .select("id")
        .eq("account_code", body.account_code)
        .eq("project_code", body.project_code)
        .maybeSingle();

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        const { data: newProject, error: projErr } = await supabase
          .from("lh_projects")
          .insert({
            account_code: body.account_code,
            project_code: body.project_code,
            project_name: body.project_name || body.project,
            developer_name: "Land and Houses",
          })
          .select("id")
          .single();

        if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
        projectId = newProject.id;
      }
    }

    const plotData = {
      project_id: projectId,
      plot_code: body.plot_code || body.name,
      occ_id: body.occ_id,
      land_plot: body.land_plot,
      house_number: body.house_number,
      home_series: body.home_series,
      label: body.label,
      full_address: body.address || body.full_address,
      po_number: body.po_number || body["รหัสใบสั่งซื้อ"],
      po_date: body.po_date,
      po_new_date: body.po_new_date,
      lot_name: body.lot_name || body.LOT,
      sheet_source: body.sheet_source || body["แหล่งชีต"],
      delivery_status: body.delivery_status || "pending",
      notes: body.notes,
    };

    const { data, error } = await supabase
      .from("lh_house_plots")
      .upsert(plotData, { onConflict: "plot_code" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plot: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
