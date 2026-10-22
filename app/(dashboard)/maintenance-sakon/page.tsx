"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Plus,
  FileUp,
  Download,
  Building,
  Wrench,
  CheckCircle2,
  Calendar,
  Layers,
  ExternalLink,
} from "lucide-react";
import { CreateSakonExchangeModal } from "@/components/maintenance/CreateSakonExchangeModal";
import { PrintableSakonSlipModal, SakonExchangeData } from "@/components/maintenance/PrintableSakonSlipModal";

export default function MaintenanceSakonPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<SakonExchangeData | null>(null);

  const { data: exchangesData, isLoading, refetch } = useQuery({
    queryKey: ["maintenance-sakon-exchanges"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance/exchanges");
      if (!res.ok) throw new Error("Failed to fetch exchanges");
      return res.json();
    },
  });

  const exchanges = Array.isArray(exchangesData) ? exchangesData : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">
              ระบบเปลี่ยนอุปกรณ์เสียหาย (Maintenance — สากลเวิร์ค / Sakon)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            รับอุปกรณ์เสียหายจาก บริษัท สากลเวิร์ค จำกัด, เบิกอุปกรณ์ Refurbished เปลี่ยนทดแทน และพิมพ์เอกสารส่งมอบสำหรับเซ็นรับของ
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4" />
          บันทึกใบขอเปลี่ยนอุปกรณ์ (Sakon)
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-xs text-blue-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Building className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 text-sm">คู่ค้างานบริการซ่อมบำรุง: บริษัท สากลเวิร์ค จำกัด (SAKOL WORK CO., LTD)</strong>
            <div className="text-slate-600 mt-0.5">
              กระบวนการ: สากลเวิร์คส่งใบขอเปลี่ยน (PDF) $\rightarrow$ อัปโหลดเข้าระบบ $\rightarrow$ เบิกอุปกรณ์ซ่อมเสร็จ (Refurbished) จ่ายให้ $\rightarrow$ พิมพ์เอกสารให้ตัวแทนลงชื่อรับของครบถ้วน
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-slate-500">บันทึกแล้วทั้งหมด:</span>{" "}
          <strong className="text-indigo-900 text-sm">{exchanges.length} รายการ</strong>
        </div>
      </div>

      {/* Exchanges Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="p-3">เลขที่ใบขอเปลี่ยน (Sakon)</th>
                <th className="p-3">วันที่ตามเอกสาร</th>
                <th className="p-3">ผู้ให้เบิก (ปลายทาง)</th>
                <th className="p-3">รายการอุปกรณ์ที่เปลี่ยน</th>
                <th className="p-3 text-center">รวมจำนวน (ชิ้น)</th>
                <th className="p-3">ไฟล์ PDF แนบ</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    กำลังโหลดข้อมูลการเปลี่ยนอุปกรณ์...
                  </td>
                </tr>
              ) : exchanges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    ยังไม่มีรายการเปลี่ยนอุปกรณ์ สามารถกดปุ่ม &quot;บันทึกใบขอเปลี่ยนอุปกรณ์ (Sakon)&quot; ด้านบนเพื่อเริ่มรายการแรก
                  </td>
                </tr>
              ) : (
                exchanges.map((exc: any) => {
                  const totalQty = (exc.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
                  return (
                    <tr key={exc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {exc.sakol_doc_no}
                      </td>
                      <td className="p-3 text-slate-600">
                        {new Date(exc.sakol_doc_date).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {exc.recipient_company}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {(exc.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="text-slate-700">
                              • {item.product_name}: <strong>{item.quantity} ชิ้น</strong>
                              {item.refurbished_sn && (
                                <span className="font-mono text-indigo-600 ml-1">
                                  [S/N: {item.refurbished_sn}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 font-mono">
                        {totalQty}
                      </td>
                      <td className="p-3">
                        {exc.pdf_file_url ? (
                          <a
                            href={exc.pdf_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline text-[11px]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {exc.pdf_filename || "เปิดไฟล์ PDF"}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          ส่งมอบเรียบร้อย
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSlip(exc)}
                          className="h-7 px-2.5 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          พิมพ์ใบเซ็นรับของ (A4)
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Sakon Exchange */}
      <CreateSakonExchangeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(newExc) => {
          refetch();
          setSelectedSlip(newExc);
        }}
      />

      {/* Modal: Printable Sakon Handover Slip */}
      <PrintableSakonSlipModal
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
        exchange={selectedSlip}
      />
    </div>
  );
}
