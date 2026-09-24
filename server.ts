import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserByUid } from './src/db/users.ts';
import {
  getAllProducts,
  upsertProduct,
  deleteProductById,
  updateProductStock,
  getAllCategories,
  upsertCategory,
  deleteCategoryById,
  getAllBlogPosts,
  upsertBlogPost,
  deleteBlogPostById,
  getUserWishlist,
  toggleUserWishlistItem,
  recordAffiliateClick,
} from './src/db/queries.ts';
import { initialProducts, initialCategories, initialBlogPosts } from './src/data/initialData.ts';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction =
  process.env.NODE_ENV === 'production' ||
  fs.existsSync(path.join(__dirname, 'dist', 'index.html'));
const PORT = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint for hostinger & cloud run
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: 'cloudsql-postgresql',
      auth: 'firebase-auth',
      timestamp: new Date().toISOString(),
    });
  });

  // User Profile Endpoints
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const user = await getOrCreateUser({
        uid: req.user.uid,
        email: req.user.email || '',
        displayName: req.user.name || null,
        photoUrl: req.user.picture || null,
      });
      res.json(user);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const { displayName, photoUrl } = req.body;
      const user = await getOrCreateUser({
        uid: req.user.uid,
        email: req.user.email || '',
        displayName: displayName || req.user.name || null,
        photoUrl: photoUrl || req.user.picture || null,
      });
      res.json(user);
    } catch (error: any) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Failed to sync user' });
    }
  });

  const normalizeUrl = (u: string) => {
    if (!u) return '';
    const trimmed = u.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}.supabase.co`;
  };

  const DEFAULT_SB_URL = 'https://awzkiktbcfssifdxdvxr.supabase.co';
  const DEFAULT_SB_KEY = 'sb_publishable_yicIcn3U8j5n6eCZEI2RUA_7LF_X-19';

  const getSb = () => {
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;
    if (!rawUrl || !key) return null;
    try {
      return createClient(normalizeUrl(rawUrl), key, { auth: { persistSession: false } });
    } catch {
      return null;
    }
  };

  const mapSupabaseProd = (r: any) => {
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
      category: r.category,
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

  const mapSupabaseCat = (r: any) => ({
    id: String(r.id),
    name: r.name,
    slug: r.slug,
    headline: r.headline || `${r.name} Heritage & Cultural Essentials`,
    description: r.description || `Explore curated ${r.name} community products on APNI PEHCHAAN.`,
    image: r.image || '/images/cat_gujjar_jaat_style_1790229006717.jpg',
    itemCount: Number(r.item_count) || 0,
  });

  // Products API (Supabase Persistent Cloud Database + PostgreSQL)
  app.get('/api/products', async (req, res) => {
    try {
      // 1. Primary: Load from Supabase
      const sb = getSb();
      if (sb) {
        const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return res.json(data.map(mapSupabaseProd));
        }
      }

      // 2. Secondary: Load from Cloud SQL PostgreSQL
      try {
        let prods = await getAllProducts();
        if (prods.length > 0) return res.json(prods);
      } catch (sqlErr) {
        // PostgreSQL unavailable
      }

      // 3. Fallback
      res.json(initialProducts);
    } catch (error: any) {
      console.error('Failed to get products:', error);
      res.json(initialProducts);
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const productData = req.body;
      if (!productData || !productData.id || !productData.name) {
        return res.status(400).json({ error: 'Invalid product payload' });
      }

      // 1. Primary: Persist to Supabase
      const sb = getSb();
      if (sb) {
        const sbRow = {
          id: productData.id,
          name: productData.name,
          short_description: productData.shortDescription || '',
          full_description: productData.fullDescription || '',
          category: productData.category,
          subcategory: productData.subcategory || '',
          price: Math.round(productData.price || 0),
          original_price: Math.round(productData.originalPrice || 0),
          discount: Math.round(productData.discount || 0),
          rating: productData.rating || 4.8,
          review_count: productData.reviewCount || 0,
          in_stock: productData.inStock !== false,
          image: productData.image,
          gallery_images: JSON.stringify(productData.galleryImages || []),
          platform: productData.platform,
          affiliate_url: productData.affiliateUrl,
          button_text: productData.buttonText || 'Shop Now',
          is_featured: !!productData.isFeatured,
          is_trending: !!productData.isTrending,
          is_published: productData.isPublished !== false,
          tags: JSON.stringify(productData.tags || []),
          seo_title: productData.seoTitle || productData.name,
          seo_description: productData.seoDescription || productData.shortDescription || '',
          created_at: productData.createdAt || new Date().toISOString(),
        };
        const { error: sbErr } = await sb.from('products').upsert(sbRow, { onConflict: 'id' });
        if (sbErr) console.warn('Supabase product upsert warning:', sbErr.message);
      }

      // 2. Also try PostgreSQL if available
      try {
        await upsertProduct(productData);
      } catch (sqlErr) {
        // Ignored if Cloud SQL is not configured on this host
      }

      res.json({ success: true, product: productData });
    } catch (error: any) {
      console.error('Failed to save product:', error);
      res.status(500).json({ error: error.message || 'Failed to save product' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const sb = getSb();
      if (sb) {
        await sb.from('products').delete().eq('id', id);
      }
      try {
        await deleteProductById(id);
      } catch {}
      res.json({ success: true, message: `Product ${id} deleted` });
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.patch('/api/products/:id/stock', async (req, res) => {
    try {
      const { id } = req.params;
      const { inStock } = req.body;
      if (typeof inStock !== 'boolean') {
        return res.status(400).json({ error: 'inStock boolean required' });
      }

      const sb = getSb();
      if (sb) {
        await sb.from('products').update({ in_stock: inStock }).eq('id', id);
      }
      try {
        await updateProductStock(id, inStock);
      } catch {}

      res.json({ success: true, inStock });
    } catch (error: any) {
      console.error('Failed to update product stock:', error);
      res.status(500).json({ error: 'Failed to update product stock' });
    }
  });

  // Categories API (Supabase Persistent Cloud Database + PostgreSQL)
  app.get('/api/categories', async (req, res) => {
    try {
      // 1. Primary: Load from Supabase
      const sb = getSb();
      if (sb) {
        const { data, error } = await sb.from('categories').select('*').order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          return res.json(data.map(mapSupabaseCat));
        }
      }

      // 2. Secondary: Load from PostgreSQL
      try {
        let cats = await getAllCategories();
        if (cats.length > 0) return res.json(cats);
      } catch (sqlErr) {}

      res.json(initialCategories);
    } catch (error: any) {
      console.error('Failed to get categories:', error);
      res.json(initialCategories);
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const catData = req.body;
      if (!catData || !catData.id || !catData.name || !catData.slug) {
        return res.status(400).json({ error: 'Invalid category payload' });
      }

      // 1. Primary: Persist to Supabase
      const sb = getSb();
      if (sb) {
        const sbRow = {
          id: catData.id,
          name: catData.name,
          slug: catData.slug,
          headline: catData.headline || '',
          description: catData.description || '',
          image: catData.image,
          item_count: catData.itemCount || 0,
        };
        const { error: sbErr } = await sb.from('categories').upsert(sbRow, { onConflict: 'id' });
        if (sbErr) console.warn('Supabase category upsert warning:', sbErr.message);
      }

      // 2. Also try PostgreSQL if available
      try {
        await upsertCategory(catData);
      } catch (sqlErr) {}

      res.json({ success: true, category: catData });
    } catch (error: any) {
      console.error('Failed to save category:', error);
      res.status(500).json({ error: error.message || 'Failed to save category' });
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const sb = getSb();
      if (sb) {
        await sb.from('categories').delete().eq('id', id);
      }
      try {
        await deleteCategoryById(id);
      } catch {}
      res.json({ success: true, message: `Category ${id} deleted` });
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // Blogs API
  app.get('/api/blogs', async (req, res) => {
    try {
      let blogs = await getAllBlogPosts();
      if (blogs.length === 0) {
        try {
          for (const b of initialBlogPosts) {
            await upsertBlogPost(b);
          }
          blogs = await getAllBlogPosts();
        } catch (seedErr) {
          console.warn('Auto-seed blogs warning:', seedErr);
          return res.json(initialBlogPosts);
        }
      }
      res.json(blogs);
    } catch (error: any) {
      console.error('Failed to get blogs:', error);
      res.json(initialBlogPosts);
    }
  });

  app.post('/api/blogs', async (req, res) => {
    try {
      const blogData = req.body;
      if (!blogData || !blogData.id || !blogData.title) {
        return res.status(400).json({ error: 'Invalid blog payload' });
      }
      const saved = await upsertBlogPost(blogData);
      res.json({ success: true, blog: saved });
    } catch (error: any) {
      console.error('Failed to save blog:', error);
      res.status(500).json({ error: error.message || 'Failed to save blog' });
    }
  });

  app.delete('/api/blogs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteBlogPostById(id);
      res.json({ success: true, message: `Blog post ${id} deleted` });
    } catch (error: any) {
      console.error('Failed to delete blog:', error);
      res.status(500).json({ error: 'Failed to delete blog' });
    }
  });

  // Wishlist API
  app.get('/api/wishlist', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const list = await getUserWishlist(req.user.uid);
      res.json(list);
    } catch (error: any) {
      console.error('Failed to fetch wishlist:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
  });

  app.post('/api/wishlist/toggle', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ error: 'Missing productId' });
      }
      const added = await toggleUserWishlistItem(req.user.uid, productId);
      res.json({ success: true, added, productId });
    } catch (error: any) {
      console.error('Failed to toggle wishlist item:', error);
      res.status(500).json({ error: 'Failed to toggle wishlist' });
    }
  });

  // Affiliate Click Tracking API
  app.post('/api/track-click', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { productId, platform } = req.body;
      if (productId && platform) {
        await recordAffiliateClick(productId, platform, req.user?.uid);
      }
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // Supabase Management APIs
  app.get('/api/supabase/status', async (req, res) => {
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
    const supabaseUrl = normalizeUrl(rawUrl);
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.json({
        configured: false,
        connected: false,
        message: 'Supabase credentials not configured in environment',
      });
    }

    try {
      const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { count: catCount, error: catErr } = await client.from('categories').select('*', { count: 'exact', head: true });
      const { count: prodCount, error: prodErr } = await client.from('products').select('*', { count: 'exact', head: true });

      if (catErr || prodErr) {
        return res.json({
          configured: true,
          connected: false,
          error: catErr?.message || prodErr?.message,
          message: 'Connected to Supabase project, but tables need to be created using supabase_schema.sql',
        });
      }

      res.json({
        configured: true,
        connected: true,
        url: supabaseUrl,
        categoriesCount: catCount || 0,
        productsCount: prodCount || 0,
      });
    } catch (err: any) {
      res.status(500).json({ configured: true, connected: false, error: err?.message || 'Error checking Supabase' });
    }
  });

  app.post('/api/supabase/sync', async (req, res) => {
    try {
      const rawUrl = req.body?.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
      const url = normalizeUrl(rawUrl);
      const key = req.body?.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;

      if (!url || !key) {
        return res.status(400).json({ error: 'Supabase URL and Key are required for synchronization.' });
      }

      const client = createClient(url, key, { auth: { persistSession: false } });
      const allProds = await getAllProducts();
      const allCats = await getAllCategories();

      // Upsert categories
      const catRows = allCats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        headline: c.headline || '',
        description: c.description || '',
        image: c.image,
        item_count: c.itemCount || 0,
      }));

      const { error: catErr } = await client.from('categories').upsert(catRows, { onConflict: 'id' });
      if (catErr) {
        return res.status(500).json({ error: `Categories table error: ${catErr.message}. Ensure supabase_schema.sql was executed in Supabase.` });
      }

      // Upsert products
      const prodRows = allProds.map((p) => ({
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
      }));

      const { error: prodErr } = await client.from('products').upsert(prodRows, { onConflict: 'id' });
      if (prodErr) {
        return res.status(500).json({ error: `Products table error: ${prodErr.message}` });
      }

      res.json({
        success: true,
        message: `Successfully synchronized ${catRows.length} categories and ${prodRows.length} products to Supabase!`,
        syncedCategories: catRows.length,
        syncedProducts: prodRows.length,
      });
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      res.status(500).json({ error: err?.message || 'Failed to sync to Supabase' });
    }
  });

  // Frontend routing & static assets
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head><title>APNI PEHCHAAN</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2>APNI PEHCHAAN Server is Running!</h2>
              <p>Please run <code>npm run build</code> to generate the client assets.</p>
            </body>
          </html>
        `);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APNI PEHCHAAN full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
