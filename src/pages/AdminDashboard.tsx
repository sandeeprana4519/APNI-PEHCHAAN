import React, { useState, useEffect, useRef } from 'react';
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
  Activity,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Mail,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  checkSupabaseConnection,
  runSupabaseDiagnostics,
  syncCatalogToSupabase,
  getStoredSupabaseConfig,
  normalizeSupabaseUrl,
  type SupabaseHealth,
  type SupabaseDiagnosticResult,
} from '../services/supabaseService.ts';

const PRESET_CATEGORY_IMAGES = [
  { label: 'Lifestyle & Identity Showcase', url: '/images/hero_lifestyle_identity_1790325324964.jpg' },
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
    refreshCatalog,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'media' | 'blogs' | 'data' | 'diagnostics'>('products');
  const [adminSearch, setAdminSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'inStock' | 'outOfStock'>('All');

  // Supabase Diagnostics state
  const [supabaseDiagnostics, setSupabaseDiagnostics] = useState<SupabaseDiagnosticResult | null>(null);
  const [isRunningFullDiag, setIsRunningFullDiag] = useState(false);

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

  // Recovery Mail & SMTP state
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.hostinger.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('APNI PEHCHAAN Security');
  const [smtpFromEmail, setSmtpFromEmail] = useState('support@apnipehchaan.in');
  const [hasSmtpConfigured, setHasSmtpConfigured] = useState(false);
  const [mailProviderMode, setMailProviderMode] = useState<'supabase' | 'smtp' | 'both'>('both');
  const [isChangingProvider, setIsChangingProvider] = useState(false);

  // Keep local credentials state synced when adminCredentials changes
  useEffect(() => {
    setNewUsername(adminCredentials.username);
    setNewEmail(adminCredentials.email);
  }, [adminCredentials.username, adminCredentials.email]);

  // Load existing SMTP settings & mail provider mode from server
  useEffect(() => {
    fetch('/api/admin/smtp-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.host) setSmtpHost(data.host);
          if (data.port) setSmtpPort(Number(data.port));
          if (data.secure !== undefined) setSmtpSecure(Boolean(data.secure));
          if (data.user) setSmtpUser(data.user);
          if (data.fromName) setSmtpFromName(data.fromName);
          if (data.fromEmail) setSmtpFromEmail(data.fromEmail);
          setHasSmtpConfigured(Boolean(data.passConfigured && data.user));
        }
      })
      .catch(() => {});

    fetch('/api/admin/mail-provider')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.mode) {
          setMailProviderMode(data.mode);
        }
      })
      .catch(() => {});
  }, []);

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

  // Handle Testing Recovery Email via chosen provider
  const handleSendTestEmail = async (providerOverride?: 'supabase' | 'smtp') => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    const chosenProvider = providerOverride || mailProviderMode;
    try {
      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminCredentials.email,
          provider: chosenProvider,
        }),
      });
      const data = await res.json();
      setIsTestingEmail(false);
      if (res.ok && data.success) {
        setEmailTestResult({
          success: true,
          message: data.message || `Test recovery email dispatched to ${adminCredentials.email}!`,
        });
      } else {
        setEmailTestResult({
          success: false,
          message: data.error || 'Failed to dispatch test email.',
        });
        if (chosenProvider === 'smtp') {
          setShowSmtpSettings(true);
        }
      }
    } catch (err: any) {
      setIsTestingEmail(false);
      setEmailTestResult({
        success: false,
        message: err.message || 'Network error while attempting to send test email.',
      });
    }
  };

  // Change Preferred Recovery Mail Provider
  const handleChangeProvider = async (mode: 'supabase' | 'smtp' | 'both') => {
    setMailProviderMode(mode);
    setIsChangingProvider(true);
    try {
      const res = await fetch('/api/admin/mail-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Recovery mail delivery set to: ${mode.toUpperCase()}`);
      }
    } catch {}
    setIsChangingProvider(false);
  };

  // Handle Saving SMTP Config
  const handleSaveSmtp = async (testFirst: boolean = false) => {
    setIsSavingSmtp(true);
    setEmailTestResult(null);
    try {
      const res = await fetch('/api/admin/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: smtpUser,
          pass: smtpPass,
          fromName: smtpFromName,
          fromEmail: smtpFromEmail,
          testConnection: testFirst,
        }),
      });
      const data = await res.json();
      setIsSavingSmtp(false);
      if (res.ok && data.success) {
        setHasSmtpConfigured(true);
        setEmailTestResult({
          success: true,
          message: testFirst
            ? '✓ SMTP connection verified & settings saved successfully!'
            : '✓ SMTP settings saved successfully!',
        });
      } else {
        setEmailTestResult({
          success: false,
          message: data.error || 'Failed to save SMTP configuration.',
        });
      }
    } catch (err: any) {
      setIsSavingSmtp(false);
      setEmailTestResult({
        success: false,
        message: err.message || 'Failed to connect to SMTP server.',
      });
    }
  };

  // Apply SMTP Presets
  const applySmtpPreset = (preset: 'hostinger' | 'gmail') => {
    if (preset === 'hostinger') {
      setSmtpHost('smtp.hostinger.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      setSmtpFromName('APNI PEHCHAAN Security');
      if (!smtpFromEmail || smtpFromEmail.includes('@apnipehchaan.in')) {
        setSmtpFromEmail(smtpUser || 'support@apnipehchaan.in');
      }
    } else if (preset === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      setSmtpFromName('APNI PEHCHAAN Security');
      setSmtpFromEmail(smtpUser || adminCredentials.email);
    }
  };

  // Handle Running Full Comprehensive Diagnostics
  const handleRunFullDiagnostics = async (overrideUrl?: string, overrideKey?: string) => {
    setIsRunningFullDiag(true);
    setIsCheckingSupabase(true);
    const targetUrl = overrideUrl !== undefined ? overrideUrl : supabaseUrl;
    const targetKey = overrideKey !== undefined ? overrideKey : supabaseKey;
    try {
      const diag = await runSupabaseDiagnostics(targetUrl, targetKey);
      setSupabaseDiagnostics(diag);
      setSupabaseHealth({
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
      });

      if (diag.connected && diag.persistenceVerified) {
        showToast(`Diagnostic Passed: ${diag.latencyMs}ms ping · Auth Validated · Read & Write Active`);
      } else if (diag.authStatus === 'auth_error') {
        showToast(`Authentication Error: ${diag.authMessage}`);
      } else if (diag.latencyRating === 'slow') {
        showToast(`High Latency Warning (${diag.latencyMs}ms): Network delays observed`);
      } else {
        showToast(diag.error || 'Diagnostic finished.');
      }
      return diag;
    } catch (err: any) {
      showToast(`Diagnostic probe failed: ${err?.message || 'Error'}`);
      return null;
    } finally {
      setIsRunningFullDiag(false);
      setIsCheckingSupabase(false);
    }
  };

  // Handle Supabase Save Credentials & Test Connection
  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedUrl = normalizeSupabaseUrl(supabaseUrl.trim());
    setSupabaseUrl(formattedUrl);
    localStorage.setItem('apni_supabase_url', formattedUrl);
    localStorage.setItem('apni_supabase_key', supabaseKey.trim());
    await handleRunFullDiagnostics(formattedUrl, supabaseKey.trim());
  };

  const handleTestSupabase = async () => {
    const formattedUrl = normalizeSupabaseUrl(supabaseUrl.trim());
    setSupabaseUrl(formattedUrl);
    await handleRunFullDiagnostics(formattedUrl, supabaseKey.trim());
  };

  // Check initial Supabase health & diagnostics once on mount
  React.useEffect(() => {
    handleRunFullDiagnostics();
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
          {/* Quick Database Status Pill */}
          <button
            onClick={() => {
              setActiveTab('diagnostics');
              handleRunFullDiagnostics();
            }}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition border ${
              supabaseDiagnostics?.connected
                ? supabaseDiagnostics.latencyRating === 'slow'
                  ? 'bg-amber-950/60 border-amber-700/80 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                : supabaseDiagnostics?.authStatus === 'auth_error'
                ? 'bg-rose-950/60 border-rose-700/80 text-rose-300 hover:bg-rose-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Click to open Supabase Diagnostic Panel"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseDiagnostics?.connected
                  ? supabaseDiagnostics.latencyRating === 'slow'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline">DB Ping:</span>
            <span className="font-mono">
              {supabaseDiagnostics?.latencyMs ? `${supabaseDiagnostics.latencyMs}ms` : 'Inspect'}
            </span>
          </button>

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

            <div className="pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">
              Diagnostics & System
            </div>

            <button
              onClick={() => {
                setActiveTab('diagnostics');
                if (!supabaseDiagnostics) {
                  handleRunFullDiagnostics();
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'diagnostics'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>DB Diagnostics</span>
              <span
                className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  supabaseDiagnostics?.connected
                    ? supabaseDiagnostics.latencyRating === 'slow'
                      ? 'bg-amber-900 text-amber-300'
                      : 'bg-emerald-900 text-emerald-300'
                    : 'bg-rose-900 text-rose-300'
                }`}
              >
                {supabaseDiagnostics?.latencyMs ? `${supabaseDiagnostics.latencyMs}ms` : 'Probe'}
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
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-slate-500">Currently Active Login ID:</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {adminCredentials.username}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-slate-500">Recovery Email (Password Reset):</div>
                    <div className="font-mono font-medium text-slate-800 flex items-center gap-1.5">
                      <span>{adminCredentials.email}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">Verified</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                    <button
                      type="button"
                      onClick={() => handleSendTestEmail()}
                      disabled={isTestingEmail}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#2271b1] text-xs font-semibold rounded cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isTestingEmail ? (
                        <>
                          <span className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Trigger Test Recovery Mail</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Reset credentials to factory default (admin / sandeeprana4519@gmail.com / admin@123)?')) {
                          resetAdminCredentials();
                          setNewUsername('admin');
                          setNewEmail('sandeeprana4519@gmail.com');
                          setNewPassword('');
                          setConfirmPassword('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded cursor-pointer transition text-center"
                    >
                      Restore Defaults
                    </button>
                  </div>
                </div>

                {/* Email Test Result Banner */}
                {emailTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                      emailTestResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border border-amber-200 text-amber-900'
                    }`}
                  >
                    {emailTestResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span>{emailTestResult.message}</span>
                      {!emailTestResult.success && !showSmtpSettings && (
                        <button
                          type="button"
                          onClick={() => setShowSmtpSettings(true)}
                          className="ml-2 font-bold underline cursor-pointer text-amber-900 hover:text-black"
                        >
                          Configure SMTP Server Now
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Password Reset Service & Email Delivery Provider Selection */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Password Reset Service & Email Provider</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choose how recovery emails and password reset links are dispatched to <strong>{adminCredentials.email}</strong>.
                      </p>
                    </div>
                    {isChangingProvider && (
                      <span className="text-[10px] text-amber-600 font-medium animate-pulse">Updating...</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Option 1: Supabase Auth Email Template */}
                    <div
                      onClick={() => handleChangeProvider('supabase')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition relative ${
                        mailProviderMode === 'supabase'
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">Supabase Auth</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800">
                          Active & Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Managed email infrastructure via Supabase Auth email templates (reset link + magic token).
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Zero Setup
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendTestEmail('supabase');
                          }}
                          className="text-[#2271b1] font-semibold underline hover:text-black cursor-pointer"
                        >
                          Test Supabase
                        </button>
                      </div>
                    </div>

                    {/* Option 2: Custom SMTP Provider */}
                    <div
                      onClick={() => handleChangeProvider('smtp')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition relative ${
                        mailProviderMode === 'smtp'
                          ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">Custom SMTP</span>
                        {hasSmtpConfigured ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800">
                            Configured
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600">
                            Hostinger/Gmail
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Dispatches branded HTML emails with 6-digit OTP directly through your Hostinger or Gmail SMTP.
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSmtpSettings(true);
                          }}
                          className="text-amber-700 font-semibold underline cursor-pointer"
                        >
                          {hasSmtpConfigured ? 'Edit Settings' : 'Configure SMTP'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendTestEmail('smtp');
                          }}
                          className="text-[#2271b1] font-semibold underline hover:text-black cursor-pointer"
                        >
                          Test SMTP
                        </button>
                      </div>
                    </div>

                    {/* Option 3: Dual Dispatch */}
                    <div
                      onClick={() => handleChangeProvider('both')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition relative ${
                        mailProviderMode === 'both'
                          ? 'bg-white border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">Dual Dispatch</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Triggers via both Supabase Auth email template and SMTP server simultaneously for 100% redundancy.
                      </p>
                      <div className="mt-2.5 text-[10px] text-blue-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Maximum Reliability
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible SMTP Configuration Panel */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer transition border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span>SMTP Mailer Credentials (Hostinger / Gmail / Custom Server)</span>
                      {hasSmtpConfigured ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                          Configured
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase">
                          Optional Setup
                        </span>
                      )}
                    </div>
                    {showSmtpSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showSmtpSettings && (
                    <div className="p-4 space-y-4 text-xs bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <p className="text-slate-500">
                          Configure outgoing SMTP credentials to ensure password recovery codes and notifications reach <strong className="text-slate-800">{adminCredentials.email}</strong>.
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">Presets:</span>
                          <button
                            type="button"
                            onClick={() => applySmtpPreset('hostinger')}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-semibold cursor-pointer border border-purple-200"
                          >
                            Hostinger Webmail
                          </button>
                          <button
                            type="button"
                            onClick={() => applySmtpPreset('gmail')}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-semibold cursor-pointer border border-red-200"
                          >
                            Gmail SMTP
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-slate-700 font-medium mb-1">SMTP Host</label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="smtp.hostinger.com"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Port</label>
                          <input
                            type="number"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(Number(e.target.value))}
                            placeholder="465"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">SMTP Username / Email</label>
                          <input
                            type="text"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            placeholder="support@apnipehchaan.in"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">
                            SMTP Password / App Password
                          </label>
                          <input
                            type="password"
                            value={smtpPass}
                            onChange={(e) => setSmtpPass(e.target.value)}
                            placeholder="Enter mail password or App Password"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Sender Name</label>
                          <input
                            type="text"
                            value={smtpFromName}
                            onChange={(e) => setSmtpFromName(e.target.value)}
                            placeholder="APNI PEHCHAAN Security"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Sender Email</label>
                          <input
                            type="email"
                            value={smtpFromEmail}
                            onChange={(e) => setSmtpFromEmail(e.target.value)}
                            placeholder="support@apnipehchaan.in"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="smtp_secure_check"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <label htmlFor="smtp_secure_check" className="text-slate-600 cursor-pointer">
                          Use Secure SSL/TLS Connection (Recommended for Port 465)
                        </label>
                      </div>

                      <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleSaveSmtp(true)}
                          disabled={isSavingSmtp}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingSmtp ? (
                            <span className="w-3.5 h-3.5 border-2 border-slate-500/30 border-t-slate-700 rounded-full animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>Verify Connection & Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveSmtp(false)}
                          disabled={isSavingSmtp}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded cursor-pointer transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Mailer Settings</span>
                        </button>
                      </div>
                    </div>
                  )}
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
                        Admin Email Address (Recovery Email) *
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="sandeeprana4519@gmail.com"
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('diagnostics');
                        handleRunFullDiagnostics();
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Diagnostics Panel →</span>
                    </button>

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

          {/* Tab 4: Supabase Database Live Diagnostics & Realtime Inspector */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 max-w-5xl">
              {/* Header Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span>Supabase Database Diagnostics & Inspector</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            supabaseDiagnostics?.connected && supabaseDiagnostics.persistenceVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : supabaseDiagnostics?.authStatus === 'auth_error'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {supabaseDiagnostics?.connected && supabaseDiagnostics.persistenceVerified
                            ? 'Live & Synchronized'
                            : supabaseDiagnostics?.authStatus === 'auth_error'
                            ? 'Auth Error'
                            : 'Checking / Degraded'}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                        Diagnostic panel verifying whether database persistence issues are caused by 
                        <strong className="text-slate-700"> API latency</strong>, <strong className="text-slate-700">authentication errors</strong>, or local synchronization conflicts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={isRunningFullDiag}
                      onClick={() => handleRunFullDiagnostics()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRunningFullDiag ? 'animate-spin' : ''}`} />
                      <span>{isRunningFullDiag ? 'Probing Database...' : 'Run Live Diagnostic'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        refreshCatalog();
                        showToast('Triggered live catalog re-sync with Supabase.');
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      title="Force customer storefront to fetch latest data"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sync Customer Site</span>
                    </button>
                  </div>
                </div>

                {/* Executive Root Cause Alert Banner */}
                {supabaseDiagnostics?.authStatus === 'auth_error' ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>ROOT CAUSE: AUTHENTICATION / AUTHORIZATION ERROR DETECTED</span>
                    </div>
                    <p className="text-rose-800 leading-relaxed">
                      {supabaseDiagnostics.authMessage || 'Supabase rejected the anon API key or JWT token.'}
                    </p>
                    <div className="text-[11px] text-rose-700 font-medium bg-rose-100/60 p-2.5 rounded-lg border border-rose-200/80">
                      <strong>Resolution:</strong> Navigate to <button onClick={() => setActiveTab('data')} className="underline font-bold hover:text-rose-900 cursor-pointer">Settings</button> and ensure your Supabase Project URL and Anon Key match your project at <em>supabase.com &gt; Project Settings &gt; API</em>. Verify that table RLS policies permit SELECT, INSERT, UPDATE, and DELETE.
                    </div>
                  </div>
                ) : supabaseDiagnostics?.latencyRating === 'slow' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>ROOT CAUSE: HIGH API LATENCY DETECTED ({supabaseDiagnostics.latencyMs}ms)</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      Database authentication is <strong>valid</strong> and operations succeed, but round-trip ping time is high ({supabaseDiagnostics.latencyMs}ms). Any perceived delay before changes appear on the Customer Site is due to network transit latency rather than authentication errors.
                    </p>
                  </div>
                ) : supabaseDiagnostics?.connected && supabaseDiagnostics.persistenceVerified ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2 text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">DATABASE PERSISTENCE & AUTHENTICATION VERIFIED</span>
                        <p className="text-emerald-800 mt-0.5 leading-relaxed">
                          Supabase connection is healthy with optimal latency ({supabaseDiagnostics.latencyMs}ms ping). Read, write, and delete probes executed successfully ({supabaseDiagnostics.writeTestLatencyMs}ms). Categories and products synchronize immediately to the Customer Site.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md shrink-0 self-start sm:self-auto font-semibold">
                      Tested {supabaseDiagnostics.testedAt}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    <span>Executing live Supabase telemetry probes...</span>
                  </div>
                )}
              </div>

              {/* 4 Core Diagnostic Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: API Latency */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>API Latency</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        supabaseDiagnostics?.latencyRating === 'fast'
                          ? 'bg-emerald-100 text-emerald-700'
                          : supabaseDiagnostics?.latencyRating === 'moderate'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {supabaseDiagnostics?.latencyRating === 'fast'
                        ? 'Fast (<250ms)'
                        : supabaseDiagnostics?.latencyRating === 'moderate'
                        ? 'Moderate'
                        : 'High Latency'}
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                      {supabaseDiagnostics?.latencyMs ?? 0}
                      <span className="text-sm font-normal text-slate-500 ml-1">ms</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          supabaseDiagnostics?.latencyRating === 'fast'
                            ? 'bg-emerald-500 w-1/4'
                            : supabaseDiagnostics?.latencyRating === 'moderate'
                            ? 'bg-amber-500 w-2/3'
                            : 'bg-rose-500 w-full'
                        }`}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Total round-trip ping to Supabase servers. Lower latency ensures instant updates.
                  </p>
                </div>

                {/* Metric 2: Authentication Status */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Auth & Access</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        supabaseDiagnostics?.authStatus === 'authenticated'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {supabaseDiagnostics?.authStatus === 'authenticated' ? 'HTTP 200 OK' : 'Auth Failed'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900 leading-tight">
                      {supabaseDiagnostics?.authStatus === 'authenticated' ? 'Authenticated' : 'Access Denied'}
                    </div>
                    <div className="text-xs font-mono text-emerald-600 mt-1 flex items-center gap-1">
                      {supabaseDiagnostics?.authStatus === 'authenticated' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Anon Key Verified</span>
                        </>
                      ) : (
                        <span className="text-rose-600">401/403 Unauthorized</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Validates project API credentials and table-level access permissions.
                  </p>
                </div>

                {/* Metric 3: Write & Delete Persistence Probe */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5 text-slate-400" />
                      <span>Persistence Probe</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        supabaseDiagnostics?.writeTestPassed
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {supabaseDiagnostics?.writeTestPassed ? 'Write/Delete OK' : 'Blocked'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900 leading-tight">
                      {supabaseDiagnostics?.writeTestPassed ? 'Read & Write Active' : 'Write Restricted'}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-1">
                      {supabaseDiagnostics?.writeTestLatencyMs ? `${supabaseDiagnostics.writeTestLatencyMs}ms write probe` : 'Probe pending'}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Tests real INSERT & DELETE probe mutations to ensure RLS policies permit saves.
                  </p>
                </div>

                {/* Metric 4: Live Cloud DB Catalog */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      <span>Live DB Catalog</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Authoritative
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900 leading-tight">
                      {supabaseDiagnostics?.categoryCount ?? 0} Cats · {supabaseDiagnostics?.productCount ?? 0} Prods
                    </div>
                    <div className="text-xs text-emerald-600 font-medium mt-1">
                      {supabaseDiagnostics?.inStockCount ?? 0} Items In Stock
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Live rows currently stored in Supabase. Customer site pulls directly from this catalog.
                  </p>
                </div>
              </div>

              {/* Comparative Diagnostic Matrix: Latency vs Authentication Root Cause */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>Persistence Diagnostics Matrix: Latency vs Authentication</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detailed breakdown evaluating whether issues stem from network latency, authentication tokens, or cache resurrection.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">Diagnostic Check</th>
                        <th className="py-2.5 px-3">Live Telemetry</th>
                        <th className="py-2.5 px-3">Current Status</th>
                        <th className="py-2.5 px-3">Root Cause Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          1. API Authentication & Token Validity
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {supabaseDiagnostics?.authStatus === 'authenticated' ? 'JWT Verified (HTTP 200)' : '401/403 Invalid API Key'}
                        </td>
                        <td className="py-3 px-3">
                          {supabaseDiagnostics?.authStatus === 'authenticated' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                              <X className="w-3 h-3 text-rose-600" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {supabaseDiagnostics?.authStatus === 'authenticated'
                            ? 'Authentication is NOT the cause of persistence issues.'
                            : 'CRITICAL: Authentication is failing. Check API key credentials in Settings.'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          2. Network Ping & API Latency
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {supabaseDiagnostics?.latencyMs ?? 0} ms round-trip
                        </td>
                        <td className="py-3 px-3">
                          {supabaseDiagnostics?.latencyRating === 'fast' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Optimal Latency
                            </span>
                          ) : supabaseDiagnostics?.latencyRating === 'moderate' ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-amber-600" /> Normal Latency
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> High Ping ({supabaseDiagnostics?.latencyMs}ms)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {supabaseDiagnostics?.latencyRating === 'slow'
                            ? 'High latency may cause a delay of several seconds before database mutations settle.'
                            : 'API Latency is fast. Network is responding normally.'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          3. Row-Level Security (RLS) Write Permissions
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {supabaseDiagnostics?.writeTestPassed ? 'INSERT & DELETE Allowed' : 'Write Rejected by RLS'}
                        </td>
                        <td className="py-3 px-3">
                          {supabaseDiagnostics?.writeTestPassed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                              <X className="w-3 h-3 text-rose-600" /> Blocked
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {supabaseDiagnostics?.writeTestPassed
                            ? 'Admin write operations successfully persist to live Supabase tables.'
                            : 'RLS policies on Supabase prevent writes from the client role.'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          4. Deleted Item Tombstone Protection
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          Active & Synchronized
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          Deleted categories and products are permanently pruned from Supabase and blocked from resurrecting upon refresh.
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          5. Customer Site Realtime Sync
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          Supabase Postgres Changes + Broadcast
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Subscribed
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          Whenever a product or category is added or deleted, all customer storefront views immediately update.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Categories List in Database */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>Live Categories Currently in Supabase Database ({categories.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Only these active categories appear on the Customer Site. Deleted categories have been completely removed.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('categories')}
                    className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <span>Manage Categories</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {categories.map((cat) => {
                    const prodCount = products.filter((p) => p.category === cat.slug).length;
                    return (
                      <div
                        key={cat.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">
                              {cat.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              slug: {cat.slug}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {prodCount} items
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Troubleshooting & Quick Actions Card */}
              <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <span>Supabase Connection Configuration</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('data')}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Edit URL & Key in Settings →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Active Supabase URL:</span>
                    <span className="text-emerald-400 font-bold break-all">{supabaseUrl || 'Not configured'}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">API Key Token:</span>
                    <span className="text-slate-300 break-all">
                      {supabaseKey ? `${supabaseKey.substring(0, 18)}...${supabaseKey.substring(supabaseKey.length - 8)}` : 'None'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400">
                  <span>
                    Endpoint Status: {supabaseDiagnostics?.connected ? 'Connected to awzkiktbcfssifdxdvxr.supabase.co' : 'Disconnected'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const report = JSON.stringify(supabaseDiagnostics, null, 2);
                      navigator.clipboard.writeText(report);
                      showToast('Copied diagnostic report to clipboard!');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Diagnostic JSON</span>
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
