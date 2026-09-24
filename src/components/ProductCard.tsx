import React from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { ExternalLink, Star, Eye, Tag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  featuredBadge?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, featuredBadge = false }) => {
  const { triggerAffiliateRedirect, openQuickView, categories } = useApp();

  const categoryObj = categories.find((c) => c.slug === product.category);
  const categoryName = categoryObj ? categoryObj.name : product.category;

  const handleAffiliateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerAffiliateRedirect(product);
  };

  const handleCardClick = () => {
    openQuickView(product);
  };

  // Platform visual indicator helper
  const getPlatformStyle = (platform: string) => {
    switch (platform) {
      case 'Amazon':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Flipkart':
        return 'text-blue-800 bg-blue-50 border-blue-200';
      case 'Meesho':
        return 'text-pink-800 bg-pink-50 border-pink-200';
      case 'Bank Partner':
        return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative"
    >
      {/* Top Image Container */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Quick View Button on Hover */}
        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1.5 bg-white/95 text-slate-900 text-xs font-semibold rounded-md shadow-md flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </span>
        </div>

        {/* Quiet Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {/* Discount Badge */}
          {product.discount > 0 ? (
            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded shadow-sm">
              {product.discount}% OFF
            </span>
          ) : (
            <span></span>
          )}

          {/* Platform Label */}
          <span
            className={`px-2 py-0.5 text-[11px] font-bold rounded border ${getPlatformStyle(
              product.platform
            )}`}
          >
            {product.platform}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Category & Subcategory line (Zero-Pill clean metadata) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="text-amber-800 font-semibold">{categoryName}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.subcategory}</span>
          </div>

          {/* Product Title */}
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
            {product.name}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        {/* Pricing & Rating Baseline */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            {/* Price */}
            <div className="flex items-baseline gap-2">
              {product.price === 0 ? (
                <span className="text-base font-bold text-emerald-700">
                  Free / Bank Offer
                </span>
              ) : (
                <>
                  <span className="text-lg font-bold text-slate-950 tabular-nums">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-xs text-slate-400 line-through tabular-nums">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span className="font-bold tabular-nums text-slate-900">
                {product.rating.toFixed(1)}
              </span>
              <span className="text-slate-400 tabular-nums">
                ({product.reviewCount})
              </span>
            </div>
          </div>

          {/* Action Button: Opens verified affiliate link */}
          <button
            onClick={handleAffiliateClick}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm group-hover:shadow"
          >
            <span>{product.buttonText || 'Shop Now'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
