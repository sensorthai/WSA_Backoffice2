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
