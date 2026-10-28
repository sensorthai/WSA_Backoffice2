"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Layers, Settings2, RotateCcw, SlidersHorizontal, HelpCircle, RotateCw } from "lucide-react";
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
  // Default calibrated values for standard 3-up roll (32mm x 37.3mm labels, 3mm gap, 104.1mm total width)
  const [pageWidthMm, setPageWidthMm] = useState<number>(104.1); // 4.098 in
  const [pageHeightMm, setPageHeightMm] = useState<number>(37.3); // 1.469 in
  const [labelWidthMm, setLabelWidthMm] = useState<number>(32.0); // 1.26 in
  const [colGapMm, setColGapMm] = useState<number>(3.0); // 3.0mm gap between stickers (35mm pitch)
  const [leftMarginMm, setLeftMarginMm] = useState<number>(1.05); // (104.1 - (32*3 + 3*2)) / 2 = 1.05mm
  const [offsetXMm, setOffsetXMm] = useState<number>(0); // fine shift left (-) / right (+)
  const [offsetYMm, setOffsetYMm] = useState<number>(0); // fine shift up (-) / down (+)
  // Print orientation mode to defeat Chrome/Edge automatic Landscape rotation when Width > Height
  const [printMode, setPrintMode] = useState<"portrait_lock" | "counter_rotate_90" | "standard">("portrait_lock");
  const [showCalibration, setShowCalibration] = useState<boolean>(true);

  // Always print 1 sticker per selected plot, arranged sequentially up to 3 plots per row
  const rowsOfThree = useMemo(() => {
    const rows: TscPlotItem[][] = [];
    for (let i = 0; i < plots.length; i += 3) {
      rows.push(plots.slice(i, i + 3));
    }
    return rows;
  }, [plots]);

  if (!isOpen || plots.length === 0) return null;

  const handleResetCalibration = () => {
    setPageWidthMm(104.1);
    setPageHeightMm(37.3);
    setLabelWidthMm(32.0);
    setColGapMm(3.0);
    setLeftMarginMm(1.05);
    setOffsetXMm(0);
    setOffsetYMm(0);
    setPrintMode("portrait_lock");
  };

  // Exact X positions (in mm) for each of the 3 stickers on the backing liner
  const colPositionsMm = [
    leftMarginMm + offsetXMm,
    leftMarginMm + labelWidthMm + colGapMm + offsetXMm,
    leftMarginMm + (labelWidthMm + colGapMm) * 2 + offsetXMm,
  ];

  const handlePrintWindow = (overrideMode?: "portrait_lock" | "counter_rotate_90" | "standard") => {
    const activeMode = overrideMode || printMode;
    const printWin = window.open("", "_blank", "width=980,height=740");
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = rowsOfThree
      .map((row) => {
        const cellsHtml = [0, 1, 2]
          .map((colIdx) => {
            const item = row[colIdx];
            const leftMm = colPositionsMm[colIdx].toFixed(2);
            const topMm = offsetYMm.toFixed(2);

            if (!item) {
              return `<div class="label-cell empty-cell" style="left: ${leftMm}mm; top: ${topMm}mm;"></div>`;
            }

            const qrUrl = getQrCodeSvgUrl(item.plot_code, 240);
            const seriesText = item.home_series || "-";
            const projectText = item.project?.project_name || item.project?.project_code || "-";
            const houseText = item.house_number || item.land_plot || "-";

            return `
              <div class="label-cell" style="left: ${leftMm}mm; top: ${topMm}mm;">
                <div class="qr-wrapper">
                  <img src="${qrUrl}" alt="${item.plot_code}" class="qr-img" />
                </div>
                <div class="series-text">${seriesText}</div>
                <div class="project-text">${projectText}</div>
                <div class="house-text">${houseText}</div>
              </div>
            `;
          })
          .join("");

        return `<div class="page-sheet"><div class="label-row">${cellsHtml}</div></div>`;
      })
      .join("");

    // CSS rules depending on printMode:
    // 1. portrait_lock: Omit custom WxH in @page so Chrome does NOT see W > H and does NOT force Landscape; uses driver's native 4.098x1.469in Portrait page size directly.
    // 2. counter_rotate_90: If driver/Windows still forces Landscape (swapping 37.3mm x 104.1mm), rotate the row 90deg so the 3 stickers align with the 3 physical columns.
    // 3. standard: Explicit @page { size: 104.1mm 37.3mm; }
    let pageCss = "";
    if (activeMode === "portrait_lock") {
      pageCss = `
        @page {
          size: portrait;
          margin: 0mm !important;
        }
        html, body {
          width: ${pageWidthMm}mm;
          margin: 0 !important;
          padding: 0 !important;
        }
        .page-sheet {
          width: ${pageWidthMm}mm;
          height: ${pageHeightMm}mm;
          position: relative;
          overflow: hidden;
          page-break-after: always;
          break-after: page;
        }
        .label-row {
          position: relative;
          width: ${pageWidthMm}mm;
          height: ${pageHeightMm}mm;
        }
      `;
    } else if (activeMode === "counter_rotate_90") {
      pageCss = `
        @page {
          size: ${pageHeightMm}mm ${pageWidthMm}mm;
          margin: 0mm !important;
        }
        html, body {
          width: ${pageHeightMm}mm;
          margin: 0 !important;
          padding: 0 !important;
        }
        .page-sheet {
          width: ${pageHeightMm}mm;
          height: ${pageWidthMm}mm;
          position: relative;
          overflow: hidden;
          page-break-after: always;
          break-after: page;
        }
        .label-row {
          position: absolute;
          top: 0;
          left: ${pageHeightMm}mm;
          width: ${pageWidthMm}mm;
          height: ${pageHeightMm}mm;
          transform-origin: top left;
          transform: rotate(90deg);
        }
      `;
    } else {
      pageCss = `
        @page {
          size: ${pageWidthMm}mm ${pageHeightMm}mm;
          margin: 0mm !important;
        }
        html, body {
          width: ${pageWidthMm}mm;
          margin: 0 !important;
          padding: 0 !important;
        }
        .page-sheet {
          width: ${pageWidthMm}mm;
          height: ${pageHeightMm}mm;
          position: relative;
          overflow: hidden;
          page-break-after: always;
          break-after: page;
        }
        .label-row {
          position: relative;
          width: ${pageWidthMm}mm;
          height: ${pageHeightMm}mm;
        }
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>พิมพ์สติกเกอร์ QR Code (3 ดวง/แถว) - Land & Houses</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fff;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          ${pageCss}
          .page-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .label-cell {
            position: absolute;
            width: ${labelWidthMm}mm;
            height: ${pageHeightMm}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 1.0mm 1.0mm;
            overflow: hidden;
          }
          .qr-wrapper {
            width: 19.0mm;
            height: 19.0mm;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.7mm;
          }
          .qr-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: pixelated;
          }
          .series-text {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.2pt;
            font-weight: 600;
            letter-spacing: 0.01em;
            line-height: 1.12;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: ${labelWidthMm - 2.0}mm;
          }
          .project-text {
            font-family: 'Times New Roman', 'Sarabun', serif;
            font-size: 7.0pt;
            font-weight: 700;
            line-height: 1.15;
            color: #000;
            margin-top: 0.3mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: ${labelWidthMm - 1.5}mm;
          }
          .house-text {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12.0pt;
            font-weight: 600;
            line-height: 1.12;
            color: #000;
            margin-top: 0.4mm;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        ${rowsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
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

    const tsplContent = generateBatchTspl(formattedPlots, pageWidthMm, pageHeightMm, 3);
    const filename = `TSC_3Up_Labels_${plots.length}_plots_${new Date().toISOString().slice(0, 10)}.prn`;
    downloadTsplFile(filename, tsplContent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-indigo-600" />
            พิมพ์สติกเกอร์ QR Code (เรียงสูงสุด 3 แปลง / แถว) - TSC TTP-244 PRO
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
            <span>
              Page Size: <strong className="text-slate-700">4.098&quot; x 1.469&quot; ({pageWidthMm} x {pageHeightMm} mm)</strong>
            </span>
            <span>•</span>
            <span>
              ขนาดต่อดวง: <strong className="text-slate-700">1.26&quot; x 1.47&quot; ({labelWidthMm} x {pageHeightMm} mm)</strong>
            </span>
            <span>•</span>
            <span>
              ระยะห่างระหว่างดวง (Gap): <strong className="text-indigo-700">{colGapMm} mm (Pitch {(labelWidthMm + colGapMm).toFixed(1)} mm)</strong>
            </span>
          </div>
        </DialogHeader>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 no-print">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>
                เลือกทั้งหมด <strong className="text-indigo-700">{plots.length}</strong> แปลง (จัดเรียง{" "}
                <strong>{rowsOfThree.length}</strong> แถว • สูงสุด 3 แปลง/แถว)
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCalibration(!showCalibration)}
              className={`h-7 px-2.5 text-xs gap-1.5 ${
                showCalibration
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "border-slate-300 text-slate-700"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showCalibration ? "ซ่อนแผงตั้งค่าทิศทาง/ระยะ" : "ตั้งค่าแก้สลับ Landscape / ระยะสติกเกอร์"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTspl}
              className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลด TSPL (.prn)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintWindow("counter_rotate_90")}
              className="gap-1.5 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              title="ใช้ปุ่มนี้หากเครื่องพิมพ์บังคับหมุน Landscape 90 องศา"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-700" />
              พิมพ์แบบหมุนแก้ Landscape (90°)
            </Button>
            <Button
              size="sm"
              onClick={() => handlePrintWindow("portrait_lock")}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              สั่งพิมพ์สติกเกอร์ (ล็อก Portrait)
            </Button>
          </div>
        </div>

        {/* Calibration & Troubleshooting Panel */}
        {showCalibration && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3.5 space-y-3 text-xs no-print animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                โหมดแก้ปัญหา Chrome/Windows บังคับพลิกหน้ากระดาษเป็น Landscape
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetCalibration}
                className="h-6 px-2 text-[11px] text-amber-800 hover:bg-amber-100 gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                คืนค่ามาตรฐาน
              </Button>
            </div>

            {/* Orientation Mode Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrintMode("portrait_lock")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  printMode === "portrait_lock"
                    ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-indigo-950 flex items-center justify-between">
                  <span>1. ล็อก Portrait (@page size: portrait)</span>
                  {printMode === "portrait_lock" && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">แนะนำ</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  ป้องกันไม่ให้ Chrome เห็นค่า กว้าง &gt; สูง แล้วแอบสลับเป็น Landscape อัตโนมัติ (ยึดขนาด 4.098&quot;×1.469&quot; จากไดรเวอร์ TSC โดยตรง)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode("counter_rotate_90")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  printMode === "counter_rotate_90"
                    ? "bg-amber-100/80 border-amber-500 ring-1 ring-amber-500"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>2. หมุนชดเชย 90° (Counter-Rotate)</span>
                  {printMode === "counter_rotate_90" && (
                    <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">กำลังเลือก</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  ใช้เมื่อไดรเวอร์/Windows ยังคงบังคับหมุนกระดาษเป็นแนวตั้ง ระบบจะหมุนแถวสติกเกอร์กลับ 90 องศาเพื่อให้พิมพ์ลง 3 แถวตรงช่องพอดี
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode("standard")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  printMode === "standard"
                    ? "bg-slate-100 border-slate-500 ring-1 ring-slate-500"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-slate-900">
                  3. มาตรฐาน (`@page 104.1mm × 37.3mm`)
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  ส่งขนาด 104.1 × 37.3 mm ไปยังบราวเซอร์โดยตรง (ใช้สำหรับบันทึกเป็น PDF)
                </p>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div className="bg-white p-2 rounded border border-amber-200">
                <label className="block text-[10px] font-medium text-slate-500">
                  กว้างรวมแผ่น (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={pageWidthMm}
                  onChange={(e) => setPageWidthMm(Number(e.target.value) || 104.1)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div className="bg-white p-2 rounded border border-amber-200">
                <label className="block text-[10px] font-medium text-slate-500">
                  ความกว้างต่อดวง (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={labelWidthMm}
                  onChange={(e) => setLabelWidthMm(Number(e.target.value) || 32)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div className="bg-white p-2 rounded border border-amber-200">
                <label className="block text-[10px] font-medium text-slate-500">
                  ช่องว่างระหว่างดวง (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={colGapMm}
                  onChange={(e) => setColGapMm(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="bg-white p-2 rounded border border-amber-200">
                <label className="block text-[10px] font-medium text-slate-500">
                  ขอบซ้ายเริ่มต้น (mm)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={leftMarginMm}
                  onChange={(e) => setLeftMarginMm(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div className="bg-white p-2 rounded border border-amber-200">
                <label className="block text-[10px] font-medium text-slate-500">
                  ชดเชยซ้าย(-)/ขวา(+) (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={offsetXMm}
                  onChange={(e) => setOffsetXMm(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-700"
                />
              </div>

              <div className="bg-white p-2 rounded border border-amber-200">
                <label className="block text-[10px] font-medium text-slate-500">
                  ชดเชยบน(-)/ล่าง(+) (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={offsetYMm}
                  onChange={(e) => setOffsetYMm(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-700"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded">
              <div>
                <strong>พิกัดแนวนอนปัจจุบัน:</strong> ดวงที่ 1 = <code>{colPositionsMm[0].toFixed(2)} mm</code> | ดวงที่ 2 = <code>{colPositionsMm[1].toFixed(2)} mm</code> | ดวงที่ 3 = <code>{colPositionsMm[2].toFixed(2)} mm</code>
              </div>
              <div>
                * ในหน้าต่าง Print ต้องเลือก <strong>Margins: None</strong> และ <strong>Scale: 100%</strong>
              </div>
            </div>
          </div>
        )}

        {/* Labels Preview Container (Simulated 3-up Label Roll) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/70 rounded-lg border border-slate-300 space-y-5">
          {rowsOfThree.map((row, rowIndex) => (
            <div key={rowIndex} className="space-y-1">
              <div className="text-[11px] font-medium text-slate-500 text-center">
                แถวที่ {rowIndex + 1} / {rowsOfThree.length} (ขนาดแผ่น 4.098&quot; × 1.469&quot;)
              </div>

              {/* 3-Up Row Strip */}
              <div className="bg-slate-300/80 p-3 rounded-xl border border-slate-400/60 shadow-inner max-w-[660px] mx-auto">
                <div className="grid grid-cols-3 gap-2.5">
                  {[0, 1, 2].map((colIndex) => {
                    const plot = row[colIndex];
                    if (!plot) {
                      return (
                        <div
                          key={`empty-${colIndex}`}
                          className="bg-white/40 border-2 border-dashed border-slate-300 rounded-[18px] h-[235px] flex items-center justify-center text-xs text-slate-400"
                        >
                          (ดวงว่าง)
                        </div>
                      );
                    }

                    const qrUrl = getQrCodeSvgUrl(plot.plot_code, 220);
                    const seriesText = plot.home_series || "-";
                    const projectText =
                      plot.project?.project_name || plot.project?.project_code || "-";
                    const houseText = plot.house_number || plot.land_plot || "-";

                    return (
                      <div
                        key={`${plot.plot_code}-${rowIndex}-${colIndex}`}
                        className="bg-white border border-slate-300 rounded-[18px] shadow-sm px-2.5 py-3 flex flex-col items-center justify-center text-center h-[235px] transition-transform hover:scale-[1.01]"
                        title={`QR Data: ${plot.plot_code}`}
                      >
                        {/* QR Code */}
                        <div className="w-[116px] h-[116px] flex items-center justify-center mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrUrl}
                            alt={plot.plot_code}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Line 1: Home Series (e.g. P31FDF2SP) */}
                        <div className="text-[13px] font-semibold text-black tracking-wide leading-tight truncate w-full">
                          {seriesText}
                        </div>

                        {/* Line 2: Project Name (e.g. CHAIYAPRUEK บางนา กม.13) */}
                        <div
                          className="text-[12px] font-bold text-black leading-snug mt-0.5 truncate w-full"
                          style={{ fontFamily: "'Times New Roman', 'Sarabun', serif" }}
                        >
                          {projectText}
                        </div>

                        {/* Line 3: House Number (e.g. 468/66) */}
                        <div className="text-[21px] font-semibold text-black leading-tight mt-1 tracking-tight">
                          {houseText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="no-print pt-2 flex flex-col sm:flex-row justify-between sm:justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Settings2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              ตั้งค่าหน้ากระดาษเครื่องพิมพ์: <strong>User Defined Size (Width: 4.098 in, Height: 1.469 in)</strong> | Margins: <strong>None</strong> | Scale: <strong>100%</strong>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
