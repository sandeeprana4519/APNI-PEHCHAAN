import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, BlogPost, Category, CategorySlug, AffiliatePlatform, ButtonActionText, MediaItem } from '../types';
import { WPLogin } from '../components/WPLogin';
import { MediaImagePicker } from '../components/MediaImagePicker';
import { MultiImageGalleryPicker } from '../components/MultiImageGalleryPicker';
import { MediaLibraryModal } from '../components/MediaLibraryModal';
import { processAndCompressImage } from '../utils/imageCompressor';
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  Flame,
  ExternalLink,
  Search,
  Check,
  X,
  FileText,
  Package,
  Layers,
  Save,
  RotateCcw,
  ArrowUpRight,
  Sliders,
  Eye,
  LogOut,
  KeyRound,
  ShieldCheck,
  Lock,
  User,
  CheckCircle,
  Tag,
  FolderPlus,
  Globe,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  FolderOpen,
  Upload,
  Copy,
  Download,
  Database,
  Server,
  RefreshCw,
  Code,
  Terminal,
} from 'lucide-react';
import {
  checkSupabaseConnection,
  syncCatalogToSupabase,
  getStoredSupabaseConfig,
  normalizeSupabaseUrl,
  type SupabaseHealth,
} from '../services/supabaseService.ts';

const PRESET_CATEGORY_IMAGES = [
  { label: 'Kada & Accessories', url: '/images/cat_gujjar_jaat_style_1790229006717.jpg' },
  { label: 'Rajputana Heritage', url: '/images/cat_rajput_heritage_1790229019313.jpg' },
  { label: 'Ethnic Kurta & Silk', url: '/images/cat_yadav_brahmin_1790229031674.jpg' },
  { label: 'Turban & Safa Pride', url: '/images/blog_turban_guide_1790229043202.jpg' },
  { label: 'Brand Identity Crest', url: '/images/hero_apni_pehchaan_1790228991906.jpg' },
];

