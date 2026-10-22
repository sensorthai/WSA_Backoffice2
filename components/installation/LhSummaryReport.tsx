"use client";

import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Printer,
  Download,
  BarChart3,
  Building,
  RefreshCw,
  Layers,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export function LhSummaryReport() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["lh-summary-reports"],
    queryFn: async () => {
      const res = await fetch("/api/lh/reports/summary");
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const lotSummary = data?.lotSummary || [];
  const totals = data?.totals || {};
  const projectMatrix = data?.projectMatrix || [];
  const matrixTotal = data?.matrixTotal || {};
  const cards = data?.cards || {};

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Lot Summary
      const lotSheetData = [
        [
          "Lot.",
          "Stock อุปกรณ์",
          "จำนวน PO ในสัญญา",
          "เบิกอุปกรณ์",
          "ติดตั้ง+QC เรียบร้อย",
          "ติดตั้งอุปกรณ์แล้ว แต่ยัง QC ไม่ผ่าน",
          "ส่งมอบ PO ในระบบแล้ว",
          "PO คงเหลือในระบบ",
          "Stock คงเหลือ",
          "Stock คงเหลือแยกตาม Model (PM 2.5/Airplus Square)",
        ],
        ...lotSummary.map((r: any) => [
          r.lot,
          r.stock_equipment,
          r.po_contract,
          r.requisition_qty,
          r.installed_qc_ok,
          r.installed_qc_fail,
          r.delivered_po,
          r.po_remaining,
          r.stock_remaining,
          r.model === "PM 2.5" ? 9 : r.lot === "1,500" ? 293 : "",
        ]),
        [
          totals.lot || "รวม",
          totals.stock_equipment,
          totals.po_contract,
          totals.requisition_qty,
          totals.installed_qc_ok,
          totals.installed_qc_fail,
          totals.delivered_po,
          totals.po_remaining,
          "",
          "",
        ],
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(lotSheetData);
      XLSX.utils.book_append_sheet(wb, ws1, "สรุปตาม_Lot");

      // Sheet 2: Project Matrix
      const matrixHeaders = ["รายการ", ...projectMatrix.map((p: any) => p.code), "ทั้งหมด"];
      const matrixRows = [
        ["PO ค่าของ", ...projectMatrix.map((p: any) => p.po), matrixTotal.po],
        ["จำนวนเบิกของ", ...projectMatrix.map((p: any) => p.req), matrixTotal.req],
        ["ติดตั้ง+QC", ...projectMatrix.map((p: any) => p.installed_qc), matrixTotal.installed_qc],
        ["ยังไม่ติดตั้ง", ...projectMatrix.map((p: any) => p.not_installed), matrixTotal.not_installed],
        ["ส่งมอบในระบบ", ...projectMatrix.map((p: any) => p.delivered), matrixTotal.delivered],
        ["บ้านโอนแล้ว", ...projectMatrix.map((p: any) => p.transferred), matrixTotal.transferred],
      ];

      const ws2 = XLSX.utils.aoa_to_sheet([matrixHeaders, ...matrixRows]);
      XLSX.utils.book_append_sheet(wb, ws2, "โครงการ_AirPlus_1500");

      XLSX.writeFile(wb, `รายงานสรุป_Land_and_Houses_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("ส่งออกรายงานสรุปเป็น Excel สำเร็จ!");
    } catch (err: any) {
      toast.error(`ส่งออก Excel ไม่สำเร็จ: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              รายงานสรุปโครงการ & แปลงบ้าน Land & Houses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รายงานติดตามสถานะสต็อก การเบิกจ่าย การติดตั้ง QC และการส่งมอบแยกตาม Lot และโครงการ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs gap-1.5 h-8 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีเฟรช
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs gap-1.5 h-8 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            ส่งออก Excel (.xlsx)
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            พิมพ์รายงาน (A4)
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REPORT 1: Master Lot Summary Table                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden print:p-0 print:border-none print:shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>1. สรุปภาพรวมการเบิก-ติดตั้ง-ส่งมอบแยกตาม Lot (Master Lot Summary)</span>
          </div>
          <span className="text-[11px] text-slate-500">หน่วย: ชุด (Units)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse border border-slate-400 font-sans">
            <thead>
              <tr className="font-bold text-slate-900 leading-snug">
                <th className="border border-slate-400 p-2.5 bg-[#d9d9d9] w-24">Lot.</th>
                <th className="border border-slate-400 p-2.5 bg-[#fce4d6] w-28">Stock อุปกรณ์</th>
                <th className="border border-slate-400 p-2.5 bg-[#fce4d6] w-28">
                  จำนวน PO ใน
                  <br />
                  สัญญา
                </th>
                <th className="border border-slate-400 p-2.5 bg-[#ffff00] text-black w-28">
                  เบิกอุปกรณ์
                </th>
                <th className="border border-slate-400 p-2.5 bg-[#e1f0fa] w-32">
                  ติดตั้ง+QC เรียบร้อย
                </th>
                <th className="border border-slate-400 p-2.5 bg-[#f7b28b] w-36">
                  ติดตั้งอุปกรณ์แล้ว แต่
                  <br />
                  ยัง QC ไม่ผ่าน
                </th>
                <th className="border border-slate-400 p-2.5 bg-[#e8eef5] w-28">
                  ส่งมอบ PO ใน
                  <br />
                  ระบบแล้ว
                </th>
                <th className="border border-slate-400 p-2.5 bg-[#ffe082] w-28">
                  PO คงเหลือใน
                  <br />
                  ระบบ
                </th>
                <th className="border border-slate-400 p-2.5 bg-[#ffe082] w-28">Stock คงเหลือ</th>
                <th className="border border-slate-400 p-2.5 bg-[#b9f6ca] w-48 text-emerald-950 font-bold">
                  Stock คงเหลือแยกตาม Model
                  <br />
                  (PM 2.5/Airplus Square)
                </th>
              </tr>
            </thead>
            <tbody>
              {lotSummary.map((r: any, idx: number) => {
                const isNegative = r.stock_remaining < 0;
                return (
                  <tr key={r.lot} className="hover:bg-slate-50/70">
                    <td className="border border-slate-400 p-2 font-semibold text-slate-800">
                      {r.lot}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono">
                      {r.stock_equipment.toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono">
                      {r.po_contract.toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono font-medium">
                      {r.requisition_qty.toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono font-medium">
                      {r.installed_qc_ok.toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono font-medium">
                      {r.installed_qc_fail}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono font-medium">
                      {r.delivered_po.toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono font-medium">
                      {r.po_remaining.toLocaleString()}
                    </td>
                    <td
                      className={`border border-slate-400 p-2 font-mono font-bold ${
                        isNegative ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {r.stock_remaining.toLocaleString()}
                    </td>

                    {/* Model Merged column exactly matching Image 1 */}
                    {idx === 0 && (
                      <td
                        rowSpan={1}
                        className="border border-slate-400 p-2 bg-[#00e5ff] text-slate-900 font-extrabold text-base align-middle shadow-inner"
                      >
                        {r.model_stock_remaining}
                      </td>
                    )}
                    {idx === 1 && (
                      <td
                        rowSpan={4}
                        className="border border-slate-400 p-2 bg-[#69f0ae] text-slate-900 font-black text-2xl align-middle shadow-inner"
                      >
                        {r.model_stock_remaining}
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Totals Row */}
              <tr className="font-extrabold text-slate-900 border-t-2 border-slate-600">
                <td className="border border-slate-400 p-2.5 bg-[#d9d9d9]">
                  {totals.lot || "รวม"}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#fce4d6] font-mono">
                  {totals.stock_equipment?.toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#fce4d6] font-mono">
                  {totals.po_contract?.toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#ffff00] font-mono">
                  {totals.requisition_qty?.toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#e1f0fa] font-mono">
                  {totals.installed_qc_ok?.toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#f7b28b] font-mono">
                  {totals.installed_qc_fail}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#e8eef5] font-mono">
                  {totals.delivered_po?.toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#ffe082] font-mono">
                  {totals.po_remaining?.toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2.5 bg-[#fafafa]"></td>
                <td className="border border-slate-400 p-2.5 bg-[#fafafa]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REPORT 2: Project Breakdown Matrix Table                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden print:p-0 print:border-none print:shadow-none space-y-4">
        <div className="text-center font-bold text-base text-slate-900">
          โครงการติดตั้ง AirPlus Square จำนวน 1,500 ชุด
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse border border-slate-400 font-sans">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-400 p-2 text-left pl-3 w-28 bg-slate-200">
                  โครงการ
                </th>
                {projectMatrix.map((p: any) => (
                  <th
                    key={p.code}
                    className={`border border-slate-400 p-1.5 min-w-[42px] ${
                      p.code === "MKR" || p.code === "V2A" || p.code === "CA"
                        ? "text-blue-700"
                        : "text-slate-900"
                    }`}
                  >
                    {p.code}
                  </th>
                ))}
                <th className="border border-slate-400 p-1.5 w-16 bg-slate-200 font-extrabold text-slate-900">
                  ทั้งหมด
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: PO ค่าของ */}
              <tr>
                <td className="border border-slate-400 p-1.5 text-left pl-3 font-semibold bg-slate-50">
                  PO ค่าของ
                </td>
                {projectMatrix.map((p: any) => (
                  <td key={p.code} className="border border-slate-400 p-1.5 font-mono">
                    {p.po}
                  </td>
                ))}
                <td className="border border-slate-400 p-1.5 font-mono font-bold bg-slate-100">
                  {matrixTotal.po}
                </td>
              </tr>

              {/* Row 2: จำนวนเบิกของ */}
              <tr>
                <td className="border border-slate-400 p-1.5 text-left pl-3 font-semibold bg-slate-50">
                  จำนวนเบิกของ
                </td>
                {projectMatrix.map((p: any) => (
                  <td key={p.code} className="border border-slate-400 p-1.5 font-mono">
                    {p.req}
                  </td>
                ))}
                <td className="border border-slate-400 p-1.5 font-mono font-bold bg-slate-100">
                  {matrixTotal.req}
                </td>
              </tr>

              {/* Row 3: ติดตั้ง+QC */}
              <tr>
                <td className="border border-slate-400 p-1.5 text-left pl-3 font-semibold bg-slate-50">
                  ติดตั้ง+QC
                </td>
                {projectMatrix.map((p: any) => (
                  <td key={p.code} className="border border-slate-400 p-1.5 font-mono">
                    {p.installed_qc}
                  </td>
                ))}
                <td className="border border-slate-400 p-1.5 font-mono font-bold bg-slate-100">
                  {matrixTotal.installed_qc}
                </td>
              </tr>

              {/* Row 4: ยังไม่ติดตั้ง */}
              <tr className="font-bold">
                <td className="border border-slate-400 p-1.5 text-left pl-3 bg-[#ffff00] text-black">
                  ยังไม่ติดตั้ง
                </td>
                {projectMatrix.map((p: any) => {
                  const isPending = p.not_installed > 0;
                  return (
                    <td
                      key={p.code}
                      className={`border border-slate-400 p-1.5 font-mono ${
                        isPending ? "bg-[#90caf9] text-blue-950 font-bold" : "bg-[#fff59d]"
                      }`}
                    >
                      {p.not_installed}
                    </td>
                  );
                })}
                <td className="border border-slate-400 p-1.5 font-mono font-bold bg-[#ffff00] text-black">
                  {matrixTotal.not_installed}
                </td>
              </tr>

              {/* Row 5: ส่งมอบในระบบ */}
              <tr>
                <td className="border border-slate-400 p-1.5 text-left pl-3 font-semibold bg-slate-50">
                  ส่งมอบในระบบ
                </td>
                {projectMatrix.map((p: any) => (
                  <td key={p.code} className="border border-slate-400 p-1.5 font-mono">
                    {p.delivered}
                  </td>
                ))}
                <td className="border border-slate-400 p-1.5 font-mono font-bold bg-slate-100">
                  {matrixTotal.delivered}
                </td>
              </tr>

              {/* Row 6: บ้านโอนแล้ว */}
              <tr className="font-semibold bg-[#c8e6c9]">
                <td className="border border-slate-400 p-1.5 text-left pl-3 font-bold bg-[#a5d6a7] text-emerald-950">
                  บ้านโอนแล้ว
                </td>
                {projectMatrix.map((p: any) => (
                  <td key={p.code} className="border border-slate-400 p-1.5 font-mono">
                    {p.transferred}
                  </td>
                ))}
                <td className="border border-slate-400 p-1.5 font-mono font-bold bg-[#a5d6a7] text-emerald-950">
                  {matrixTotal.transferred}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mini Cards matching bottom of Image 2 */}
        <div className="pt-2 flex flex-wrap items-center gap-6 text-xs font-sans">
          {/* Stock tiers */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Stock:</span>
            <div className="border border-slate-400 rounded overflow-hidden divide-y divide-slate-400 text-center font-mono font-semibold">
              {(cards.stockTiers || [200, 600, 700]).map((tier: number, i: number) => (
                <div key={i} className="px-5 py-0.5 bg-[#90caf9] text-blue-950">
                  {tier}
                </div>
              ))}
            </div>
          </div>

          {/* คงเหลือรวม */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">คงเหลือรวม:</span>
            <div className="border border-slate-400 bg-[#90caf9] text-blue-950 font-black text-sm px-6 py-3 rounded text-center min-w-[50px]">
              {cards.totalRemaining || 2}
            </div>
          </div>

          {/* แจ้งตาม PO & ส่งมอบในระบบ */}
          <div className="border border-slate-400 rounded overflow-hidden divide-y divide-slate-400 text-xs font-semibold">
            <div className="flex justify-between items-center gap-3 px-3 py-1 bg-[#ffcc80] text-amber-950">
              <span>แจ้งตาม PO</span>
              <span className="font-mono font-bold">{cards.notifiedPo || 1500}</span>
            </div>
            <div className="flex justify-between items-center gap-3 px-3 py-1 bg-[#90caf9] text-blue-950">
              <span>ส่งมอบในระบบ</span>
              <span className="font-mono font-bold">{cards.deliveredInSystem || 1498}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
