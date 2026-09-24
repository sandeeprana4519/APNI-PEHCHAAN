import React from 'react';
import { Hero } from '../components/Hero';
import { CategorySection } from '../components/CategorySection';
import { ProductGrid } from '../components/ProductGrid';
import { BlogPreview } from '../components/BlogPreview';
import { AffiliateDisclosureNotice } from '../components/AffiliateDisclosureNotice';
import { useApp } from '../context/AppContext';
import { Sparkles, Star, TrendingUp, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { products, navigate } = useApp();

  const trendingProducts = products.filter((p) => p.isTrending && p.isPublished);
  const featuredProducts = products.filter((p) => p.isFeatured && p.isPublished);

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Cultural Category Section */}
      <CategorySection />

      {/* 3. Featured Products Highlight Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>Handpicked by Curators</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                Featured Heritage Collections
              </h2>
              <p className="mt-1 text-sm text-slate-600 max-w-xl">
                Top-rated heirloom wristwear, custom ceremonial attire, and high-saving bank cards.
              </p>
            </div>
            <button
              onClick={() => navigate('categories')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-end cursor-pointer"
            >
              <span>View All Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <ProductGrid
            products={featuredProducts}
            showFilters={false}
            itemsPerPage={4}
          />
        </div>
      </section>

      {/* 4. Trending Products Section (Full responsive catalog with search & platform filters) */}
      <section className="py-16 bg-[#F8F9FA] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 -mb-4">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span>High-Demand Affiliate Offers</span>
          </div>

          <ProductGrid
            products={trendingProducts}
            title="Trending Products Across Platforms"
            subtitle="Discover top-converting traditional jewelry, ethnic fashion, car emblems, and credit rewards."
            showFilters={true}
            itemsPerPage={8}
          />

          <div className="pt-4 text-center">
            <button
              onClick={() => navigate('trending')}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Explore Complete Trending Catalog ({trendingProducts.length} Deals)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Editorial Style & Buying Guides (Blog Preview) */}
      <BlogPreview />

      {/* 6. Legal Affiliate Disclosure Callout */}
      <AffiliateDisclosureNotice />
    </div>
  );
};
