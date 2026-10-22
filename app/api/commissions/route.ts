import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const cycle = searchParams.get("cycle"); // e.g. '2026-10'
    const technicianName = searchParams.get("technician");

    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("installation_technicians")
      .select(`
        *,
        report:installation_site_reports (
          id,
          assigned_date,
          completed_at,
          status,
          plot:lh_house_plots (
            plot_code,
            land_plot,
            house_number,
            home_series,
            project:lh_projects (
              account_code,
              project_code,
              project_name
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (cycle) query = query.eq("payment_cycle", cycle);
    if (technicianName) query = query.ilike("technician_name", `%${technicianName}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aggregate summary by technician
    const summaryMap: Record<string, {
      technician_name: string;
      solo_count: number;
      duo_count: number;
      total_plots: number;
      total_earned: number;
      pending_amount: number;
      paid_amount: number;
    }> = {};

    (data || []).forEach((row) => {
      const name = row.technician_name;
      if (!summaryMap[name]) {
        summaryMap[name] = {
          technician_name: name,
          solo_count: 0,
          duo_count: 0,
          total_plots: 0,
          total_earned: 0,
          pending_amount: 0,
          paid_amount: 0,
        };
      }

      summaryMap[name].total_plots += 1;
      const earned = Number(row.commission_earned) || 0;
      summaryMap[name].total_earned += earned;

      if (row.technician_count === 1) {
        summaryMap[name].solo_count += 1;
      } else {
        summaryMap[name].duo_count += 1;
      }

      if (row.payout_status === "paid") {
        summaryMap[name].paid_amount += earned;
      } else {
        summaryMap[name].pending_amount += earned;
      }
    });

    return NextResponse.json({
      records: data || [],
      summary: Object.values(summaryMap),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
