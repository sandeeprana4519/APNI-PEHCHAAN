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
  latencyMs?: number;
  latencyRating?: 'fast' | 'moderate' | 'slow';
  authStatus?: 'authenticated' | 'auth_error' | 'not_configured' | 'network_error';
  authMessage?: string;
  productCount?: number;
  categoryCount?: number;
  inStockCount?: number;
  writeTestPassed?: boolean;
  writeTestLatencyMs?: number;
  error?: string;
}

export interface SupabaseDiagnosticResult {
  configured: boolean;
  connected: boolean;
  url: string;
  latencyMs: number;
  latencyRating: 'fast' | 'moderate' | 'slow';
  authStatus: 'authenticated' | 'auth_error' | 'not_configured' | 'network_error';
  authMessage: string;
  categoryCount: number;
  productCount: number;
  inStockCount: number;
  categoriesTableOk: boolean;
  productsTableOk: boolean;
  writeTestPassed: boolean;
  writeTestLatencyMs: number;
  writeTestMessage: string;
  persistenceVerified: boolean;
  issuesSummary: string[];
  testedAt: string;
  error?: string;
}

const isSupabaseAuthError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = String(err.code || '');
  return (
    code === '401' ||
    code === '403' ||
    code === 'PGRST301' ||
    msg.includes('jwt') ||
    msg.includes('apikey') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid api key') ||
    msg.includes('claim') ||
    msg.includes('permission denied') ||
    msg.includes('row-level security') ||
    msg.includes('rls')
  );
};

