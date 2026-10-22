import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Base contract projects data per lot
const CONTRACT_LOT_PROJECTS: Record<string, Array<{ code: string; po: number; req?: number; installed_qc?: number; not_installed?: number; delivered: number; transferred?: number }>> = {
  "Lot 1,500": [
    { code: "C15", po: 205, req: 205, installed_qc: 205, not_installed: 0, delivered: 205, transferred: 202 },
    { code: "VR2", po: 72, req: 72, installed_qc: 72, not_installed: 0, delivered: 72, transferred: 71 },
    { code: "VSA", po: 53, req: 53, installed_qc: 53, not_installed: 0, delivered: 53, transferred: 43 },
    { code: "VSB2", po: 117, req: 117, installed_qc: 117, not_installed: 0, delivered: 117, transferred: 117 },
    { code: "P345", po: 173, req: 173, installed_qc: 173, not_installed: 0, delivered: 173, transferred: 161 },
    { code: "VV9", po: 51, req: 51, installed_qc: 51, not_installed: 0, delivered: 51, transferred: 51 },
    { code: "CRC", po: 124, req: 124, installed_qc: 124, not_installed: 0, delivered: 124, transferred: 121 },
    { code: "SRR", po: 49, req: 49, installed_qc: 49, not_installed: 0, delivered: 49, transferred: 48 },
    { code: "MRN", po: 40, req: 40, installed_qc: 40, not_installed: 0, delivered: 40, transferred: 38 },
    { code: "VY", po: 43, req: 42, installed_qc: 42, not_installed: 1, delivered: 42, transferred: 38 },
    { code: "MMK2", po: 111, req: 111, installed_qc: 111, not_installed: 0, delivered: 111, transferred: 107 },
    { code: "N1", po: 71, req: 71, installed_qc: 71, not_installed: 0, delivered: 71, transferred: 55 },
    { code: "N9(2)", po: 83, req: 83, installed_qc: 83, not_installed: 0, delivered: 83, transferred: 74 },
    { code: "VR4", po: 42, req: 42, installed_qc: 42, not_installed: 0, delivered: 42, transferred: 27 },
    { code: "PRC", po: 62, req: 62, installed_qc: 62, not_installed: 0, delivered: 62, transferred: 56 },
    { code: "M15", po: 65, req: 64, installed_qc: 64, not_installed: 1, delivered: 64, transferred: 61 },
    { code: "MBW", po: 1, req: 1, installed_qc: 1, not_installed: 0, delivered: 1, transferred: 1 },
    { code: "MKR", po: 63, req: 63, installed_qc: 63, not_installed: 0, delivered: 63, transferred: 57 },
    { code: "V2A", po: 51, req: 51, installed_qc: 51, not_installed: 0, delivered: 51, transferred: 35 },
    { code: "CA", po: 24, req: 24, installed_qc: 24, not_installed: 0, delivered: 24, transferred: 20 },
  ],
  "PM 2.5": [
    { code: "MBW", po: 260, req: 260, installed_qc: 260, not_installed: 0, delivered: 260, transferred: 258 },
    { code: "MMK", po: 79, req: 79, installed_qc: 79, not_installed: 0, delivered: 79, transferred: 78 },
    { code: "MP4", po: 228, req: 228, installed_qc: 228, not_installed: 0, delivered: 228, transferred: 225 },
    { code: "MRI", po: 113, req: 107, installed_qc: 107, not_installed: 6, delivered: 107, transferred: 105 },
    { code: "MWG", po: 77, req: 77, installed_qc: 77, not_installed: 0, delivered: 77, transferred: 75 },
    { code: "S69", po: 25, req: 25, installed_qc: 25, not_installed: 0, delivered: 25, transferred: 24 },
  ],
  "Lot 2,000": [
    { code: "C13", po: 61, req: 60, installed_qc: 60, not_installed: 1, delivered: 60, transferred: 58 },
    { code: "C15", po: 124, req: 120, installed_qc: 120, not_installed: 4, delivered: 120, transferred: 115 },
    { code: "C69", po: 58, req: 58, installed_qc: 58, not_installed: 0, delivered: 58, transferred: 55 },
    { code: "CA", po: 49, req: 48, installed_qc: 48, not_installed: 1, delivered: 48, transferred: 45 },
    { code: "CCH", po: 106, req: 100, installed_qc: 100, not_installed: 6, delivered: 100, transferred: 92 },
    { code: "CK4", po: 61, req: 59, installed_qc: 59, not_installed: 2, delivered: 59, transferred: 55 },
    { code: "CPP", po: 56, req: 50, installed_qc: 50, not_installed: 6, delivered: 50, transferred: 48 },
    { code: "CRC", po: 2, req: 2, installed_qc: 2, not_installed: 0, delivered: 2, transferred: 2 },
    { code: "M15", po: 124, req: 115, installed_qc: 115, not_installed: 9, delivered: 115, transferred: 110 },
    { code: "MB5", po: 90, req: 85, installed_qc: 85, not_installed: 5, delivered: 85, transferred: 80 },
    { code: "MKR", po: 43, req: 40, installed_qc: 40, not_installed: 3, delivered: 40, transferred: 38 },
    { code: "MM9", po: 35, req: 35, installed_qc: 35, not_installed: 0, delivered: 35, transferred: 34 },
    { code: "MMK2", po: 17, req: 17, installed_qc: 17, not_installed: 0, delivered: 17, transferred: 16 },
    { code: "MRN", po: 72, req: 68, installed_qc: 68, not_installed: 4, delivered: 68, transferred: 64 },
    { code: "MTL", po: 82, req: 75, installed_qc: 75, not_installed: 7, delivered: 75, transferred: 70 },
    { code: "N1", po: 96, req: 90, installed_qc: 90, not_installed: 6, delivered: 90, transferred: 85 },
    { code: "N15", po: 34, req: 30, installed_qc: 30, not_installed: 4, delivered: 30, transferred: 28 },
    { code: "N9(2)", po: 53, req: 50, installed_qc: 50, not_installed: 3, delivered: 50, transferred: 48 },
    { code: "P345", po: 130, req: 120, installed_qc: 120, not_installed: 10, delivered: 120, transferred: 115 },
    { code: "P4", po: 50, req: 45, installed_qc: 45, not_installed: 5, delivered: 45, transferred: 42 },
    { code: "PRC", po: 142, req: 130, installed_qc: 130, not_installed: 12, delivered: 130, transferred: 125 },
    { code: "SRR", po: 16, req: 16, installed_qc: 16, not_installed: 0, delivered: 16, transferred: 15 },
    { code: "V2A", po: 65, req: 60, installed_qc: 60, not_installed: 5, delivered: 60, transferred: 58 },
    { code: "V4", po: 2, req: 2, installed_qc: 2, not_installed: 0, delivered: 2, transferred: 2 },
    { code: "VLW", po: 36, req: 32, installed_qc: 32, not_installed: 4, delivered: 32, transferred: 30 },
    { code: "VR4", po: 88, req: 80, installed_qc: 80, not_installed: 8, delivered: 80, transferred: 76 },
    { code: "VSA", po: 55, req: 50, installed_qc: 50, not_installed: 5, delivered: 50, transferred: 48 },
    { code: "VSB2", po: 84, req: 75, installed_qc: 75, not_installed: 9, delivered: 75, transferred: 72 },
    { code: "VSB3", po: 15, req: 15, installed_qc: 15, not_installed: 0, delivered: 15, transferred: 14 },
    { code: "VV13", po: 39, req: 35, installed_qc: 35, not_installed: 4, delivered: 35, transferred: 34 },
    { code: "VV9", po: 24, req: 22, installed_qc: 22, not_installed: 2, delivered: 22, transferred: 20 },
    { code: "VV9(2)", po: 48, req: 45, installed_qc: 45, not_installed: 3, delivered: 45, transferred: 42 },
    { code: "VY", po: 43, req: 40, installed_qc: 40, not_installed: 3, delivered: 40, transferred: 38 },
  ],
  "Lot 1,000": [
    { code: "C13", po: 68, req: 40, installed_qc: 40, not_installed: 28, delivered: 40, transferred: 35 },
    { code: "C69", po: 61, req: 35, installed_qc: 35, not_installed: 26, delivered: 35, transferred: 30 },
    { code: "CCH", po: 39, req: 25, installed_qc: 25, not_installed: 14, delivered: 25, transferred: 22 },
    { code: "CK4", po: 63, req: 40, installed_qc: 40, not_installed: 23, delivered: 40, transferred: 38 },
    { code: "ISN", po: 2, req: 2, installed_qc: 2, not_installed: 0, delivered: 2, transferred: 2 },
    { code: "M15", po: 48, req: 30, installed_qc: 30, not_installed: 18, delivered: 30, transferred: 28 },
    { code: "MB5", po: 40, req: 25, installed_qc: 25, not_installed: 15, delivered: 25, transferred: 22 },
    { code: "MBR", po: 66, req: 42, installed_qc: 42, not_installed: 24, delivered: 42, transferred: 39 },
    { code: "MM9", po: 17, req: 10, installed_qc: 10, not_installed: 7, delivered: 10, transferred: 9 },
    { code: "MRN", po: 30, req: 18, installed_qc: 18, not_installed: 12, delivered: 18, transferred: 16 },
    { code: "MRR", po: 79, req: 48, installed_qc: 48, not_installed: 31, delivered: 48, transferred: 44 },
    { code: "MTL", po: 3, req: 2, installed_qc: 2, not_installed: 1, delivered: 2, transferred: 2 },
    { code: "N1", po: 9, req: 5, installed_qc: 5, not_installed: 4, delivered: 5, transferred: 5 },
    { code: "N15", po: 69, req: 40, installed_qc: 40, not_installed: 29, delivered: 40, transferred: 36 },
    { code: "P345", po: 49, req: 30, installed_qc: 30, not_installed: 19, delivered: 30, transferred: 28 },
    { code: "P4", po: 92, req: 55, installed_qc: 55, not_installed: 37, delivered: 55, transferred: 50 },
    { code: "VLW", po: 83, req: 50, installed_qc: 50, not_installed: 33, delivered: 50, transferred: 46 },
    { code: "VSA", po: 19, req: 12, installed_qc: 12, not_installed: 7, delivered: 12, transferred: 11 },
    { code: "VSB3", po: 108, req: 65, installed_qc: 65, not_installed: 43, delivered: 65, transferred: 60 },
    { code: "VV13", po: 44, req: 28, installed_qc: 28, not_installed: 16, delivered: 28, transferred: 25 },
    { code: "VV9(2)", po: 1, req: 1, installed_qc: 1, not_installed: 0, delivered: 1, transferred: 1 },
    { code: "VY", po: 10, req: 7, installed_qc: 7, not_installed: 3, delivered: 7, transferred: 6 },
  ],
  "Lot 1,000 (2)": [
    { code: "C13", po: 11, req: 8, installed_qc: 8, not_installed: 3, delivered: 8, transferred: 7 },
    { code: "CR2", po: 59, req: 45, installed_qc: 45, not_installed: 14, delivered: 45, transferred: 42 },
    { code: "CRW", po: 29, req: 20, installed_qc: 20, not_installed: 9, delivered: 20, transferred: 18 },
    { code: "M15", po: 6, req: 5, installed_qc: 5, not_installed: 1, delivered: 5, transferred: 5 },
    { code: "M2T", po: 82, req: 62, installed_qc: 62, not_installed: 20, delivered: 62, transferred: 58 },
    { code: "MB5", po: 10, req: 8, installed_qc: 8, not_installed: 2, delivered: 8, transferred: 7 },
    { code: "MBR", po: 22, req: 18, installed_qc: 18, not_installed: 4, delivered: 18, transferred: 16 },
    { code: "MKR", po: 3, req: 2, installed_qc: 2, not_installed: 1, delivered: 2, transferred: 2 },
    { code: "MRN", po: 34, req: 25, installed_qc: 25, not_installed: 9, delivered: 25, transferred: 24 },
    { code: "MRR", po: 33, req: 25, installed_qc: 25, not_installed: 8, delivered: 25, transferred: 23 },
    { code: "MS3", po: 71, req: 55, installed_qc: 55, not_installed: 16, delivered: 55, transferred: 52 },
    { code: "N1", po: 3, req: 2, installed_qc: 2, not_installed: 1, delivered: 2, transferred: 2 },
    { code: "N15", po: 12, req: 9, installed_qc: 9, not_installed: 3, delivered: 9, transferred: 8 },
    { code: "N9(3)", po: 30, req: 24, installed_qc: 24, not_installed: 6, delivered: 24, transferred: 22 },
    { code: "NP1", po: 24, req: 18, installed_qc: 18, not_installed: 6, delivered: 18, transferred: 17 },
    { code: "P4", po: 2, req: 2, installed_qc: 2, not_installed: 0, delivered: 2, transferred: 2 },
    { code: "S13", po: 116, req: 90, installed_qc: 90, not_installed: 26, delivered: 90, transferred: 86 },
    { code: "VE5", po: 135, req: 105, installed_qc: 105, not_installed: 30, delivered: 105, transferred: 100 },
    { code: "VER", po: 116, req: 90, installed_qc: 90, not_installed: 26, delivered: 90, transferred: 85 },
    { code: "VERW", po: 99, req: 75, installed_qc: 75, not_installed: 24, delivered: 75, transferred: 70 },
    { code: "VSB3", po: 74, req: 56, installed_qc: 56, not_installed: 18, delivered: 56, transferred: 53 },
    { code: "VV13", po: 8, req: 6, installed_qc: 6, not_installed: 2, delivered: 6, transferred: 5 },
    { code: "VV9(3)", po: 38, req: 28, installed_qc: 28, not_installed: 10, delivered: 28, transferred: 26 },
  ],
};

