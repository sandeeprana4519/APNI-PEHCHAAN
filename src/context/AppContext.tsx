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
  deleteProductFromSupabase,
  deleteCategoryFromSupabase,
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
  refreshCatalog: () => Promise<void>;

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
  DELETED_PRODUCTS: 'apni_pehchaan_deleted_products_v1',
  DELETED_CATEGORIES: 'apni_pehchaan_deleted_categories_v1',
};

// Tombstone helpers to prevent deleted records from reappearing
const getDeletedCategoryIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_CATEGORIES);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const getDeletedProductIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_PRODUCTS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const recordDeletedCategory = (id: string) => {
  const current = getDeletedCategoryIds();
  current.add(id);
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_CATEGORIES, JSON.stringify([...current]));
  } catch {}
};

const recordDeletedProduct = (id: string) => {
  const current = getDeletedProductIds();
  current.add(id);
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_PRODUCTS, JSON.stringify([...current]));
  } catch {}
};

const unmarkDeletedCategory = (id: string) => {
  const current = getDeletedCategoryIds();
  current.delete(id);
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_CATEGORIES, JSON.stringify([...current]));
  } catch {}
};

const unmarkDeletedProduct = (id: string) => {
  const current = getDeletedProductIds();
  current.delete(id);
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_PRODUCTS, JSON.stringify([...current]));
  } catch {}
};

const broadcastCatalogChange = () => {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('apni_catalog_channel');
      bc.postMessage('sync_catalog');
      bc.close();
    }
  } catch {}
};

