import React from 'react';
import { ShieldCheck, Info, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AffiliateDisclosureNotice: React.FC = () => {
  const { navigate } = useApp();

  return (
    <section className="bg-amber-50/60 border-y border-amber-200/80 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-xl shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                Official Affiliate Disclosure & Transparency Notice
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong>APNI PEHCHAAN</strong> is an independent affiliate marketing and discovery portal. When you click on &ldquo;Shop Now&rdquo; or &ldquo;Apply Now&rdquo; buttons and visit third-party websites (including Amazon, Flipkart, Meesho, or Bank Partners) to complete a qualifying transaction, we may earn an affiliate commission at absolutely no extra cost to you.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                We do not sell products directly, process payments, or ship orders. Prices, discounts, and item availability are determined by partner platforms and may vary over time.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2 w-full md:w-auto">
            <button
              onClick={() => navigate('affiliate-disclosure')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
            >
              <span>Full Affiliate Policy</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-500 text-right hidden sm:block">
              FTC & ASCI Compliant Disclosures
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