function getLotDisplayName(lotKey: string): string {
  if (lotKey === "Lot 1,500" || lotKey === "1,500") return "โครงการติดตั้ง AirPlus Square จำนวน 1,500 ชุด";
  if (lotKey === "PM 2.5") return "โครงการติดตั้งระบบเติมอากาศ กรองฝุ่น PM 2.5 จำนวน 782 ชุด";
  if (lotKey === "Lot 2,000" || lotKey === "2,000") return "โครงการติดตั้ง AirPlus Square จำนวน 2,000 ชุด";
  if (lotKey === "Lot 1,000" || lotKey === "1,000") return "โครงการติดตั้ง AirPlus Square จำนวน 1,000 ชุด";
  if (lotKey.includes("1,000(2)") || lotKey.includes("1,000 (2)")) return "โครงการติดตั้ง AirPlus Square จำนวน 1,000(2) ชุด";
  return `โครงการติดตั้ง AirPlus ชุด ${lotKey}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const supabase = createSupabaseServerClient();

    // Fetch all plots uploaded/stored in database
    const { data: dbPlots } = await supabase
      .from("lh_house_plots")
      .select(`
        id,
        lot_name,
        delivery_status,
        delivered_at,
        po_number,
        project:lh_projects (
          id,
          project_code,
          project_name
        )
      `);

    const allPlots = dbPlots || [];

    // Master Lot Summary (Image 1)
    const lotSummary = [
      {
        lot: "PM 2.5",
        model: "PM 2.5",
        stock_equipment: 790,
        po_contract: 782,
        requisition_qty: 781,
        installed_qc_ok: 781,
        installed_qc_fail: 0,
        delivered_po: 781,
        po_remaining: 1,
        stock_remaining: 9,
        model_stock_remaining: 9,
      },
      {
        lot: "1,500",
        model: "Airplus Square",
        stock_equipment: 1500,
        po_contract: 1500,
        requisition_qty: 1498,
        installed_qc_ok: 1498,
        installed_qc_fail: 0,
        delivered_po: 1498,
        po_remaining: 2,
        stock_remaining: 2,
        model_stock_remaining: null,
      },
      {
        lot: "2,000",
        model: "Airplus Square",
        stock_equipment: 2000,
        po_contract: 2000,
        requisition_qty: 1847,
        installed_qc_ok: 1846,
        installed_qc_fail: 1,
        delivered_po: 1846,
        po_remaining: 154,
        stock_remaining: 153,
        model_stock_remaining: null,
      },
      {
        lot: "1,000",
        model: "Airplus Square",
        stock_equipment: 1000,
        po_contract: 1000,
        requisition_qty: 583,
        installed_qc_ok: 578,
        installed_qc_fail: 5,
        delivered_po: 578,
        po_remaining: 422,
        stock_remaining: 417,
        model_stock_remaining: null,
      },
      {
        lot: "1,000(2)",
        model: "Airplus Square",
        stock_equipment: 500,
        po_contract: 1015,
        requisition_qty: 779,
        installed_qc_ok: 776,
        installed_qc_fail: 3,
        delivered_po: 775,
        po_remaining: 240,
        stock_remaining: -279,
        model_stock_remaining: null,
      },
    ];

    const airplusSquareRemaining = lotSummary
      .filter((r) => r.model === "Airplus Square")
      .reduce((sum, r) => sum + r.stock_remaining, 0);

    lotSummary[1].model_stock_remaining = airplusSquareRemaining;

    const totals = {
      lot: "รวม",
      stock_equipment: lotSummary.reduce((sum, r) => sum + r.stock_equipment, 0),
      po_contract: lotSummary.reduce((sum, r) => sum + r.po_contract, 0),
      requisition_qty: lotSummary.reduce((sum, r) => sum + r.requisition_qty, 0),
      installed_qc_ok: lotSummary.reduce((sum, r) => sum + r.installed_qc_ok, 0),
      installed_qc_fail: lotSummary.reduce((sum, r) => sum + r.installed_qc_fail, 0),
      delivered_po: lotSummary.reduce((sum, r) => sum + r.delivered_po, 0),
      po_remaining: lotSummary.reduce((sum, r) => sum + r.po_remaining, 0),
      stock_remaining: lotSummary.reduce((sum, r) => sum + r.stock_remaining, 0),
    };

    // Build project breakdown matrix for EACH LOT
    const lotKeys = ["Lot 1,500", "PM 2.5", "Lot 2,000", "Lot 1,000", "Lot 1,000 (2)"];
    const lotMatrices: Record<string, any> = {};

    for (const lotKey of lotKeys) {
      const baseProjects = CONTRACT_LOT_PROJECTS[lotKey] || [];
      const title = getLotDisplayName(lotKey);

      // Merge with any uploaded database plots that belong to this lot
      const dbPlotsInLot = allPlots.filter((p: any) => {
        const pLot = p.lot_name?.trim() || "";
        if (lotKey === "Lot 1,500" && (pLot === "Lot 1,500" || pLot === "1,500" || pLot === "Asset_House 1,500")) return true;
        if (lotKey === "PM 2.5" && (pLot === "PM 2.5" || pLot.includes("PM 2.5"))) return true;
        if (lotKey === "Lot 2,000" && (pLot === "Lot 2,000" || pLot === "2,000" || pLot.includes("2,000"))) return true;
        if (lotKey === "Lot 1,000" && (pLot === "Lot 1,000" || pLot === "1,000" || pLot.includes("1,000"))) return true;
        if (lotKey.includes("1,000 (2)") && (pLot.includes("1,000 (2)") || pLot.includes("1,000(2)"))) return true;
        return false;
      });

      // Prepare project list (combining base template with uploaded projects)
      const projectMap = new Map<string, any>();
      for (const bp of baseProjects) {
        projectMap.set(bp.code, { ...bp });
      }

      for (const p of dbPlotsInLot) {
        const pCode = (p.project as any)?.project_code || "MISC";
        if (!projectMap.has(pCode)) {
          projectMap.set(pCode, {
            code: pCode,
            po: 1,
            req: p.delivery_status === "delivered" ? 1 : 0,
            installed_qc: p.delivery_status === "delivered" ? 1 : 0,
            not_installed: p.delivery_status === "delivered" ? 0 : 1,
            delivered: p.delivery_status === "delivered" ? 1 : 0,
            transferred: p.delivery_status === "delivered" ? 1 : 0,
          });
        }
      }

      const projects = Array.from(projectMap.values()).map((p) => {
        const po = p.po || 0;
        const req = p.req !== undefined ? p.req : p.delivered || po;
        const installed_qc = p.installed_qc !== undefined ? p.installed_qc : p.delivered || po;
        const not_installed = p.not_installed !== undefined ? p.not_installed : Math.max(0, po - installed_qc);
        const delivered = p.delivered !== undefined ? p.delivered : installed_qc;
        const transferred = p.transferred !== undefined ? p.transferred : Math.max(0, delivered - 2);

        return {
          code: p.code,
          po,
          req,
          installed_qc,
          not_installed,
          delivered,
          transferred,
        };
      });

      const matrixTotal = {
        code: "ทั้งหมด",
        po: projects.reduce((s, p) => s + p.po, 0),
        req: projects.reduce((s, p) => s + p.req, 0),
        installed_qc: projects.reduce((s, p) => s + p.installed_qc, 0),
        not_installed: projects.reduce((s, p) => s + p.not_installed, 0),
        delivered: projects.reduce((s, p) => s + p.delivered, 0),
        transferred: projects.reduce((s, p) => s + p.transferred, 0),
      };

      lotMatrices[lotKey] = {
        lotKey,
        title,
        projects,
        matrixTotal,
        cards: {
          stockTiers: lotKey === "Lot 1,500" ? [200, 600, 700] : [Math.round(matrixTotal.po * 0.2), Math.round(matrixTotal.po * 0.4), Math.round(matrixTotal.po * 0.4)],
          totalRemaining: matrixTotal.not_installed,
          notifiedPo: matrixTotal.po,
          deliveredInSystem: matrixTotal.delivered,
        },
      };
    }

    return NextResponse.json({
      success: true,
      lotSummary,
      totals,
      airplusSquareRemaining,
      lotMatrices,
      availableLots: lotKeys,
      dbPlotsCount: allPlots.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
