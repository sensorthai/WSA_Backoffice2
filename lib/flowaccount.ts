import { Buffer } from 'buffer';

const FLOWACCOUNT_API_URL = process.env.FLOWACCOUNT_API_URL || 'https://openapi.flowaccount.com/v1';
const FLOWACCOUNT_CLIENT_ID = process.env.FLOWACCOUNT_CLIENT_ID || 'tinwirelesssolution.asia-testonproduction-client';
const FLOWACCOUNT_CLIENT_SECRET = process.env.FLOWACCOUNT_CLIENT_SECRET || 'dGlud2lyZWxlc3Nzb2x1dGlvbi5hc2lhLXRlc3RvbnByb2R1Y3Rpb24tY2xpZW50IDE2LzEyLzIwMjQ=';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

export async function getFlowAccountToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 300000) {
    return tokenCache.accessToken;
  }

  const tokenUrl = `${FLOWACCOUNT_API_URL}/token`;
  const params = new URLSearchParams();
  params.append('client_id', FLOWACCOUNT_CLIENT_ID);
  params.append('client_secret', FLOWACCOUNT_CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'flowaccount-api');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`FlowAccount Auth Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('FlowAccount response did not include access_token');
  }

  const expiresInMs = (data.expires_in || 86400) * 1000;
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + expiresInMs
  };

  return tokenCache.accessToken;
}

export interface BusinessCategory {
  id: number;
  systemCode: string;
  categoryId: string;
  nameLocal: string;
  nameForeign?: string;
  creditId: string;
  creditCategory: string;
  creditCode: string;
  creditNameLocal?: string;
  creditNameForeign?: string;
  debitId: string;
  debitCategory: string;
  debitCode: string;
  debitNameLocal?: string;
  debitNameForeign?: string;
}

export async function getBusinessCategories(): Promise<BusinessCategory[]> {
  const token = await getFlowAccountToken();
  const res = await fetch(`${FLOWACCOUNT_API_URL}/expenses/categories/business`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch FlowAccount business categories: ${err}`);
  }

  const result = await res.json();
  return result.data || [];
}

export interface ExpenseItemInput {
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  price?: number;
  total?: number;
}

export interface CreateExpenseParams {
  contactName: string;
  contactAddress?: string;
  contactTaxId?: string;
  publishedOn?: string;
  dueDate?: string;
  creditType?: number;
  remarks?: string;
  reference?: string;
  subTotal?: number;
  vatAmount?: number;
  grandTotal?: number;
  isVat?: boolean;
  systemCode?: string | number;
  categoryId?: string | number;
  items: ExpenseItemInput[];
  receiptUrl?: string | null;
}

