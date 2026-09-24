import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ExternalLink, X, ShieldCheck, Check, Copy, AlertCircle, Sparkles } from 'lucide-react';

export const AffiliateModal: React.FC = () => {
  const { activeAffiliateProduct, closeAffiliateModal, quickViewProduct, closeQuickView } = useApp();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [autoRedirect, setAutoRedirect] = useState(false);

  // Reset copy state on product change
  useEffect(() => {
    setCopied(false);
  }, [activeAffiliateProduct, quickViewProduct]);

  if (!activeAffiliateProduct && !quickViewProduct) return null;

  const current = activeAffiliateProduct || quickViewProduct;
  if (!current) return null;

  const isAffiliateRedirect = !!activeAffiliateProduct;

  const handleProceed = () => {
    // Open affiliate link in new tab safely
    window.open(current.affiliateUrl, '_blank', 'noopener,noreferrer');
    if (activeAffiliateProduct) {
      closeAffiliateModal();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(current.affiliateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={isAffiliateRedirect ? closeAffiliateModal : closeQuickView}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {isAffiliateRedirect ? (
          /* Affiliate Redirection Handshake Modal */
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header Badge */}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Partner Referral Link</span>
            </div>

            {/* Product Summary Row */}
            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={current.image}
                alt={current.name}
                className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 leading-snug">
                  {current.name}
                </h4>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="font-bold text-slate-900 tabular-nums">
                    {current.price === 0 ? 'Free Offer' : `₹${current.price.toLocaleString('en-IN')}`}
                  </span>
                  <span className="font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {current.platform}
                  </span>
                </div>
              </div>
            </div>

            {/* Transparent Affiliate Disclosure */}
            <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Affiliate Commission Disclosure</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-950/80">
                You are being redirected to the official partner store (<strong>{current.platform}</strong>). APNI PEHCHAAN does not directly sell products or process payments. As an affiliate partner, we may earn an advertising fee or commission on qualifying purchases at zero extra cost to you.
              </p>
            </div>

            {/* Destination URL Display */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Affiliate Target Link
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono">
                <span className="truncate flex-1">{current.affiliateUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded text-slate-800 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-sans font-medium">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleProceed}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to {current.platform}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={closeAffiliateModal}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Stay on APNI PEHCHAAN
              </button>
            </div>
          </div>
        ) : (
          /* Full Quick View Modal */
          <div className="overflow-y-auto p-6 space-y-6">
            <div className="relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <img
                src={current.image}
                alt={current.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                {current.discount > 0 && (
                  <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded-md shadow-xs">
                    {current.discount}% OFF
                  </span>
                )}
                <span className="px-2.5 py-1 bg-slate-900 text-white font-semibold text-xs rounded-md">
                  {current.platform}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-amber-700 font-bold uppercase tracking-wider">
                {current.category.toUpperCase()} · {current.subcategory}
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 leading-snug">
                {current.name}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-2xl font-black text-slate-950 tabular-nums">
                  {current.price === 0 ? 'Special Offer' : `₹${current.price.toLocaleString('en-IN')}`}
                </span>
                {current.originalPrice > current.price && (
                  <span className="text-sm text-slate-400 line-through tabular-nums">
                    ₹{current.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4 leading-relaxed">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                About this Item
              </h4>
              <p>{current.fullDescription}</p>
            </div>

            {/* Tags */}
            {current.tags && current.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 text-xs text-slate-500">
                {current.tags.map((t, idx) => (
                  <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Affiliate CTA */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={handleProceed}
                className="w-full py-3.5 bg-slate-900 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{current.buttonText} on {current.platform}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Direct redirect to partner store. Secure affiliate navigation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
