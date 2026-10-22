import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku")?.trim() || "AP-CTRL";
    const ownership = searchParams.get("ownership")?.trim() || "all";
    const condition = searchParams.get("condition")?.trim() || "all";

    const supabase = createSupabaseServerClient();

    // 1. Get product info
    const { data: product, error: prodErr } = await supabase
      .from("product_catalog")
      .select("*")
      .eq("sku", sku)
      .single();

    if (prodErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2. Fetch all devices for this product
    let devQuery = supabase
      .from("device_items")
      .select(`
        *,
        current_plot:lh_house_plots (
          plot_code,
          land_plot,
          house_number,
          project:lh_projects (project_name)
        )
      `)
      .eq("product_id", product.id)
      .order("created_at", { ascending: true });

    if (ownership !== "all") {
      devQuery = devQuery.ilike("owner_company_name", `%${ownership}%`);
    }
    if (condition !== "all") {
      devQuery = devQuery.eq("condition", condition);
    }

    const { data: devices, error: devErr } = await devQuery;
    if (devErr) {
      return NextResponse.json({ error: devErr.message }, { status: 500 });
    }

    // 3. Fetch requisitions for these devices
    const deviceIds = (devices || []).map((d) => d.id);
    let reqItems: any[] = [];
    if (deviceIds.length > 0) {
      const { data: items } = await supabase
        .from("inventory_requisition_items")
        .select(`
          *,
          requisition:inventory_requisitions (
            requisition_no,
            requester_name,
            purpose_type,
            created_at,
            plot:lh_house_plots (
              plot_code,
              land_plot,
              house_number,
              project:lh_projects (project_name)
            )
          )
        `)
        .in("device_item_id", deviceIds);
      reqItems = items || [];
    }

    // 4. Build Stock Card Timeline (Transactions)
    // Initial received items
    const transactions: any[] = [];

    devices?.forEach((dev) => {
      // Inbound event (รับเข้าคลัง)
      transactions.push({
        id: `in-${dev.id}`,
        timestamp: dev.created_at,
        ref_no: dev.notes?.includes("Lot") ? dev.notes : "LOT-INIT-2026",
        action: dev.condition === "repaired_refurbished" ? "รับเข้า (ซ่อมเสร็จ QC)" : "รับเข้า (ผลิตใหม่/สต็อกฝาก)",
        type: "IN",
        serial_number: dev.serial_number,
        owner: dev.owner_company_name?.includes("YIP") ? "YIP" : "WSA",
        condition: dev.condition === "repaired_refurbished" ? "Refurbished" : "ของใหม่",
        destination: "-",
        actor: "เจ้าหน้าที่สโตร์ / คลัง",
        quantity_in: 1,
        quantity_out: 0,
      });

      // Outbound event if requisitioned
      const reqItem = reqItems.find((r) => r.device_item_id === dev.id);
      if (reqItem && reqItem.requisition) {
        const plotDesc = reqItem.requisition.plot
          ? `แปลง ${reqItem.requisition.plot.land_plot} (${reqItem.requisition.plot.project?.project_name || "-"})`
          : "-";

        transactions.push({
          id: `out-${reqItem.id}`,
          timestamp: reqItem.requisition.created_at,
          ref_no: reqItem.requisition.requisition_no,
          action: "เบิกออกไปติดตั้ง",
          type: "OUT",
          serial_number: dev.serial_number,
          owner: dev.owner_company_name?.includes("YIP") ? "YIP" : "WSA",
          condition: dev.condition === "repaired_refurbished" ? "Refurbished" : "ของใหม่",
          destination: plotDesc,
          actor: reqItem.requisition.requester_name || "ช่างติดตั้ง",
          quantity_in: 0,
          quantity_out: 1,
        });
      }
    });

    // Sort chronologically
    transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledger = transactions.map((tx) => {
      if (tx.type === "IN") {
        runningBalance += tx.quantity_in;
      } else if (tx.type === "OUT") {
        runningBalance -= tx.quantity_out;
      }
      return {
        ...tx,
        balance: runningBalance,
      };
    });

    // Summary Metrics
    const totalIn = devices?.length || 0;
    const totalOut = reqItems.length;
    const currentInStock = (devices || []).filter((d) => d.status === "in_stock").length;
    const withTechnician = (devices || []).filter((d) => d.status === "with_technician").length;
    const installed = (devices || []).filter((d) => d.status === "installed").length;
    const underRepair = (devices || []).filter((d) => d.status === "under_repair").length;

    return NextResponse.json({
      product,
      summary: {
        total_in: totalIn,
        total_out: totalOut,
        current_in_stock: currentInStock,
        with_technician: withTechnician,
        installed,
        under_repair: underRepair,
        balance: currentInStock,
      },
      ledger: ledger.reverse(), // latest first for display
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
