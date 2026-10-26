"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Printer,
  UploadCloud,
  FileText,
  CheckSquare,
  Square,
  QrCode,
  Building2,
  Home,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Download,
  BarChart3,
  ListFilter,
} from "lucide-react";
import { downloadLhPlotTemplate } from "@/lib/excel-templates";
import { TscLabelModal, TscPlotItem } from "@/components/installation/TscLabelModal";
import { CoverSheetModal } from "@/components/installation/CoverSheetModal";
import { LhImportModal } from "@/components/installation/LhImportModal";
import { LhSummaryReport } from "@/components/installation/LhSummaryReport";
import { PlotCoverSheetData } from "@/components/installation/ExactCoverSheet";
import { getCustomerCompanyInfo } from "@/lib/lh-customer";
import { TablePagination, useTablePagination } from "@/components/ui/TablePagination";

export default function LhPlotsPage() {
  const [viewMode, setViewMode] = useState<"plots" | "reports">("plots");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending"); // default to pending
  const [lotFilter, setLotFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTscModalOpen, setIsTscModalOpen] = useState(false);
  const [coverSheetPlot, setCoverSheetPlot] = useState<PlotCoverSheetData | null>(null);

  // Fetch plots from API
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["lh-plots", statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
      params.append("limit", "1000");

      const res = await fetch(`/api/lh/plots?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch plots");
      return res.json();
    },
  });

  const rawPlots = data?.plots || [];

  // Filter by Lot if specified
  const plots = React.useMemo(() => {
    if (lotFilter === "all") return rawPlots;
    return rawPlots.filter((p: any) => {
      const lotStr = (p.po_item?.lot_number || p.project?.notes || "").toString().toLowerCase();
      return lotStr.includes(lotFilter.toLowerCase());
    });
  }, [rawPlots, lotFilter]);

  // Pagination hook
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedPlots,
    setCurrentPage,
    setPageSize,
  } = useTablePagination(plots, 10, [10, 20, 30, 50, 100]);

  // Toggle single selection
  const handleToggleSelect = (plotId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(plotId)) {
        next.delete(plotId);
      } else {
        next.add(plotId);
      }
      return next;
    });
  };

  // Select all or deselect all visible
  const handleSelectAll = () => {
    if (selectedIds.size === plots.length && plots.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(plots.map((p: any) => p.id)));
    }
  };

  // Get selected plot objects for TSC label printing
  const selectedPlotsForTsc: TscPlotItem[] = plots
    .filter((p: any) => selectedIds.has(p.id))
    .map((p: any) => ({
      plot_code: p.plot_code,
      land_plot: p.land_plot,
      house_number: p.house_number,
      home_series: p.home_series,
      po_number: p.po_number,
      project: p.project,
    }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">
              ระบบจัดการโครงการ & แปลงบ้าน Land & Houses
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            ฐานข้อมูลแปลงบ้าน, สัญญา PO, ใบปะหน้าส่งมอบงานติดตั้ง และพิมพ์สติกเกอร์ QR Code บนเครื่อง TSC TTP-244 PRO
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadLhPlotTemplate}
            className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            ดาวน์โหลด Excel Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีเฟรช
          </Button>
          <Button
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            นำเข้าข้อมูลจาก Excel / ชีต
          </Button>
        </div>
      </div>

      {/* Top View Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode("plots")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === "plots"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          รายการแปลงบ้าน & พิมพ์ใบปะหน้า
        </button>

        <button
          onClick={() => setViewMode("reports")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === "reports"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          รายงานสรุป Lot & โครงการ (ตามตัวอย่าง)
        </button>
      </div>

      {viewMode === "reports" ? (
        <LhSummaryReport />
      ) : (
        <>
          {/* Filter Tabs & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => {
                setStatusFilter("pending");
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === "pending"
                  ? "bg-white text-indigo-700 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              ยังไม่ส่งมอบ
            </button>
            <button
              onClick={() => {
                setStatusFilter("delivered");
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === "delivered"
                  ? "bg-white text-emerald-700 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ส่งมอบแล้ว
            </button>
            <button
              onClick={() => {
                setStatusFilter("all");
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Lot Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-medium">Lot:</span>
              <select
                value={lotFilter}
                onChange={(e) => {
                  setLotFilter(e.target.value);
                  setSelectedIds(new Set());
                }}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value="all">ทุก Lot</option>
                <option value="PM 2.5">PM 2.5</option>
                <option value="1,500">Lot 1,500</option>
                <option value="2,000">Lot 2,000</option>
                <option value="1,000">Lot 1,000</option>
                <option value="1,000(2)">Lot 1,000(2)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="ค้นหาตามแปลง, บ้านเลขที่, PO, โครงการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Batch Action Bar (When items are selected) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs font-medium text-indigo-950">
                เลือกอยู่ <strong>{selectedIds.size}</strong> แปลง
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsTscModalOpen(true)}
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์ QR Code บนเครื่อง TSC TTP-244 PRO ({selectedIds.size} แปลง)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table of Plots */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>
              เลือกแปลงที่ต้องการพิมพ์ หรือกดปุ่ม <strong>พิมพ์ QR Code</strong> เพื่อจัดเรียงสติกเกอร์แบบ <strong>3 ดวงต่อ 1 แถว (4.098&quot; × 1.469&quot;)</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={paginatedPlots.length === 0}
              onClick={() => {
                setSelectedIds(new Set(paginatedPlots.map((p: any) => p.id)));
                setIsTscModalOpen(true);
              }}
              className="h-7 px-2.5 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์ QR หน้าปัจจุบัน ({paginatedPlots.length} แปลง)
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    title="เลือกทั้งหมด"
                    className="text-slate-500 hover:text-indigo-600"
                  >
                    {selectedIds.size === plots.length && plots.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">รหัสแปลง (Name) / Label</th>
                <th className="p-3">โครงการ / ลูกค้า</th>
                <th className="p-3">แปลงที่</th>
                <th className="p-3">บ้านเลขที่</th>
                <th className="p-3">แบบบ้าน</th>
                <th className="p-3">ใบสั่งซื้อ (PO) / LOT</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    กำลังโหลดข้อมูลแปลงบ้าน...
                  </td>
                </tr>
              ) : plots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    ไม่พบข้อมูลแปลงบ้านตามเงื่อนไขที่เลือก (สามารถกดปุ่ม "นำเข้าข้อมูลจาก Excel" ด้านบนเพื่อเริ่มต้น)
                  </td>
                </tr>
              ) : (
                paginatedPlots.map((plot: any) => {
                  const isSelected = selectedIds.has(plot.id);
                  const customerInfo = getCustomerCompanyInfo(plot.project?.account_code);

                  return (
                    <tr
                      key={plot.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(plot.id)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-900 text-xs">
                          {plot.plot_code}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {plot.label || plot.occ_id || "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">
                          {plot.project?.project_name || plot.project?.project_code || "-"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {customerInfo.companyName} ({plot.project?.account_code || "-"})
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {plot.land_plot}
                      </td>
                      <td className="p-3 text-slate-700">
                        {plot.house_number || "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {plot.home_series}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <div className="text-slate-800">{plot.po_number || "-"}</div>
                        {plot.lot_name && (
                          <div className="text-[10px] text-indigo-600">{plot.lot_name}</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {plot.delivery_status === "delivered" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            ส่งมอบแล้ว
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                            ยังไม่ส่งมอบ
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Cover Sheet */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCoverSheetPlot(plot)}
                            title="พิมพ์เอกสารส่งมอบงานติดตั้ง (ใบปะหน้า)"
                            className="h-7 px-2 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            ใบปะหน้า
                          </Button>

                          {/* Print Single TSC Label */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIds(new Set([plot.id]));
                              setIsTscModalOpen(true);
                            }}
                            title="พิมพ์สติกเกอร์ QR Code บนเครื่อง TSC TTP-244 PRO"
                            className="h-7 px-2 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-600" />
                            TSC
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="แปลง"
        />
      </div>
      </>
      )}

      {/* Modals */}
      <LhImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
      />

      <TscLabelModal
        isOpen={isTscModalOpen}
        onClose={() => setIsTscModalOpen(false)}
        plots={selectedPlotsForTsc}
      />

      <CoverSheetModal
        isOpen={!!coverSheetPlot}
        onClose={() => setCoverSheetPlot(null)}
        plot={coverSheetPlot}
      />
    </div>
  );
}