export async function createExpenseDocument(params: CreateExpenseParams) {
  const token = await getFlowAccountToken();
  const categories = await getBusinessCategories();

  let matchedCat: BusinessCategory | undefined;
  if (params.systemCode) {
    matchedCat = categories.find(c => String(c.systemCode) === String(params.systemCode));
  }
  if (!matchedCat && params.categoryId) {
    matchedCat = categories.find(c => String(c.categoryId) === String(params.categoryId));
  }
  if (!matchedCat) {
    matchedCat = categories.find(c => c.systemCode === '1007') || categories[0];
  }

  if (!matchedCat) {
    throw new Error('No FlowAccount business expense categories found.');
  }

  const catFields = {
    systemCode: Number(matchedCat.systemCode) || 1007,
    categoryId: Number(matchedCat.categoryId) || 199499,
    nameLocal: matchedCat.nameLocal || 'สินค้า/วัตถุดิบ/แพคเกจจิ้ง',
    nameForeign: matchedCat.nameForeign || '',
    creditCategory: Number(matchedCat.creditCategory) || 2,
    creditId: Number(matchedCat.creditId) || 315312942,
    creditCode: matchedCat.creditCode || '21311',
    creditNameLocal: matchedCat.creditNameLocal || '',
    creditNameForeign: matchedCat.creditNameForeign || '',
    debitCategory: Number(matchedCat.debitCategory) || 5,
    debitId: Number(matchedCat.debitId) || 315313044,
    debitCode: matchedCat.debitCode || '51111.01',
    debitNameLocal: matchedCat.debitNameLocal || '',
    debitNameForeign: matchedCat.debitNameForeign || ''
  };

  const rawItems = params.items && params.items.length > 0
    ? params.items
    : [{ description: params.remarks || 'ค่าใช้จ่ายเบิกจ่าย', quantity: 1, unit_price: params.grandTotal || 0 }];

  const formattedItems = rawItems.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price ?? item.price ?? 0);
    const lineTotal = Number(item.total ?? (qty * price));
    return {
      ...catFields,
      description: item.name || item.description || params.remarks || 'รายการค่าใช้จ่าย',
      quantity: qty,
      pricePerUnit: price,
      total: lineTotal,
      discountAmount: 0,
      vatRate: params.isVat ? 7 : 0
    };
  });

  const calculatedSubTotal = formattedItems.reduce((sum, item) => sum + item.total, 0);
  const vat = Number(params.vatAmount) || 0;
  const isVat = params.isVat !== undefined ? params.isVat : (vat > 0);
  const subTotal = params.subTotal !== undefined ? Number(params.subTotal) : calculatedSubTotal;
  const grandTotal = params.grandTotal !== undefined ? Number(params.grandTotal) : (subTotal + vat);

  const today = new Date().toISOString().split('T')[0];
  const docDate = params.publishedOn || today;

  const payload = {
    contactName: params.contactName || 'คู่ค้า/ผู้ให้บริการ',
    contactAddress: params.contactAddress || '',
    contactTaxId: params.contactTaxId || '',
    publishedOn: docDate,
    dueDate: params.dueDate || docDate,
    creditType: params.creditType || 3,
    reference: params.reference || '',
    remarks: params.remarks || '',
    isVat: isVat,
    vatAmount: isVat ? vat : 0,
    subTotal: subTotal,
    totalAfterDiscount: subTotal,
    grandTotal: grandTotal,
    items: formattedItems
  };

  const res = await fetch(`${FLOWACCOUNT_API_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resJson = await res.json();

  if (!res.ok || !resJson.status) {
    const validationMsgs = resJson.data?.validationErrors?.join(', ') || resJson.message || 'Unknown error';
    throw new Error(`FlowAccount Create Expense Error: ${validationMsgs}`);
  }

  const docData = resJson.data || {};
  const documentSerial = docData.documentSerial || `EXP-${docData.documentId || Date.now()}`;
  const documentId = docData.documentId || docData.recordId;

  if (params.receiptUrl && documentId) {
    try {
      await uploadExpenseAttachment(documentId, params.receiptUrl);
    } catch (attachErr: any) {
      console.warn(`Could not upload attachment for FlowAccount doc ${documentSerial}:`, attachErr.message);
    }
  }

  return {
    success: true,
    documentSerial,
    documentId,
    data: docData
  };
}

export async function uploadExpenseAttachment(documentId: string | number, receiptUrl: string) {
  const token = await getFlowAccountToken();

  let targetUrl = receiptUrl.trim();
  if (targetUrl.startsWith('[') && targetUrl.endsWith(']')) {
    try {
      const parsed = JSON.parse(targetUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        targetUrl = parsed[0];
      }
    } catch {
      // ignore
    }
  }

  if (!targetUrl.startsWith('http')) return null;

  const fileRes = await fetch(targetUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch receipt from ${targetUrl}`);

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = fileRes.headers.get('content-type') || 'image/png';
  let filename = 'receipt.png';
  if (contentType.includes('pdf')) filename = 'receipt.pdf';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) filename = 'receipt.jpg';

  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  formData.append('file', blob, filename);

  const uploadRes = await fetch(`${FLOWACCOUNT_API_URL}/expenses/${documentId}/attachment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload attachment to FlowAccount: ${errText}`);
  }

  return uploadRes.json();
}

export async function testConnection() {
  const token = await getFlowAccountToken();
  const categories = await getBusinessCategories();
  return {
    status: 'connected',
    tokenSample: token.substring(0, 8) + '...',
    categoryCount: categories.length,
    categories
  };
}