export const runSupabaseDiagnostics = async (
  customUrl?: string,
  customKey?: string
): Promise<SupabaseDiagnosticResult> => {
  const config = customUrl && customKey
    ? { url: normalizeSupabaseUrl(customUrl), key: customKey }
    : getStoredSupabaseConfig();
  const client = getSupabaseClient(config.url, config.key);
  const now = new Date().toLocaleTimeString();

  if (!client || !config.url || !config.key) {
    return {
      configured: false,
      connected: false,
      url: config.url || 'Not configured',
      latencyMs: 0,
      latencyRating: 'slow',
      authStatus: 'not_configured',
      authMessage: 'Supabase Project URL or API Key is missing. Please configure credentials in the settings panel.',
      categoryCount: 0,
      productCount: 0,
      inStockCount: 0,
      categoriesTableOk: false,
      productsTableOk: false,
      writeTestPassed: false,
      writeTestLatencyMs: 0,
      writeTestMessage: 'Skipped - credentials not configured',
      persistenceVerified: false,
      issuesSummary: ['Missing Supabase URL or Anon Key in environment / settings'],
      testedAt: now,
      error: 'Supabase URL or Key not set.',
    };
  }

  const issues: string[] = [];
  const startPing = performance.now();

  try {
    // 1. Measure Category read latency & test Auth
    const t0 = performance.now();
    const { count: catCount, error: catError } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true });
    const catLatency = Math.round(performance.now() - t0);

    if (catError && isSupabaseAuthError(catError)) {
      return {
        configured: true,
        connected: false,
        url: config.url,
        latencyMs: catLatency,
        latencyRating: catLatency < 250 ? 'fast' : catLatency < 750 ? 'moderate' : 'slow',
        authStatus: 'auth_error',
        authMessage: `Authentication Failed: ${catError.message} (Verify Supabase anon/publishable key & RLS policies)`,
        categoryCount: 0,
        productCount: 0,
        inStockCount: 0,
        categoriesTableOk: false,
        productsTableOk: false,
        writeTestPassed: false,
        writeTestLatencyMs: 0,
        writeTestMessage: 'Aborted due to authentication error',
        persistenceVerified: false,
        issuesSummary: ['Authentication Error: 401/403 Unauthorized on Supabase categories table'],
        testedAt: now,
        error: catError.message,
      };
    }

    const categoriesTableOk = !catError;
    if (catError) {
      issues.push(`Categories table issue: ${catError.message}`);
    }

    // 2. Measure Products read latency & check schema
    const t1 = performance.now();
    const { count: prodCount, error: prodError } = await client
      .from('products')
      .select('*', { count: 'exact', head: true });
    const prodLatency = Math.round(performance.now() - t1);

    if (prodError && isSupabaseAuthError(prodError)) {
      return {
        configured: true,
        connected: false,
        url: config.url,
        latencyMs: prodLatency,
        latencyRating: prodLatency < 250 ? 'fast' : prodLatency < 750 ? 'moderate' : 'slow',
        authStatus: 'auth_error',
        authMessage: `Authentication Failed on products table: ${prodError.message}`,
        categoryCount: catCount || 0,
        productCount: 0,
        inStockCount: 0,
        categoriesTableOk,
        productsTableOk: false,
        writeTestPassed: false,
        writeTestLatencyMs: 0,
        writeTestMessage: 'Aborted due to authentication error on products table',
        persistenceVerified: false,
        issuesSummary: ['Authentication Error: Unauthorized on Supabase products table'],
        testedAt: now,
        error: prodError.message,
      };
    }

    const productsTableOk = !prodError;
    if (prodError) {
      issues.push(`Products table issue: ${prodError.message}`);
    }

    // 3. In-stock count
    const { count: inStockCount } = await client
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true);

    // 4. Persistence Probe Test (Insert & Delete transient probe)
    let writeTestPassed = false;
    let writeTestLatencyMs = 0;
    let writeTestMessage = 'Write & delete persistence verified';
    const probeId = `probe_diag_${Date.now()}`;

    try {
      const probeT0 = performance.now();
      const { error: insErr } = await client
        .from('categories')
        .insert({
          id: probeId,
          name: 'DIAG_PROBE',
          slug: `diag-probe-${Date.now()}`,
          headline: 'Transient connection probe',
          image: '/images/cat_gujjar_jaat_style_1790229006717.jpg',
          item_count: 0,
        });

      writeTestLatencyMs = Math.round(performance.now() - probeT0);

      if (insErr) {
        if (isSupabaseAuthError(insErr)) {
          writeTestMessage = `Write rejected by Auth / RLS: ${insErr.message}`;
          issues.push('Data Persistence Issue: RLS Policy prevents client writes. Grant INSERT/UPDATE/DELETE permissions to anon role.');
        } else {
          writeTestMessage = `Write test failed: ${insErr.message}`;
          issues.push(`Write probe error: ${insErr.message}`);
        }
      } else {
        writeTestPassed = true;
        // Clean up probe immediately
        await client.from('categories').delete().eq('id', probeId);
      }
    } catch (wErr: any) {
      writeTestMessage = `Write probe exception: ${wErr?.message || String(wErr)}`;
      issues.push(writeTestMessage);
    }

    const totalLatency = Math.round(performance.now() - startPing);
    const latencyRating: 'fast' | 'moderate' | 'slow' =
      totalLatency < 250 ? 'fast' : totalLatency < 800 ? 'moderate' : 'slow';

    if (latencyRating === 'slow') {
      issues.push(`High API Latency (${totalLatency}ms) - Network roundtrips may cause slight UI lag before updates settle.`);
    }

    return {
      configured: true,
      connected: categoriesTableOk && productsTableOk,
      url: config.url,
      latencyMs: totalLatency,
      latencyRating,
      authStatus: 'authenticated',
      authMessage: 'API Key & Token authenticated successfully (Read & Write permissions active)',
      categoryCount: catCount || 0,
      productCount: prodCount || 0,
      inStockCount: inStockCount || 0,
      categoriesTableOk,
      productsTableOk,
      writeTestPassed,
      writeTestLatencyMs,
      writeTestMessage,
      persistenceVerified: categoriesTableOk && productsTableOk && writeTestPassed,
      issuesSummary: issues,
      testedAt: now,
      error: issues.length > 0 ? issues.join(' · ') : undefined,
    };
  } catch (err: any) {
    const totalLatency = Math.round(performance.now() - startPing);
    const isNetwork = err?.message?.includes('fetch') || err?.message?.includes('Network');
    return {
      configured: true,
      connected: false,
      url: config.url,
      latencyMs: totalLatency,
      latencyRating: 'slow',
      authStatus: isNetwork ? 'network_error' : 'auth_error',
      authMessage: `Connection failed: ${err?.message || 'Network unreachable'}`,
      categoryCount: 0,
      productCount: 0,
      inStockCount: 0,
      categoriesTableOk: false,
      productsTableOk: false,
      writeTestPassed: false,
      writeTestLatencyMs: 0,
      writeTestMessage: 'Aborted due to connection error',
      persistenceVerified: false,
      issuesSummary: [err?.message || 'Network latency or connection dropped'],
      testedAt: now,
      error: err?.message,
    };
  }
};

