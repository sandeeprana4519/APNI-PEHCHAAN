import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, FileText, AlertTriangle, ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  type: 'privacy' | 'terms' | 'affiliate-disclosure' | 'disclaimer';
}

export const LegalPages: React.FC<LegalPageProps> = ({ type }) => {
  const { navigate } = useApp();

  const getDetails = () => {
    switch (type) {
      case 'affiliate-disclosure':
        return {
          title: 'Affiliate Commission Disclosure',
          subtitle: 'Complete transparency regarding our business model & partner commissions',
          date: 'March 2026',
          icon: <ShieldCheck className="w-8 h-8 text-amber-500" />,
          content: (
            <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 font-medium">
                <strong>Summary:</strong> APNI PEHCHAAN participates in affiliate advertising programs. When you click links on our site and make purchases on Amazon, Flipkart, Meesho, or through Bank partners, we may earn an affiliate commission at zero additional cost to you.
              </div>

              <h3 className="font-display text-lg font-bold text-slate-900">1. Amazon Associates Program</h3>
              <p>
                APNI PEHCHAAN is a participant in the Amazon Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.in.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">2. Flipkart & Meesho Affiliate Networks</h3>
              <p>
                We also feature curated fashion, lifestyle, and home products via approved affiliate links directing to Flipkart.com and Meesho.com. Qualifying transactions generate referral fees directly from the platform.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">3. Banking & Financial Product Referrals</h3>
              <p>
                For select credit cards, personal finance offers, and banking perks, APNI PEHCHAAN acts as a digital discovery partner. Applications are redirected directly to the authorized banking server.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">4. No Cost to You as a Shopper</h3>
              <p>
                The retail price you pay remains identical whether you use our affiliate link or navigate directly to the vendor&apos;s homepage. In many instances, special coupon codes or seasonal affiliate promotions highlighted on our site may save you money.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">5. Editorial Independence</h3>
              <p>
                Product inclusions are guided by quality, cultural relevance, and community ratings. We do not accept payment to promote defective or substandard products.
              </p>
            </div>
          ),
        };

      case 'disclaimer':
        return {
          title: 'General Disclaimer Notice',
          subtitle: 'Pricing, product specifications, and third-party warranties',
          date: 'March 2026',
          icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
          content: (
            <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
              <h3 className="font-display text-lg font-bold text-slate-900">1. Independent Portal</h3>
              <p>
                APNI PEHCHAAN is not an online store, warehouse, merchant, or manufacturer. We do not sell items directly, process payments, or ship parcels. Every order is placed on and fulfilled by third-party marketplace portals.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">2. Real-Time Pricing Fluctuation</h3>
              <p>
                Product pricing, discounts, coupon codes, and inventory availability change dynamically on third-party sites. While we strive to present accurate pricing, the exact price shown on the checkout page of the seller at the time of purchase is the final binding price.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">3. Product Warranties & Customer Returns</h3>
              <p>
                Any issues concerning order delivery, defective merchandise, sizing exchanges, or refunds must be resolved directly through customer support on Amazon, Flipkart, Meesho, or the issuing bank. APNI PEHCHAAN cannot intervene in merchant disputes.
              </p>
            </div>
          ),
        };

      case 'privacy':
        return {
          title: 'Privacy Policy',
          subtitle: 'How we protect your browsing data and respect digital confidentiality',
          date: 'March 2026',
          icon: <FileText className="w-8 h-8 text-amber-500" />,
          content: (
            <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
              <h3 className="font-display text-lg font-bold text-slate-900">1. Information We Collect</h3>
              <p>
                APNI PEHCHAAN respects your privacy. We do not require account registration, passwords, credit card credentials, or personal banking data to browse our portal. When you submit an optional inquiry through our Contact page, we collect only the provided name and email address to reply.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">2. Cookies and Affiliate Tracking</h3>
              <p>
                When you click an affiliate link to Amazon, Flipkart, or partner stores, a temporary cookie is set by the third-party merchant to track the referral and credit the qualifying commission. These cookies operate according to each respective platform&apos;s privacy policy.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">3. Third-Party Web Links</h3>
              <p>
                Our website contains links to external websites. We do not control or assume responsibility for the privacy practices, content, or terms of third-party portals.
              </p>
            </div>
          ),
        };

      case 'terms':
      default:
        return {
          title: 'Terms & Conditions',
          subtitle: 'Rules of usage for browsing and interacting with APNI PEHCHAAN',
          date: 'March 2026',
          icon: <FileText className="w-8 h-8 text-amber-500" />,
          content: (
            <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
              <h3 className="font-display text-lg font-bold text-slate-900">1. Acceptance of Terms</h3>
              <p>
                By accessing and browsing APNI PEHCHAAN, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue use of this site.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">2. Intellectual Property</h3>
              <p>
                All site branding, logos, editorial guides, article copy, and custom curation structures belong exclusively to APNI PEHCHAAN. Product trademarks (such as Amazon, Flipkart, Meesho) belong to their respective owners.
              </p>

              <h3 className="font-display text-lg font-bold text-slate-900">3. Limitation of Liability</h3>
              <p>
                Under no circumstances shall APNI PEHCHAAN or its owners be liable for any direct, indirect, incidental, or consequential damages resulting from transactions conducted on external partner websites.
              </p>
            </div>
          ),
        };
    }
  };

  const details = getDetails();

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <div className="bg-slate-950 text-white py-12 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-3">
          <button
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </button>
          <div className="flex items-center gap-3">
            {details.icon}
            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white">
                {details.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Last reviewed: {details.date} · {details.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-xs">
          {details.content}
        </div>
      </div>
    </div>
  );
};
