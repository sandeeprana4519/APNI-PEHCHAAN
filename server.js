var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "applied-method-zmn89",
  appId: "1:233412224067:web:c93d2b0f05541b25d820f6",
  apiKey: "AIzaSyBD8eHoWX6h07Am_psi5PfANTjKy6vHiIA",
  authDomain: "applied-method-zmn89.firebaseapp.com",
  storageBucket: "applied-method-zmn89.firebasestorage.app",
  messagingSenderId: "233412224067",
  measurementId: "",
  oAuthClientId: "233412224067-ugecb33tdbv3ne1ogmul4doehk8l9c11.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/firebase-admin.ts
if (!getApps().length) {
  initializeApp({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = getAuth();

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
var optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
    } catch {
    }
  }
  next();
};

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  blogPosts: () => blogPosts,
  categories: () => categories,
  clickEvents: () => clickEvents,
  products: () => products,
  users: () => users,
  usersRelations: () => usersRelations,
  wishlists: () => wishlists,
  wishlistsRelations: () => wishlistsRelations
});
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow()
});
var categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  headline: text("headline"),
  description: text("description"),
  image: text("image").notNull(),
  itemCount: integer("item_count").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  price: integer("price").notNull(),
  originalPrice: integer("original_price").notNull(),
  discount: integer("discount").notNull(),
  rating: numeric("rating").default("4.8"),
  reviewCount: integer("review_count").default(0),
  inStock: boolean("in_stock").default(true),
  image: text("image").notNull(),
  galleryImages: text("gallery_images"),
  // JSON string array of URLs
  platform: text("platform").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  buttonText: text("button_text").notNull().default("Shop Now"),
  isFeatured: boolean("is_featured").default(false),
  isTrending: boolean("is_trending").default(false),
  isPublished: boolean("is_published").default(true),
  tags: text("tags"),
  // JSON string array
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: text("created_at").notNull()
});
var blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  coverImage: text("cover_image").notNull(),
  author: text("author").notNull().default("APNI PEHCHAAN Editorial"),
  date: text("date").notNull(),
  readTime: text("read_time").notNull().default("4 min read"),
  tags: text("tags"),
  // JSON string array
  relatedCategorySlug: text("related_category_slug"),
  createdAt: timestamp("created_at").defaultNow()
});
var wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  // Firebase Auth UID
  productId: text("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var clickEvents = pgTable("click_events", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  platform: text("platform").notNull(),
  userId: text("user_id"),
  timestamp: timestamp("timestamp").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  wishlist: many(wishlists)
}));
var wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.uid]
  })
}));

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/users.ts
import { eq } from "drizzle-orm";
async function getOrCreateUser(data) {
  try {
    const result = await db.insert(users).values({
      uid: data.uid,
      email: data.email,
      displayName: data.displayName || null,
      photoUrl: data.photoUrl || null,
      role: data.role || "user"
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email: data.email,
        displayName: data.displayName || null,
        photoUrl: data.photoUrl || null
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// src/db/queries.ts
import { eq as eq2, and } from "drizzle-orm";
async function getAllProducts() {
  try {
    const rows = await db.select().from(products);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortDescription: r.shortDescription || "",
      fullDescription: r.fullDescription || "",
      category: r.category,
      subcategory: r.subcategory || "",
      price: r.price,
      originalPrice: r.originalPrice,
      discount: r.discount,
      rating: parseFloat(r.rating || "4.8"),
      reviewCount: r.reviewCount || 0,
      inStock: r.inStock !== false,
      image: r.image,
      galleryImages: r.galleryImages ? JSON.parse(r.galleryImages) : [],
      platform: r.platform,
      affiliateUrl: r.affiliateUrl,
      buttonText: r.buttonText || "Shop Now",
      isFeatured: !!r.isFeatured,
      isTrending: !!r.isTrending,
      isPublished: r.isPublished !== false,
      tags: r.tags ? JSON.parse(r.tags) : [],
      seoTitle: r.seoTitle || "",
      seoDescription: r.seoDescription || "",
      createdAt: r.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch (error) {
    console.error("Error fetching products from database:", error);
    throw new Error("Failed to retrieve products from database", { cause: error });
  }
}
async function upsertProduct(p) {
  try {
    const values = {
      id: p.id,
      name: p.name,
      shortDescription: p.shortDescription || "",
      fullDescription: p.fullDescription || "",
      category: p.category,
      subcategory: p.subcategory || "",
      price: p.price,
      originalPrice: p.originalPrice,
      discount: p.discount,
      rating: p.rating ? p.rating.toString() : "4.8",
      reviewCount: p.reviewCount || 0,
      inStock: p.inStock !== false,
      image: p.image,
      galleryImages: p.galleryImages ? JSON.stringify(p.galleryImages) : null,
      platform: p.platform,
      affiliateUrl: p.affiliateUrl,
      buttonText: p.buttonText || "Shop Now",
      isFeatured: !!p.isFeatured,
      isTrending: !!p.isTrending,
      isPublished: p.isPublished !== false,
      tags: p.tags ? JSON.stringify(p.tags) : null,
      seoTitle: p.seoTitle || "",
      seoDescription: p.seoDescription || "",
      createdAt: p.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    const res = await db.insert(products).values(values).onConflictDoUpdate({
      target: products.id,
      set: values
    }).returning();
    return res[0];
  } catch (error) {
    console.error("Error saving product:", error);
    throw new Error("Failed to save product in database", { cause: error });
  }
}
async function deleteProductById(id) {
  try {
    await db.delete(products).where(eq2(products.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product", { cause: error });
  }
}
async function getAllCategories() {
  try {
    const rows = await db.select().from(categories);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      headline: r.headline || "",
      description: r.description || "",
      image: r.image,
      itemCount: r.itemCount || 0
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to retrieve categories", { cause: error });
  }
}
async function upsertCategory(c) {
  try {
    const values = {
      id: c.id,
      name: c.name,
      slug: c.slug,
      headline: c.headline || "",
      description: c.description || "",
      image: c.image,
      itemCount: c.itemCount || 0
    };
    const res = await db.insert(categories).values(values).onConflictDoUpdate({
      target: categories.id,
      set: values
    }).returning();
    return res[0];
  } catch (error) {
    console.error("Error saving category:", error);
    throw new Error("Failed to save category in database", { cause: error });
  }
}
async function deleteCategoryById(id) {
  try {
    await db.delete(categories).where(eq2(categories.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new Error("Failed to delete category", { cause: error });
  }
}
async function updateProductStock(id, inStock) {
  try {
    const res = await db.update(products).set({ inStock }).where(eq2(products.id, id)).returning();
    return res[0];
  } catch (error) {
    console.error("Error updating product stock:", error);
    throw new Error("Failed to update product stock in database", { cause: error });
  }
}
async function getAllBlogPosts() {
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
      relatedCategorySlug: r.relatedCategorySlug ? r.relatedCategorySlug : void 0
    }));
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw new Error("Failed to retrieve blog posts", { cause: error });
  }
}
async function upsertBlogPost(b) {
  try {
    const values = {
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      content: b.content,
      category: b.category,
      coverImage: b.coverImage,
      author: b.author || "APNI PEHCHAAN Editorial",
      date: b.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      readTime: b.readTime || "4 min read",
      tags: b.tags ? JSON.stringify(b.tags) : null,
      relatedCategorySlug: b.relatedCategorySlug || null
    };
    const res = await db.insert(blogPosts).values(values).onConflictDoUpdate({
      target: blogPosts.id,
      set: values
    }).returning();
    return res[0];
  } catch (error) {
    console.error("Error saving blog post:", error);
    throw new Error("Failed to save blog post in database", { cause: error });
  }
}
async function deleteBlogPostById(id) {
  try {
    await db.delete(blogPosts).where(eq2(blogPosts.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting blog post:", error);
    throw new Error("Failed to delete blog post", { cause: error });
  }
}
async function getUserWishlist(userId) {
  try {
    const rows = await db.select({ productId: wishlists.productId }).from(wishlists).where(eq2(wishlists.userId, userId));
    return rows.map((r) => r.productId);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }
}
async function toggleUserWishlistItem(userId, productId) {
  try {
    const existing = await db.select().from(wishlists).where(and(eq2(wishlists.userId, userId), eq2(wishlists.productId, productId))).limit(1);
    if (existing.length > 0) {
      await db.delete(wishlists).where(and(eq2(wishlists.userId, userId), eq2(wishlists.productId, productId)));
      return false;
    } else {
      await db.insert(wishlists).values({ userId, productId });
      return true;
    }
  } catch (error) {
    console.error("Error toggling wishlist item:", error);
    throw new Error("Wishlist update failed", { cause: error });
  }
}
async function recordAffiliateClick(productId, platform, userId) {
  try {
    await db.insert(clickEvents).values({
      productId,
      platform,
      userId: userId || null
    });
    return { success: true };
  } catch (error) {
    console.error("Error recording click event:", error);
    return { success: false };
  }
}

// src/data/initialData.ts
var HERO_IMAGE = "/images/hero_apni_pehchaan_1790228991906.jpg";
var ACCESSORY_IMAGE = "/images/cat_gujjar_jaat_style_1790229006717.jpg";
var RAJPUT_IMAGE = "/images/cat_rajput_heritage_1790229019313.jpg";
var ETHNIC_IMAGE = "/images/cat_yadav_brahmin_1790229031674.jpg";
var BLOG_TURBAN_IMAGE = "/images/blog_turban_guide_1790229043202.jpg";
var initialCategories = [
  {
    id: "cat-gujjar",
    name: "Gujjar",
    slug: "gujjar",
    headline: "Heritage, Strength & Royal Pride",
    description: "Curated collection of authentic heavy brass & silver Kadas, cultural kurtas, car crests, and identity lifestyle accessories.",
    image: ACCESSORY_IMAGE
  },
  {
    id: "cat-jaat",
    name: "Jaat",
    slug: "jaat",
    headline: "Valiant Spirit & Modern Desi Style",
    description: "Signature heavy Kada bracelets, premium heavyweight graphic hoodies, traditional brass hookahs, and automotive emblems.",
    image: ACCESSORY_IMAGE
  },
  {
    id: "cat-yadav",
    name: "Yadav",
    slug: "yadav",
    headline: "Divine Heritage & Timeless Elegance",
    description: "Gold-accented Krishna Morpankh motifs, festive tussar silk kurta sets, pure copper wellness accessories, and personalized wallets.",
    image: ETHNIC_IMAGE
  },
  {
    id: "cat-rajput",
    name: "Rajput",
    slug: "rajput",
    headline: "Royal Rajputana Splendor & Chivalry",
    description: "Handcrafted Bandhani safas with kalgi brooches, velvet sherwani jackets, decorative heritage talwars, and royal mojari shoes.",
    image: RAJPUT_IMAGE
  },
  {
    id: "cat-brahmin",
    name: "Brahmin",
    slug: "brahmin",
    headline: "Spiritual Wisdom & Sacred Traditions",
    description: "Certified silver-capped Rudraksha malas, pure Pitambari dhoti angavastrams, Gayatri mantra engraved cuffs, and brass pooja sets.",
    image: ETHNIC_IMAGE
  },
  {
    id: "cat-jatav",
    name: "Jatav",
    slug: "jatav",
    headline: "Dignity, Intellect & Modern Identity",
    description: "Iconic Ashoka pillar emblems, sharp tailored royal blue bandhgala suits, sleek steel statement bracelets, and luxury executive journals.",
    image: ACCESSORY_IMAGE
  },
  {
    id: "cat-other",
    name: "Other",
    slug: "other",
    headline: "Premium Lifestyle & Financial Offers",
    description: "Curated zero-fee cashback credit cards, exclusive shopping rewards, premium festival hampers, and trending smart gadgets.",
    image: HERO_IMAGE
  }
];
var initialProducts = [
  // Gujjar
  {
    id: "prod-g-01",
    name: "Royal Veer Gujjar Heavy Carved Solid Brass Kada",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE, RAJPUT_IMAGE],
    shortDescription: "Substantial 180g solid brass wristband with embossed traditional lion motifs and mirror-polished inner comfort edge.",
    fullDescription: "Crafted for unmatched presence, this authentic Gujjar identity Kada is cast from pure virgin brass with deep lion engravings. Hand-finished with anti-tarnish coating to ensure a lasting golden sheen.",
    category: "gujjar",
    subcategory: "Traditional Jewelry & Wristwear",
    price: 1499,
    originalPrice: 2999,
    discount: 50,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-gujjar-kada?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Gujjar", "Brass Kada", "Wristwear", "Royal Jewelry"],
    seoTitle: "Royal Veer Gujjar Solid Brass Kada \u2013 Best Price on Amazon",
    seoDescription: "Buy authentic 180g solid brass Gujjar Kada with lion engraving online. Best price & fast shipping via Amazon affiliate link.",
    rating: 4.9,
    reviewCount: 382,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-10"
  },
  {
    id: "prod-g-02",
    name: "Gurjar 3D Heavy Metal Car & SUV Hood Emblem",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE],
    shortDescription: "Weatherproof chrome-plated zinc alloy emblem with 3M industrial adhesive for Thar, Scorpio, and Fortuner.",
    fullDescription: "Add bold identity to your vehicle with this laser-cut 3D emblem. Rust-proof, water-resistant, and tested for highway conditions without fading or peeling.",
    category: "gujjar",
    subcategory: "Automotive & Lifestyle Accessories",
    price: 649,
    originalPrice: 1299,
    discount: 50,
    platform: "Flipkart",
    affiliateUrl: "https://www.flipkart.com/example-gurjar-car-emblem?affid=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: false,
    isTrending: true,
    tags: ["Car Accessories", "Gujjar Badge", "3D Emblem", "Scorpio Accessories"],
    seoTitle: "Gurjar 3D Heavy Metal Car Emblem \u2013 Check Flipkart Offer",
    seoDescription: "Premium chrome 3D metal car emblem for Gujjar pride. Easy stick-on installation. Discover discounts on Flipkart.",
    rating: 4.8,
    reviewCount: 215,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-12"
  },
  {
    id: "prod-g-03",
    name: "Handcrafted Raw Khadi Cotton Kurta with Saffron Threading",
    image: ETHNIC_IMAGE,
    galleryImages: [ETHNIC_IMAGE, HERO_IMAGE],
    shortDescription: "Breathable organic khadi kurta with mandarin collar, antique metal buttons, and tailored comfort fit.",
    fullDescription: "Hand-spun khadi cotton dyed with natural colors. Features reinforced double-stitched seams and side slits for effortless movement in all seasons.",
    category: "gujjar",
    subcategory: "Heritage Apparel",
    price: 1199,
    originalPrice: 2499,
    discount: 52,
    platform: "Meesho",
    affiliateUrl: "https://www.meesho.com/example-khadi-kurta?p=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: false,
    tags: ["Khadi Kurta", "Ethnic Wear", "Gujjar Fashion", "Handloom"],
    seoTitle: "Handcrafted Khadi Kurta for Men \u2013 Exclusive Deal on Meesho",
    seoDescription: "Shop comfortable 100% Khadi cotton kurta for festivals and everyday wear. Verified affiliate link with direct cashback.",
    rating: 4.7,
    reviewCount: 154,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-15"
  },
  // Jaat
  {
    id: "prod-j-01",
    name: "Solid 925 Sterling Silver Royal Jaat Heavy Kada (120g)",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE, RAJPUT_IMAGE],
    shortDescription: "Hallmarked pure sterling silver heavy Kada with traditional chisel-carved geometric border and openable spring pin.",
    fullDescription: "Certified BIS Hallmarked 925 Pure Silver Kada with weighted wrist feel. Perfect heirloom piece symbolizing bravery, endurance, and rustic elegance.",
    category: "jaat",
    subcategory: "Traditional Jewelry & Wristwear",
    price: 9499,
    originalPrice: 13999,
    discount: 32,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-jaat-silver-kada?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Jaat", "925 Silver", "Heavy Kada", "BIS Hallmarked"],
    seoTitle: "925 Sterling Silver Jaat Kada \u2013 Hallmarked on Amazon",
    seoDescription: "Authentic 925 pure silver Jaat Kada with BIS hallmark. Heavyweight masculine styling at best online price.",
    rating: 4.9,
    reviewCount: 420,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-08"
  },
  {
    id: "prod-j-02",
    name: "Heavyweight 420 GSM Desi Swag Jaat Fleece Hoodie",
    image: HERO_IMAGE,
    galleryImages: [HERO_IMAGE],
    shortDescription: "Pre-shrunk ultra-dense cotton fleece pullover hoodie with high-density embroidered identity chest badge.",
    fullDescription: "Built for winter rallies and street style. Features a double-layered drawstring hood, ribbed cuffs, and spacious kangaroo pocket.",
    category: "jaat",
    subcategory: "Modern Streetwear",
    price: 1399,
    originalPrice: 2799,
    discount: 50,
    platform: "Flipkart",
    affiliateUrl: "https://www.flipkart.com/example-jaat-hoodie?affid=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: false,
    isTrending: true,
    tags: ["Jaat Hoodie", "Streetwear", "420 GSM Cotton", "Winter Wear"],
    seoTitle: "Jaat Heavyweight Fleece Hoodie \u2013 Flipkart Deals",
    seoDescription: "High density cotton Jaat hoodie with premium embroidery. Durable fabric, warm fleece lining, best price.",
    rating: 4.7,
    reviewCount: 198,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-14"
  },
  {
    id: "prod-j-03",
    name: "Handcarved Sheesham Wood & Brass Desi Huqqa Set",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE],
    shortDescription: "Decorative traditional north-Indian village hookah with carved brass water bowl and wooden stem.",
    fullDescription: "An iconic showpiece for drawing rooms, farmhouse verandahs, and cultural heritage display. Authentic rural craftsmanship with ornamental brass accents.",
    category: "jaat",
    subcategory: "Heritage Home Decor",
    price: 2499,
    originalPrice: 4999,
    discount: 50,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-sheesham-hookah?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: false,
    tags: ["Huqqa", "Sheesham Wood", "Brass Hookah", "Village Decor"],
    seoTitle: "Traditional Sheesham Brass Huqqa Showpiece \u2013 Amazon Offer",
    seoDescription: "Handcrafted Sheesham wood and brass decorative hookah. Classic north Indian heritage decor.",
    rating: 4.8,
    reviewCount: 112,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-11"
  },
  // Yadav
  {
    id: "prod-y-01",
    name: "Divine 24K Gold-Plated Krishna Morpankh & Flute Silver Pendant",
    image: ETHNIC_IMAGE,
    galleryImages: [ETHNIC_IMAGE, ACCESSORY_IMAGE],
    shortDescription: "Intricately detailed peacock feather & sacred flute pendant with green and royal blue Austrian cubic zirconia.",
    fullDescription: "Dedicated to Lord Krishna, this auspicious pendant represents joy, duty, and spiritual elegance. Comes with an anti-tarnish rhodium cable chain.",
    category: "yadav",
    subcategory: "Sacred Jewelry & Pendants",
    price: 1299,
    originalPrice: 2999,
    discount: 57,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-krishna-morpankh-pendant?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Yadav", "Krishna Pendant", "Morpankh", "Gold Plated"],
    seoTitle: "Gold-Plated Krishna Morpankh Silver Pendant \u2013 Buy on Amazon",
    seoDescription: "Beautiful 24K gold plated peacock feather and flute pendant. Certified anti-allergic alloy with chain included.",
    rating: 4.9,
    reviewCount: 310,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-09"
  },
  {
    id: "prod-y-02",
    name: "Traditional Pure Tussar Silk Festive Kurta Pajama in Royal Cream",
    image: ETHNIC_IMAGE,
    galleryImages: [ETHNIC_IMAGE, HERO_IMAGE],
    shortDescription: "Lustrous festive tussar silk blend kurta set with delicate resham thread work on collar and placket.",
    fullDescription: "Drape yourself in royal cultural grace. Tailored to perfection with pure cotton inner lining for all-day comfort during weddings and cultural festivities.",
    category: "yadav",
    subcategory: "Heritage Apparel",
    price: 1899,
    originalPrice: 3999,
    discount: 53,
    platform: "Flipkart",
    affiliateUrl: "https://www.flipkart.com/example-tussar-kurta-set?affid=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: false,
    isTrending: true,
    tags: ["Silk Kurta", "Yadav Fashion", "Festive Kurta Pajama", "Ethnic Men"],
    seoTitle: "Tussar Silk Kurta Pajama Set \u2013 Check Discount on Flipkart",
    seoDescription: "Festive raw tussar silk kurta pajama set with embroidered collar. Breathable lining and royal aesthetic.",
    rating: 4.8,
    reviewCount: 167,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-13"
  },
  // Rajput
  {
    id: "prod-r-01",
    name: "Royal Rajputana Pachrangi Silk Bandhani Safa with Pearl Kalgi",
    image: RAJPUT_IMAGE,
    galleryImages: [RAJPUT_IMAGE, BLOG_TURBAN_IMAGE],
    shortDescription: "Authentic 5-colored Rajasthani tie-dye silk pagri complete with antique gold brooch jewel and pearl strings.",
    fullDescription: "Experience royal Maharana grace with this traditional 9-meter hand-tied Bandhani safa. Lightweight, breathable, and adorned with an exquisite Kalgi brooch with dangling faux pearls.",
    category: "rajput",
    subcategory: "Royal Turbans & Headwear",
    price: 2199,
    originalPrice: 4500,
    discount: 51,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-rajput-safa-turban?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Rajput", "Bandhani Safa", "Royal Turban", "Kalgi Brooch", "Banna Style"],
    seoTitle: "Rajputana Silk Bandhani Safa with Kalgi Brooch \u2013 Amazon",
    seoDescription: "Authentic royal Rajasthani 5-color Bandhani safa with pearl brooch. Perfect for wedding grooms and cultural festivals.",
    rating: 5,
    reviewCount: 489,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-05"
  },
  {
    id: "prod-r-02",
    name: "Handcrafted Heritage Decorative Talwar Sword with Velvet Sheath",
    image: RAJPUT_IMAGE,
    galleryImages: [RAJPUT_IMAGE],
    shortDescription: "Display replica steel sword with brass lion hilt, intricate laser engraving, and crimson velvet scabbard.",
    fullDescription: "A magnificent heritage display artifact designed for ceremonial groom wear, royal wall decor, and ancestral weapon collections. (Blunt display collector replica).",
    category: "rajput",
    subcategory: "Ceremonial & Heritage Artifacts",
    price: 3899,
    originalPrice: 7999,
    discount: 51,
    platform: "Flipkart",
    affiliateUrl: "https://www.flipkart.com/example-rajput-talwar-replica?affid=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: false,
    tags: ["Rajput Talwar", "Heritage Sword", "Wedding Groom Sword", "Brass Hilt"],
    seoTitle: "Handcrafted Ceremonial Rajput Talwar Replica \u2013 Flipkart",
    seoDescription: "Blunt decorative steel ceremonial sword with lion brass hilt and red velvet scabbard. Authentic royal replica.",
    rating: 4.8,
    reviewCount: 142,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-07"
  },
  // Brahmin
  {
    id: "prod-b-01",
    name: "Certified Natural 5-Mukhi Indonesian Rudraksha Mala in Pure Silver",
    image: ETHNIC_IMAGE,
    galleryImages: [ETHNIC_IMAGE, ACCESSORY_IMAGE],
    shortDescription: "108+1 natural 5-Mukhi Rudraksha beads enclosed in hallmarked 92.5 pure silver wire and capping.",
    fullDescription: "Lab-certified authentic beads for japa, meditation, and daily wearing. Silver wire strung with secure s-hook clasp for lifetime durability and peace of mind.",
    category: "brahmin",
    subcategory: "Spiritual & Sacred Accessories",
    price: 2799,
    originalPrice: 5999,
    discount: 53,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-rudraksha-silver-mala?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Brahmin", "Rudraksha Mala", "Silver Capping", "Spiritual Jewelry"],
    seoTitle: "Certified 5 Mukhi Rudraksha Silver Mala \u2013 Amazon Deal",
    seoDescription: "108 original Rudraksha beads strung in pure silver capping. Laboratory certified for daily protection and meditation.",
    rating: 4.9,
    reviewCount: 520,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-04"
  },
  {
    id: "prod-b-02",
    name: "Pure Brass Engraved Gayatri Mantra Heavy Cuff Bracelet",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE],
    shortDescription: "Open-ended adjustable brass wrist cuff engraved in Sanskrit Devanagari script with sacred Om emblems.",
    fullDescription: "Polished to an antique golden shine with clear Devanagari lettering of the revered Gayatri Mantra. Designed for mindful energy, calm, and cultural pride.",
    category: "brahmin",
    subcategory: "Traditional Jewelry & Wristwear",
    price: 799,
    originalPrice: 1599,
    discount: 50,
    platform: "Meesho",
    affiliateUrl: "https://www.meesho.com/example-gayatri-mantra-kada?p=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: false,
    isTrending: true,
    tags: ["Gayatri Mantra", "Brass Bracelet", "Brahmin Jewelry", "Sanskrit Cuff"],
    seoTitle: "Gayatri Mantra Brass Cuff Bracelet \u2013 Meesho Direct Offer",
    seoDescription: "Beautiful Sanskrit engraved brass Kada for men and women. Adjustable size with high gloss finish.",
    rating: 4.8,
    reviewCount: 231,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-12"
  },
  // Jatav
  {
    id: "prod-jt-01",
    name: "Heavy Brass Ashoka Lion Capital & Dhamma Wheel Desk Emblem",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE],
    shortDescription: "Solid cast brass 4-lion Sarnath emblem mounted on rich walnut wood base with engraved identity plaque.",
    fullDescription: "Symbol of sovereign pride, truth, and equality. Weighing 750g, this desktop masterpiece is coated with automotive lacquer to prevent oxidization.",
    category: "jatav",
    subcategory: "Identity Desk Decor",
    price: 1899,
    originalPrice: 3499,
    discount: 46,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-ashoka-pillar-brass?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Jatav", "Ashoka Pillar", "Brass Trophy", "Desk Decor"],
    seoTitle: "Solid Brass Ashoka Lion Capital Desk Trophy \u2013 Amazon Best Price",
    seoDescription: "750g solid brass Ashoka pillar desktop emblem with wooden base. High precision carving and glossy finish.",
    rating: 4.9,
    reviewCount: 295,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-06"
  },
  {
    id: "prod-jt-02",
    name: "Executive Royal Blue Structured Bandhgala Jodhpuri Suit Jacket",
    image: HERO_IMAGE,
    galleryImages: [HERO_IMAGE, ETHNIC_IMAGE],
    shortDescription: "Tailored poly-viscose blend jacket with structured shoulder pads, stand collar, and crested brass buttons.",
    fullDescription: "Command respect in every assembly. Deep royal blue hue with tailored chest canvas, breathable satin lining, and two internal passport pockets.",
    category: "jatav",
    subcategory: "Formal Heritage Apparel",
    price: 3299,
    originalPrice: 6999,
    discount: 53,
    platform: "Flipkart",
    affiliateUrl: "https://www.flipkart.com/example-royal-blue-bandhgala?affid=apnipehchaan",
    buttonText: "Shop Now",
    isFeatured: true,
    isTrending: false,
    tags: ["Bandhgala", "Royal Blue Suit", "Jodhpuri Blazer", "Formal Wear"],
    seoTitle: "Royal Blue Bandhgala Jodhpuri Jacket \u2013 Flipkart Price Drop",
    seoDescription: "Sophisticated royal blue formal suit jacket with brass buttons. Ideal for celebrations, conferences, and weddings.",
    rating: 4.8,
    reviewCount: 189,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-10"
  },
  // Other (Financial, Banking, Lifestyle Offers)
  {
    id: "prod-oth-01",
    name: "HDFC Millennia Cash-Back Credit Card (5% Amazon & Flipkart Rebate)",
    image: HERO_IMAGE,
    galleryImages: [HERO_IMAGE],
    shortDescription: "Earn 5% flat cashback on Amazon, Flipkart, Myntra, Swiggy + 1% all other spends with annual fee waiver.",
    fullDescription: "The premier shopping credit card for online deal hunters. Welcome benefit of 1000 CashPoints upon card activation. Zero liability on lost cards and contactless tap-and-pay capability.",
    category: "other",
    subcategory: "Banking & Financial Partner Offers",
    price: 0,
    originalPrice: 1e3,
    discount: 100,
    platform: "Bank Partner",
    affiliateUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/millennia-cards?promocode=APNIPEHCHAAN",
    buttonText: "Apply Now",
    isFeatured: true,
    isTrending: true,
    tags: ["Credit Card", "Cashback", "HDFC Bank", "Amazon Discount", "Zero Fee"],
    seoTitle: "HDFC Millennia Card: 5% Cashback on Amazon & Flipkart \u2013 Apply Now",
    seoDescription: "Apply for HDFC Millennia credit card online. Get 5% cashback on leading shopping sites plus complimentary lounge access.",
    rating: 4.9,
    reviewCount: 890,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-01"
  },
  {
    id: "prod-oth-02",
    name: "Tata Neu Infinity RuPay Credit Card (Up to 10% NeuCoins + UPI Access)",
    image: HERO_IMAGE,
    galleryImages: [HERO_IMAGE],
    shortDescription: "Link with Google Pay & PhonePe for 1.5% cashback on UPI QR scans + 8 complimentary domestic lounge visits.",
    fullDescription: "Seamlessly pay via UPI and earn accelerated NeuCoins across Air India, Croma, BigBasket, and 1mg. Low interest rates and complimentary international lounge visits.",
    category: "other",
    subcategory: "Banking & Financial Partner Offers",
    price: 0,
    originalPrice: 1499,
    discount: 100,
    platform: "Bank Partner",
    affiliateUrl: "https://www.tataneu.com/credit-card?ref=apnipehchaan",
    buttonText: "Check Offer",
    isFeatured: true,
    isTrending: true,
    tags: ["RuPay Card", "UPI Cashback", "Tata Neu", "Lounge Access"],
    seoTitle: "Tata Neu Infinity RuPay Credit Card \u2013 Special Partner Offer",
    seoDescription: "Get up to 10% NeuCoins and UPI transaction rewards with the Tata Neu Infinity credit card. Instant digital approval.",
    rating: 4.8,
    reviewCount: 440,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-03"
  },
  {
    id: "prod-oth-03",
    name: "Heritage Pure Brass Dhoop Dani & Organic Sambrani Festival Hamper",
    image: ACCESSORY_IMAGE,
    galleryImages: [ACCESSORY_IMAGE, ETHNIC_IMAGE],
    shortDescription: "Handcrafted burner with wooden handle + 50 organic guggal and loban cups for spiritual fragrance.",
    fullDescription: "Purify your home ambience with traditional Ayurvedic aromas. Brass burner with heat-insulated teakwood grip and smokeless slow-burning charcoal cups.",
    category: "other",
    subcategory: "Festive Hampers & Wellness",
    price: 899,
    originalPrice: 1799,
    discount: 50,
    platform: "Amazon",
    affiliateUrl: "https://www.amazon.in/dp/example-brass-dhoop-dani?tag=apnipehchaan-21",
    buttonText: "Shop Now",
    isFeatured: false,
    isTrending: false,
    tags: ["Dhoop Dani", "Brass Incense", "Gift Hamper", "Festive Offer"],
    seoTitle: "Handcrafted Brass Dhoop Dani Hamper \u2013 Buy on Amazon",
    seoDescription: "Authentic brass incense burner with wooden handle and organic dhoop cups. Great gift for Diwali and housewarming.",
    rating: 4.7,
    reviewCount: 165,
    inStock: true,
    isPublished: true,
    createdAt: "2026-03-14"
  }
];
var initialBlogPosts = [
  {
    id: "blog-01",
    slug: "traditional-turbans-safas-styles-guide",
    title: "The Ultimate Guide to Traditional Turbans & Safas: Rajasthan, Haryana & Punjab",
    excerpt: "Discover the rich heritage behind Bandhani, Leheriya, and Pachrangi safas, how to select royal kalgis, and styling them for contemporary celebrations.",
    content: `Turbans (Safas and Pagris) have been the crowning glory of Indian identity for centuries. Across Rajasthan, Haryana, Punjab, and Uttar Pradesh, the fabric, fold, and color of a safa communicate prestige, lineage, and festive spirit.

### 1. The Royal Pachrangi (Five-Colored) Safa
Worn during celebratory royal occasions, the Pachrangi features five sacred hues: saffron, crimson, emerald, yellow, and royal blue. When paired with an antique gold or silver Kalgi brooch studded with pearls, it instantly elevates formal ethnic attire.

### 2. The Rajasthani Bandhani & Leheriya
Crafted using ancestral tie-and-dye techniques on pure georgette or mulmul cotton, Bandhani represents auspicious celebrations. The diagonal ripple patterns of Leheriya are traditionally worn during monsoon festivals and royal weddings.

### 3. Choosing the Perfect Fabric
For summer festivities, 100% fine cotton or Kota Doria offers breathability while holding crisp architectural pleats. For winter soirees, raw tussar silk and brocade jacquard provide warmth and a regal sheen.

Explore our curated selection of verified affiliate safas and brooch pins on APNI PEHCHAAN to find genuine handcrafted pieces directly from accredited artisans on Amazon and Flipkart.`,
    coverImage: BLOG_TURBAN_IMAGE,
    category: "Style Guides",
    author: "Vikram Singh Shekhawat",
    date: "March 18, 2026",
    readTime: "5 min read",
    tags: ["Turbans", "Safas", "Royal Fashion", "Ethnic Wear"],
    relatedCategorySlug: "rajput"
  },
  {
    id: "blog-02",
    slug: "brass-vs-sterling-silver-kada-guide",
    title: "Brass vs. Pure Silver Kada: How to Choose the Perfect Cultural Wristwear",
    excerpt: "A comprehensive comparison between heavyweight brass and 925 hallmarked sterling silver Kadas in weight, durability, spiritual significance, and maintenance.",
    content: `A Kada is far more than an accessory\u2014it is an enduring symbol of strength, discipline, and community pride across Gujjar, Jaat, and Sikh traditions.

### Solid Brass Kada
- **Aesthetic**: Warm, golden hue reminiscent of ancestral armor and temple brass.
- **Weight**: Substantial heft (150g to 220g) providing a bold masculine feel.
- **Maintenance**: Naturally patinas over time; easily restored to high shine with lemon and pitambari powder.
- **Affordability**: Excellent value for high impact and rugged durability.

### 925 Hallmarked Sterling Silver Kada
- **Aesthetic**: Refined, timeless brilliance that pairs effortlessly with both formal suits and traditional kurtas.
- **Hypoallergenic**: Safe for all sensitive skin types with zero skin discoloration.
- **Value**: Holds tangible precious metal value with official BIS hallmark authentication.
- **Weight**: Typically ranges from 80g to 150g for balanced wrist ergonomics.

Discover both verified options in our Gujjar and Jaat category sections with direct affiliate discounts!`,
    coverImage: ACCESSORY_IMAGE,
    category: "Product Comparisons",
    author: "Devendra Gurjar",
    date: "March 15, 2026",
    readTime: "4 min read",
    tags: ["Kada", "Silver", "Brass", "Jewelry Comparison"],
    relatedCategorySlug: "gujjar"
  },
  {
    id: "blog-03",
    slug: "best-high-reward-shopping-credit-cards-india",
    title: "Top High-Reward Shopping Credit Cards in India: Maximize Amazon & Flipkart Savings",
    excerpt: "How to save an extra 5% to 10% on every festive purchase, electronics, and ethnic wear using curated bank partner credit card offers.",
    content: `Smart shoppers never pay full retail price. By strategically coupling seasonal marketplace sales with high-rebate bank credit cards, you can unlock up to 10% net savings on every transaction.

### 1. HDFC Millennia Credit Card
The undisputed king of everyday online shopping. Offers 5% cashback directly as CashPoints on Amazon, Flipkart, Myntra, Swiggy, and Uber. Annual fees are waived upon reaching basic annual spend targets.

### 2. Tata Neu Infinity RuPay Card
Allows direct linkage to UPI apps like PhonePe and Google Pay, earning 1.5% cashback on merchant QR scans + 5% on partner brands. Includes complimentary domestic airport lounge access.

Check out our curated "Other" category to apply for verified pre-approved bank credit cards with exclusive welcome perks!`,
    coverImage: HERO_IMAGE,
    category: "Buying Guides",
    author: "Neha Verma",
    date: "March 12, 2026",
    readTime: "6 min read",
    tags: ["Credit Cards", "Affiliate Offers", "Shopping Hacks", "Cashback"],
    relatedCategorySlug: "other"
  },
  {
    id: "blog-04",
    slug: "five-mukhi-rudraksha-identification-guide",
    title: "How to Identify Genuine 5-Mukhi Rudraksha: Sacred Beads & Silver Settings",
    excerpt: "Practical test methods to verify natural Indonesian vs. Nepali Rudraksha beads and the benefits of pure silver wire capping.",
    content: `Rudraksha beads hold deep sacred meaning in Indian spiritual practice. The 5-Mukhi (Panchamukhi) Rudraksha is governed by Lord Shiva and is revered for promoting mental tranquility, lower blood pressure, and spiritual focus.

### Key Authenticity Indicators:
1. **Natural Facets (Mukhis)**: Real beads feature distinct, organic grooves running from the apex to the bottom without artificial glue cuts.
2. **Water Test**: Genuine dry Rudraksha beads possess natural density; synthetic plastic fakes float or peel.
3. **Pure Silver Capping**: Strung in 92.5 sterling silver wire, it shields the bead edges from wear and tear while elevating the sacred aesthetic.

Read our full collection under the Brahmin category on APNI PEHCHAAN to inspect lab-certified tested malas directly on Amazon.`,
    coverImage: ETHNIC_IMAGE,
    category: "Heritage & Lifestyle",
    author: "Acharya R. K. Sharma",
    date: "March 08, 2026",
    readTime: "4 min read",
    tags: ["Rudraksha", "Spiritual", "Brahmin Heritage", "Authenticity"],
    relatedCategorySlug: "brahmin"
  }
];

// server.ts
import { createClient } from "@supabase/supabase-js";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(__dirname, "dist", "index.html"));
var PORT = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3e3;
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      database: "cloudsql-postgresql",
      auth: "firebase-auth",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const user = await getOrCreateUser({
        uid: req.user.uid,
        email: req.user.email || "",
        displayName: req.user.name || null,
        photoUrl: req.user.picture || null
      });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  app.post("/api/auth/sync", requireAuth, async (req, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { displayName, photoUrl } = req.body;
      const user = await getOrCreateUser({
        uid: req.user.uid,
        email: req.user.email || "",
        displayName: displayName || req.user.name || null,
        photoUrl: photoUrl || req.user.picture || null
      });
      res.json(user);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });
  app.get("/api/products", async (req, res) => {
    try {
      let prods = await getAllProducts();
      if (prods.length === 0) {
        try {
          for (const p of initialProducts) {
            await upsertProduct(p);
          }
          prods = await getAllProducts();
        } catch (seedErr) {
          console.warn("Auto-seed products warning:", seedErr);
          return res.json(initialProducts);
        }
      }
      res.json(prods);
    } catch (error) {
      console.error("Failed to get products:", error);
      res.json(initialProducts);
    }
  });
  app.post("/api/products", async (req, res) => {
    try {
      const productData = req.body;
      if (!productData || !productData.id || !productData.name) {
        return res.status(400).json({ error: "Invalid product payload" });
      }
      const saved = await upsertProduct(productData);
      res.json({ success: true, product: saved });
    } catch (error) {
      console.error("Failed to save product:", error);
      res.status(500).json({ error: error.message || "Failed to save product" });
    }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteProductById(id);
      res.json({ success: true, message: `Product ${id} deleted` });
    } catch (error) {
      console.error("Failed to delete product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  app.patch("/api/products/:id/stock", async (req, res) => {
    try {
      const { id } = req.params;
      const { inStock } = req.body;
      if (typeof inStock !== "boolean") {
        return res.status(400).json({ error: "inStock boolean required" });
      }
      const updated = await updateProductStock(id, inStock);
      res.json({ success: true, product: updated });
    } catch (error) {
      console.error("Failed to update product stock:", error);
      res.status(500).json({ error: "Failed to update product stock" });
    }
  });
  app.get("/api/categories", async (req, res) => {
    try {
      let cats = await getAllCategories();
      if (cats.length === 0) {
        try {
          for (const c of initialCategories) {
            await upsertCategory(c);
          }
          cats = await getAllCategories();
        } catch (seedErr) {
          console.warn("Auto-seed categories warning:", seedErr);
          return res.json(initialCategories);
        }
      }
      res.json(cats);
    } catch (error) {
      console.error("Failed to get categories:", error);
      res.json(initialCategories);
    }
  });
  app.post("/api/categories", async (req, res) => {
    try {
      const catData = req.body;
      if (!catData || !catData.id || !catData.name || !catData.slug) {
        return res.status(400).json({ error: "Invalid category payload" });
      }
      const saved = await upsertCategory(catData);
      res.json({ success: true, category: saved });
    } catch (error) {
      console.error("Failed to save category:", error);
      res.status(500).json({ error: error.message || "Failed to save category" });
    }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteCategoryById(id);
      res.json({ success: true, message: `Category ${id} deleted` });
    } catch (error) {
      console.error("Failed to delete category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  app.get("/api/blogs", async (req, res) => {
    try {
      let blogs = await getAllBlogPosts();
      if (blogs.length === 0) {
        try {
          for (const b of initialBlogPosts) {
            await upsertBlogPost(b);
          }
          blogs = await getAllBlogPosts();
        } catch (seedErr) {
          console.warn("Auto-seed blogs warning:", seedErr);
          return res.json(initialBlogPosts);
        }
      }
      res.json(blogs);
    } catch (error) {
      console.error("Failed to get blogs:", error);
      res.json(initialBlogPosts);
    }
  });
  app.post("/api/blogs", async (req, res) => {
    try {
      const blogData = req.body;
      if (!blogData || !blogData.id || !blogData.title) {
        return res.status(400).json({ error: "Invalid blog payload" });
      }
      const saved = await upsertBlogPost(blogData);
      res.json({ success: true, blog: saved });
    } catch (error) {
      console.error("Failed to save blog:", error);
      res.status(500).json({ error: error.message || "Failed to save blog" });
    }
  });
  app.delete("/api/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteBlogPostById(id);
      res.json({ success: true, message: `Blog post ${id} deleted` });
    } catch (error) {
      console.error("Failed to delete blog:", error);
      res.status(500).json({ error: "Failed to delete blog" });
    }
  });
  app.get("/api/wishlist", requireAuth, async (req, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const list = await getUserWishlist(req.user.uid);
      res.json(list);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });
  app.post("/api/wishlist/toggle", requireAuth, async (req, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ error: "Missing productId" });
      }
      const added = await toggleUserWishlistItem(req.user.uid, productId);
      res.json({ success: true, added, productId });
    } catch (error) {
      console.error("Failed to toggle wishlist item:", error);
      res.status(500).json({ error: "Failed to toggle wishlist" });
    }
  });
  app.post("/api/track-click", optionalAuth, async (req, res) => {
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
  const normalizeUrl = (u) => {
    if (!u) return "";
    const trimmed = u.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}.supabase.co`;
  };
  const DEFAULT_SB_URL = "https://awzkiktbcfssifdxdvxr.supabase.co";
  const DEFAULT_SB_KEY = "sb_publishable_yicIcn3U8j5n6eCZEI2RUA_7LF_X-19";
  app.get("/api/supabase/status", async (req, res) => {
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
    const supabaseUrl = normalizeUrl(rawUrl);
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.json({
        configured: false,
        connected: false,
        message: "Supabase credentials not configured in environment"
      });
    }
    try {
      const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { count: catCount, error: catErr } = await client.from("categories").select("*", { count: "exact", head: true });
      const { count: prodCount, error: prodErr } = await client.from("products").select("*", { count: "exact", head: true });
      if (catErr || prodErr) {
        return res.json({
          configured: true,
          connected: false,
          error: catErr?.message || prodErr?.message,
          message: "Connected to Supabase project, but tables need to be created using supabase_schema.sql"
        });
      }
      res.json({
        configured: true,
        connected: true,
        url: supabaseUrl,
        categoriesCount: catCount || 0,
        productsCount: prodCount || 0
      });
    } catch (err) {
      res.status(500).json({ configured: true, connected: false, error: err?.message || "Error checking Supabase" });
    }
  });
  app.post("/api/supabase/sync", async (req, res) => {
    try {
      const rawUrl = req.body?.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
      const url = normalizeUrl(rawUrl);
      const key = req.body?.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;
      if (!url || !key) {
        return res.status(400).json({ error: "Supabase URL and Key are required for synchronization." });
      }
      const client = createClient(url, key, { auth: { persistSession: false } });
      const allProds = await getAllProducts();
      const allCats = await getAllCategories();
      const catRows = allCats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        headline: c.headline || "",
        description: c.description || "",
        image: c.image,
        item_count: c.itemCount || 0
      }));
      const { error: catErr } = await client.from("categories").upsert(catRows, { onConflict: "id" });
      if (catErr) {
        return res.status(500).json({ error: `Categories table error: ${catErr.message}. Ensure supabase_schema.sql was executed in Supabase.` });
      }
      const prodRows = allProds.map((p) => ({
        id: p.id,
        name: p.name,
        short_description: p.shortDescription || "",
        full_description: p.fullDescription || "",
        category: p.category,
        subcategory: p.subcategory || "",
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
        button_text: p.buttonText || "Shop Now",
        is_featured: !!p.isFeatured,
        is_trending: !!p.isTrending,
        is_published: p.isPublished !== false,
        tags: JSON.stringify(p.tags || []),
        seo_title: p.seoTitle || p.name,
        seo_description: p.seoDescription || p.shortDescription || "",
        created_at: p.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      }));
      const { error: prodErr } = await client.from("products").upsert(prodRows, { onConflict: "id" });
      if (prodErr) {
        return res.status(500).json({ error: `Products table error: ${prodErr.message}` });
      }
      res.json({
        success: true,
        message: `Successfully synchronized ${catRows.length} categories and ${prodRows.length} products to Supabase!`,
        syncedCategories: catRows.length,
        syncedProducts: prodRows.length
      });
    } catch (err) {
      console.error("Supabase sync error:", err);
      res.status(500).json({ error: err?.message || "Failed to sync to Supabase" });
    }
  });
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`APNI PEHCHAAN full-stack server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
