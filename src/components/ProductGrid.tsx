import React, { useState, useMemo } from 'react';
import { Product, AffiliatePlatform, CategorySlug } from '../types';
import { ProductCard } from './ProductCard';
import { useApp } from '../context/AppContext';
import { Search, SlidersHorizontal, ArrowUpDown, RefreshCcw } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  forcedCategory?: CategorySlug;
  itemsPerPage?: number;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  title,
  subtitle,
  showFilters = true,
  forcedCategory,
  itemsPerPage = 12,
}) => {
  const { searchQuery, setSearchQuery, categories } = useApp();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (!prod.isPublished) return false;
      if (forcedCategory && prod.category !== forcedCategory) return false;

      // Search query match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = prod.name.toLowerCase().includes(query);
        const matchDesc = prod.shortDescription.toLowerCase().includes(query);
        const matchCategory = prod.category.toLowerCase().includes(query);
        const matchTags = prod.tags.some((t) => t.toLowerCase().includes(query));
        const matchPlatform = prod.platform.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCategory && !matchTags && !matchPlatform) {
          return false;
        }
      }

      // Platform filter
      if (selectedPlatform !== 'All' && prod.platform !== selectedPlatform) {
        return false;
      }

      return true;
    });
  }, [products, forcedCategory, searchQuery, selectedPlatform]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'price-low':
        return list.sort((a, b) => a.price - b.price);
      case 'price-high':
        return list.sort((a, b) => b.price - a.price);
      case 'discount':
        return list.sort((a, b) => b.discount - a.discount);
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'featured':
      default:
        // Prioritize featured then trending
        return list.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          if (a.isTrending && !b.isTrending) return -1;
          if (!a.isTrending && b.isTrending) return 1;
          return 0;
        });
    }
  }, [filteredProducts, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const platforms: ('All' | AffiliatePlatform)[] = [
    'All',
    'Amazon',
    'Flipkart',
    'Meesho',
    'Bank Partner',
  ];

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      {(title || showFilters) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {title && (
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  {title}
                </h2>
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
              </div>
            )}

            {/* Total Results Counter */}
            <div className="text-xs text-slate-500 font-medium tabular-nums self-start sm:self-end">
              Showing <span className="font-bold text-slate-900">{sortedProducts.length}</span> curated offers
            </div>
          </div>

          {/* Interactive Filter Controls */}
          {showFilters && (
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              {/* Platform Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">
                  Platform:
                </span>
                {platforms.map((plat) => (
                  <button
                    key={plat}
                    onClick={() => {
                      setSelectedPlatform(plat);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      selectedPlatform === plat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              {/* Sort by Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="featured">Featured & Trending</option>
                  <option value="discount">Highest Discount %</option>
                  <option value="rating">Top Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Recently Added</option>
                </select>

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                    title="Clear search"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Cards Grid */}
      {paginatedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300 space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No matching products or offers found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query or selecting a different platform filter. All partner deals are frequently updated.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPlatform('All');
            }}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                currentPage === i + 1
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
