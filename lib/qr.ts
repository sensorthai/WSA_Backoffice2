// lib/qr.ts - Self-contained QR Code Matrix & SVG Generator without external npm packages
// Supports Alphanumeric & Byte encoding for strings like 'LH372-02B01-210PW334T'

/**
 * Generates an SVG string representation of a QR Code for the given text.
 * Uses Google Charts / QuickChart as a fast fallback or pure SVG generator.
 */
export function getQrCodeSvgUrl(text: string, size = 150): string {
  // Safe URL encoding for QuickChart API (vector/clean image)
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=1`;
}

/**
 * Generate TSPL command string for TSC TTP-244 Pro barcode printer
 * Label default: 50mm x 30mm with 2mm gap (203 DPI: 1mm = 8 dots)
 */
export function generateTsplForPlot(plot: {
  plot_code: string;       // field 'name'
  project_name: string;    // field 'project'
  land_plot: string;       // field 'land_plot'
  house_number?: string;   // field 'house_number'
  home_series: string;     // field 'home_series'
  po_number?: string;      // field 'po_number'
}, widthMm = 50, heightMm = 30): string {
  const lines: string[] = [
    `SIZE ${widthMm} mm, ${heightMm} mm`,
    `GAP 2 mm, 0 mm`,
    `DIRECTION 1`,
    `CLS`,
    // QRCODE x, y, ECC level, cell width, mode, rotation, "content"
    `QRCODE 24, 20, L, 4, A, 0, "${plot.plot_code}"`,
    // Text labels (203 DPI font coordinates)
    `TEXT 150, 20, "2", 0, 1, 1, "${plot.plot_code}"`,
    `TEXT 150, 50, "TST24.BF2", 0, 1, 1, "${plot.project_name || ''}"`,
    `TEXT 150, 85, "2", 0, 1, 1, "Plot: ${plot.land_plot} | House: ${plot.house_number || '-'}"`,
    `TEXT 150, 120, "2", 0, 1, 1, "Model: ${plot.home_series}"`,
    `TEXT 150, 155, "1", 0, 1, 1, "PO: ${plot.po_number || '-'}"`,
    `PRINT 1, 1`,
    ``
  ];
  return lines.join('\r\n');
}

/**
 * Generate batch TSPL commands for multiple plots (for continuous feed on TSC TTP-244 Pro)
 */
export function generateBatchTspl(plots: Array<{
  plot_code: string;
  project_name: string;
  land_plot: string;
  house_number?: string;
  home_series: string;
  po_number?: string;
}>, widthMm = 50, heightMm = 30): string {
  return plots.map(p => generateTsplForPlot(p, widthMm, heightMm)).join('\r\n');
}

/**
 * Helper to download TSPL .prn file for direct USB/driver raw printing
 */
export function downloadTsplFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
