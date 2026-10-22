"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, PackageCheck } from "lucide-react";

export interface RequisitionSlipData {
  requisition_no: string;
  requester_name: string;
  requester_phone?: string;
  purpose_type: string;
  created_at: string;
  plot?: {
    plot_code: string;
    land_plot: string;
    house_number?: string;
    home_series: string;
    po_number?: string;
    project?: {
      account_code: string;
      project_name: string;
    };
  };
  items: Array<{
    id: string;
    device?: {
      serial_number: string;
      ownership_type: string;
      condition: string;
      product?: {
        name: string;
        sku: string;
      };
    };
  }>;
}

interface PrintableRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: RequisitionSlipData | null;
}

export function PrintableRequisitionModal({ isOpen, onClose, requisition }: PrintableRequisitionModalProps) {
  if (!isOpen || !requisition) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPurposeLabel = (type: string) => {
    switch (type) {
      case "installation_new":
        return "ติดตั้งโครงการใหม่";
      case "warranty_replace":
        return "เปลี่ยนทดแทนในประกัน";
      case "out_of_warranty_refurbished":
        return "เปลี่ยนทดแทนเกินประกัน (อุปกรณ์ซ่อม)";
      case "office_testing":
        return "ทดสอบ / ใช้งานภายใน";
      default:
        return type;
    }
  };

  const getOwnershipLabel = (type?: string) => {
    if (type === "customer_consignment") return "ลูกค้าฝากสต็อก (LH)";
    if (type === "company_owned") return "ของบริษัท";
    return type || "-";
  };

  const getConditionLabel = (condition?: string) => {
    if (condition === "new") return "ของใหม่";
    if (condition === "repaired_refurbished") return "ซ่อมเสร็จพร้อมใช้ (Refurbished)";
    return condition || "-";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50 no-print flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <PackageCheck className="w-5 h-5 text-indigo-600" />
              ใบเบิกอุปกรณ์ / คลังสินค้า (Equipment Requisition Slip)
            </DialogTitle>
            <p className="text-xs text-slate-500">
              เลขที่ใบเบิก: {requisition.requisition_no}
            </p>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ใบเบิก (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white text-black p-8 max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:p-0 print:border-none print:shadow-none font-sans text-[13px] leading-relaxed">
            {/* Header */}
            <div className="text-center font-bold text-base mb-1">
              บริษัท ดับเบิ้ลยู เอส เอ จำกัด
            </div>
            <div className="text-center font-semibold text-sm mb-4 pb-2 border-b-2 border-black">
              ใบเบิกอุปกรณ์ / คลังสินค้า (EQUIPMENT REQUISITION SLIP)
            </div>

            {/* Requisition Meta */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div>
                <div><strong>เลขที่ใบเบิก:</strong> {requisition.requisition_no}</div>
                <div><strong>ผู้ขอเบิก:</strong> {requisition.requester_name}</div>
                <div><strong>เบอร์โทร:</strong> {requisition.requester_phone || "-"}</div>
              </div>
              <div className="text-right">
                <div><strong>วันที่เบิก:</strong> {new Date(requisition.created_at).toLocaleDateString('th-TH')}</div>
                <div><strong>วัตถุประสงค์:</strong> {getPurposeLabel(requisition.purpose_type)}</div>
              </div>
            </div>

            {/* Site / Project Information */}
            {requisition.plot && (
              <div className="p-3 bg-slate-50 border border-slate-300 rounded mb-4 text-xs space-y-1">
                <div className="font-bold text-slate-900 border-b pb-1 mb-1">
                  ข้อมูลโครงการและแปลงบ้านที่นำไปติดตั้ง:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>โครงการ:</strong> {requisition.plot.project?.project_name || "-"} ({requisition.plot.project?.account_code})</div>
                  <div><strong>แปลงที่:</strong> {requisition.plot.land_plot} | <strong>บ้านเลขที่:</strong> {requisition.plot.house_number || "-"}</div>
                  <div><strong>แบบบ้าน:</strong> {requisition.plot.home_series}</div>
                  <div><strong>เลขที่ PO:</strong> {requisition.plot.po_number || "-"}</div>
                </div>
              </div>
            )}

            {/* Device Items Table */}
            <div className="mb-6">
              <div className="font-bold mb-1 text-xs">รายการอุปกรณ์ที่เบิกออก:</div>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 print:bg-transparent">
                    <th className="border border-black p-1.5 w-12">ลำดับ</th>
                    <th className="border border-black p-1.5 text-left pl-3">รายการอุปกรณ์</th>
                    <th className="border border-black p-1.5 w-36">Serial Number (S/N)</th>
                    <th className="border border-black p-1.5 w-36">แหล่งสต็อก / สภาพ</th>
                    <th className="border border-black p-1.5 w-16">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {requisition.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-black p-1">{idx + 1}</td>
                      <td className="border border-black p-1 text-left pl-3">
                        {item.device?.product?.name || item.device?.product?.sku || "อุปกรณ์"}
                      </td>
                      <td className="border border-black p-1 font-mono font-bold">
                        {item.device?.serial_number || "-"}
                      </td>
                      <td className="border border-black p-1 text-[11px]">
                        {getOwnershipLabel(item.device?.ownership_type)} ({getConditionLabel(item.device?.condition)})
                      </td>
                      <td className="border border-black p-1">1 ชุด</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes & Agreement */}
            <div className="text-xs text-slate-700 space-y-1 mb-8 border-t pt-3">
              <div><strong>ข้อตกลงและเงื่อนไข:</strong></div>
              <div>
                พนักงานผู้ขอเบิกมีหน้าที่ดูแลรักษาอุปกรณ์ตามหมายเลข Serial Number ข้างต้นให้อยู่ในสภาพสมบูรณ์จนกว่าจะส่งมอบและติดตั้งให้แก่ลูกค้า
                หากไม่ได้ติดตั้งหรือติดตั้งไม่สำเร็จ ต้องนำอุปกรณ์กลับมาส่งคืนคลังสินค้าทันที
              </div>
            </div>

            {/* Signature Section */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-dashed border-slate-400">
              <div>
                <div>ลงชื่อ ...................................................... ผู้ขอเบิก (พนักงาน/ช่าง)</div>
                <div className="mt-1">( {requisition.requester_name} )</div>
                <div className="mt-2">วันที่ ......./......./.......</div>
              </div>
              <div>
                <div>ลงชื่อ ...................................................... ผู้จ่ายอุปกรณ์ (เจ้าหน้าที่คลัง)</div>
                <div className="mt-1">( ..................................................... )</div>
                <div className="mt-2">วันที่ ......./......./.......</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50 no-print">
          <Button variant="outline" size="sm" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