export const AdminDashboard: React.FC = () => {
  const {
    products,
    categories,
    blogPosts,
    mediaLibrary,
    addMediaItem,
    deleteMediaItem,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleFeatured,
    toggleTrending,
    toggleProductStock,
    addBlogPost,
    updateBlogPost,
    deleteBlogPost,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefault,
    navigate,
    showToast,
    isAdminLoggedIn,
    adminCredentials,
    logoutAdmin,
    updateAdminCredentials,
    resetAdminCredentials,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'media' | 'blogs' | 'data'>('products');
  const [adminSearch, setAdminSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'inStock' | 'outOfStock'>('All');

  // Media library tab state
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState('All');
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const mediaTabFileInputRef = useRef<HTMLInputElement>(null);

  // In-app Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'product' | 'category' | 'blog' | 'reset';
    id?: string;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleMediaTabUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsMediaUploading(true);
    try {
      let count = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const result = await processAndCompressImage(file, 1200, 1200, 0.85);
        addMediaItem({
          url: result.dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          sizeKb: result.sizeKb,
          category: mediaCategoryFilter !== 'All' ? mediaCategoryFilter : 'Gallery Uploads',
        });
        count++;
      }
      showToast(`${count} image(s) uploaded directly from gallery to Media Library!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload from gallery.');
    } finally {
      setIsMediaUploading(false);
      if (mediaTabFileInputRef.current) {
        mediaTabFileInputRef.current.value = '';
      }
    }
  };

  // Supabase Integration state
  const initialSupabaseConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabaseConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(initialSupabaseConfig.key);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealth | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [isOpeningCategoryFromProduct, setIsOpeningCategoryFromProduct] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    headline: '',
    description: '',
    image: '/images/cat_gujjar_jaat_style_1790229006717.jpg',
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Credentials change state
  const [newUsername, setNewUsername] = useState(adminCredentials.username);
  const [newEmail, setNewEmail] = useState(adminCredentials.email);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);

  // Edit / Add Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, 'id' | 'createdAt'>>({
    name: '',
    image: '',
    galleryImages: [],
    shortDescription: '',
    fullDescription: '',
    category: 'gujjar',
    subcategory: '',
    price: 999,
    originalPrice: 1999,
    discount: 50,
    platform: 'Amazon',
    affiliateUrl: '',
    buttonText: 'Shop Now',
    isFeatured: true,
    isTrending: true,
    tags: [],
    seoTitle: '',
    seoDescription: '',
    rating: 4.8,
    reviewCount: 50,
    inStock: true,
    isPublished: true,
  });
  const [tagsInput, setTagsInput] = useState('');

  // Blog Modal State
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState<Omit<BlogPost, 'id'>>({
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    coverImage: '',
    category: 'Style Guides',
    author: 'Editorial Team',
    date: 'March 2026',
    readTime: '4 min read',
    tags: [],
    relatedCategorySlug: 'gujjar',
  });
  const [blogTagsInput, setBlogTagsInput] = useState('');

  // Open Add Product
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      image: '',
      galleryImages: [],
      shortDescription: '',
      fullDescription: '',
      category: 'gujjar',
      subcategory: 'Traditional Wristwear',
      price: 1299,
      originalPrice: 2499,
      discount: 48,
      platform: 'Amazon',
      affiliateUrl: 'https://www.amazon.in/dp/sample-deal?tag=apnipehchaan-21',
      buttonText: 'Shop Now',
      isFeatured: true,
      isTrending: true,
      tags: ['Traditional', 'Authentic'],
      seoTitle: '',
      seoDescription: '',
      rating: 4.8,
      reviewCount: 30,
      inStock: true,
      isPublished: true,
    });
    setTagsInput('Traditional, Authentic');
    setIsProductModalOpen(true);
  };

  // Open Edit Product
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name,
      image: prod.image,
      galleryImages: prod.galleryImages,
      shortDescription: prod.shortDescription,
      fullDescription: prod.fullDescription,
      category: prod.category,
      subcategory: prod.subcategory,
      price: prod.price,
      originalPrice: prod.originalPrice,
      discount: prod.discount,
      platform: prod.platform,
      affiliateUrl: prod.affiliateUrl,
      buttonText: prod.buttonText,
      isFeatured: prod.isFeatured,
      isTrending: prod.isTrending,
      tags: prod.tags,
      seoTitle: prod.seoTitle,
      seoDescription: prod.seoDescription,
      rating: prod.rating,
      reviewCount: prod.reviewCount,
      inStock: prod.inStock,
      isPublished: prod.isPublished,
    });
    setTagsInput(prod.tags.join(', '));
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const calculatedDiscount =
      productForm.originalPrice > 0
        ? Math.round(
            ((productForm.originalPrice - productForm.price) /
              productForm.originalPrice) *
              100
          )
        : 0;

    const dataToSave = {
      ...productForm,
      tags: parsedTags,
      discount: Math.max(0, calculatedDiscount),
      seoTitle: productForm.seoTitle || productForm.name,
      seoDescription: productForm.seoDescription || productForm.shortDescription,
    };

    if (editingProductId) {
      updateProduct(editingProductId, dataToSave);
    } else {
      addProduct(dataToSave);
    }
    setIsProductModalOpen(false);
  };

  // Blog handling
  const handleOpenAddBlog = () => {
    setEditingBlogId(null);
    setBlogForm({
      slug: `guide-${Date.now()}`,
      title: '',
      excerpt: '',
      content: '',
      coverImage: 'https://placehold.co/800x500/1e293b/amber?text=Blog+Cover',
      category: 'Style Guides',
      author: 'Editorial Team',
      date: 'March 2026',
      readTime: '5 min read',
      tags: ['Guide', 'Heritage'],
      relatedCategorySlug: 'gujjar',
    });
    setBlogTagsInput('Guide, Heritage');
    setIsBlogModalOpen(true);
  };

  const handleOpenEditBlog = (post: BlogPost) => {
    setEditingBlogId(post.id);
    setBlogForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage,
      category: post.category,
      author: post.author,
      date: post.date,
      readTime: post.readTime,
      tags: post.tags,
      relatedCategorySlug: post.relatedCategorySlug,
    });
    setBlogTagsInput(post.tags.join(', '));
    setIsBlogModalOpen(true);
  };

  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTags = blogTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const dataToSave = {
      ...blogForm,
      tags: parsedTags,
      slug: blogForm.slug || blogForm.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    };

    if (editingBlogId) {
      updateBlogPost(editingBlogId, dataToSave);
    } else {
      addBlogPost(dataToSave);
    }
    setIsBlogModalOpen(false);
  };

  // Category Actions
  const handleOpenAddCategory = (fromProduct = false) => {
    setIsOpeningCategoryFromProduct(fromProduct);
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      slug: '',
      headline: '',
      description: '',
      image: PRESET_CATEGORY_IMAGES[0].url,
    });
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setIsOpeningCategoryFromProduct(false);
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      headline: cat.headline,
      description: cat.description,
      image: cat.image,
    });
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleCategoryNameInput = (nameVal: string) => {
    const autoSlug = nameVal
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setCategoryForm((prev) => ({
      ...prev,
      name: nameVal,
      slug: editingCategoryId ? prev.slug : autoSlug,
      headline: prev.headline || (nameVal ? `${nameVal} Heritage & Cultural Essentials` : ''),
      description:
        prev.description ||
        (nameVal
          ? `Discover authentic ${nameVal} traditional wear, royal accessories, jewelry, and lifestyle products.`
          : ''),
    }));
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);

    const name = categoryForm.name.trim();
    if (!name) {
      setCategoryError('Category Name is required.');
      return;
    }

    const rawSlug = categoryForm.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = rawSlug.toLowerCase();

    if (editingCategoryId) {
      const res = updateCategory(editingCategoryId, {
        name,
        slug,
        headline: categoryForm.headline.trim() || `${name} Collection`,
        description: categoryForm.description.trim(),
        image: categoryForm.image.trim() || PRESET_CATEGORY_IMAGES[0].url,
      });
      if (!res.success) {
        setCategoryError(res.error || 'Failed to update category.');
        return;
      }
    } else {
      const res = addCategory({
        name,
        slug,
        headline: categoryForm.headline.trim() || `${name} Heritage & Cultural Essentials`,
        description:
          categoryForm.description.trim() ||
          `Explore curated ${name} community products, traditional wear, jewelry and accessories on APNI PEHCHAAN.`,
        image: categoryForm.image.trim() || PRESET_CATEGORY_IMAGES[0].url,
      });
      if (!res.success) {
        setCategoryError(res.error || 'Failed to add category.');
        return;
      }
      if (isOpeningCategoryFromProduct && res.category) {
        setProductForm((prev) => ({ ...prev, category: res.category!.slug }));
      }
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (cat: Category) => {
    if (categories.length <= 1) {
      showToast('Cannot delete the only remaining category in the catalog.');
      return;
    }
    const productCount = products.filter((p) => p.category === cat.slug).length;
    const confirmMessage =
      productCount > 0
        ? `Category "${cat.name}" has ${productCount} item(s) assigned. Deleting this category will reassign those items to another category and permanently delete "${cat.name}" from PostgreSQL.`
        : `Are you sure you want to permanently delete category "${cat.name}" from PostgreSQL?`;

    setDeleteConfirmation({
      type: 'category',
      id: cat.id,
      title: `Delete Category: ${cat.name}`,
      message: confirmMessage,
      onConfirm: () => {
        const res = deleteCategory(cat.id);
        if (!res.success) {
          showToast(res.error || 'Failed to delete category.');
        }
        setDeleteConfirmation(null);
      },
    });
  };

  const displayedCategories = categories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.headline.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  // Filter products for table
  const displayedProducts = products.filter((p) => {
    if (filterCategory !== 'All' && p.category !== filterCategory) return false;
    if (stockFilter === 'inStock' && p.inStock === false) return false;
    if (stockFilter === 'outOfStock' && p.inStock !== false) return false;
    if (adminSearch.trim()) {
      const q = adminSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.affiliateUrl.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalCatalogCount = products.length;
  const inStockItemsCount = products.filter((p) => p.inStock !== false).length;
  const outOfStockItemsCount = products.filter((p) => p.inStock === false).length;
  const inStockPercentage =
    totalCatalogCount > 0 ? Math.round((inStockItemsCount / totalCatalogCount) * 100) : 0;

  // Handle Admin Credentials Update
  const handleUpdateCreds = (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setCredError('New password and confirm password do not match.');
      return;
    }

    const passwordToUse = newPassword.trim() ? newPassword.trim() : adminCredentials.password;
    const res = updateAdminCredentials(newUsername, newEmail, passwordToUse);

    if (!res.success) {
      setCredError(res.error || 'Failed to update credentials.');
    } else {
      setCredSuccess('WordPress Admin Login ID & Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setCredSuccess(null), 4000);
    }
  };

  // Handle Supabase Save Credentials & Test Connection
  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedUrl = normalizeSupabaseUrl(supabaseUrl.trim());
    setSupabaseUrl(formattedUrl);
    localStorage.setItem('apni_supabase_url', formattedUrl);
    localStorage.setItem('apni_supabase_key', supabaseKey.trim());
    setIsCheckingSupabase(true);
    try {
      const res = await checkSupabaseConnection(formattedUrl, supabaseKey.trim());
      setSupabaseHealth(res);
      if (res.connected) {
        showToast('Supabase connection verified successfully!');
      } else {
        showToast(res.error || 'Connected to project, please verify table schemas.');
      }
    } catch (err: any) {
      setSupabaseHealth({
        configured: true,
        connected: false,
        error: err?.message || 'Failed to connect to Supabase',
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleTestSupabase = async () => {
    const formattedUrl = normalizeSupabaseUrl(supabaseUrl.trim());
    setSupabaseUrl(formattedUrl);
    setIsCheckingSupabase(true);
    try {
      const res = await checkSupabaseConnection(formattedUrl, supabaseKey.trim());
      setSupabaseHealth(res);
      if (res.connected) {
        showToast(`Connected! Products: ${res.productCount}, Categories: ${res.categoryCount}`);
      } else {
        showToast(res.error || 'Connection failed.');
      }
    } catch (err: any) {
      setSupabaseHealth({
        configured: true,
        connected: false,
        error: err?.message || 'Failed to connect to Supabase',
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  // Check initial Supabase health once on mount
  React.useEffect(() => {
    checkSupabaseConnection().then((res) => {
      setSupabaseHealth(res);
    });
  }, []);

  const handleSyncToSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      showToast('Please provide your Supabase URL and API Key first.');
      return;
    }
    setIsSyncingSupabase(true);
    try {
      const res = await syncCatalogToSupabase(products, categories, supabaseUrl.trim(), supabaseKey.trim());
      if (res.success) {
        showToast(res.message);
        handleTestSupabase();
      } else {
        showToast(res.error || res.message);
      }
    } catch (err: any) {
      showToast(err?.message || 'Sync failed.');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const SUPABASE_SCHEMA_SQL = `-- Supabase Table Schema for APNI PEHCHAAN
-- Run this in your Supabase SQL Editor:

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
    gallery_images TEXT,
    platform TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    button_text TEXT NOT NULL DEFAULT 'Shop Now',
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    tags TEXT,
    seo_title TEXT,
    seo_description TEXT,
    created_at TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin full access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access products" ON public.products FOR ALL USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    showToast('Supabase SQL schema copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // If not logged in, render authentic WordPress Login screen
  if (!isAdminLoggedIn) {
    return <WPLogin />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* WordPress-inspired Top Admin Bar */}
      <header className="bg-slate-900 text-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-amber-400/50 shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src="/apni-pehchaan-logo.jpg"
              alt="APNI PEHCHAAN Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="font-semibold text-xs tracking-wider uppercase text-white">
              APNI PEHCHAAN
            </span>
            <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
              WordPress Affiliate Administration
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('home')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition"
          >
            <span>Visit Storefront</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>

          {/* WordPress User Profile & Logout */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">Howdy,</span>
            <span className="text-xs font-bold text-amber-400">{adminCredentials.username}</span>
            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[11px] uppercase shadow-xs">
              {adminCredentials.username.charAt(0)}
            </div>

            <button
              onClick={logoutAdmin}
              className="ml-2 px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-200 text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer transition"
              title="Log out of WordPress Admin"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* WP Admin Sidebar */}
        <aside className="w-full md:w-56 bg-slate-950 text-slate-300 p-4 border-r border-slate-800 shrink-0 space-y-6">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">
              Catalog Management
            </div>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'products'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products & Deals</span>
              <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'categories'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Categories</span>
              <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'media'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Media Library</span>
              <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                {mediaLibrary.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('blogs')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'blogs'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Guides & Posts</span>
              <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                {blogPosts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'data'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Settings & Reset</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div>WordPress v6.8-Ready</div>
            <div>Affiliate Links: Editable Per-Product</div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Total Products</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {products.length}
              </div>
            </div>
            <div
              onClick={() => setActiveTab('categories')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-300 transition-colors"
              title="Click to view all categories"
            >
              <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Categories</span>
                <span className="text-[10px] text-amber-600 font-semibold">Manage →</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {categories.length}
              </div>
            </div>
            <div
              onClick={() => setActiveTab('media')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-300 transition-colors"
              title="Click to view Media Library"
            >
              <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Media Gallery</span>
                <span className="text-[10px] text-amber-600 font-semibold">Browse →</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {mediaLibrary.length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Featured Items</div>
              <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                {products.filter((p) => p.isFeatured).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Trending Items</div>
              <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                {products.filter((p) => p.isTrending).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Live Articles</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {blogPosts.length}
              </div>
            </div>
          </div>

          {/* Tab 1: Products Management */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Inventory KPI Status Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Database Catalog</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">{totalCatalogCount} Items</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Package className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-emerald-700">In Stock (Active)</div>
                    <div className="text-xl font-bold text-emerald-700 mt-0.5">{inStockItemsCount} Items</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-rose-700">Out of Stock</div>
                    <div className="text-xl font-bold text-rose-700 mt-0.5">{outOfStockItemsCount} Items</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Availability Health</div>
                    <div className="text-xl font-bold text-amber-700 mt-0.5">{inStockPercentage}% Ready</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Header Action Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Product</span>
                  </button>

                  <button
                    onClick={() => handleOpenAddCategory(false)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-700 transition"
                    title="Add new category option"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Add New Category</span>
                  </button>

                  {/* Filter by Category */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Stock / Inventory */}
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="All">All Stock Status</option>
                    <option value="inStock">In Stock Only ({inStockItemsCount})</option>
                    <option value="outOfStock">Out of Stock Only ({outOfStockItemsCount})</option>
                  </select>
                </div>

                {/* Admin Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search by title, tag, link..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Platform</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4 text-center">Inventory Stock</th>
                        <th className="py-3 px-4">Affiliate URL</th>
                        <th className="py-3 px-4 text-center">Featured</th>
                        <th className="py-3 px-4 text-center">Trending</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                              />
                              <div className="max-w-xs">
                                <span className="font-semibold text-slate-900 block truncate">
                                  {p.name}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {p.subcategory}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium uppercase text-slate-700">
                            {p.category}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {p.platform}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 tabular-nums">
                            {p.price === 0 ? 'Free' : `₹${p.price.toLocaleString('en-IN')}`}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleProductStock(p.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border ${
                                p.inStock !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                              title={`Click to mark as ${p.inStock !== false ? 'Out of Stock' : 'In Stock'}`}
                            >
                              {p.inStock !== false ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                  <span>In Stock</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                  <span>Out of Stock</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate font-mono text-[11px] text-amber-700">
                            <a
                              href={p.affiliateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1"
                              title={p.affiliateUrl}
                            >
                              <span className="truncate">{p.affiliateUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => toggleFeatured(p.id)}
                              className={`p-1.5 rounded cursor-pointer ${
                                p.isFeatured
                                  ? 'text-amber-600 bg-amber-50'
                                  : 'text-slate-300 hover:text-slate-500'
                              }`}
                              title="Toggle Featured"
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => toggleTrending(p.id)}
                              className={`p-1.5 rounded cursor-pointer ${
                                p.isTrending
                                  ? 'text-amber-600 bg-amber-50'
                                  : 'text-slate-300 hover:text-slate-500'
                              }`}
                              title="Toggle Trending"
                            >
                              <Flame className="w-4 h-4 fill-current" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmation({
                                    type: 'product',
                                    id: p.id,
                                    title: `Delete Product: ${p.name}`,
                                    message: `Are you sure you want to permanently delete "${p.name}"? This action will remove the item from the live inventory catalog and the PostgreSQL database.`,
                                    onConfirm: () => {
                                      deleteProduct(p.id);
                                      setDeleteConfirmation(null);
                                    },
                                  });
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded cursor-pointer transition"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Categories Management (WordPress Taxonomies) */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-600" />
                    <span>Product Categories (Taxonomies)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create community collections, cultural classifications, and storefront hero landing pages.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenAddCategory(false)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Category</span>
                  </button>

                  <div className="relative flex-1 sm:w-56">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Left Form + Right Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Form: Add New Category */}
                <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-amber-600" />
                      <span>{editingCategoryId ? 'Edit Category' : 'Add New Category'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      New categories appear immediately across navigation menus, filters, and product catalogs.
                    </p>
                  </div>

                  {categoryError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{categoryError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveCategory} className="space-y-4">
                    {/* Category Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={categoryForm.name}
                        onChange={(e) => handleCategoryNameInput(e.target.value)}
                        placeholder="e.g. Saini, Tyagi, Maratha, Royal Jewelry"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        The public name displayed on storefront badges, menus, and banners.
                      </span>
                    </div>

                    {/* Slug */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        URL Slug *
                      </label>
                      <div className="flex items-center">
                        <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-500 px-2.5 py-2 text-xs rounded-l-lg select-none">
                          /category/
                        </span>
                        <input
                          type="text"
                          required
                          value={categoryForm.slug}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                            })
                          }
                          placeholder="e.g. saini"
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-r-lg text-slate-900 font-mono focus:bg-white focus:border-amber-500 outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        URL-friendly version of the name. Lowercase, containing letters, numbers, and hyphens.
                      </span>
                    </div>

                    {/* Headline */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hero Headline
                      </label>
                      <input
                        type="text"
                        value={categoryForm.headline}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, headline: e.target.value })
                        }
                        placeholder="e.g. Heritage, Valor & Cultural Pride"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Displayed as the prominent tagline on the category landing page.
                      </span>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={categoryForm.description}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, description: e.target.value })
                        }
                        placeholder="Explore authentic traditional accessories, handcrafted kadas, ethnic kurtas..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Short summary for SEO search cards and category introductory text.
                      </span>
                    </div>

                    {/* Category Banner Image (Direct Gallery & Library) */}
                    <div>
                      <MediaImagePicker
                        label="Category Banner Image"
                        value={categoryForm.image}
                        onChange={(url) => setCategoryForm({ ...categoryForm, image: url })}
                        aspectRatio="video"
                        categoryContext="Category Banners"
                        helpText="Upload from device gallery or choose from presets below."
                      />

                      {/* Quick Preset Banners */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium shrink-0">
                          Presets:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_CATEGORY_IMAGES.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() =>
                                setCategoryForm({ ...categoryForm, image: preset.url })
                              }
                              className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition ${
                                categoryForm.image === preset.url
                                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Form Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {editingCategoryId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setCategoryForm({
                              name: '',
                              slug: '',
                              headline: '',
                              description: '',
                              image: PRESET_CATEGORY_IMAGES[0].url,
                            });
                          }}
                          className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                        >
                          Cancel Editing
                        </button>
                      )}
                      <button
                        type="submit"
                        className="ml-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5 transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{editingCategoryId ? 'Update Category' : 'Add New Category'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Table: All Categories */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        Active Categories ({displayedCategories.length})
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Click on product counts to jump directly to filtered products.
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Headline / Description</th>
                          <th className="py-3 px-4 text-center">Products</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedCategories.map((c) => {
                          const linkedProductsCount = products.filter(
                            (p) => p.category === c.slug
                          ).length;
                          return (
                            <tr
                              key={c.id}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                editingCategoryId === c.id ? 'bg-amber-50/50' : ''
                              }`}
                            >
                              {/* Category Image & Name */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={c.image}
                                    alt={c.name}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        PRESET_CATEGORY_IMAGES[0].url;
                                    }}
                                  />
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">
                                      {c.name}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-400">
                                      /category/{c.slug}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Headline & Description */}
                              <td className="py-3 px-4 max-w-xs">
                                <div className="font-medium text-slate-800 line-clamp-1">
                                  {c.headline}
                                </div>
                                <div className="text-[11px] text-slate-400 line-clamp-1">
                                  {c.description}
                                </div>
                              </td>

                              {/* Count of Products */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterCategory(c.slug);
                                    setActiveTab('products');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-full border border-amber-200 text-[11px] cursor-pointer transition"
                                  title={`View all ${linkedProductsCount} products in ${c.name}`}
                                >
                                  <span>{linkedProductsCount}</span>
                                  <span className="text-[10px] text-amber-600 font-normal">items</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Live Storefront */}
                                  <button
                                    onClick={() =>
                                      navigate('category-detail', { categorySlug: c.slug })
                                    }
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition"
                                    title="View category page in live storefront"
                                  >
                                    <Globe className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Edit Category */}
                                  <button
                                    onClick={() => handleOpenEditCategory(c)}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded cursor-pointer transition"
                                    title="Edit Category Details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Category */}
                                  <button
                                    onClick={() => handleDeleteCategory(c)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded cursor-pointer transition"
                                    title="Delete Category"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Media Library Management */}
          {activeTab === 'media' && (
            <div className="space-y-5">
              {/* Header Action Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-amber-600" />
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Media Library
                    </h2>
                    <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                      {mediaLibrary.length} images
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Directly upload photos from your phone or PC gallery and manage all site images.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={mediaTabFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMediaTabUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isMediaUploading}
                    onClick={() => mediaTabFileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isMediaUploading ? 'Compressing & Uploading...' : 'Upload from Gallery / Files'}</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleMediaTabUpload(e.dataTransfer.files);
                }}
                onClick={() => mediaTabFileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl bg-amber-50/40 hover:bg-amber-50/70 p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-amber-200 text-amber-600 flex items-center justify-center mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-xs sm:text-sm text-slate-800">
                  Click to select photos from phone gallery or drag & drop files here
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Supports JPG, PNG, WEBP. Automatically optimized for fast loading on phones and browsers.
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Search images by name or category..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-slate-500 whitespace-nowrap">Filter:</span>
                  <select
                    value={mediaCategoryFilter}
                    onChange={(e) => setMediaCategoryFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
                  >
                    {['All', ...Array.from(new Set(mediaLibrary.map((m) => m.category || 'General')))].map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Media Grid */}
              {mediaLibrary.filter((m) => {
                if (mediaCategoryFilter !== 'All' && m.category !== mediaCategoryFilter) return false;
                if (!mediaSearch.trim()) return true;
                const q = mediaSearch.toLowerCase();
                return m.name.toLowerCase().includes(q) || (m.category && m.category.toLowerCase().includes(q));
              }).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 p-8">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No media items found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload your first photo directly from your device gallery.
                  </p>
                  <button
                    onClick={() => mediaTabFileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image from Gallery</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaLibrary
                    .filter((m) => {
                      if (mediaCategoryFilter !== 'All' && m.category !== mediaCategoryFilter) return false;
                      if (!mediaSearch.trim()) return true;
                      const q = mediaSearch.toLowerCase();
                      return m.name.toLowerCase().includes(q) || (m.category && m.category.toLowerCase().includes(q));
                    })
                    .map((item) => (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col"
                      >
                        {/* Image Thumbnail */}
                        <div
                          onClick={() => setPreviewMediaUrl(item.url)}
                          className="aspect-square bg-slate-100 overflow-hidden cursor-pointer relative"
                        >
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          {item.sizeKb && (
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/70 text-white font-mono text-[9px]">
                              {item.sizeKb} KB
                            </span>
                          )}

                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.url);
                                showToast(`Copied image URL to clipboard!`);
                              }}
                              className="p-2 bg-white text-slate-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg shadow-xs cursor-pointer transition"
                              title="Copy URL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMediaUrl(item.url);
                              }}
                              className="p-2 bg-white text-slate-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg shadow-xs cursor-pointer transition"
                              title="View Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between bg-white border-t border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-900 text-xs truncate block" title={item.name}>
                              {item.name}
                            </span>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                              <span>{item.category || 'General'}</span>
                              <span>{item.uploadedAt}</span>
                            </div>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenAddProduct();
                                setProductForm((prev) => ({ ...prev, image: item.url }));
                              }}
                              className="text-[10px] text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
                            >
                              + Use in Product
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove "${item.name}" from Media Library?`)) {
                                  deleteMediaItem(item.id);
                                }
                              }}
                              className="text-slate-300 hover:text-rose-600 cursor-pointer p-1 rounded"
                              title="Delete from Library"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Blog Management */}
          {activeTab === 'blogs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleOpenAddBlog}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write New Blog Guide</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {blogPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-16 h-12 object-cover rounded border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="text-[11px] font-bold text-amber-700 uppercase">
                            {post.category} · {post.date}
                          </span>
                          <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                            {post.title}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenEditBlog(post)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete post "${post.title}"?`)) {
                              deleteBlogPost(post.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs rounded font-medium cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Settings & Data Reset */}
          {activeTab === 'data' && (
            <div className="space-y-6 max-w-3xl">
              {/* Card 1: WordPress Administrator Security & Login ID / Password */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        WordPress Admin Credentials & Security
                      </h3>
                      <p className="text-xs text-slate-500">
                        Configure the Administrator Login ID (Username), Email, and Password used to access this dashboard.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase tracking-wider">
                    Secured
                  </span>
                </div>

                {/* Status Callout */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-slate-500">Currently Active Login ID:</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {adminCredentials.username}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-slate-500">Recovery Email:</div>
                    <div className="font-mono font-medium text-slate-800">
                      {adminCredentials.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset credentials to factory default (admin / admin@123)?')) {
                        resetAdminCredentials();
                        setNewUsername('admin');
                        setNewEmail('admin@apnipehchaan.in');
                        setNewPassword('');
                        setConfirmPassword('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded cursor-pointer transition text-center"
                  >
                    Restore Defaults
                  </button>
                </div>

                {/* Success / Error Alerts */}
                {credSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{credSuccess}</span>
                  </div>
                )}
                {credError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{credError}</span>
                  </div>
                )}

                {/* Edit Form */}
                <form onSubmit={handleUpdateCreds} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Login ID / Username *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="admin"
                          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                        />
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="admin@apnipehchaan.in"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Password (leave empty to keep current)
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                        />
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save New Credentials</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Supabase & Relational Database Integration */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <span>Supabase Relational Database</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase tracking-wider">
                          PostgreSQL
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage 'products' and 'categories' tables, sync live inventory, and run custom DDL scripts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Schema'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSqlSchema(!showSqlSchema)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>{showSqlSchema ? 'Hide SQL' : 'View SQL DDL'}</span>
                    </button>
                  </div>
                </div>

                {/* Connection Status Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                      <span>Server Cloud SQL Database</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">Connected (Active)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {totalCatalogCount} products & {categories.length} categories
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                      <span>Supabase Project Status</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          supabaseHealth?.connected
                            ? 'bg-emerald-500'
                            : supabaseUrl
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {supabaseHealth?.connected
                        ? 'Connected'
                        : isCheckingSupabase
                        ? 'Checking...'
                        : supabaseUrl
                        ? 'Configured'
                        : 'Standby / Local'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                      {supabaseHealth?.connected
                        ? `${supabaseHealth.productCount || 0} prods / ${supabaseHealth.categoryCount || 0} cats`
                        : supabaseUrl
                        ? supabaseUrl
                        : 'Enter URL & Key below'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Live Inventory Ready</div>
                      <div className="text-base font-bold text-emerald-700 mt-1">
                        {inStockItemsCount} In Stock / {outOfStockItemsCount} Out
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSyncingSupabase}
                      onClick={handleSyncToSupabase}
                      className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                      <span>{isSyncingSupabase ? 'Syncing Tables...' : 'Sync Catalog to Supabase'}</span>
                    </button>
                  </div>
                </div>

                {/* Supabase Credentials Form */}
                <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="url"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xyzproject.supabase.co"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Supabase Anon / Service Role Key
                      </label>
                      <input
                        type="password"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-slate-500">
                      Credentials are saved safely in your browser and used by admin CRUD actions to persist changes to Supabase.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestSupabase}
                        disabled={isCheckingSupabase}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        {isCheckingSupabase ? 'Testing...' : 'Test Connection'}
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save & Verify</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Collapsible Supabase SQL Schema Viewer */}
                {showSqlSchema && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-xl text-slate-200 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono font-semibold text-amber-300">
                          supabase_schema.sql (Products, Categories, RLS, Indexes)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded flex items-center gap-1 cursor-pointer transition"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedSql ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto max-h-64 p-2 bg-slate-950 rounded-lg text-emerald-400 selection:bg-amber-600 selection:text-white">
                      {SUPABASE_SCHEMA_SQL}
                    </pre>
                  </div>
                )}

                {/* Table Schema Architecture Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        <span>Table: categories</span>
                      </span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono">
                        7 Columns
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                      id (PK), name, slug (UNIQUE), headline, description, image, item_count, created_at, updated_at
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Table: products</span>
                      </span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono">
                        22 Columns
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                      id (PK), name, category, in_stock (BOOL), price, affiliate_url, platform, is_featured, is_trending...
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Catalogue & LocalStorage Settings */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Catalogue & LocalStorage Settings
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage persistent local storage or restore initial authentic Indian cultural catalog.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <span className="font-bold text-xs text-amber-900 block">
                    Affiliate Link Integrity
                  </span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Every product affiliate link stored in this database redirects visitors with your custom tracking tag. You can edit any link directly from the Products tab.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-900">Reset Demo Data</div>
                    <div className="text-[11px] text-slate-500">
                      Reverts products & articles to original verified preset data.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteConfirmation({
                        type: 'reset',
                        title: 'Reset Catalogue & Demo Data',
                        message: 'Are you sure you want to restore default product, category, and blog post collections? Any newly created custom items will be reset.',
                        onConfirm: () => {
                          resetToDefault();
                          setDeleteConfirmation(null);
                        },
                      });
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Catalogue</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Add/Edit Modal (All 17 Required Fields) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingProductId ? 'Edit Affiliate Product' : 'Add New Affiliate Product'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Royal Veer Gujjar Heavy Brass Kada"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Cultural Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenAddCategory(true)}
                      className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Category</span>
                    </button>
                  </div>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm({ ...productForm, category: e.target.value as CategorySlug })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={productForm.subcategory}
                    onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                    placeholder="e.g. Traditional Wristwear, Emblems, Apparel"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Platform & Affiliate URL (CRITICAL REQUIREMENT) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Affiliate Platform *
                  </label>
                  <select
                    value={productForm.platform}
                    onChange={(e) =>
                      setProductForm({ ...productForm, platform: e.target.value as AffiliatePlatform })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Meesho">Meesho</option>
                    <option value="Bank Partner">Bank Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Affiliate URL (Individually Editable) *
                  </label>
                  <input
                    type="url"
                    required
                    value={productForm.affiliateUrl}
                    onChange={(e) => setProductForm({ ...productForm, affiliateUrl: e.target.value })}
                    placeholder="https://www.amazon.in/dp/...?tag=yourtag-21"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Pricing & Button Text */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Offer Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.originalPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, originalPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Button Action Text
                  </label>
                  <select
                    value={productForm.buttonText}
                    onChange={(e) =>
                      setProductForm({ ...productForm, buttonText: e.target.value as ButtonActionText })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="Shop Now">Shop Now</option>
                    <option value="Apply Now">Apply Now</option>
                    <option value="Check Offer">Check Offer</option>
                  </select>
                </div>
              </div>

              {/* Main Product Image (Direct Gallery Upload & Media Library) */}
              <MediaImagePicker
                label="Product Main Image"
                value={productForm.image}
                onChange={(url) => setProductForm({ ...productForm, image: url })}
                required
                categoryContext={productForm.category}
                helpText="Click 'Upload from Gallery / Device' to select any photo directly from your phone camera roll or PC files."
              />

              {/* Additional Product Gallery Images */}
              <MultiImageGalleryPicker
                label="Additional Product Gallery Images"
                images={productForm.galleryImages || []}
                onChange={(galleryImages) => setProductForm({ ...productForm, galleryImages })}
                categoryContext={productForm.category}
              />

              {/* Short & Full Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Description *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.shortDescription}
                  onChange={(e) => setProductForm({ ...productForm, shortDescription: e.target.value })}
                  placeholder="One sentence overview for product card"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Description & Specifications
                </label>
                <textarea
                  rows={3}
                  value={productForm.fullDescription}
                  onChange={(e) => setProductForm({ ...productForm, fullDescription: e.target.value })}
                  placeholder="Detailed material information, BIS hallmark, dimensions..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. Gujjar, Brass Kada, Traditional, Lion Motifs"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Inventory Stock Status */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Inventory Stock Status *
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Control whether this product is actively available for buyers or marked out of stock.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, inStock: true })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        productForm.inStock
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>In Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, inStock: false })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        !productForm.inStock
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Out of Stock</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Flags: Featured, Trending, Published */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isFeatured}
                    onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="font-medium text-slate-800">Featured Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isTrending}
                    onChange={(e) => setProductForm({ ...productForm, isTrending: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="font-medium text-slate-800">Trending Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isPublished}
                    onChange={(e) => setProductForm({ ...productForm, isPublished: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="font-medium text-slate-800">Published (Visible in Catalog)</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingProductId ? 'Update Product' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blog Add/Edit Modal */}
      {isBlogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingBlogId ? 'Edit Journal Article' : 'Write New Journal Article'}
              </h3>
              <button
                onClick={() => setIsBlogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  placeholder="e.g. The Ultimate Guide to Traditional Turbans & Safas"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Editorial Category
                  </label>
                  <select
                    value={blogForm.category}
                    onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="Style Guides">Style Guides</option>
                    <option value="Product Comparisons">Product Comparisons</option>
                    <option value="Buying Guides">Buying Guides</option>
                    <option value="Heritage & Lifestyle">Heritage & Lifestyle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={blogForm.author}
                    onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Cover Image (Direct Gallery & Library) */}
              <MediaImagePicker
                label="Article Cover Image"
                value={blogForm.coverImage}
                onChange={(url) => setBlogForm({ ...blogForm, coverImage: url })}
                required
                aspectRatio="wide"
                categoryContext="Articles"
                helpText="Click 'Upload from Gallery / Device' to select a high-res cover photo."
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Excerpt *
                </label>
                <input
                  type="text"
                  required
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                  placeholder="Summary shown on blog card..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Article Content (Markdown-ready) *
                </label>
                <textarea
                  rows={6}
                  required
                  value={blogForm.content}
                  onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  placeholder="Write editorial content with ### headings and bullet points..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={blogTagsInput}
                  onChange={(e) => setBlogTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBlogModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingBlogId ? 'Update Article' : 'Publish Article'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal (For Quick Add from Products and Header) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {editingCategoryId ? 'Edit Category' : 'Add New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {categoryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{categoryError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => handleCategoryNameInput(e.target.value)}
                  placeholder="e.g. Saini, Tyagi, Maratha, Royal Jewelry"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The name as it appears on your website navigation and product cards.
                </span>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-500 px-2.5 py-2 text-xs rounded-l-lg select-none">
                    /category/
                  </span>
                  <input
                    type="text"
                    required
                    value={categoryForm.slug}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    placeholder="e.g. saini"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-r-lg text-slate-900 font-mono focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={categoryForm.headline}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, headline: e.target.value })
                  }
                  placeholder="e.g. Heritage, Valor & Cultural Pride"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  placeholder="Explore authentic traditional accessories, handcrafted kadas, ethnic kurtas..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              {/* Category Banner Image (Direct Gallery & Library) */}
              <div>
                <MediaImagePicker
                  label="Category Banner Image"
                  value={categoryForm.image}
                  onChange={(url) => setCategoryForm({ ...categoryForm, image: url })}
                  aspectRatio="video"
                  categoryContext="Category Banners"
                  helpText="Upload from device gallery or choose from presets below."
                />

                {/* Preset banner options */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium shrink-0">
                    Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CATEGORY_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setCategoryForm({ ...categoryForm, image: preset.url })
                        }
                        className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition ${
                          categoryForm.image === preset.url
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingCategoryId ? 'Update Category' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Full-Size Media Preview Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>Media File Preview</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewMediaUrl);
                    showToast('Copied media URL to clipboard!');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMediaUrl(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh] bg-black/40">
              <img
                src={previewMediaUrl}
                alt="Preview"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Database & Inventory Deletion Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">
                  {deleteConfirmation.title}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Database Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {deleteConfirmation.message}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteConfirmation.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Action</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
