import { db } from './index.ts';
import { products, categories, blogPosts, wishlists, clickEvents } from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { Product, Category, BlogPost } from '../types';

export async function getAllProducts(): Promise<Product[]> {
  try {
    const rows = await db.select().from(products);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortDescription: r.shortDescription || '',
      fullDescription: r.fullDescription || '',
      category: r.category as any,
      subcategory: r.subcategory || '',
      price: r.price,
      originalPrice: r.originalPrice,
      discount: r.discount,
      rating: parseFloat(r.rating || '4.8'),
      reviewCount: r.reviewCount || 0,
      inStock: r.inStock !== false,
      image: r.image,
      galleryImages: r.galleryImages ? JSON.parse(r.galleryImages) : [],
      platform: r.platform as any,
      affiliateUrl: r.affiliateUrl,
      buttonText: (r.buttonText || 'Shop Now') as any,
      isFeatured: !!r.isFeatured,
      isTrending: !!r.isTrending,
      isPublished: r.isPublished !== false,
      tags: r.tags ? JSON.parse(r.tags) : [],
      seoTitle: r.seoTitle || '',
      seoDescription: r.seoDescription || '',
      createdAt: r.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching products from database:', error);
    throw new Error('Failed to retrieve products from database', { cause: error });
  }
}

export async function upsertProduct(p: Product) {
  try {
    const values = {
      id: p.id,
      name: p.name,
      shortDescription: p.shortDescription || '',
      fullDescription: p.fullDescription || '',
      category: p.category,
      subcategory: p.subcategory || '',
      price: p.price,
      originalPrice: p.originalPrice,
      discount: p.discount,
      rating: p.rating ? p.rating.toString() : '4.8',
      reviewCount: p.reviewCount || 0,
      inStock: p.inStock !== false,
      image: p.image,
      galleryImages: p.galleryImages ? JSON.stringify(p.galleryImages) : null,
      platform: p.platform,
      affiliateUrl: p.affiliateUrl,
      buttonText: p.buttonText || 'Shop Now',
      isFeatured: !!p.isFeatured,
      isTrending: !!p.isTrending,
      isPublished: p.isPublished !== false,
      tags: p.tags ? JSON.stringify(p.tags) : null,
      seoTitle: p.seoTitle || '',
      seoDescription: p.seoDescription || '',
      createdAt: p.createdAt || new Date().toISOString(),
    };

    const res = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.id,
        set: values,
      })
      .returning();

    return res[0];
  } catch (error) {
    console.error('Error saving product:', error);
    throw new Error('Failed to save product in database', { cause: error });
  }
}

export async function deleteProductById(id: string) {
  try {
    await db.delete(products).where(eq(products.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw new Error('Failed to delete product', { cause: error });
  }
}

export async function getAllCategories(): Promise<Category[]> {
  try {
    const rows = await db.select().from(categories);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug as any,
      headline: r.headline || '',
      description: r.description || '',
      image: r.image,
      itemCount: r.itemCount || 0,
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to retrieve categories', { cause: error });
  }
}

export async function upsertCategory(c: Category) {
  try {
    const values = {
      id: c.id,
      name: c.name,
      slug: c.slug,
      headline: c.headline || '',
      description: c.description || '',
      image: c.image,
      itemCount: c.itemCount || 0,
    };

    const res = await db
      .insert(categories)
      .values(values)
      .onConflictDoUpdate({
        target: categories.id,
        set: values,
      })
      .returning();

    return res[0];
  } catch (error) {
    console.error('Error saving category:', error);
    throw new Error('Failed to save category in database', { cause: error });
  }
}

export async function deleteCategoryById(id: string) {
  try {
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    throw new Error('Failed to delete category', { cause: error });
  }
}

export async function updateProductStock(id: string, inStock: boolean) {
  try {
    const res = await db
      .update(products)
      .set({ inStock })
      .where(eq(products.id, id))
      .returning();
    return res[0];
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw new Error('Failed to update product stock in database', { cause: error });
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const rows = await db.select().from(blogPosts);
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      content: r.content,
      category: r.category,
      coverImage: r.coverImage,
      author: r.author,
      date: r.date,
      readTime: r.readTime,
      tags: r.tags ? JSON.parse(r.tags) : [],
      relatedCategorySlug: r.relatedCategorySlug ? (r.relatedCategorySlug as any) : undefined,
    }));
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw new Error('Failed to retrieve blog posts', { cause: error });
  }
}

export async function upsertBlogPost(b: BlogPost) {
  try {
    const values = {
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      content: b.content,
      category: b.category,
      coverImage: b.coverImage,
      author: b.author || 'APNI PEHCHAAN Editorial',
      date: b.date || new Date().toISOString().split('T')[0],
      readTime: b.readTime || '4 min read',
      tags: b.tags ? JSON.stringify(b.tags) : null,
      relatedCategorySlug: b.relatedCategorySlug || null,
    };

    const res = await db
      .insert(blogPosts)
      .values(values)
      .onConflictDoUpdate({
        target: blogPosts.id,
        set: values,
      })
      .returning();

    return res[0];
  } catch (error) {
    console.error('Error saving blog post:', error);
    throw new Error('Failed to save blog post in database', { cause: error });
  }
}

export async function deleteBlogPostById(id: string) {
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting blog post:', error);
    throw new Error('Failed to delete blog post', { cause: error });
  }
}

export async function getUserWishlist(userId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    return rows.map((r) => r.productId);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return [];
  }
}

export async function toggleUserWishlistItem(userId: string, productId: string): Promise<boolean> {
  try {
    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(wishlists)
        .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
      return false; // removed
    } else {
      await db.insert(wishlists).values({ userId, productId });
      return true; // added
    }
  } catch (error) {
    console.error('Error toggling wishlist item:', error);
    throw new Error('Wishlist update failed', { cause: error });
  }
}

export async function recordAffiliateClick(productId: string, platform: string, userId?: string) {
  try {
    await db.insert(clickEvents).values({
      productId,
      platform,
      userId: userId || null,
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording click event:', error);
    return { success: false };
  }
}
