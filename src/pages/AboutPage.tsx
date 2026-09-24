import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Compass, Heart, Users, ArrowRight } from 'lucide-react';
import { HERO_IMAGE } from '../data/initialData';

export const AboutPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Banner */}
      <div className="bg-slate-950 text-white py-14 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
            About APNI PEHCHAAN
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Your Style. Your Identity.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Connecting modern Indian communities with timeless cultural fashion, authentic wristwear, heritage emblems, and premier financial savings.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-12">
        {/* Story Section */}
        <section className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Our Mission & Concept
          </h2>
          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              In an era of mass-produced generic fast fashion, finding high-quality cultural apparel, authentic 180-gram solid brass Kadas, pure Bandhani safas, or crested automotive badges often feels scattered across confusing marketplaces.
            </p>
            <p>
              <strong>APNI PEHCHAAN</strong> was founded to solve this problem. We are India&apos;s first cultural affiliate discovery hub, organizing products by deep-rooted heritage categories—including <strong>Gujjar, Jaat, Yadav, Rajput, Brahmin, Jatav</strong>, and other contemporary lifestyle categories.
            </p>
            <p>
              We do <strong>not</strong> operate a warehouse or process orders ourselves. Instead, our team scours verified sellers across <strong>Amazon India, Flipkart, Meesho</strong>, and certified financial institutions to curate only the best-rated, hallmark-certified, and value-packed deals.
            </p>
          </div>
        </section>

        {/* 3 Pillars Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">100% Free Discovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We never charge visitors for browsing, price comparing, or viewing buying guides. You get direct access to official marketplace deals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Honest Affiliate Model</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When you purchase or apply via our links, we may receive a commission from the retailer. The price to you remains identical or lower.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Cultural Pride</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every category celebrates community dignity, historical bravery, sacred traditions, and refined personal identity.
            </p>
          </div>
        </section>

        {/* CTA Callout */}
        <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-display text-xl font-bold">Have a Cultural Brand or Product?</h3>
            <p className="text-xs text-slate-300">
              We feature top artisan products and affiliate listings across India.
            </p>
          </div>
          <button
            onClick={() => navigate('contact')}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg whitespace-nowrap cursor-pointer transition-colors"
          >
            Partner With Us
          </button>
        </section>
      </div>
    </div>
  );
};
