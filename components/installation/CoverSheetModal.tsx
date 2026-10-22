"use client";

import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText } from "lucide-react";
import { ExactCoverSheet, PlotCoverSheetData } from "./ExactCoverSheet";

interface CoverSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: PlotCoverSheetData | null;
}

export function CoverSheetModal({ isOpen, onClose, plot }: CoverSheetModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !plot) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50 no-print flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="w-5 h-5 text-indigo-600" />
              เอกสารส่งมอบงานติดตั้ง/ใบส่งสินค้า (ต้นฉบับ Land & Houses)
            </DialogTitle>
            <p className="text-xs text-slate-500">
              แปลง: {plot.land_plot} | แบบบ้าน: {plot.home_series} | โครงการ: {plot.project?.project_name}
            </p>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Printable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          <div ref={printRef} className="print:m-0 print:w-full">
            <ExactCoverSheet plot={plot} />
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
