import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

function parseThaiDate(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Format DD/MM/YYYY
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543; // Buddhist to Christian era
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const body = await req.json();
    let rows: any[] = [];

    if (Array.isArray(body.rows)) {
      rows = body.rows;
    } else if (typeof body.tsvText === "string") {
      // Parse TSV (Tab-separated) pasted directly from Excel / Google Sheets
      const lines = body.tsvText.trim().split(/\r?\n/);
      if (lines.length > 1) {
        const headers = lines[0].split("\t").map((h: string) => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split("\t");
          if (cells.length === 0 || !cells[0].trim()) continue;
          const rowObj: any = {};
          headers.forEach((h: string, idx: number) => {
            rowObj[h] = cells[idx]?.trim() || "";
          });
          rows.push(rowObj);
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found to import" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    // 1. Collect unique projects from rows
    const projectMap = new Map<string, string>(); // key: `${account_code}_${project_code}` -> project_id

    for (const r of rows) {
      const accountCode = r.account_code || r.AccountCode;
      const projectCode = r.project_code || r.ProjectCode;
      const projectName = r.project || r.ProjectName || r.project_name;

      if (accountCode && projectCode) {
        const key = `${accountCode}_${projectCode}`;
        if (!projectMap.has(key)) {
          // Check if already in DB
          const { data: existing } = await supabase
            .from("lh_projects")
            .select("id")
            .eq("account_code", accountCode)
            .eq("project_code", projectCode)
            .maybeSingle();

          if (existing) {
            projectMap.set(key, existing.id);
          } else {
            const { data: created, error: pErr } = await supabase
              .from("lh_projects")
              .insert({
                account_code: accountCode,
                project_code: projectCode,
                project_name: projectName || `${projectCode} Project`,
                developer_name: "Land and Houses",
              })
              .select("id")
              .single();

            if (!pErr && created) {
              projectMap.set(key, created.id);
            }
          }
        }
      }
    }

    // 2. Prepare plots for upsert
    let importedCount = 0;
    const errors: string[] = [];

    const plotsToUpsert = rows.map((r) => {
      const accountCode = r.account_code || r.AccountCode;
      const projectCode = r.project_code || r.ProjectCode;
      const key = `${accountCode}_${projectCode}`;
      const projectId = projectMap.get(key) || null;

      const plotCode = r.name || r.plot_code || `${accountCode}-${r.land_plot}-${r.home_series}`;
      const rawStatus = (r["สถานะส่งมอบ"] || r.delivery_status || "").trim();
      const deliveryStatus = rawStatus.includes("ส่งมอบแล้ว") ? "delivered" : "pending";

      return {
        project_id: projectId,
        plot_code: plotCode,
        occ_id: r.occ_id || null,
        land_plot: r.land_plot || "",
        house_number: r.house_number || "",
        home_series: r.home_series || "",
        label: r.label || "",
        full_address: r.address || r.full_address || "",
        po_number: r["รหัสใบสั่งซื้อ"] || r.po_number || null,
        po_date: parseThaiDate(r["วันที่สั่งซื้อ (ค.ศ.)"] || r.po_date),
        po_new_date: parseThaiDate(r["วันที่ PO เพิ่มใหม่ (ค.ศ.)"] || r.po_new_date),
        lot_name: r.LOT || r.lot_name || null,
        sheet_source: r["แหล่งชีต"] || r.sheet_source || null,
        delivery_status: deliveryStatus,
        delivered_at: r["ส่งมอบในระบบ"] ? parseThaiDate(r["ส่งมอบในระบบ"]) : null,
      };
    }).filter((p) => p.plot_code && p.land_plot);

    if (plotsToUpsert.length > 0) {
      const { data, error } = await supabase
        .from("lh_house_plots")
        .upsert(plotsToUpsert, { onConflict: "plot_code" })
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      importedCount = data?.length || 0;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalRows: rows.length,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
