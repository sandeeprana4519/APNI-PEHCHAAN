import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category, BlogPost, PageView, CategorySlug, MediaItem } from '../types';
import { initialProducts, initialCategories, initialBlogPosts, initialMediaItems } from '../data/initialData';

interface NavigationParams {
  categorySlug?: CategorySlug | string;
  blogId?: string;
  productId?: string;
}

export interface AdminCredentials {
  username: string;
  email: string;
  password: string;
}

interface AppContextType {
  // Navigation & View
  view: PageView;
  selectedCategorySlug: string;
  selectedBlogId: string;
  selectedProductId: string;
  navigate: (view: PageView, params?: NavigationParams) => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Data
  products: Product[];
  categories: Category[];
  blogPosts: BlogPost[];

  // Affiliate Redirect Handling
  activeAffiliateProduct: Product | null;
  triggerAffiliateRedirect: (product: Product) => void;
  closeAffiliateModal: () => void;

  // Quick View Modal
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;

  // Admin Product Operations
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleFeatured: (id: string) => void;
  toggleTrending: (id: string) => void;

  // Admin Blog Operations
  addBlogPost: (post: Omit<BlogPost, 'id'>) => void;
  updateBlogPost: (id: string, updates: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;

  // Admin Category Operations
  addCategory: (category: Omit<Category, 'id'>) => { success: boolean; error?: string; category?: Category };
  updateCategory: (id: string, updates: Partial<Category>) => { success: boolean; error?: string };
  deleteCategory: (id: string) => { success: boolean; error?: string };

  // Media Library Operations
  mediaLibrary: MediaItem[];
  addMediaItem: (item: Omit<MediaItem, 'id' | 'uploadedAt'>) => MediaItem;
  deleteMediaItem: (id: string) => void;

  // Admin Authentication
  isAdminLoggedIn: boolean;
  adminCredentials: AdminCredentials;
  loginAdmin: (idOrEmail: string, pass: string, remember?: boolean) => { success: boolean; error?: string };
  logoutAdmin: () => void;
  updateAdminCredentials: (username: string, email: string, password: string) => { success: boolean; error?: string };
  resetAdminCredentials: () => void;

  // Utilities
  resetToDefault: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'apni_pehchaan_products_v1',
  CATEGORIES: 'apni_pehchaan_categories_v1',
  BLOGS: 'apni_pehchaan_blogs_v1',
  MEDIA: 'apni_pehchaan_media_v1',
  ADMIN_AUTH: 'apni_pehchaan_admin_auth_v1',
  ADMIN_CREDS: 'apni_pehchaan_admin_creds_v1',
};

const DEFAULT_ADMIN_CREDS: AdminCredentials = {
  username: 'admin',
  email: 'admin@apnipehchaan.in',
  password: 'admin@123',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial states with localStorage check
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : initialProducts;
    } catch {
      return initialProducts;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : initialCategories;
    } catch {
      return initialCategories;
    }
  });

  // Sync categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  }, [categories]);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BLOGS);
      return saved ? JSON.parse(saved) : initialBlogPosts;
    } catch {
      return initialBlogPosts;
    }
  });

  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEDIA);
      if (saved) {
        const parsed: MediaItem[] = JSON.parse(saved);
        if (!parsed.some((item) => item.url.includes('apni-pehchaan-logo'))) {
          return [initialMediaItems[0], ...parsed];
        }
        return parsed;
      }
      return initialMediaItems;
    } catch {
      return initialMediaItems;
    }
  });

  // Sync media library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(mediaLibrary));
    } catch (e) {
      console.error('Failed to save media library', e);
    }
  }, [mediaLibrary]);

  // Navigation state
  const [view, setView] = useState<PageView>('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('gujjar');
  const [selectedBlogId, setSelectedBlogId] = useState<string>('blog-01');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin Authentication State
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDS);
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_CREDS;
    } catch {
      return DEFAULT_ADMIN_CREDS;
    }
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
      return savedAuth === 'true';
    } catch {
      return false;
    }
  });

  // Sync admin credentials to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_CREDS, JSON.stringify(adminCredentials));
    } catch (e) {
      console.error('Failed to save admin credentials', e);
    }
  }, [adminCredentials]);

  // Modals
  const [activeAffiliateProduct, setActiveAffiliateProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOGS, JSON.stringify(blogPosts));
    } catch (e) {
      console.error('Failed to save blog posts', e);
    }
  }, [blogPosts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const navigate = (newView: PageView, params?: NavigationParams) => {
    if (params?.categorySlug) {
      setSelectedCategorySlug(params.categorySlug);
    }
    if (params?.blogId) {
      setSelectedBlogId(params.blogId);
    }
    if (params?.productId) {
      setSelectedProductId(params.productId);
    }
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerAffiliateRedirect = (product: Product) => {
    setActiveAffiliateProduct(product);
  };

  const closeAffiliateModal = () => {
    setActiveAffiliateProduct(null);
  };

  const openQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
  };

  // Product Admin
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-custom-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`Product "${newProduct.name}" created successfully.`);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    showToast('Product updated successfully.');
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
    showToast('Product deleted from inventory.');
  };

  const toggleFeatured = (id: string) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFeatured: !item.isFeatured } : item
      )
    );
  };

  const toggleTrending = (id: string) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isTrending: !item.isTrending } : item
      )
    );
  };

  // Blog Admin
  const addBlogPost = (postData: Omit<BlogPost, 'id'>) => {
    const newPost: BlogPost = {
      ...postData,
      id: `blog-${Date.now()}`,
    };
    setBlogPosts((prev) => [newPost, ...prev]);
    showToast('Blog article published successfully.');
  };

  const updateBlogPost = (id: string, updates: Partial<BlogPost>) => {
    setBlogPosts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    showToast('Blog article updated.');
  };

  const deleteBlogPost = (id: string) => {
    setBlogPosts((prev) => prev.filter((item) => item.id !== id));
    showToast('Blog article removed.');
  };

  // Admin Category Operations
  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const trimmedName = categoryData.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Category name is required.' };
    }

    const rawSlug = categoryData.slug?.trim() || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const cleanSlug = rawSlug.toLowerCase();

    if (!cleanSlug) {
      return { success: false, error: 'A valid category slug is required.' };
    }

    // Check duplicate slug
    const exists = categories.some((c) => c.slug.toLowerCase() === cleanSlug);
    if (exists) {
      return { success: false, error: `A category with slug "${cleanSlug}" already exists.` };
    }

    const newCategory: Category = {
      id: `cat-${cleanSlug}-${Date.now().toString(36)}`,
      name: trimmedName,
      slug: cleanSlug,
      headline: categoryData.headline?.trim() || `${trimmedName} Heritage & Cultural Essentials`,
      description:
        categoryData.description?.trim() ||
        `Explore curated ${trimmedName} community products, traditional wear, jewelry and accessories on APNI PEHCHAAN.`,
      image:
        categoryData.image?.trim() ||
        '/src/assets/images/cat_gujjar_jaat_style_1790229006717.jpg',
    };

    setCategories((prev) => [...prev, newCategory]);
    showToast(`Category "${newCategory.name}" added successfully.`);
    return { success: true, category: newCategory };
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      })
    );
    showToast('Category updated successfully.');
    return { success: true };
  };

  const deleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) {
      return { success: false, error: 'Category not found.' };
    }
    if (categories.length <= 1) {
      return { success: false, error: 'Cannot delete the only remaining category in the catalog.' };
    }

    // Reassign products of deleted category to another category or 'other'
    const fallbackCategory = categories.find((c) => c.id !== id)?.slug || 'other';
    setProducts((prev) =>
      prev.map((p) => (p.category === target.slug ? { ...p, category: fallbackCategory } : p))
    );

    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast(`Category "${target.name}" removed.`);
    return { success: true };
  };

  // Media Library Operations
  const addMediaItem = (itemData: Omit<MediaItem, 'id' | 'uploadedAt'>): MediaItem => {
    const newItem: MediaItem = {
      id: `media-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      url: itemData.url,
      name: itemData.name || 'Gallery Upload',
      category: itemData.category || 'General',
      sizeKb: itemData.sizeKb,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setMediaLibrary((prev) => [newItem, ...prev]);
    return newItem;
  };

  const deleteMediaItem = (id: string) => {
    setMediaLibrary((prev) => prev.filter((m) => m.id !== id));
    showToast('Image removed from media library.');
  };

  // Admin Authentication Actions
  const loginAdmin = (idOrEmail: string, pass: string, remember: boolean = true) => {
    const cleanId = idOrEmail.trim().toLowerCase();
    const isIdMatch =
      cleanId === adminCredentials.username.toLowerCase() ||
      cleanId === adminCredentials.email.toLowerCase();

    if (!isIdMatch) {
      return {
        success: false,
        error: 'Unknown username or email address. Check again or contact administrator.',
      };
    }

    if (pass !== adminCredentials.password) {
      return {
        success: false,
        error: `The password you entered for the username "${idOrEmail}" is incorrect. Lost your password?`,
      };
    }

    setIsAdminLoggedIn(true);
    try {
      if (remember) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      } else {
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      }
    } catch (e) {
      console.error('Storage access issue', e);
    }
    showToast(`Welcome back, ${adminCredentials.username}! Logged into WordPress Admin.`);
    return { success: true };
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    } catch (e) {
      console.error('Storage access issue', e);
    }
    showToast('You have been securely logged out from WordPress Admin.');
  };

  const updateAdminCredentials = (username: string, email: string, pass: string) => {
    if (!username.trim()) {
      return { success: false, error: 'Login ID / Username cannot be empty.' };
    }
    if (!pass.trim() || pass.length < 5) {
      return { success: false, error: 'Password must be at least 5 characters long.' };
    }
    const updated = {
      username: username.trim(),
      email: email.trim() || `${username.trim()}@apnipehchaan.in`,
      password: pass,
    };
    setAdminCredentials(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_CREDS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update credentials', e);
    }
    showToast('Admin Login ID and Password updated successfully.');
    return { success: true };
  };

  const resetAdminCredentials = () => {
    setAdminCredentials(DEFAULT_ADMIN_CREDS);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_CREDS, JSON.stringify(DEFAULT_ADMIN_CREDS));
    } catch (e) {
      console.error('Failed to reset credentials', e);
    }
    showToast('Admin credentials reset to default (admin / admin@123).');
  };

  const resetToDefault = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.BLOGS);
    localStorage.removeItem(STORAGE_KEYS.MEDIA);
    setProducts(initialProducts);
    setCategories(initialCategories);
    setBlogPosts(initialBlogPosts);
    setMediaLibrary(initialMediaItems);
    showToast('Restored default products, categories, media & articles catalogue.');
  };

  return (
    <AppContext.Provider
      value={{
        view,
        selectedCategorySlug,
        selectedBlogId,
        selectedProductId,
        navigate,
        searchQuery,
        setSearchQuery,
        products,
        categories,
        blogPosts,
        mediaLibrary,
        addMediaItem,
        deleteMediaItem,
        activeAffiliateProduct,
        triggerAffiliateRedirect,
        closeAffiliateModal,
        quickViewProduct,
        openQuickView,
        closeQuickView,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleFeatured,
        toggleTrending,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        addCategory,
        updateCategory,
        deleteCategory,
        isAdminLoggedIn,
        adminCredentials,
        loginAdmin,
        logoutAdmin,
        updateAdminCredentials,
        resetAdminCredentials,
        resetToDefault,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
