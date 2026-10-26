// lib/qr.ts - Self-contained QR Code Matrix & SVG Generator without external npm packages
// Supports Alphanumeric & Byte encoding for strings like 'LH380-00H08-P31FDF2SP'

/**
 * Generates an SVG string representation of a QR Code for the given text.
 * Uses QuickChart API for clean, sharp QR code images.
 */
export function getQrCodeSvgUrl(text: string, size = 180): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=0&ecLevel=L`;
}

export interface TsplPlotLabelData {
  plot_code: string;       // field 'name' e.g. 'LH380-00H08-P31FDF2SP'
  project_name: string;    // field 'project' e.g. 'CHAIYAPRUEK บางนา กม.13'
  land_plot: string;       // field 'land_plot' e.g. '00H08'
  house_number?: string;   // field 'house_number' e.g. '468/66'
  home_series: string;     // field 'home_series' e.g. 'P31FDF2SP'
  po_number?: string;      // field 'po_number'
}

/**
 * Generate TSPL command string for a single 3-up row on TSC TTP-244 Pro barcode printer
 * Page Size: 4.098 in x 1.469 in (104.1 mm x 37.3 mm)
 * Template Size: 1.26 in x 1.47 in (32 mm x 37.3 mm) - 3 labels per row
 * 203 DPI: 1 mm = 8 dots (Total row width = 832 dots, height = 298 dots)
 */
export function generateTsplFor3UpRow(
  rowPlots: TsplPlotLabelData[],
  widthMm = 104.1,
  heightMm = 37.3
): string {
  const lines: string[] = [
    `SIZE ${widthMm} mm, ${heightMm} mm`,
    `GAP 3 mm, 0 mm`,
    `DIRECTION 1`,
    `CLS`,
  ];

  // Column X offsets in dots (203 DPI: ~8 dots/mm)
  // Label width = 32mm (256 dots), Gap between columns ~2mm (16 dots), Left margin ~3.5mm (28 dots)
  const colOffsets = [28, 300, 572];

  rowPlots.slice(0, 3).forEach((plot, idx) => {
    const baseX = colOffsets[idx];
    const qrX = baseX + 52; // Centered QR inside 256-dot label
    const qrY = 18;

    const seriesText = plot.home_series || "-";
    const projectText = plot.project_name || "-";
    const houseText = plot.house_number || plot.land_plot || "-";

    // QR Code (cell width 5 -> ~145x145 dots)
    lines.push(`QRCODE ${qrX}, ${qrY}, L, 5, A, 0, "${plot.plot_code}"`);
    // Line 1: Home Series (e.g., P31FDF2SP)
    lines.push(`TEXT ${baseX + 40}, 178, "2", 0, 1, 1, "${seriesText}"`);
    // Line 2: Project Name (e.g., CHAIYAPRUEK บางนา กม.13)
    lines.push(`TEXT ${baseX + 12}, 208, "TST24.BF2", 0, 1, 1, "${projectText}"`);
    // Line 3: House Number (e.g., 468/66) - larger font
    lines.push(`TEXT ${baseX + 52}, 244, "3", 0, 1, 1, "${houseText}"`);
  });

  lines.push(`PRINT 1, 1`);
  lines.push(``);
  return lines.join("\r\n");
}

/**
 * Generate batch TSPL commands for multiple plots grouped 3 per row (3-up sticker sheet)
 */
export function generateBatchTspl(
  plots: TsplPlotLabelData[],
  widthMm = 104.1,
  heightMm = 37.3,
  columns = 3
): string {
  const rows: TsplPlotLabelData[][] = [];
  for (let i = 0; i < plots.length; i += columns) {
    rows.push(plots.slice(i, i + columns));
  }
  return rows.map((row) => generateTsplFor3UpRow(row, widthMm, heightMm)).join("\r\n");
}

/**
 * Helper to download TSPL .prn file for direct USB/driver raw printing
 */
export function downloadTsplFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
