// lib/lh-customer.ts
// Single source of truth for Land & Houses customer resolution rules

export interface CustomerCompanyInfo {
  companyName: string;
  headOfficeAddress: string;
}

export function getCustomerCompanyInfo(accountCode?: string): CustomerCompanyInfo {
  const prefix = accountCode?.trim()?.substring(0, 2)?.toUpperCase() || '';
  
  const standardAddress = 'เลขที่ 1 อาคารคิวเฮ้าส์ลุมพินี ชั้น 37-38 ถนนสาทรใต้ แขวงทุ่งมหาเมฆ เขตสาทร กรุงเทพ ฯ 10120';

  switch (prefix) {
    case 'LH':
      return {
        companyName: 'บริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด',
        headOfficeAddress: standardAddress
      };
    case 'LA':
      return {
        companyName: 'บริษัท แลนด์ แอนด์ เฮ้าส์ แอคเสส จำกัด',
        headOfficeAddress: standardAddress
      };
    case 'NE':
      return {
        companyName: 'บริษัท แลนด์ แอนด์ เฮ้าส์ นอร์ธอีส จำกัด',
        headOfficeAddress: standardAddress
      };
    default:
      return {
        companyName: 'บริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด',
        headOfficeAddress: standardAddress
      };
  }
}
