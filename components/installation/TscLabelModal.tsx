"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, QrCode, Layers } from "lucide-react";
import { generateBatchTspl, downloadTsplFile, getQrCodeSvgUrl } from "@/lib/qr";

export interface TscPlotItem {
  plot_code: string;
  land_plot: string;
  house_number?: string;
  home_series: string;
  po_number?: string;
  project?: {
    project_name: string;
    project_code: string;
    account_code: string;
  };
}

interface TscLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  plots: TscPlotItem[];
}

export function TscLabelModal({ isOpen, onClose, plots }: TscLabelModalProps) {
  const [labelWidth] = useState(50); // mm
  const [labelHeight] = useState(30); // mm

  if (!isOpen || plots.length === 0) return null;

  const handlePrintWeb = () => {
    window.print();
  };

  const handleDownloadTspl = () => {
    const formattedPlots = plots.map((p) => ({
      plot_code: p.plot_code,
      project_name: p.project?.project_name || p.project?.project_code || "",
      land_plot: p.land_plot,
      house_number: p.house_number,
      home_series: p.home_series,
      po_number: p.po_number,
    }));

    const tsplContent = generateBatchTspl(formattedPlots, labelWidth, labelHeight);
    const filename = `TSC_Labels_${plots.length}_plots_${new Date().toISOString().slice(0, 10)}.prn`;
    downloadTsplFile(filename, tsplContent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-indigo-600" />
            พิมพ์สติกเกอร์ QR Code บนเครื่อง TSC TTP-244 PRO ({plots.length} แปลงที่เลือก)
          </DialogTitle>
          <p className="text-xs text-slate-500">
            ระบบสร้าง QR Code จากข้อมูล <span className="font-semibold text-slate-700">name</span> ของแปลงบ้าน ขนาดสติกเกอร์มาตรฐาน 50 x 30 mm
          </p>
        </DialogHeader>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>จำนวนสติกเกอร์: <strong className="text-slate-900">{plots.length}</strong> ดวง</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTspl}
              className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลดคำสั่ง TSPL (.prn)
            </Button>
            <Button
              size="sm"
              onClick={handlePrintWeb}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              สั่งพิมพ์ออกไดรเวอร์ TSC (Web Print)
            </Button>
          </div>
        </div>

        {/* Labels Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-lg border border-slate-200 space-y-4 print:p-0 print:m-0 print:border-none print:bg-white print:overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:block">
            {plots.map((plot, index) => {
              const qrUrl = getQrCodeSvgUrl(plot.plot_code, 120);
              return (
                <div
                  key={plot.plot_code + index}
                  className="bg-white border-2 border-dashed border-slate-400 p-2.5 rounded shadow-sm flex items-center gap-3 w-full max-w-[500px] mx-auto print:border-none print:shadow-none print:p-1 print:m-0 print:w-[50mm] print:h-[30mm] print:page-break-after-always"
                  style={{
                    minHeight: "115px",
                  }}
                >
                  {/* QR Code Column */}
                  <div className="shrink-0 flex flex-col items-center justify-center bg-white border border-slate-200 p-1 rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt={plot.plot_code}
                      className="w-20 h-20 object-contain print:w-[22mm] print:h-[22mm]"
                    />
                    <span className="text-[9px] font-mono font-bold text-slate-700 mt-0.5">
                      {plot.land_plot}
                    </span>
                  </div>

                  {/* Text Details Column */}
                  <div className="flex-1 min-w-0 text-left space-y-0.5 leading-tight">
                    <div className="font-mono font-bold text-xs truncate text-indigo-900 border-b pb-0.5 print:text-[10px]">
                      {plot.plot_code}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-800 truncate pt-0.5 print:text-[9px]">
                      {plot.project?.project_name || plot.project?.project_code || "โครงการ LH"}
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium print:text-[9px]">
                      แปลง: <strong className="text-black">{plot.land_plot}</strong>
                      {plot.house_number ? ` | เลขที่: ${plot.house_number}` : ""}
                    </div>
                    <div className="text-[10px] text-slate-600 print:text-[8px]">
                      แบบ: <strong className="text-slate-800">{plot.home_series}</strong>
                    </div>
                    {plot.po_number && (
                      <div className="text-[9px] font-mono text-slate-500 truncate print:text-[8px]">
                        PO: {plot.po_number}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="no-print pt-2 flex justify-between sm:justify-between items-center">
          <span className="text-xs text-slate-500">
            * ในหน้าต่างพิมพ์ของ Windows/Browser ให้เลือกกระดาษขนาด 50 x 30 mm และ Margins: None
          </span>
          <Button variant="ghost" onClick={onClose}>
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
