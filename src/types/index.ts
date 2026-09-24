export type CategorySlug =
  | 'gujjar'
  | 'jaat'
  | 'yadav'
  | 'rajput'
  | 'brahmin'
  | 'jatav'
  | 'other'
  | (string & {});

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  headline: string;
  description: string;
  image: string;
  itemCount?: number;
}

export type AffiliatePlatform =
  | 'Amazon'
  | 'Flipkart'
  | 'Meesho'
  | 'Bank Partner'
  | 'Other';

export type ButtonActionText = 'Shop Now' | 'Apply Now' | 'Check Offer';

export interface Product {
  id: string;
  name: string;
  image: string;
  galleryImages: string[];
  shortDescription: string;
  fullDescription: string;
  category: CategorySlug;
  subcategory: string;
  price: number;
  originalPrice: number;
  discount: number;
  platform: AffiliatePlatform;
  affiliateUrl: string;
  buttonText: ButtonActionText;
  isFeatured: boolean;
  isTrending: boolean;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isPublished: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  tags: string[];
  relatedCategorySlug?: CategorySlug;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  category?: string;
  sizeKb?: number;
  uploadedAt: string;
}

export type PageView =
  | 'home'
  | 'categories'
  | 'category-detail'
  | 'trending'
  | 'blog'
  | 'blog-detail'
  | 'about'
  | 'contact'
  | 'privacy-policy'
  | 'terms-conditions'
  | 'affiliate-disclosure'
  | 'disclaimer'
  | 'admin';
