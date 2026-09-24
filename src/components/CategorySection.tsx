import React from 'react';
import { useApp } from '../context/AppContext';
import { CategorySlug } from '../types';
import { ArrowRight } from 'lucide-react';

export const CategorySection: React.FC = () => {
  const { categories, products, navigate } = useApp();

  return (
    <section className="py-16 bg-[#F8F9FA] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
              Curated Community Hubs
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              Explore Cultural Categories
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
              Discover authentic fashion, identity accessories, ceremonial gear, and exclusive deals tailored to your pride and traditions.
            </p>
          </div>
          <button
            onClick={() => navigate('categories')}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start md:self-end cursor-pointer group"
          >
            <span>Browse All Categories</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 7 Cultural Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat, idx) => {
            const count = products.filter((p) => p.category === cat.slug && p.isPublished).length;
            const isFeaturedLarge = idx === 0 || idx === 3; // Give visual balance

            return (
              <div
                key={cat.id}
                onClick={() => navigate('category-detail', { categorySlug: cat.slug })}
                className="group cursor-pointer bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                {/* Image slot */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                  
                  {/* Category Name Overlay */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-wide">
                        {cat.name}
                      </h3>
                      <span className="text-xs text-amber-300 font-medium">
                        {cat.headline}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 tabular-nums font-medium">
                      {count} {count === 1 ? 'Curated Item' : 'Curated Items'}
                    </span>
                    <span className="text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      View Products &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
