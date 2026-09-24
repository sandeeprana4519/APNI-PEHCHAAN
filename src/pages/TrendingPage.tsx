import React from 'react';
import { useApp } from '../context/AppContext';
import { ProductGrid } from '../components/ProductGrid';
import { Flame, Home, ChevronRight, Sparkles } from 'lucide-react';

export const TrendingPage: React.FC = () => {
  const { products, navigate } = useApp();

  const trendingProducts = products.filter(
    (p) => (p.isTrending || p.id.startsWith('prod-custom')) && p.isPublished
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => navigate('home')}
              className="hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-amber-400 font-semibold">Trending Products</span>
          </nav>

          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Community Bestsellers & Top Deals</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Trending Products & Offers
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore the most sought-after cultural accessories, solid kada designs, tailored kurtas, and banking cards handpicked for maximum value.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <ProductGrid
          products={trendingProducts}
          title="All Trending Items"
          subtitle="Updated daily with verified pricing on partner platforms"
          showFilters={true}
          itemsPerPage={12}
        />
      </div>
    </div>
  );
};
