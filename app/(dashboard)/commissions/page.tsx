"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Download,
  Users,
  CheckCircle2,
  Calendar,
  Filter,
  FileSpreadsheet,
  Building,
  Home,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { TablePagination, useTablePagination } from "@/components/ui/TablePagination";

export default function CommissionsPage() {
  const [selectedCycle, setSelectedCycle] = useState<string>(
    new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  );
  const [filterTech, setFilterTech] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["commissions", selectedCycle, filterTech],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCycle) params.append("cycle", selectedCycle);
      if (filterTech) params.append("technician", filterTech);

      const res = await fetch(`/api/commissions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch commissions");
      return res.json();
    },
  });

  const rawRecords = data?.records || [];
  const rawSummary = data?.summary || [];

  const [recordSearch, setRecordSearch] = useState("");
  const [recordStatusFilter, setRecordStatusFilter] = useState("all");

  const filteredRecords = useMemo(() => {
    let list = rawRecords;
    if (recordStatusFilter !== "all") {
      list = list.filter((r: any) => r.payout_status === recordStatusFilter);
    }
    if (!recordSearch.trim()) return list;
    const q = recordSearch.toLowerCase();
    return list.filter((r: any) =>
      r.technician_name?.toLowerCase().includes(q) ||
      r.report?.plot?.project?.project_name?.toLowerCase().includes(q) ||
      r.report?.plot?.land_plot?.toLowerCase().includes(q) ||
      r.report?.plot?.house_number?.toLowerCase().includes(q) ||
      r.report?.plot?.po_number?.toLowerCase().includes(q)
    );
  }, [rawRecords, recordStatusFilter, recordSearch]);

  const summaryPagination = useTablePagination(rawSummary, 10, [10, 20, 30, 50, 100]);
  const recordsPagination = useTablePagination(filteredRecords, 10, [10, 20, 30, 50, 100]);

  const records = rawRecords;
  const summary = rawSummary;

  // Export to Excel
  const handleExportExcel = () => {
    if (summary.length === 0 && records.length === 0) return;

    // Sheet 1: สรุปรายบุคคล
    const summaryRows = summary.map((s: any, idx: number) => ({
      ลำดับ: idx + 1,
      ชื่อช่าง: s.technician_name,
      จำนวนหลังเดี่ยว: s.solo_count,
      จำนวนหลังคู่: s.duo_count,
      รวมจำนวนหลัง: s.total_plots,
      ค่าคอมมิชชั่นสุทธิ: s.total_earned,
      สถานะรอจ่าย: s.pending_amount,
      สถานะจ่ายแล้ว: s.paid_amount,
    }));

    // Sheet 2: รายละเอียดรายแปลง
    const detailRows = records.map((r: any, idx: number) => ({
      ลำดับ: idx + 1,
      ชื่อช่าง: r.technician_name,
      วันที่ติดตั้ง: r.report?.assigned_date || "-",
      โครงการ: r.report?.plot?.project?.project_name || "-",
      แปลงที่: r.report?.plot?.land_plot || "-",
      บ้านเลขที่: r.report?.plot?.house_number || "-",
      แบบบ้าน: r.report?.plot?.home_series || "-",
      ประเภท: r.technician_count === 1 ? "ทำเดี่ยว (50.-)" : "ทำคู่ (25.-)",
      ยอดเงิน: r.commission_earned,
      สถานะ: r.payout_status === "paid" ? "จ่ายแล้ว" : "รอจ่าย",
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปค่าคอมมิชชั่น");
    XLSX.utils.book_append_sheet(wb, wsDetail, "รายละเอียดงานรายแปลง");

    XLSX.writeFile(wb, `รายงานค่าคอมมิชชั่น_ช่างติดตั้ง_${selectedCycle}.xlsx`);
  };

  const totalCommissionAll = summary.reduce(
    (sum: number, s: any) => sum + (s.total_earned || 0),
    0
  );
  const totalPlotsAll = summary.reduce(
    (sum: number, s: any) => sum + (s.total_plots || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900">
              ระบบสรุปค่าคอมมิชชั่นช่างติดตั้ง
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            เกณฑ์ค่าคอมมิชชั่นมาตรฐาน 50 บาท/หลัง (หากทำคู่ แบ่งคนละครึ่งคนละ 25 บาท)
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleExportExcel}
          disabled={summary.length === 0}
          className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          ส่งออก Excel (.xlsx)
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-700">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">รวมยอดค่าคอมมิชชั่นรอบนี้</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              ฿{totalCommissionAll.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-lg text-indigo-700">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">รวมแปลงที่ติดตั้งสำเร็จ</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {totalPlotsAll} แปลง
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">จำนวนช่างที่มีผลงาน</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {summary.length} คน
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            ตารางสรุปยอดรายบุคคล ประจำรอบ {selectedCycle}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">รอบเดือน:</span>
            <input
              type="month"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="p-3 w-12 text-center">ลำดับ</th>
                <th className="p-3">ชื่อ-นามสกุลช่าง</th>
                <th className="p-3 text-center">งานเดี่ยว (50.-)</th>
                <th className="p-3 text-center">งานคู่ (25.-)</th>
                <th className="p-3 text-center">รวมจำนวนหลัง</th>
                <th className="p-3 text-right">ยอดค่าคอมฯ รวม</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    กำลังคำนวณยอดค่าคอมมิชชั่น...
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    ยังไม่มีรายการติดตั้งที่ส่งมอบงานในรอบเดือนนี้
                  </td>
                </tr>
              ) : (
                summaryPagination.paginatedItems.map((s: any, idx: number) => (
                  <tr key={s.technician_name} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono">
                      {(summaryPagination.currentPage - 1) * summaryPagination.pageSize + idx + 1}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {s.technician_name}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {s.solo_count} หลัง
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {s.duo_count} หลัง
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-indigo-700">
                      {s.total_plots} หลัง
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 text-sm">
                      ฿{s.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {s.pending_amount > 0 ? (
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                          รอจ่าย (฿{s.pending_amount.toLocaleString()})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                          จ่ายครบแล้ว
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={summaryPagination.currentPage}
          totalPages={summaryPagination.totalPages}
          totalItems={summaryPagination.totalItems}
          pageSize={summaryPagination.pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={summaryPagination.setCurrentPage}
          onPageSizeChange={summaryPagination.setPageSize}
          itemLabel="คน"
        />
      </div>

      {/* Detail Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              รายละเอียดงานติดตั้งรายแปลง ({filteredRecords.length} รายการ)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจสอบสถานะการจ่ายเงินค่าคอมมิชชั่นรายแปลง (ทำเดี่ยว 50.- / ทำคู่ 25.-)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">สถานะ:</span>
            <select
              value={recordStatusFilter}
              onChange={(e) => setRecordStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รอจ่าย</option>
              <option value="paid">จ่ายแล้ว</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="ค้นหาชื่อช่าง, โครงการ, แปลง..."
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="p-3 w-12 text-center">ลำดับ</th>
                <th className="p-3">ชื่อช่าง</th>
                <th className="p-3">วันที่ติดตั้ง</th>
                <th className="p-3">โครงการ</th>
                <th className="p-3">แปลงที่ / บ้านเลขที่</th>
                <th className="p-3">แบบบ้าน</th>
                <th className="p-3 text-center">ประเภทงาน</th>
                <th className="p-3 text-right">ยอดเงิน</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    กำลังโหลดรายละเอียด...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    ไม่พบรายการงานติดตั้งตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                recordsPagination.paginatedItems.map((r: any, idx: number) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono">
                      {(recordsPagination.currentPage - 1) * recordsPagination.pageSize + idx + 1}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {r.technician_name}
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.report?.assigned_date ? new Date(r.report.assigned_date).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {r.report?.plot?.project?.project_name || "-"}
                    </td>
                    <td className="p-3">
                      <strong className="text-slate-900">{r.report?.plot?.land_plot || "-"}</strong>
                      {r.report?.plot?.house_number ? ` (${r.report.plot.house_number})` : ""}
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.report?.plot?.home_series || "-"}
                    </td>
                    <td className="p-3 text-center">
                      {r.technician_count === 1 ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          ทำเดี่ยว (50.-)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                          ทำคู่ (25.-)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                      ฿{Number(r.commission_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {r.payout_status === "paid" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          จ่ายแล้ว
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                          รอจ่าย
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={recordsPagination.currentPage}
          totalPages={recordsPagination.totalPages}
          totalItems={recordsPagination.totalItems}
          pageSize={recordsPagination.pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={recordsPagination.setCurrentPage}
          onPageSizeChange={recordsPagination.setPageSize}
          itemLabel="แปลง"
        />
      </div>
    </div>
  );
}
