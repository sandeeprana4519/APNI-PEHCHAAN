import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category, BlogPost, PageView, CategorySlug, MediaItem } from '../types';
import { initialProducts, initialCategories, initialBlogPosts, initialMediaItems } from '../data/initialData';
import { auth, signInWithGoogle, logOutUser } from '../lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  getSupabaseClient,
  mapProductToSupabase,
  mapCategoryToSupabase,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
} from '../services/supabaseService.ts';

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

export interface UserProfile {
  id?: number;
  uid: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  role?: string;
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
  toggleProductStock: (id: string) => void;

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

  // User Auth & Profiles (Firebase Auth + Cloud SQL)
  currentUser: User | null;
  userProfile: UserProfile | null;
  userToken: string | null;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => Promise<void>;

  // User Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;

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
  WISHLIST: 'apni_pehchaan_wishlist_v1',
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
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        return parsed.map((p) => ({
          ...p,
          image: p.image?.replace('/src/assets/images/', '/images/') || '/apni-pehchaan-logo.jpg',
          galleryImages: p.galleryImages?.map((img) => img.replace('/src/assets/images/', '/images/')) || [],
        }));
      }
      return initialProducts;
    } catch {
      return initialProducts;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        return parsed.map((c) => ({
          ...c,
          image: c.image?.replace('/src/assets/images/', '/images/') || '/images/cat_gujjar_jaat_style_1790229006717.jpg',
        }));
      }
      return initialCategories;
    } catch {
      return initialCategories;
    }
  });

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BLOGS);
      if (saved) {
        const parsed: BlogPost[] = JSON.parse(saved);
        return parsed.map((b) => ({
          ...b,
          coverImage: b.coverImage?.replace('/src/assets/images/', '/images/') || '/images/blog_turban_guide_1790229043202.jpg',
        }));
      }
      return initialBlogPosts;
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

  // User Auth & Profiles (Firebase Auth + Cloud SQL PostgreSQL)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // User Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Modals & Notifications
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
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOGS, JSON.stringify(blogPosts));
    } catch (e) {
      console.error('Failed to save blog posts', e);
    }
  }, [blogPosts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(mediaLibrary));
    } catch (e) {
      console.error('Failed to save media library', e);
    }
  }, [mediaLibrary]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist', e);
    }
  }, [wishlist]);

  // Load from Supabase Persistent Cloud Database & APIs on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // 1. Direct Supabase load (fastest, client-authoritative)
      try {
        const [sbProds, sbCats] = await Promise.all([
          fetchProductsFromSupabase(),
          fetchCategoriesFromSupabase(),
        ]);

        if (isMounted) {
          if (sbProds && sbProds.length > 0) {
            setProducts((prev) => {
              const remoteIds = new Set(sbProds.map((p) => p.id));
              const localCustom = prev.filter((p) => p.id.startsWith('prod-custom-') && !remoteIds.has(p.id));
              return [...localCustom, ...sbProds];
            });
          }
          if (sbCats && sbCats.length > 0) {
            setCategories((prev) => {
              const remoteIds = new Set(sbCats.map((c) => c.id));
              const localCustom = prev.filter((c) => c.id.startsWith('cat-') && !remoteIds.has(c.id));
              return [...sbCats, ...localCustom];
            });
          }
        }
      } catch (sbErr) {
        console.warn('Supabase direct load error:', sbErr);
      }

      // 2. Fetch from backend /api routes
      fetch('/api/products')
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setProducts((prev) => {
              const remoteIds = new Set(data.map((p: Product) => p.id));
              const localCustom = prev.filter((p) => p.id.startsWith('prod-custom-') && !remoteIds.has(p.id));
              return [...localCustom, ...data];
            });
          }
        })
        .catch((err) => console.warn('Could not load products from API:', err));

      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setCategories((prev) => {
              const remoteIds = new Set(data.map((c: Category) => c.id));
              const localCustom = prev.filter((c) => c.id.startsWith('cat-') && !remoteIds.has(c.id));
              return [...data, ...localCustom];
            });
          }
        })
        .catch((err) => console.warn('Could not load categories from API:', err));

      fetch('/api/blogs')
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setBlogPosts(data);
          }
        })
        .catch((err) => console.warn('Could not load blogs from API:', err));
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        try {
          const token = await user.getIdToken();
          setUserToken(token);

          // Synchronize profile with Cloud SQL PostgreSQL database
          const syncRes = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: user.displayName,
              photoUrl: user.photoURL,
            }),
          });

          if (syncRes.ok) {
            const profile = await syncRes.json();
            setUserProfile(profile);
          }

          // Fetch user wishlist from PostgreSQL
          const wishRes = await fetch('/api/wishlist', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (wishRes.ok) {
            const list = await wishRes.json();
            if (Array.isArray(list)) {
              setWishlist(list);
            }
          }
        } catch (e) {
          console.error('Failed to sync user with PostgreSQL database:', e);
        }
      } else {
        setUserToken(null);
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const { user, token, error } = await signInWithGoogle();
    if (error || !user) {
      showToast(error || 'Google sign in failed');
      return { success: false, error };
    }
    showToast(`Signed in as ${user.displayName || user.email}`);
    return { success: true };
  };

  const logoutUser = async () => {
    await logOutUser();
    setUserToken(null);
    setUserProfile(null);
    showToast('Signed out successfully.');
  };

  const isWishlisted = (productId: string) => {
    return wishlist.includes(productId);
  };

  const toggleWishlist = async (productId: string) => {
    // Optimistic update
    const already = wishlist.includes(productId);
    const updated = already ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];
    setWishlist(updated);
    showToast(already ? 'Removed from your Saved Wishlist' : 'Saved to your Wishlist');

    // If user is authenticated, sync to Cloud SQL PostgreSQL database
    if (userToken) {
      try {
        await fetch('/api/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ productId }),
        });
      } catch (e) {
        console.error('Failed to sync wishlist to database', e);
      }
    }
  };

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
    // Track click event in Cloud SQL PostgreSQL
    fetch('/api/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
      body: JSON.stringify({
        productId: product.id,
        platform: product.platform,
      }),
    }).catch(() => {});
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

  // Product Operations
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-custom-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
    showToast(`Product "${newProduct.name}" created and synced.`);

    // 1. Persist directly to Supabase
    const sb = getSupabaseClient();
    if (sb) {
      sb.from('products')
        .upsert(mapProductToSupabase(newProduct), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.warn('Supabase product insert warning:', error.message);
        })
        .catch((err) => console.error('Supabase direct insert error:', err));
    }

    // 2. Persist to server API
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    }).catch((err) => console.error('Failed to sync product to API:', err));
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    let updatedProduct: Product | undefined;
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedProduct = { ...item, ...updates };
          return updatedProduct;
        }
        return item;
      })
    );
    showToast('Product updated.');

    if (updatedProduct) {
      const sb = getSupabaseClient();
      if (sb) {
        sb.from('products')
          .upsert(mapProductToSupabase(updatedProduct), { onConflict: 'id' })
          .then(({ error }) => {
            if (error) console.warn('Supabase product update warning:', error.message);
          })
          .catch((err) => console.error('Supabase update product error:', err));
      }

      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      }).catch((err) => console.error('Failed to update product in API:', err));
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
    showToast('Product deleted.');

    const sb = getSupabaseClient();
    if (sb) {
      sb.from('products')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase product delete warning:', error.message);
        })
        .catch((err) => console.error('Supabase delete product error:', err));
    }

    fetch(`/api/products/${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete product from API:', err)
    );
  };

  const toggleFeatured = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    updateProduct(id, { isFeatured: !target.isFeatured });
  };

  const toggleTrending = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    updateProduct(id, { isTrending: !target.isTrending });
  };

  const toggleProductStock = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    const nextStock = !target.inStock;
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inStock: nextStock } : item))
    );
    showToast(`"${target.name}" is now marked as ${nextStock ? 'In Stock' : 'Out of Stock'}.`);

    fetch(`/api/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock: nextStock }),
    }).catch((err) => {
      console.warn('Direct stock patch failed, falling back to update:', err);
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, inStock: nextStock }),
      }).catch((postErr) => console.error('Failed to update product stock:', postErr));
    });

    const sb = getSupabaseClient();
    if (sb) {
      sb.from('products')
        .update({ in_stock: nextStock })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase stock toggle warning:', error);
        });
    }
  };

  // Blog Operations
  const addBlogPost = (postData: Omit<BlogPost, 'id'>) => {
    const newPost: BlogPost = {
      ...postData,
      id: `blog-${Date.now()}`,
    };
    setBlogPosts((prev) => [newPost, ...prev]);
    showToast('Blog article published.');

    fetch('/api/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    }).catch((err) => console.error('Failed to sync blog to PostgreSQL:', err));
  };

  const updateBlogPost = (id: string, updates: Partial<BlogPost>) => {
    let updatedBlog: BlogPost | undefined;
    setBlogPosts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedBlog = { ...item, ...updates };
          return updatedBlog;
        }
        return item;
      })
    );
    showToast('Blog article updated.');

    if (updatedBlog) {
      fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBlog),
      }).catch((err) => console.error('Failed to update blog in PostgreSQL:', err));
    }
  };

  const deleteBlogPost = (id: string) => {
    setBlogPosts((prev) => prev.filter((item) => item.id !== id));
    showToast('Blog article removed.');

    fetch(`/api/blogs/${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete blog from PostgreSQL:', err)
    );
  };

  // Category Operations
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
        '/images/cat_gujjar_jaat_style_1790229006717.jpg',
    };

    setCategories((prev) => [...prev.filter((c) => c.id !== newCategory.id), newCategory]);
    showToast(`Category "${newCategory.name}" added.`);

    // 1. Persist directly to Supabase
    const sb = getSupabaseClient();
    if (sb) {
      sb.from('categories')
        .upsert(mapCategoryToSupabase(newCategory), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.warn('Supabase category insert warning:', error.message);
        })
        .catch((err) => console.error('Supabase category direct insert failed:', err));
    }

    // 2. Persist to server API
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    }).catch((err) => console.error('Failed to sync category to API:', err));

    return { success: true, category: newCategory };
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    let updatedCat: Category | undefined;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedCat = { ...c, ...updates };
          return updatedCat;
        }
        return c;
      })
    );
    showToast('Category updated.');

    if (updatedCat) {
      const sb = getSupabaseClient();
      if (sb) {
        sb.from('categories')
          .upsert(mapCategoryToSupabase(updatedCat), { onConflict: 'id' })
          .then(({ error }) => {
            if (error) console.warn('Supabase category update warning:', error.message);
          })
          .catch((err) => console.error('Supabase update category failed:', err));
      }

      fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCat),
      }).catch((err) => console.error('Failed to update category in API:', err));
    }
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

    const fallbackCategory = categories.find((c) => c.id !== id)?.slug || 'other';
    setProducts((prev) =>
      prev.map((p) => (p.category === target.slug ? { ...p, category: fallbackCategory } : p))
    );

    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast(`Category "${target.name}" removed.`);

    const sb = getSupabaseClient();
    if (sb) {
      sb.from('categories')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase category delete warning:', error.message);
        })
        .catch((err) => console.error('Supabase delete category failed:', err));
    }

    fetch(`/api/categories/${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete category from API:', err)
    );

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
        error: 'Unknown username or email address.',
      };
    }

    if (pass !== adminCredentials.password) {
      return {
        success: false,
        error: `The password you entered for "${idOrEmail}" is incorrect.`,
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
    showToast(`Welcome back, ${adminCredentials.username}!`);
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
    showToast('Logged out from Admin Dashboard.');
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
    showToast('Admin credentials updated.');
    return { success: true };
  };

  const resetAdminCredentials = () => {
    setAdminCredentials(DEFAULT_ADMIN_CREDS);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_CREDS, JSON.stringify(DEFAULT_ADMIN_CREDS));
    } catch (e) {
      console.error('Failed to reset credentials', e);
    }
    showToast('Admin credentials reset to default.');
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
    showToast('Restored default catalog.');
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
        toggleProductStock,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        addCategory,
        updateCategory,
        deleteCategory,
        currentUser,
        userProfile,
        userToken,
        isAuthLoading,
        loginWithGoogle,
        logoutUser,
        wishlist,
        toggleWishlist,
        isWishlisted,
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