const DEFAULT_ADMIN_CREDS: AdminCredentials = {
  username: 'admin',
  email: 'admin@apnipehchaan.in',
  password: 'admin@123',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial states with tombstone checks to ensure deleted items never appear
  const [products, setProducts] = useState<Product[]>(() => {
    const deleted = getDeletedProductIds();
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        return parsed
          .filter((p) => !deleted.has(p.id))
          .map((p) => ({
            ...p,
            image: p.image?.replace('/src/assets/images/', '/images/') || '/apni-pehchaan-logo.jpg',
            galleryImages: p.galleryImages?.map((img) => img.replace('/src/assets/images/', '/images/')) || [],
          }));
      }
      return initialProducts.filter((p) => !deleted.has(p.id));
    } catch {
      return initialProducts.filter((p) => !deleted.has(p.id));
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const deleted = getDeletedCategoryIds();
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        return parsed
          .filter((c) => !deleted.has(c.id))
          .map((c) => ({
            ...c,
            image: c.image?.replace('/src/assets/images/', '/images/') || '/images/cat_gujjar_jaat_style_1790229006717.jpg',
          }));
      }
      return initialCategories.filter((c) => !deleted.has(c.id));
    } catch {
      return initialCategories.filter((c) => !deleted.has(c.id));
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

  // Synchronize live catalog with live Supabase database and server API
  const refreshCatalog = async () => {
    const deletedCats = getDeletedCategoryIds();
    const deletedProds = getDeletedProductIds();

    try {
      const [sbProds, sbCats] = await Promise.all([
        fetchProductsFromSupabase(),
        fetchCategoriesFromSupabase(),
      ]);

      if (sbCats !== null) {
        // Authoritative live categories from Supabase! Filter out any tombstoned IDs
        const liveCats = sbCats.filter((c) => !deletedCats.has(c.id));
        setCategories(liveCats);
        try {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(liveCats));
        } catch {}
      } else {
        // Fallback: Fetch categories from API
        fetch('/api/categories')
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const live = data.filter((c: Category) => !deletedCats.has(c.id));
              setCategories(live);
            }
          })
          .catch(() => {});
      }

      if (sbProds !== null) {
        // Authoritative live products from Supabase! Filter out any tombstoned IDs
        const liveProds = sbProds.filter((p) => !deletedProds.has(p.id));
        setProducts(liveProds);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(liveProds));
        } catch {}
      } else {
        // Fallback: Fetch products from API
        fetch('/api/products')
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const live = data.filter((p: Product) => !deletedProds.has(p.id));
              setProducts(live);
            }
          })
          .catch(() => {});
      }
    } catch (sbErr) {
      console.warn('Direct Supabase catalog sync error:', sbErr);
    }
  };

  // Initial mount load and multi-tab / realtime listeners
  useEffect(() => {
    refreshCatalog();

    // 1. Supabase Realtime postgres_changes listener
    const sb = getSupabaseClient();
    let channel: any = null;
    if (sb) {
      try {
        channel = sb
          .channel('public:customer_catalog_sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'categories' },
            () => {
              refreshCatalog();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => {
              refreshCatalog();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription issue:', e);
      }
    }

    // 2. Multi-tab BroadcastChannel listener
    let broadcast: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcast = new BroadcastChannel('apni_catalog_channel');
        broadcast.onmessage = (event) => {
          if (event.data === 'sync_catalog') {
            refreshCatalog();
          }
        };
      }
    } catch {}

    // 3. Storage event listener across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.CATEGORIES ||
        e.key === STORAGE_KEYS.PRODUCTS ||
        e.key === STORAGE_KEYS.DELETED_CATEGORIES ||
        e.key === STORAGE_KEYS.DELETED_PRODUCTS
      ) {
        refreshCatalog();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Refetch latest data whenever customer revisits or focuses window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCatalog();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 5. Fetch blogs
    fetch('/api/blogs')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBlogPosts(data);
        }
      })
      .catch((err) => console.warn('Could not load blogs from API:', err));

    return () => {
      if (channel && sb) {
        try {
          sb.removeChannel(channel);
        } catch {}
      }
      if (broadcast) {
        try {
          broadcast.close();
        } catch {}
      }
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    unmarkDeletedProduct(newProduct.id);
    setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
    showToast(`Product "${newProduct.name}" created and synced.`);

    // 1. Persist directly to Supabase
    const sb = getSupabaseClient();
    if (sb) {
      sb.from('products')
        .upsert(mapProductToSupabase(newProduct), { onConflict: 'id' })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase product insert warning:', error.message);
            broadcastCatalogChange();
          },
          (err: any) => console.error('Supabase direct insert error:', err)
        );
    }

    // 2. Persist to server API
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    })
      .then(() => broadcastCatalogChange())
      .catch((err) => console.error('Failed to sync product to API:', err));

    broadcastCatalogChange();
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
          .then(
            ({ error }) => {
              if (error) console.warn('Supabase product update warning:', error.message);
              broadcastCatalogChange();
            },
            (err: any) => console.error('Supabase update product error:', err)
          );
      }

      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      })
        .then(() => broadcastCatalogChange())
        .catch((err) => console.error('Failed to update product in API:', err));

      broadcastCatalogChange();
    }
  };

  const deleteProduct = (id: string) => {
    // 1. Record in tombstone immediately
    recordDeletedProduct(id);

    // 2. Remove from local state
    setProducts((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast('Product removed from customer catalog.');

    // 3. Delete directly from Supabase
    deleteProductFromSupabase(id).then((res) => {
      if (!res.success) {
        console.warn('Supabase product delete warning:', res.error);
      }
      broadcastCatalogChange();
    });

    // 4. Delete on server API
    fetch(`/api/products/${id}`, { method: 'DELETE' })
      .then(() => broadcastCatalogChange())
      .catch((err) => console.error('Failed to delete product from API:', err));

    broadcastCatalogChange();
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
    })
      .then(() => broadcastCatalogChange())
      .catch((err) => {
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
          broadcastCatalogChange();
        });
    }

    broadcastCatalogChange();
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

    unmarkDeletedCategory(newCategory.id);
    const updatedCategories = [...categories.filter((c) => c.id !== newCategory.id), newCategory];
    setCategories(updatedCategories);
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updatedCategories));
    } catch {}

    showToast(`Category "${newCategory.name}" added to customer catalog.`);

    // 1. Persist directly to Supabase
    const sb = getSupabaseClient();
    if (sb) {
      sb.from('categories')
        .upsert(mapCategoryToSupabase(newCategory), { onConflict: 'id' })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase category insert warning:', error.message);
            broadcastCatalogChange();
          },
          (err: any) => console.error('Supabase category direct insert failed:', err)
        );
    }

    // 2. Persist to server API
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    })
      .then(() => broadcastCatalogChange())
      .catch((err) => console.error('Failed to sync category to API:', err));

    broadcastCatalogChange();
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
          .then(
            ({ error }) => {
              if (error) console.warn('Supabase category update warning:', error.message);
              broadcastCatalogChange();
            },
            (err: any) => console.error('Supabase update category failed:', err)
          );
      }

      fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCat),
      })
        .then(() => broadcastCatalogChange())
        .catch((err) => console.error('Failed to update category in API:', err));

      broadcastCatalogChange();
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

    // 1. Record in tombstone
    recordDeletedCategory(id);

    // 2. Remove from categories state
    const nextCategories = categories.filter((c) => c.id !== id);
    setCategories(nextCategories);
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCategories));
    } catch {}

    // 3. Move products of deleted category to another active category
    const fallbackCategory = nextCategories[0]?.slug || 'other';
    setProducts((prev) =>
      prev.map((p) => (p.category === target.slug ? { ...p, category: fallbackCategory } : p))
    );

    showToast(`Category "${target.name}" removed from customer catalog.`);

    // 4. Delete directly from Supabase
    deleteCategoryFromSupabase(id).then((res) => {
      if (!res.success) {
        console.warn('Supabase category delete warning:', res.error);
      }
      broadcastCatalogChange();
    });

    // 5. Delete on server API
    fetch(`/api/categories/${id}`, { method: 'DELETE' })
      .then(() => broadcastCatalogChange())
      .catch((err) => console.error('Failed to delete category from API:', err));

    broadcastCatalogChange();
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
    localStorage.removeItem(STORAGE_KEYS.DELETED_PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_CATEGORIES);
    setProducts(initialProducts);
    setCategories(initialCategories);
    setBlogPosts(initialBlogPosts);
    setMediaLibrary(initialMediaItems);
    showToast('Restored default catalog.');
    broadcastCatalogChange();
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
        refreshCatalog,
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
