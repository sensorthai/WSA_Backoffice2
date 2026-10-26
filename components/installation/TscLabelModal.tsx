"use client";

import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Layers, Settings2 } from "lucide-react";
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
  // Always print 1 sticker per selected plot, arranged sequentially up to 3 plots per row
  const rowsOfThree = useMemo(() => {
    const rows: TscPlotItem[][] = [];
    for (let i = 0; i < plots.length; i += 3) {
      rows.push(plots.slice(i, i + 3));
    }
    return rows;
  }, [plots]);

  if (!isOpen || plots.length === 0) return null;

  const handlePrintWindow = () => {
    const printWin = window.open("", "_blank", "width=950,height=700");
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = rowsOfThree
      .map((row) => {
        const cellsHtml = [0, 1, 2]
          .map((colIdx) => {
            const item = row[colIdx];
            if (!item) {
              return `<div class="label-cell empty-cell"></div>`;
            }
            const qrUrl = getQrCodeSvgUrl(item.plot_code, 220);
            const seriesText = item.home_series || "-";
            const projectText = item.project?.project_name || item.project?.project_code || "-";
            const houseText = item.house_number || item.land_plot || "-";

            return `
              <div class="label-cell">
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

        return `<div class="label-row">${cellsHtml}</div>`;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>พิมพ์สติกเกอร์ QR Code (3 ดวง/แถว) - Land & Houses</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 4.098in 1.469in;
            margin: 0;
          }
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
          .label-row {
            width: 4.098in;
            height: 1.469in;
            display: grid;
            grid-template-columns: repeat(3, 1.26in);
            justify-content: space-between;
            align-items: center;
            padding: 0 0.08in;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .label-row:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .label-cell {
            width: 1.26in;
            height: 1.469in;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 0.05in 0.03in;
            overflow: hidden;
          }
          .qr-wrapper {
            width: 0.78in;
            height: 0.78in;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.03in;
          }
          .qr-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: pixelated;
          }
          .series-text {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.5pt;
            font-weight: 600;
            letter-spacing: 0.01em;
            line-height: 1.15;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 1.22in;
          }
          .project-text {
            font-family: 'Times New Roman', 'Sarabun', serif;
            font-size: 7.5pt;
            font-weight: 700;
            line-height: 1.2;
            color: #000;
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 1.22in;
          }
          .house-text {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13pt;
            font-weight: 600;
            line-height: 1.15;
            color: #000;
            margin-top: 2px;
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

    // 4.098 in = 104.1 mm, 1.469 in = 37.3 mm, 3 columns per row
    const tsplContent = generateBatchTspl(formattedPlots, 104.1, 37.3, 3);
    const filename = `TSC_3Up_Labels_${plots.length}_plots_${new Date().toISOString().slice(0, 10)}.prn`;
    downloadTsplFile(filename, tsplContent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-indigo-600" />
            พิมพ์สติกเกอร์ QR Code (เรียงสูงสุด 3 แปลง / แถว) - TSC TTP-244 PRO
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
            <span>
              Page Size: <strong className="text-slate-700">4.098&quot; x 1.469&quot; (104.1 x 37.3 mm)</strong>
            </span>
            <span>•</span>
            <span>
              Template Size (ต่อดวง): <strong className="text-slate-700">1.26&quot; x 1.47&quot; (32 x 37.3 mm)</strong>
            </span>
            <span>•</span>
            <span>
              รูปแบบ: <strong className="text-indigo-700">เรียงแปลงต่อเนื่อง แถวละไม่เกิน 3 แปลง</strong>
            </span>
          </div>
        </DialogHeader>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 no-print">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>
                เลือกทั้งหมด <strong className="text-indigo-700">{plots.length}</strong> แปลง (จัดเรียง{" "}
                <strong>{rowsOfThree.length}</strong> แถว • สูงสุด 3 แปลง/แถว)
              </span>
            </div>
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
              onClick={handlePrintWindow}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              สั่งพิมพ์สติกเกอร์ (3 ดวง/แถว)
            </Button>
          </div>
        </div>

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
              ตั้งค่าหน้ากระดาษเครื่องพิมพ์: <strong>User Defined Size (Width: 4.098 in, Height: 1.469 in)</strong> | Margins: <strong>None</strong>
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
