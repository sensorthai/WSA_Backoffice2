import * as XLSX from "xlsx";

/**
 * Downloads Excel template for Land & Houses Plots import
 */
export function downloadLhPlotTemplate() {
  const sampleRows = [
    {
      name: "LH372-02B01-210PW334T",
      type: "House",
      label: "90/109 มัณฑนา ราชพฤกษ์-นครอินทร์",
      house_number: "90/109",
      account_code: "LH372",
      land_plot: "02B01",
      home_series: "210PW334T",
      project_code: "MRI",
      project: "มัณฑนา ราชพฤกษ์-นครอินทร์",
      address: "90/109 หมู่ 8 ถ.บางกรวย-ไทรน้อย ต.บางเลน อ.บางใหญ่ จ.นนทบุรี 11140",
      รหัสใบสั่งซื้อ: "LH3726300837",
      "วันที่สั่งซื้อ (ค.ศ.)": "27/09/2020",
      occ_id: "90/109 มัณฑนา ราชพฤกษ์-นครอินทร์ - MRI 02B01",
      ส่งมอบในระบบ: "",
      "วันที่ PO เพิ่มใหม่ (ค.ศ.)": "",
      LOT: "PM 2.5",
      แหล่งชีต: "Asset_House 1,500",
      สถานะส่งมอบ: "ยังไม่ส่งมอบ",
    },
    {
      name: "LH354-01B01-103SI115C",
      type: "House",
      label: "168/402 Villaggio บางใหญ่",
      house_number: "168/402",
      account_code: "LH354",
      land_plot: "01B01",
      home_series: "103SI115C",
      project_code: "VY",
      project: "Villaggio บางใหญ่",
      address: "168/402 หมู่ 9 ต.บ้านใหม่ อ.บางใหญ่ จ.นนทบุรี 11140",
      รหัสใบสั่งซื้อ: "LH3546504727",
      "วันที่สั่งซื้อ (ค.ศ.)": "10/11/2022",
      occ_id: "168/402 Villaggio บางใหญ่ - VY 01B01",
      ส่งมอบในระบบ: "",
      "วันที่ PO เพิ่มใหม่ (ค.ศ.)": "10/11/2022",
      LOT: "Lot 1,500",
      แหล่งชีต: "Asset_House 1,500",
      สถานะส่งมอบ: "ยังไม่ส่งมอบ",
    },
    {
      name: "LA030-00N16-236OW236B",
      type: "House",
      label: "456/167 มัณฑนา บางนา กม.15",
      house_number: "456/167",
      account_code: "LA030",
      land_plot: "00N16",
      home_series: "236OW236B",
      project_code: "M15",
      project: "มัณฑนา บางนา กม.15",
      address: "456/167 หมู่ 3 ถ.บางนาตราด กม.15 ต.บางโฉลง อ.บางพลี จ.สมุทรปราการ 10540",
      รหัสใบสั่งซื้อ: "LA0306503596",
      "วันที่สั่งซื้อ (ค.ศ.)": "10/11/2022",
      occ_id: "456/167 มัณฑนา บางนา กม.15 - M15 00N16",
      ส่งมอบในระบบ: "",
      "วันที่ PO เพิ่มใหม่ (ค.ศ.)": "10/11/2022",
      LOT: "Lot 1,500",
      แหล่งชีต: "Asset_House 1,500",
      สถานะส่งมอบ: "ยังไม่ส่งมอบ",
    },
    {
      name: "LH380-00K01-155FD127B",
      type: "House",
      label: "468/106 CHAIYAPRUEK บางนา กม.13",
      house_number: "468/106",
      account_code: "LH380",
      land_plot: "00K01",
      home_series: "155FD127B",
      project_code: "C13",
      project: "CHAIYAPRUEK บางนา กม.13",
      address: "468/106 หมู่ 11 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540",
      รหัสใบสั่งซื้อ: "LH3806603750",
      "วันที่สั่งซื้อ (ค.ศ.)": "28/12/2023",
      occ_id: "468/106 CHAIYAPRUEK บางนา กม.13 - C13 00K01",
      ส่งมอบในระบบ: "",
      "วันที่ PO เพิ่มใหม่ (ค.ศ.)": "06/01/2024",
      LOT: "Lot 1,000",
      แหล่งชีต: "Asset_House 1,000",
      สถานะส่งมอบ: "ยังไม่ส่งมอบ",
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);

  // Auto-fit column widths
  const colWidths = [
    { wch: 25 }, // name
    { wch: 10 }, // type
    { wch: 35 }, // label
    { wch: 15 }, // house_number
    { wch: 15 }, // account_code
    { wch: 12 }, // land_plot
    { wch: 15 }, // home_series
    { wch: 14 }, // project_code
    { wch: 30 }, // project
    { wch: 60 }, // address
    { wch: 18 }, // รหัสใบสั่งซื้อ
    { wch: 20 }, // วันที่สั่งซื้อ
    { wch: 45 }, // occ_id
    { wch: 15 }, // ส่งมอบในระบบ
    { wch: 25 }, // วันที่ PO เพิ่มใหม่
    { wch: 15 }, // LOT
    { wch: 20 }, // แหล่งชีต
    { wch: 15 }, // สถานะส่งมอบ
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "LH_House_Plots_Template");
  XLSX.writeFile(wb, "Template_นำเข้าแปลงบ้าน_Land_and_Houses.xlsx");
}

/**
 * Downloads Excel template for Device Serial Numbers & Inventory Import
 */
export function downloadDeviceInventoryTemplate() {
  const sampleDevices = [
    {
      "Serial Number (S/N)": "APC-2610-0001",
      "รหัสสินค้า (SKU)": "AP-CTRL",
      "ชื่ออุปกรณ์": "ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5 (Air Plus Controller)",
      "กรรมสิทธิ์ (customer_consignment / company_owned)": "customer_consignment",
      "ชื่อเจ้าของกรรมสิทธิ์": "Land and Houses",
      "สภาพ (new / repaired_refurbished / defective)": "new",
      "สถานะสต็อก (in_stock)": "in_stock",
      "หมายเหตุ / ล็อต": "สต็อกฝาก LH Lot 1,500",
    },
    {
      "Serial Number (S/N)": "AP8-2610-0001",
      "รหัสสินค้า (SKU)": "AP-8PORT",
      "ชื่ออุปกรณ์": "Air Plus 8 Port Extension",
      "กรรมสิทธิ์ (customer_consignment / company_owned)": "customer_consignment",
      "ชื่อเจ้าของกรรมสิทธิ์": "Land and Houses",
      "สภาพ (new / repaired_refurbished / defective)": "new",
      "สถานะสต็อก (in_stock)": "in_stock",
      "หมายเหตุ / ล็อต": "สต็อกฝาก LH Lot 1,500",
    },
    {
      "Serial Number (S/N)": "PM25-2610-0001",
      "รหัสสินค้า (SKU)": "SN-PM25",
      "ชื่ออุปกรณ์": "เซ็นเซอร์ PM 2.5",
      "กรรมสิทธิ์ (customer_consignment / company_owned)": "customer_consignment",
      "ชื่อเจ้าของกรรมสิทธิ์": "Land and Houses",
      "สภาพ (new / repaired_refurbished / defective)": "new",
      "สถานะสต็อก (in_stock)": "in_stock",
      "หมายเหตุ / ล็อต": "สต็อกฝาก LH Lot 1,500",
    },
    {
      "Serial Number (S/N)": "APC-2401-0899",
      "รหัสสินค้า (SKU)": "AP-CTRL",
      "ชื่ออุปกรณ์": "ชุดควบคุมระบบเติมอากาศ กรองฝุ่น PM 2.5 (Air Plus Controller)",
      "กรรมสิทธิ์ (customer_consignment / company_owned)": "company_owned",
      "ชื่อเจ้าของกรรมสิทธิ์": "WSA",
      "สภาพ (new / repaired_refurbished / defective)": "repaired_refurbished",
      "สถานะสต็อก (in_stock)": "in_stock",
      "หมายเหตุ / ล็อต": "ซ่อมเสร็จผ่าน QC พร้อมใช้สำหรับงานเปลี่ยนนอกประกัน",
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleDevices);

  ws["!cols"] = [
    { wch: 22 }, // Serial Number
    { wch: 18 }, // SKU
    { wch: 55 }, // Name
    { wch: 32 }, // Ownership
    { wch: 25 }, // Owner Company
    { wch: 30 }, // Condition
    { wch: 18 }, // Status
    { wch: 45 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Device_Inventory_Template");
  XLSX.writeFile(wb, "Template_คลังอุปกรณ์_Serial_Number.xlsx");
}
