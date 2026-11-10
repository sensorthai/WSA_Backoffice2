import { NextResponse } from 'next/server';
import { getFlowAccountProducts, getAllFlowAccountProducts, getFlowAccountToken } from '@/lib/flowaccount';

const FLOWACCOUNT_API_URL = process.env.FLOWACCOUNT_API_URL || 'https://openapi.flowaccount.com/v1';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('raw') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // If raw parameter is set, call FlowAccount OpenAPI /product-masters directly and return raw response
    if (raw) {
      const token = await getFlowAccountToken();
      const url = `${FLOWACCOUNT_API_URL}/product-masters?currentPage=${page}&pageSize=${pageSize}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      return NextResponse.json({
        endpoint: url,
        status: res.status,
        data
      }, { status: res.status });
    }

    // Normal parsed response
    const result = searchParams.has('all')
      ? await getAllFlowAccountProducts()
      : await getFlowAccountProducts(page, pageSize);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          hint: result.error?.includes('subscription')
            ? 'แพ็กเกจ FlowAccount OpenAPI ของคุณอาจยังไม่รวมฟีเจอร์ Products/Inventory หรือหมดอายุการใช้งาน'
            : undefined
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      total: result.total,
      count: result.items.length,
      items: result.items
    });
  } catch (err: any) {
    console.error('FlowAccount product-masters route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
