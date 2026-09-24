import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Product, Category } from '../types';

let cachedClient: SupabaseClient | null = null;
let lastUsedConfig = { url: '', key: '' };

const DEFAULT_SUPABASE_URL = 'https://awzkiktbcfssifdxdvxr.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_yicIcn3U8j5n6eCZEI2RUA_7LF_X-19';

export const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}.supabase.co`;
};

export const getStoredSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem('apni_supabase_url');
    const storedKey = localStorage.getItem('apni_supabase_key');
    return {
      url: normalizeSupabaseUrl(storedUrl || (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL),
      key: storedKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_KEY,
    };
  }
  return {
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL),
    key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY,
  };
};

export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  const config = customUrl && customKey 
    ? { url: normalizeSupabaseUrl(customUrl), key: customKey } 
    : getStoredSupabaseConfig();

  if (!config.url || !config.key) {
    return null;
  }

  if (cachedClient && lastUsedConfig.url === config.url && lastUsedConfig.key === config.key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.key, {
      auth: { persistSession: false },
    });
    lastUsedConfig = config;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

export interface SupabaseHealth {
  configured: boolean;
  connected: boolean;
  url?: string;
  productCount?: number;
  categoryCount?: number;
  inStockCount?: number;
  error?: string;
}

export const checkSupabaseConnection = async (customUrl?: string, customKey?: string): Promise<SupabaseHealth> => {
  const client = getSupabaseClient(customUrl, customKey);
  const config = customUrl && customKey ? { url: customUrl, key: customKey } : getStoredSupabaseConfig();

  if (!client || !config.url) {
    return {
      configured: false,
      connected: false,
      error: 'Supabase URL or Key not set. Enter your Supabase credentials or configure environment variables.',
    };
  }

  try {
    // Check categories table
    const { count: catCount, error: catError } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (catError) {
      return {
        configured: true,
        connected: false,
        url: config.url,
        error: `Supabase Table 'categories' error: ${catError.message}. Make sure you ran the SQL schema in your Supabase SQL Editor.`,
      };
    }

    // Check products table
    const { count: prodCount, error: prodError } = await client
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (prodError) {
      return {
        configured: true,
        connected: false,
        url: config.url,
        error: `Supabase Table 'products' error: ${prodError.message}`,
      };
    }

    // Check in-stock count
    const { count: inStockCount } = await client
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true);

    return {
      configured: true,
      connected: true,
      url: config.url,
      categoryCount: catCount || 0,
      productCount: prodCount || 0,
      inStockCount: inStockCount || 0,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      url: config.url,
      error: err?.message || 'Network error connecting to Supabase instance',
    };
  }
};

// Transform client product to Supabase DB row format
export const mapProductToSupabase = (p: Product) => ({
  id: p.id,
  name: p.name,
  short_description: p.shortDescription || '',
  full_description: p.fullDescription || '',
  category: p.category,
  subcategory: p.subcategory || '',
  price: Math.round(p.price || 0),
  original_price: Math.round(p.originalPrice || 0),
  discount: Math.round(p.discount || 0),
  rating: p.rating || 4.8,
  review_count: p.reviewCount || 0,
  in_stock: p.inStock !== false,
  image: p.image,
  gallery_images: JSON.stringify(p.galleryImages || []),
  platform: p.platform,
  affiliate_url: p.affiliateUrl,
  button_text: p.buttonText || 'Shop Now',
  is_featured: !!p.isFeatured,
  is_trending: !!p.isTrending,
  is_published: p.isPublished !== false,
  tags: JSON.stringify(p.tags || []),
  seo_title: p.seoTitle || p.name,
  seo_description: p.seoDescription || p.shortDescription || '',
  created_at: p.createdAt || new Date().toISOString(),
});

// Transform client category to Supabase DB row format
export const mapCategoryToSupabase = (c: Category) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  headline: c.headline || '',
  description: c.description || '',
  image: c.image,
  item_count: c.itemCount || 0,
});

// Sync full catalog to Supabase
export const syncCatalogToSupabase = async (
  products: Product[],
  categories: Category[],
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) {
    return { success: false, message: 'Supabase client is not configured', error: 'Missing URL/Key' };
  }

  try {
    // 1. Sync Categories
    const categoryRows = categories.map(mapCategoryToSupabase);
    const { error: catErr } = await client.from('categories').upsert(categoryRows, { onConflict: 'id' });
    if (catErr) {
      throw new Error(`Failed to upsert categories: ${catErr.message}`);
    }

    // 2. Sync Products
    const productRows = products.map(mapProductToSupabase);
    const { error: prodErr } = await client.from('products').upsert(productRows, { onConflict: 'id' });
    if (prodErr) {
      throw new Error(`Failed to upsert products: ${prodErr.message}`);
    }

    return {
      success: true,
      message: `Successfully synchronized ${categoryRows.length} categories and ${productRows.length} products to Supabase!`,
    };
  } catch (err: any) {
    console.error('Supabase catalog sync failed:', err);
    return { success: false, message: 'Failed to sync with Supabase', error: err?.message || String(err) };
  }
};
