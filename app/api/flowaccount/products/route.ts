import { NextResponse } from 'next/server';
import { getFlowAccountProducts, getAllFlowAccountProducts } from '@/lib/flowaccount';
import { createClient } from '@supabase/supabase-js';

// Supabase client with Service Role Key for server-side updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1/', '') || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'preview'; // 'preview' | 'sync'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // 1. Fetch products from FlowAccount
    const result = searchParams.has('all')
      ? await getAllFlowAccountProducts()
      : await getFlowAccountProducts(page, pageSize);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to fetch products from FlowAccount',
          hint: result.error?.includes('subscription')
            ? 'แพ็กเกจ FlowAccount OpenAPI ของคุณอาจยังไม่รวมฟีเจอร์ Products/Inventory หรือหมดอายุการใช้งาน โปรดตรวจสอบกับทีมสนับสนุน FlowAccount'
            : undefined
        },
        { status: 400 }
      );
    }

    // 2. If mode is preview, just return items
    if (mode === 'preview') {
      return NextResponse.json({
        total: result.total,
        count: result.items.length,
        items: result.items
      });
    }

    // 3. If mode is sync, match with product_catalog in Supabase
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing product catalog
    const { data: catalog, error: catError } = await supabase
      .from('product_catalog')
      .select('id, sku, name');

    if (catError) {
      return NextResponse.json({ error: `Supabase error: ${catError.message}` }, { status: 500 });
    }

    const matched: any[] = [];
    const unmatched: any[] = [];

    const catalogMap = new Map((catalog || []).map(p => [p.sku.toUpperCase(), p]));

    for (const faItem of result.items) {
      const skuUpper = (faItem.code || '').trim().toUpperCase();
      const existing = catalogMap.get(skuUpper);

      if (existing) {
        matched.push({
          productId: existing.id,
          sku: existing.sku,
          name: existing.name,
          flowAccountCode: faItem.code,
          flowAccountQty: faItem.inventoryTotalQty,
          flowAccountPrice: faItem.sellPrice
        });
      } else {
        unmatched.push({
          flowAccountCode: faItem.code,
          name: faItem.name,
          flowAccountQty: faItem.inventoryTotalQty
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'sync',
      totalFromFlowAccount: result.items.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      matched,
      unmatched
    });
  } catch (err: any) {
    console.error('FlowAccount Products API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