export const checkSupabaseConnection = async (customUrl?: string, customKey?: string): Promise<SupabaseHealth> => {
  const diag = await runSupabaseDiagnostics(customUrl, customKey);
  return {
    configured: diag.configured,
    connected: diag.connected,
    url: diag.url,
    latencyMs: diag.latencyMs,
    latencyRating: diag.latencyRating,
    authStatus: diag.authStatus,
    authMessage: diag.authMessage,
    categoryCount: diag.categoryCount,
    productCount: diag.productCount,
    inStockCount: diag.inStockCount,
    writeTestPassed: diag.writeTestPassed,
    writeTestLatencyMs: diag.writeTestLatencyMs,
    error: diag.error,
  };
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

// Map Supabase product row back to application Product type
export const mapProductFromSupabase = (r: any): Product => {
  let gallery: string[] = [];
  try {
    gallery = typeof r.gallery_images === 'string' ? JSON.parse(r.gallery_images) : (r.gallery_images || []);
  } catch {
    gallery = [];
  }
  let tags: string[] = [];
  try {
    tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []);
  } catch {
    tags = [];
  }

  return {
    id: String(r.id),
    name: r.name || 'Untitled Product',
    shortDescription: r.short_description || '',
    fullDescription: r.full_description || '',
    category: r.category as any,
    subcategory: r.subcategory || '',
    price: Number(r.price) || 0,
    originalPrice: Number(r.original_price) || 0,
    discount: Number(r.discount) || 0,
    rating: Number(r.rating) || 4.8,
    reviewCount: Number(r.review_count) || 0,
    inStock: r.in_stock !== false,
    image: r.image || '/apni-pehchaan-logo.jpg',
    galleryImages: gallery,
    platform: r.platform || 'Amazon',
    affiliateUrl: r.affiliate_url || '#',
    buttonText: r.button_text || 'Shop Now',
    isFeatured: !!r.is_featured,
    isTrending: !!r.is_trending,
    isPublished: r.is_published !== false,
    tags: tags,
    seoTitle: r.seo_title || r.name,
    seoDescription: r.seo_description || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
};

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

// Map Supabase category row back to application Category type
export const mapCategoryFromSupabase = (r: any): Category => ({
  id: String(r.id),
  name: r.name,
  slug: r.slug,
  headline: r.headline || `${r.name} Heritage & Cultural Essentials`,
  description: r.description || `Explore curated ${r.name} community products on APNI PEHCHAAN.`,
  image: r.image || '/images/cat_gujjar_jaat_style_1790229006717.jpg',
  itemCount: Number(r.item_count) || 0,
});

// Fetch all categories from Supabase
export const fetchCategoriesFromSupabase = async (customUrl?: string, customKey?: string): Promise<Category[] | null> => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.warn('Failed to fetch categories from Supabase:', error.message);
      return null;
    }
    if (!data) return null;
    return data.map(mapCategoryFromSupabase);
  } catch (err) {
    console.error('Error in fetchCategoriesFromSupabase:', err);
    return null;
  }
};

// Fetch all products from Supabase
export const fetchProductsFromSupabase = async (customUrl?: string, customKey?: string): Promise<Product[] | null> => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Failed to fetch products from Supabase:', error.message);
      return null;
    }
    if (!data) return null;
    return data.map(mapProductFromSupabase);
  } catch (err) {
    console.error('Error in fetchProductsFromSupabase:', err);
    return null;
  }
};

// Direct delete category from Supabase
export const deleteCategoryFromSupabase = async (id: string, customUrl?: string, customKey?: string) => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) return { success: false, error: 'No client' };
  try {
    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

// Direct delete product from Supabase
export const deleteProductFromSupabase = async (id: string, customUrl?: string, customKey?: string) => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) return { success: false, error: 'No client' };
  try {
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

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
