import React from 'react';
import { useApp } from '../context/AppContext';
import { HERO_IMAGE } from '../data/initialData';
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Hero: React.FC = () => {
  const { navigate } = useApp();

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute inset-0 bg-radial from-amber-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            {/* Kicker (Zero-Pill: Clean unboxed metadata) */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
              <span>Curated Indian Lifestyle & Heritage</span>
              <span aria-hidden="true">·</span>
              <span>100% Verified Affiliate Deals</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15] text-balance">
              Discover Products That Match Your Style & Identity
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Explore trending fashion, accessories, gifts, lifestyle products and more organized into authentic cultural communities. Direct deals from Amazon, Flipkart, Meesho & leading bank partners.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate('categories')}
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Products</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('trending')}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium border border-slate-700 rounded-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>View Trending</span>
              </button>
            </div>

            {/* Claim to Proof Adjacency */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 sm:gap-6 text-xs text-slate-400">
              <div>
                <div className="text-lg sm:text-xl font-bold text-white tabular-nums">7+</div>
                <div className="mt-0.5">Cultural Categories</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white tabular-nums">100%</div>
                <div className="mt-0.5">Free Redirection</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white tabular-nums">Verified</div>
                <div className="mt-0.5">Amazon & Flipkart Links</div>
              </div>
            </div>
          </div>

          {/* Right Showcase Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-900 group">
              <img
                src={HERO_IMAGE}
                alt="Contemporary Indian cultural fashion and lifestyle accessories"
                className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] object-cover object-center group-hover:scale-102 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />

              {/* Quiet Floating Showcase Marker */}
              <div className="absolute bottom-4 left-4 right-4 p-4 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="text-white font-semibold">Veer Heritage Series 2026</div>
                  <div className="text-slate-400 text-[11px]">Solid Brass & Silver Kadas, Safas, Kurtas</div>
                </div>
                <button
                  onClick={() => navigate('category-detail', { categorySlug: 'gujjar' })}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  View Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
