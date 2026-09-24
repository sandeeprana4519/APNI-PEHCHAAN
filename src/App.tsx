/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AffiliateModal } from './components/AffiliateModal';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { TrendingPage } from './pages/TrendingPage';
import { BlogPage } from './pages/BlogPage';
import { BlogDetailPage } from './pages/BlogDetailPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LegalPages } from './pages/LegalPages';
import { AdminDashboard } from './pages/AdminDashboard';
import { CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { view, toastMessage } = useApp();

  const renderCurrentView = () => {
    switch (view) {
      case 'home':
        return <HomePage />;
      case 'categories':
      case 'category-detail':
        return <CategoryPage />;
      case 'trending':
        return <TrendingPage />;
      case 'blog':
        return <BlogPage />;
      case 'blog-detail':
        return <BlogDetailPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'privacy-policy':
        return <LegalPages type="privacy" />;
      case 'terms-conditions':
        return <LegalPages type="terms" />;
      case 'affiliate-disclosure':
        return <LegalPages type="affiliate-disclosure" />;
      case 'disclaimer':
        return <LegalPages type="disclaimer" />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  const isAdminView = view === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#1E293B]">
      {/* Top Header Navigation (Only shown on storefront views) */}
      {!isAdminView && <Header />}

      {/* Main Page View */}
      <main className="flex-1">
        {renderCurrentView()}
      </main>

      {/* Footer (Storefront only) */}
      {!isAdminView && <Footer />}

      {/* Global Affiliate Redirection & Quick View Modal */}
      <AffiliateModal />

      {/* Subtle Toast Feedback Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
