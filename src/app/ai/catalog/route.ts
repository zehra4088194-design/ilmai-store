import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { siteConfig } from '@/config/site';
import { PHYSICAL_GOODS_ENABLED, PHYSICAL_PRODUCT_TYPES } from '@/constants/product';

export const revalidate = 3600;

export async function GET() {
  const db = await createSupabaseServerClient();
  let query = db
    .from('products')
    .select('slug,title,description,product_type,base_price_minor,currency,updated_at')
    .eq('status', 'published')
    .not('slug', 'like', 'notes-%')
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (!PHYSICAL_GOODS_ENABLED) {
    query = query.not('product_type', 'in', '(' + PHYSICAL_PRODUCT_TYPES.join(',') + ')');
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: 'The public store catalog is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  }

  const baseUrl = siteConfig.url.replace(/\/$/, '');
  return NextResponse.json(
    {
      name: 'IlmAI Store public discovery catalog',
      description:
        'Machine-readable index of published IlmAI Store products. Generated one-off printed-note links (notes-*) are intentionally excluded from this catalog.',
      website: baseUrl,
      official_study_platform: siteConfig.ilmaiStudyUrl,
      updated_at: new Date().toISOString(),
      products: (data || []).map((product: any) => ({
        title: product.title,
        description: product.description || null,
        product_type: product.product_type,
        currency: product.currency,
        price_minor: product.base_price_minor,
        url: baseUrl + '/store/' + product.slug,
        updated_at: product.updated_at,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
