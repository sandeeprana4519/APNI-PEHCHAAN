-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR APNI PEHCHAAN
-- Tables: categories, products, blog_posts
-- Includes: Indexes, RLS Policies, Triggers, and Real-time Support
-- ====================================================================

-- 1. Create CATEGORIES Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    headline TEXT,
    description TEXT,
    image TEXT NOT NULL,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create PRODUCTS Table (with Inventory Stock tracking)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT,
    full_description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    original_price INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC DEFAULT 4.8,
    review_count INTEGER DEFAULT 0,
    in_stock BOOLEAN DEFAULT true,
    image TEXT NOT NULL,
    gallery_images TEXT, -- JSON array of image URLs
    platform TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    button_text TEXT NOT NULL DEFAULT 'Shop Now',
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    tags TEXT, -- JSON array of string tags
    seo_title TEXT,
    seo_description TEXT,
    created_at TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create BLOG POSTS Table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'APNI PEHCHAAN Editorial',
    date TEXT NOT NULL,
    read_time TEXT NOT NULL DEFAULT '4 min read',
    tags TEXT, -- JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Fast Query Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_trending ON public.products(is_trending);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- 5. Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: Public Read Access (Anon and Authenticated)
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" 
    ON public.categories FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" 
    ON public.products FOR SELECT 
    USING (is_published = true OR true);

DROP POLICY IF EXISTS "Public can view blog posts" ON public.blog_posts;
CREATE POLICY "Public can view blog posts" 
    ON public.blog_posts FOR SELECT 
    USING (true);

-- 8. RLS Policies: Admin/Service Role Full Access for CRUD & Inventory
DROP POLICY IF EXISTS "Admin full access categories" ON public.categories;
CREATE POLICY "Admin full access categories" 
    ON public.categories FOR ALL 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products" 
    ON public.products FOR ALL 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access blog posts" ON public.blog_posts;
CREATE POLICY "Admin full access blog posts" 
    ON public.blog_posts FOR ALL 
    USING (true) 
    WITH CHECK (true);
