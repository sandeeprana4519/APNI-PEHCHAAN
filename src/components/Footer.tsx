import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Heart, ArrowUp, Lock, CheckCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate, categories, isAdminLoggedIn, adminCredentials } = useApp();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-amber-400/40 shadow-lg shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src="/apni-pehchaan-logo.jpg"
                  alt="APNI PEHCHAAN Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="font-display text-2xl font-black tracking-wider text-white block">
                  APNI PEHCHAAN
                </span>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  Your Style · Your Identity
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              India&apos;s dedicated cultural identity discovery portal. We curate trending ethnic wear, traditional royal accessories, heritage emblems, and premier banking partner offers, redirecting you directly to verified marketplace savings on Amazon, Flipkart, and Meesho.
            </p>

            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Free Browsing · Secure Affiliate Redirections</span>
            </div>
          </div>

          {/* Cultural Categories Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Categories
            </h4>
            <ul className="space-y-2 text-xs">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => navigate('category-detail', { categorySlug: cat.slug })}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    {cat.name} Collection
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('home')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('categories')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  All Categories
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('trending')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Trending Offers
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('blog')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Style & Buying Blog
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('about')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('contact')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('admin')}
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="WordPress Administrator Portal"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAdminLoggedIn ? `WP Admin (${adminCredentials.username})` : 'WP Admin Login'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Compliance & Legal Pages */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Legal & Disclosures
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('affiliate-disclosure')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Affiliate Disclosure
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('disclaimer')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Disclaimer Notice
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('privacy-policy')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('terms-conditions')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('contact')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Partner / Affiliate Inquiries
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Affiliate Bottom Statement */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Disclaimer: </span>
          APNI PEHCHAAN participates in various affiliate marketing programs, designed to provide a means for sites to earn advertising fees by linking to Amazon.in, Flipkart.com, Meesho.com, and partner financial institutions. Prices and availability of products are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on the merchant site at the time of purchase will apply to the purchase of this product.
        </div>

        {/* Bottom Row */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            © {new Date().getFullYear()} APNI PEHCHAAN. All rights reserved. Designed for Indian Cultural Heritage.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Back to top"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
