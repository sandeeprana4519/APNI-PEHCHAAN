import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductGrid } from '../components/ProductGrid';
import { CategorySlug } from '../types';
import { ChevronRight, Home, ShieldCheck, Sparkles } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const { categories, products, selectedCategorySlug, navigate } = useApp();

  // Find active category
  const currentCategory =
    categories.find((c) => c.slug === selectedCategorySlug) || categories[0];

  const categoryProducts = products.filter(
    (p) => p.category === currentCategory.slug && p.isPublished
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Category Banner Hero */}
      <div className="relative bg-slate-950 text-white overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-25 mix-blend-luminosity">
          <img
            src={currentCategory.image}
            alt={currentCategory.name}
            className="w-full h-full object-cover object-center filter blur-xs scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10 space-y-4">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => navigate('home')}
              className="hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <button
              onClick={() => navigate('categories')}
              className="hover:text-white cursor-pointer"
            >
              Categories
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-amber-400 font-semibold">{currentCategory.name}</span>
          </nav>

          {/* Banner Title & Description */}
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Community Collection
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              {currentCategory.name} Collection
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {currentCategory.description}
            </p>
          </div>

          {/* Category Horizontal Quick Switcher Tabs */}
          <div className="pt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isActive = cat.slug === currentCategory.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate('category-detail', { categorySlug: cat.slug })}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <ProductGrid
          products={categoryProducts}
          title={`All ${currentCategory.name} Products & Offers`}
          subtitle={`Showing authentic items available on verified third-party affiliate stores`}
          showFilters={true}
          forcedCategory={currentCategory.slug}
          itemsPerPage={12}
        />
      </div>
    </div>
  );
};
