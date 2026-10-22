"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Filter,
  RefreshCw,
  QrCode,
  Tag,
  FileText,
  Warehouse,
  Download,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { downloadDeviceInventoryTemplate } from "@/lib/excel-templates";
import { CreateRequisitionModal } from "@/components/inventory/CreateRequisitionModal";
import { PrintableRequisitionModal, RequisitionSlipData } from "@/components/inventory/PrintableRequisitionModal";
import { toast } from "sonner";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"devices" | "requisitions" | "stock_card">("devices");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [ownerCompanyFilter, setOwnerCompanyFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Stock Card state
  const [stockCardSku, setStockCardSku] = useState("AP-CTRL");
  const [stockCardOwner, setStockCardOwner] = useState("all");
  const [stockCardCondition, setStockCardCondition] = useState("all");

  // Modals
  const [isCreateReqOpen, setIsCreateReqOpen] = useState(false);
  const [selectedReqSlip, setSelectedReqSlip] = useState<RequisitionSlipData | null>(null);

  // Quick Device Register Form Modal
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newSn, setNewSn] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newOwnership, setNewOwnership] = useState("customer_consignment");
  const [newCondition, setNewCondition] = useState("new");

  // Fetch Devices
  const {
    data: devicesData,
    isLoading: isDevicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ["inventory-devices", ownershipFilter, ownerCompanyFilter, conditionFilter, statusFilter, deviceSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ownershipFilter !== "all") params.append("ownership", ownershipFilter);
      if (ownerCompanyFilter !== "all") params.append("owner_company", ownerCompanyFilter);
      if (conditionFilter !== "all") params.append("condition", conditionFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (deviceSearch) params.append("search", deviceSearch);

      const res = await fetch(`/api/inventory/devices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch devices");
      return res.json();
    },
  });

  // Fetch Requisitions
  const {
    data: requisitionsData,
    isLoading: isReqsLoading,
    refetch: refetchReqs,
  } = useQuery({
    queryKey: ["inventory-requisitions"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/requisitions");
      if (!res.ok) throw new Error("Failed to fetch requisitions");
      return res.json();
    },
  });

  // Fetch Stock Card Data
  const {
    data: stockCardData,
    isLoading: isStockCardLoading,
    refetch: refetchStockCard,
  } = useQuery({
    queryKey: ["inventory-stock-card", stockCardSku, stockCardOwner, stockCardCondition],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("sku", stockCardSku);
      if (stockCardOwner !== "all") params.append("ownership", stockCardOwner);
      if (stockCardCondition !== "all") params.append("condition", stockCardCondition);

      const res = await fetch(`/api/inventory/stock-card?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch stock card");
      return res.json();
    },
    enabled: activeTab === "stock_card",
  });

  const handleExportStockCardExcel = () => {
    if (!stockCardData || !stockCardData.ledger) {
      toast.error("ไม่มีข้อมูลใน Stock Card");
      return;
    }

    const rows = stockCardData.ledger.map((tx: any, idx: number) => ({
      ลำดับ: idx + 1,
      วันที่เวลา: new Date(tx.timestamp).toLocaleString("th-TH"),
      เอกสารอ้างอิง: tx.ref_no,
      รายการความเคลื่อนไหว: tx.action,
      ประเภท: tx.type === "IN" ? "รับเข้า" : "จ่ายออก",
      Serial_Number: tx.serial_number,
      กรรมสิทธิ์: tx.owner,
      สภาพ: tx.condition,
      แปลงบ้านปลายทาง: tx.destination,
      ผู้ทำรายการ: tx.actor,
      รับเข้า: tx.quantity_in,
      จ่ายออก: tx.quantity_out,
      ยอดคงเหลือ: tx.balance,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 22 },
      { wch: 28 },
      { wch: 12 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 35 },
      { wch: 25 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Stock_Card");
    XLSX.writeFile(wb, `Stock_Card_${stockCardSku}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const devices = Array.isArray(devicesData) ? devicesData : [];
  const requisitions = Array.isArray(requisitionsData) ? requisitionsData : [];

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSn.trim()) {
      toast.error("กรุณาระบุ Serial Number");
      return;
    }
    try {
      const res = await fetch("/api/inventory/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number: newSn.trim(),
          product_id: newProductId || undefined,
          ownership_type: newOwnership,
          condition: newCondition,
          status: "in_stock",
        }),
      });

      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      toast.success(`ลงทะเบียนอุปกรณ์ S/N: ${newSn} เรียบร้อยแล้ว`);
      setNewSn("");
      setIsAddDeviceOpen(false);
      refetchDevices();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">
              ระบบคลังอุปกรณ์ & ใบเบิกสินค้า (Inventory & Requisitions)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            ติดตามสต็อกตาม Serial Number, สต็อกลูกค้าฝากไว้ (LH), ของซ่อมพร้อมใช้ และพิมพ์ใบเบิกสำหรับพนักงานเซ็นรับของ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadDeviceInventoryTemplate}
            className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            ดาวน์โหลด Excel Template
          </Button>
          {activeTab === "devices" ? (
            <Button
              size="sm"
              onClick={() => setIsAddDeviceOpen(true)}
              className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              ลงทะเบียนอุปกรณ์ (S/N)
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsCreateReqOpen(true)}
              className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              สร้างใบเบิกอุปกรณ์ใหม่
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("devices")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "devices"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Boxes className="w-4 h-4" />
          คลังอุปกรณ์ราย Serial Number ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab("requisitions")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "requisitions"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          ประวัติใบเบิกอุปกรณ์ ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab("stock_card")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "stock_card"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          บัตรคุมสต็อก (Stock Card)
        </button>
      </div>

      {/* TAB 1: DEVICES */}
      {activeTab === "devices" && (
        <div className="space-y-4">
          {/* Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 font-medium">อุปกรณ์ทั้งหมด</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{devices.length} ชิ้น</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm bg-blue-50/30">
              <div className="text-blue-700 font-medium">กรรมสิทธิ์ YIP</div>
              <div className="text-lg font-bold text-blue-900 mt-0.5">
                {devices.filter((d: any) => (d.owner_company_name || '').toUpperCase().includes('YIP')).length} ชิ้น
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-sm bg-indigo-50/30">
              <div className="text-indigo-700 font-medium">กรรมสิทธิ์ WSA</div>
              <div className="text-lg font-bold text-indigo-900 mt-0.5">
                {devices.filter((d: any) => (d.owner_company_name || '').toUpperCase().includes('WSA')).length} ชิ้น
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
              <div className="text-emerald-700 font-medium">สภาพของใหม่</div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">
                {devices.filter((d: any) => d.condition === 'new').length} ชิ้น
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm bg-amber-50/30">
              <div className="text-amber-700 font-medium">สภาพ Refurbished</div>
              <div className="text-lg font-bold text-amber-900 mt-0.5">
                {devices.filter((d: any) => d.condition === 'repaired_refurbished').length} ชิ้น
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">กรรมสิทธิ์:</span>
              <select
                value={ownerCompanyFilter}
                onChange={(e) => setOwnerCompanyFilter(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-medium"
              >
                <option value="all">ทั้งหมด</option>
                <option value="YIP">กรรมสิทธิ์ YIP (Yip In Tsoi)</option>
                <option value="WSA">กรรมสิทธิ์ WSA</option>
              </select>

              <span className="text-slate-500 font-medium ml-2">สภาพ:</span>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-medium"
              >
                <option value="all">ทั้งหมด</option>
                <option value="new">ของใหม่ (New)</option>
                <option value="repaired_refurbished">ซ่อมแล้ว (Refurbished)</option>
              </select>

              <span className="text-slate-500 font-medium ml-2">สถานะ:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-medium"
              >
                <option value="all">ทั้งหมด</option>
                <option value="in_stock">อยู่ในคลังพร้อมใช้</option>
                <option value="with_technician">อยู่กับช่าง</option>
                <option value="installed">ติดตั้งแล้ว</option>
                <option value="under_repair">รอซ่อม</option>
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="ค้นหา Serial Number..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          {/* Devices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Serial Number (S/N)</th>
                    <th className="p-3">รายการอุปกรณ์</th>
                    <th className="p-3">กรรมสิทธิ์</th>
                    <th className="p-3">สภาพ</th>
                    <th className="p-3">สถานะสต็อก</th>
                    <th className="p-3">แปลงที่ติดตั้งอยู่ (ถ้ามี)</th>
                    <th className="p-3">วันที่บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isDevicesLoading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        กำลังโหลดข้อมูลคลังอุปกรณ์...
                      </td>
                    </tr>
                  ) : devices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        ยังไม่มีรายการอุปกรณ์ในสต็อก สามารถกดปุ่ม "ลงทะเบียนอุปกรณ์ (S/N)" ด้านบนเพื่อเริ่มลงทะเบียน
                      </td>
                    </tr>
                  ) : (
                    devices.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {d.serial_number}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">
                            {d.product?.name || "อุปกรณ์"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            SKU: {d.product?.sku || "-"}
                          </div>
                        </td>
                        <td className="p-3">
                          {(d.owner_company_name || '').toUpperCase().includes('YIP') ? (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                              YIP (Yip In Tsoi)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                              {d.owner_company_name || "WSA"}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {d.condition === "repaired_refurbished" ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              ซ่อมแล้ว (Refurbished)
                            </Badge>
                          ) : d.condition === "defective" ? (
                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                              ของเสีย
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              ของใหม่
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {d.status === "in_stock" && (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">ในคลังพร้อมใช้</Badge>
                          )}
                          {d.status === "with_technician" && (
                            <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">อยู่กับช่าง</Badge>
                          )}
                          {d.status === "installed" && (
                            <Badge className="bg-slate-100 text-slate-800 text-[10px]">ติดตั้งแล้ว</Badge>
                          )}
                          {d.status === "under_repair" && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px]">กำลังส่งซ่อม</Badge>
                          )}
                        </td>
                        <td className="p-3 text-slate-700">
                          {d.current_plot ? (
                            <div>
                              <strong className="text-slate-900">{d.current_plot.land_plot}</strong>
                              {d.current_plot.house_number ? ` (${d.current_plot.house_number})` : ""}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(d.created_at).toLocaleDateString("th-TH")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUISITIONS */}
      {activeTab === "requisitions" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-3">เลขที่ใบเบิก</th>
                  <th className="p-3">วันที่เบิก</th>
                  <th className="p-3">ผู้ขอเบิก (ช่าง)</th>
                  <th className="p-3">แปลงบ้านปลายทาง</th>
                  <th className="p-3">โครงการ / PO</th>
                  <th className="p-3 text-center">จำนวนอุปกรณ์</th>
                  <th className="p-3 text-center">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isReqsLoading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      กำลังโหลดประวัติใบเบิก...
                    </td>
                  </tr>
                ) : requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      ยังไม่มีประวัติการเบิกอุปกรณ์ สามารถกดปุ่ม "สร้างใบเบิกอุปกรณ์ใหม่" ด้านบนเพื่อเริ่มเบิกของ
                    </td>
                  </tr>
                ) : (
                  requisitions.map((req: any) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {req.requisition_no}
                      </td>
                      <td className="p-3 text-slate-600">
                        {new Date(req.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {req.requester_name}
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900">{req.plot?.land_plot || "-"}</strong>
                        {req.plot?.house_number ? ` (บ้านเลขที่: ${req.plot.house_number})` : ""}
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>{req.plot?.project?.project_name || "-"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">PO: {req.plot?.po_number || "-"}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">
                        {req.items?.length || 0} ชิ้น
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">
                          เบิกออกแล้ว
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReqSlip(req)}
                          className="h-7 px-2.5 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          พิมพ์ใบเบิก
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK CARD */}
      {activeTab === "stock_card" && (
        <div className="space-y-4">
          {/* Product SKU Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                sku: "AP-CTRL",
                name: "ชุดควบคุม Air Plus Controller",
                subtitle: "ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5",
              },
              {
                sku: "AP-8PORT",
                name: "Air Plus 8 Port Extension",
                subtitle: "กล่องขยายสัญญาณ Air Plus 8 Port",
              },
              {
                sku: "SN-PM25",
                name: "เซ็นเซอร์ PM 2.5",
                subtitle: "เซ็นเซอร์ตรวจวัดค่าฝุ่นละออง PM 2.5",
              },
            ].map((p) => {
              const isSelected = stockCardSku === p.sku;
              return (
                <button
                  key={p.sku}
                  type="button"
                  onClick={() => setStockCardSku(p.sku)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-600 shadow-sm ring-1 ring-indigo-600"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`font-mono text-[10px] ${isSelected ? "bg-indigo-600 text-white border-indigo-600" : ""}`}>
                        {p.sku}
                      </Badge>
                      {isSelected && <span className="text-[10px] font-bold text-indigo-700">● กำลังเลือก</span>}
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-2">{p.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{p.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stock Card Controls & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">กรองกรรมสิทธิ์:</span>
              <select
                value={stockCardOwner}
                onChange={(e) => setStockCardOwner(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-medium"
              >
                <option value="all">ทั้งหมด (YIP + WSA)</option>
                <option value="YIP">เฉพาะกรรมสิทธิ์ YIP</option>
                <option value="WSA">เฉพาะกรรมสิทธิ์ WSA</option>
              </select>

              <span className="text-slate-500 font-medium ml-2">กรองสภาพ:</span>
              <select
                value={stockCardCondition}
                onChange={(e) => setStockCardCondition(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-medium"
              >
                <option value="all">ทั้งหมด (ของใหม่ + Refurbished)</option>
                <option value="new">เฉพาะของใหม่ (New)</option>
                <option value="repaired_refurbished">เฉพาะซ่อมแล้ว (Refurbished)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs text-slate-700"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                พิมพ์ Stock Card (A4)
              </Button>
              <Button
                size="sm"
                onClick={handleExportStockCardExcel}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                ส่งออก Stock Card (.xlsx)
              </Button>
            </div>
          </div>

          {/* Stock Card Summary Header */}
          {stockCardData?.summary && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                <div>
                  <div className="text-xs text-slate-500 font-medium">บัตรคุมสต็อกสินค้า (STOCK CARD LEDGER)</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {stockCardData.product?.name} ({stockCardData.product?.sku})
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  หน่วยนับ: <strong className="text-slate-800">ชุด / เครื่อง</strong>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-medium">รับเข้าสะสม (Total In)</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                    +{stockCardData.summary.total_in}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-red-700 font-medium">จ่ายออกสะสม (Total Out)</div>
                  <div className="text-lg font-bold text-red-900 mt-0.5 font-mono">
                    -{stockCardData.summary.total_out}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-emerald-700 font-medium">คงเหลือในคลังพร้อมใช้</div>
                  <div className="text-xl font-bold text-emerald-900 mt-0.5 font-mono">
                    {stockCardData.summary.current_in_stock}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-indigo-700 font-medium">อยู่ระหว่างช่างถือไปติด</div>
                  <div className="text-lg font-bold text-indigo-900 mt-0.5 font-mono">
                    {stockCardData.summary.with_technician}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-amber-700 font-medium">ติดตั้งสำเร็จแล้ว</div>
                  <div className="text-lg font-bold text-amber-900 mt-0.5 font-mono">
                    {stockCardData.summary.installed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stock Card Movement Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>ประวัติความเคลื่อนไหวทางบัญชีสต็อก (Stock Movement Transactions)</span>
              <span className="text-[11px] text-slate-500 font-normal">
                แสดง {stockCardData?.ledger?.length || 0} รายการล่าสุด
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="p-2.5">วันที่ & เวลา</th>
                    <th className="p-2.5">เอกสารอ้างอิง</th>
                    <th className="p-2.5">รายการความเคลื่อนไหว</th>
                    <th className="p-2.5">Serial Number</th>
                    <th className="p-2.5">กรรมสิทธิ์ / สภาพ</th>
                    <th className="p-2.5">โครงการ / แปลงบ้าน</th>
                    <th className="p-2.5">ผู้ทำรายการ</th>
                    <th className="p-2.5 text-center text-emerald-700">รับเข้า (+)</th>
                    <th className="p-2.5 text-center text-red-700">จ่ายออก (-)</th>
                    <th className="p-2.5 text-center font-bold text-indigo-900">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isStockCardLoading ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">
                        กำลังโหลดข้อมูล Stock Card...
                      </td>
                    </tr>
                  ) : !stockCardData?.ledger || stockCardData.ledger.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">
                        ไม่พบประวัติความเคลื่อนไหวสต็อกตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    stockCardData.ledger.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                          {new Date(tx.timestamp).toLocaleString("th-TH", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] font-semibold text-slate-800">
                          {tx.ref_no}
                        </td>
                        <td className="p-2.5">
                          {tx.type === "IN" ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              {tx.action}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                              {tx.action}
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {tx.serial_number}
                        </td>
                        <td className="p-2.5 text-[11px]">
                          <span className="font-semibold text-slate-800">{tx.owner}</span>
                          <span className="text-slate-500 ml-1">({tx.condition})</span>
                        </td>
                        <td className="p-2.5 text-slate-700 text-[11px]">
                          {tx.destination}
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          {tx.actor}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-600">
                          {tx.quantity_in > 0 ? `+${tx.quantity_in}` : "-"}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-red-600">
                          {tx.quantity_out > 0 ? `-${tx.quantity_out}` : "-"}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                          {tx.balance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Requisition */}
      <CreateRequisitionModal
        isOpen={isCreateReqOpen}
        onClose={() => setIsCreateReqOpen(false)}
        onSuccess={(newReq) => {
          refetchReqs();
          refetchDevices();
          setSelectedReqSlip(newReq);
        }}
      />

      {/* Modal: Printable Requisition Slip */}
      <PrintableRequisitionModal
        isOpen={!!selectedReqSlip}
        onClose={() => setSelectedReqSlip(null)}
        requisition={selectedReqSlip}
      />
    </div>
  );
}
