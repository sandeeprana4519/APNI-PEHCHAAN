import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Menu, X, SlidersHorizontal, ShieldCheck, ChevronDown } from 'lucide-react';
import { CategorySlug } from '../types';

export const Header: React.FC = () => {
  const { view, navigate, searchQuery, setSearchQuery, categories, isAdminLoggedIn, adminCredentials } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryDropdown, setCategoryDropdown] = useState(false);

  const handleNav = (targetView: Parameters<typeof navigate>[0], params?: Parameters<typeof navigate>[1]) => {
    navigate(targetView, params);
    setMobileMenuOpen(false);
    setCategoryDropdown(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-200">
      {/* Top Affiliate Micro-Notice */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Independent Indian Affiliate Discovery Platform · Amazon, Flipkart & Meesho Partner</span>
          </div>
          <button
            onClick={() => handleNav('affiliate-disclosure')}
            className="hover:text-amber-400 underline transition-colors cursor-pointer"
          >
            Affiliate Disclosure
          </button>
        </div>
      </div>

      {/* Main 3-Zone Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Zone 1: Logo and Brand identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
          >
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden border border-amber-200/90 bg-white shadow-xs group-hover:border-amber-400 group-hover:shadow-md transition-all shrink-0">
              <img
                src="/apni-pehchaan-logo.jpg"
                alt="APNI PEHCHAAN Logo"
                className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl sm:text-2xl font-black tracking-wider text-slate-950 group-hover:text-amber-600 transition-colors leading-tight">
                APNI PEHCHAAN
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-amber-700 uppercase -mt-0.5">
                Your Style · Your Identity
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Text with subtle underlines) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-700">
          <button
            onClick={() => handleNav('home')}
            className={`transition-colors py-1 hover:text-amber-600 cursor-pointer ${
              view === 'home' ? 'text-amber-600 font-semibold border-b-2 border-amber-600' : ''
            }`}
          >
            Home
          </button>

          {/* Categories Dropdown */}
          <div className="relative group">
            <button
              onClick={() => handleNav('categories')}
              onMouseEnter={() => setCategoryDropdown(true)}
              className={`flex items-center gap-1 transition-colors py-1 hover:text-amber-600 cursor-pointer ${
                view === 'categories' || view === 'category-detail'
                  ? 'text-amber-600 font-semibold border-b-2 border-amber-600'
                  : ''
              }`}
            >
              <span>Categories</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
            </button>

            {/* Dropdown Menu */}
            <div
              onMouseLeave={() => setCategoryDropdown(false)}
              className={`absolute top-full left-0 w-64 pt-2 ${categoryDropdown ? 'block' : 'hidden group-hover:block'}`}
            >
              <div className="bg-white rounded-lg shadow-xl border border-slate-100 py-2">
                <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cultural Categories
                </div>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleNav('category-detail', { categorySlug: cat.slug })}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs text-slate-400">Explore →</span>
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => handleNav('categories')}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer"
                  >
                    View All Categories
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNav('trending')}
            className={`transition-colors py-1 hover:text-amber-600 cursor-pointer ${
              view === 'trending' ? 'text-amber-600 font-semibold border-b-2 border-amber-600' : ''
            }`}
          >
            Trending
          </button>

          <button
            onClick={() => handleNav('blog')}
            className={`transition-colors py-1 hover:text-amber-600 cursor-pointer ${
              view === 'blog' || view === 'blog-detail'
                ? 'text-amber-600 font-semibold border-b-2 border-amber-600'
                : ''
            }`}
          >
            Blog
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`transition-colors py-1 hover:text-amber-600 cursor-pointer ${
              view === 'about' ? 'text-amber-600 font-semibold border-b-2 border-amber-600' : ''
            }`}
          >
            About Us
          </button>

          <button
            onClick={() => handleNav('contact')}
            className={`transition-colors py-1 hover:text-amber-600 cursor-pointer ${
              view === 'contact' ? 'text-amber-600 font-semibold border-b-2 border-amber-600' : ''
            }`}
          >
            Contact Us
          </button>
        </nav>

        {/* Zone 3: Search, Admin Toggle, Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Quick Search Bar (Desktop) */}
          <div className="relative hidden md:block w-52 lg:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (view !== 'trending' && view !== 'categories' && view !== 'category-detail') {
                  // Keep search active on product listing
                }
              }}
              placeholder="Search Kada, Safa, Kurta..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Toggle (Mobile) */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 cursor-pointer"
            aria-label="Toggle search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Admin Management Button */}
          <button
            onClick={() => handleNav('admin')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              view === 'admin'
                ? 'bg-amber-600 text-white shadow-sm'
                : isAdminLoggedIn
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/80'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
            title={isAdminLoggedIn ? `Logged in as ${adminCredentials.username}` : 'WP Admin Login (ID: admin / pass: admin@123)'}
          >
            {isAdminLoggedIn ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isAdminLoggedIn ? `WP: ${adminCredentials.username}` : 'WP Admin'}
            </span>
            <span className="sm:hidden">WP</span>
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-slate-900 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Input (Mobile) */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100 bg-white">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, tags..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800"
              autoFocus
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-6 space-y-4 shadow-lg animate-in slide-in-from-top-2">
          {/* Mobile Drawer Logo Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 p-0.5 shadow-2xs shrink-0 overflow-hidden">
              <img
                src="/apni-pehchaan-logo.jpg"
                alt="APNI PEHCHAAN Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-display text-base font-black text-slate-950 tracking-wider block">
                APNI PEHCHAAN
              </span>
              <span className="text-[10px] font-semibold text-amber-700 tracking-wider uppercase block">
                Your Style · Your Identity
              </span>
            </div>
          </div>

          <div className="flex flex-col space-y-3 font-medium text-slate-800">
            <button
              onClick={() => handleNav('home')}
              className="text-left py-2 hover:text-amber-600"
            >
              Home
            </button>
            <button
              onClick={() => handleNav('categories')}
              className="text-left py-2 hover:text-amber-600 font-semibold text-amber-700"
            >
              All Categories
            </button>

            {/* Cultural Categories Links on Mobile */}
            <div className="pl-3 border-l-2 border-amber-200 space-y-2 py-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleNav('category-detail', { categorySlug: c.slug })}
                  className="block text-left text-sm text-slate-600 hover:text-amber-700"
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleNav('trending')}
              className="text-left py-2 hover:text-amber-600"
            >
              Trending Products
            </button>
            <button
              onClick={() => handleNav('blog')}
              className="text-left py-2 hover:text-amber-600"
            >
              Style & Buying Guides (Blog)
            </button>
            <button
              onClick={() => handleNav('about')}
              className="text-left py-2 hover:text-amber-600"
            >
              About Us
            </button>
            <button
              onClick={() => handleNav('contact')}
              className="text-left py-2 hover:text-amber-600"
            >
              Contact Us
            </button>
            <button
              onClick={() => handleNav('admin')}
              className="text-left py-2 text-amber-700 font-semibold flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>WordPress Admin Panel</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>© 2026 APNI PEHCHAAN</span>
            <button
              onClick={() => handleNav('affiliate-disclosure')}
              className="hover:underline text-slate-700"
            >
              Affiliate Policy
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
