import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth uid)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Categories table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  headline: text('headline'),
  description: text('description'),
  image: text('image').notNull(),
  itemCount: integer('item_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortDescription: text('short_description'),
  fullDescription: text('full_description'),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  price: integer('price').notNull(),
  originalPrice: integer('original_price').notNull(),
  discount: integer('discount').notNull(),
  rating: numeric('rating').default('4.8'),
  reviewCount: integer('review_count').default(0),
  inStock: boolean('in_stock').default(true),
  image: text('image').notNull(),
  galleryImages: text('gallery_images'), // JSON string array of URLs
  platform: text('platform').notNull(),
  affiliateUrl: text('affiliate_url').notNull(),
  buttonText: text('button_text').notNull().default('Shop Now'),
  isFeatured: boolean('is_featured').default(false),
  isTrending: boolean('is_trending').default(false),
  isPublished: boolean('is_published').default(true),
  tags: text('tags'), // JSON string array
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: text('created_at').notNull(),
});

// Blog Posts table
export const blogPosts = pgTable('blog_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),
  coverImage: text('cover_image').notNull(),
  author: text('author').notNull().default('APNI PEHCHAAN Editorial'),
  date: text('date').notNull(),
  readTime: text('read_time').notNull().default('4 min read'),
  tags: text('tags'), // JSON string array
  relatedCategorySlug: text('related_category_slug'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User Wishlist
export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase Auth UID
  productId: text('product_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Affiliate Click Event Tracking
export const clickEvents = pgTable('click_events', {
  id: serial('id').primaryKey(),
  productId: text('product_id').notNull(),
  platform: text('platform').notNull(),
  userId: text('user_id'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  wishlist: many(wishlists),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.uid],
  }),
}));