// ----------------------------------------------------
// Product & Inventory Functions
// ----------------------------------------------------

export interface FlowAccountProductItem {
  id: number | string;
  type?: number; // 1 = Product with stock, 3 = Service, etc.
  code: string;  // Product code / SKU
  name: string;
  description?: string;
  sellPrice?: number;
  buyPrice?: number;
  unitName?: string;
  categoryName?: string;
  inventoryTotalQty?: number;
  currentQuantity?: number;
  remaining?: number;
  totalQuantity?: number;
  raw?: any;
}

export interface FetchProductsResponse {
  success: boolean;
  total?: number;
  items: FlowAccountProductItem[];
  error?: string;
}

/**
 * ดึงรายการสินค้าและสต็อกจาก FlowAccount ผ่าน Product Masters API (/product-masters)
 * อ้างอิงตาม FlowAccount Developer Tutorial: https://developers.flowaccount.com/tutorial/product-api/
 * ประเภทสินค้า (Type):
 *   1 = บริการ (Service)
 *   3 = สินค้าไม่นับสต็อก (Non-Inventory Product)
 *   5 = สินค้านับสต็อก (Inventory / Stock Product)
 */
export async function getFlowAccountProducts(currentPage: number = 1, pageSize: number = 50): Promise<FetchProductsResponse> {
  const token = await getFlowAccountToken();

  // เรียกผ่าน /product-masters ตามคู่มือทางการของ FlowAccount
  const url = `${FLOWACCOUNT_API_URL}/product-masters?currentPage=${currentPage}&pageSize=${pageSize}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const resJson = await res.json().catch(() => null);

  if (!res.ok || (resJson && resJson.status === false)) {
    const errorMsg = resJson?.message || `HTTP ${res.status}: ${res.statusText}`;
    return {
      success: false,
      items: [],
      error: errorMsg
    };
  }

  const data = resJson?.data || {};
  const rawList: any[] = Array.isArray(data) ? data : (data.list || data.items || []);

  const items: FlowAccountProductItem[] = rawList.map((item: any) => {
    // รองรับทั้งโครงสร้าง Product Master และ Product List Element
    const productList = item.productList || item.products || [];
    const firstVariant = Array.isArray(productList) && productList.length > 0 ? productList[0] : {};

    return {
      id: item.id || item.productMasterId || item.recordId,
      type: item.type, // 1 = Service, 3 = Non-inventory, 5 = Inventory
      code: item.code || item.productCode || firstVariant.productCode || item.customCode || '',
      name: item.name || item.productName || firstVariant.name || '',
      description: item.description || firstVariant.description,
      sellPrice: Number(item.sellPrice ?? firstVariant.sellPrice ?? item.price ?? 0),
      buyPrice: Number(item.buyPrice ?? firstVariant.buyPrice ?? item.cost ?? 0),
      unitName: item.unitName || firstVariant.unitName || item.unit,
      categoryName: item.categoryName,
      inventoryTotalQty: Number(
        item.inventoryTotalQty ?? 
        item.currentQuantity ?? 
        item.remaining ?? 
        firstVariant.remaining ?? 
        firstVariant.totalQuantity ?? 
        item.totalQuantity ?? 
        0
      ),
      raw: item
    };
  });

  return {
    success: true,
    total: data.total || items.length,
    items
  };
}

/**
 * ดึงสินค้าทั้งหมดทุกหน้า (Paginated) จาก FlowAccount
 */
export async function getAllFlowAccountProducts(): Promise<FetchProductsResponse> {
  let page = 1;
  const pageSize = 50;
  const allItems: FlowAccountProductItem[] = [];

  while (true) {
    const res = await getFlowAccountProducts(page, pageSize);
    if (!res.success) {
      return {
        success: false,
        items: allItems,
        error: res.error
      };
    }

    allItems.push(...res.items);

    if (res.items.length < pageSize || (res.total && allItems.length >= res.total)) {
      break;
    }
    page++;
    if (page > 20) break; // Safeguard
  }

  return {
    success: true,
    total: allItems.length,
    items: allItems
  };
}

