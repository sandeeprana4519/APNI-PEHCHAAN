import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import {
  Home,
  ChevronRight,
  User,
  Calendar,
  Clock,
  Share2,
  Check,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const BlogDetailPage: React.FC = () => {
  const { selectedBlogId, blogPosts, products, navigate } = useApp();
  const [copied, setCopied] = useState(false);

  const post = blogPosts.find((p) => p.id === selectedBlogId) || blogPosts[0];

  // Related products based on category
  const relatedProducts = products.filter(
    (prod) =>
      prod.isPublished &&
      (post.relatedCategorySlug ? prod.category === post.relatedCategorySlug : true)
  ).slice(0, 4);

  // Other blog posts
  const otherPosts = blogPosts.filter((p) => p.id !== post.id).slice(0, 3);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Article Header & Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <button
              onClick={() => navigate('home')}
              className="hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => navigate('blog')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Blog
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-amber-800 font-semibold truncate max-w-xs">{post.title}</span>
          </nav>

          <button
            onClick={() => navigate('blog')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Guides</span>
          </button>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
              {post.category}
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-950 leading-tight">
              {post.title}
            </h1>

            {/* Author and Date unboxed metadata */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="font-medium text-slate-800">By {post.author}</span>
                <span aria-hidden="true">·</span>
                <span>{post.date}</span>
                <span aria-hidden="true">·</span>
                <span>{post.readTime}</span>
              </div>

              <button
                onClick={handleShare}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer transition-colors"
                title="Share link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Cover Image */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Affiliate Disclosure in Post */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Affiliate Disclosure:</strong> Articles published on APNI PEHCHAAN may contain partner links. If you make a purchase or sign up via links in this article, we may receive a commission without any extra charge to you. We strictly recommend authentic cultural products.
          </p>
        </div>

        {/* Article Markdown/Content Render */}
        <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed space-y-4 text-base">
          {post.content.split('\n\n').map((paragraph, index) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={index} className="font-display text-xl font-bold text-slate-900 pt-4">
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            if (paragraph.startsWith('- ')) {
              return (
                <ul key={index} className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                  {paragraph.split('\n').map((line, i) => (
                    <li key={i}>{line.replace('- ', '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={index} className="text-slate-700 leading-relaxed text-sm sm:text-base">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Tags */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Related Tags:</span>
          {post.tags.map((t, idx) => (
            <span key={idx} className="bg-slate-100 px-2.5 py-1 rounded text-slate-700">
              #{t}
            </span>
          ))}
        </div>

        {/* Curated Products Recommended in this Guide */}
        {relatedProducts.length > 0 && (
          <section className="pt-12 border-t border-slate-200 space-y-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Shop The Guide
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                Recommended Products from this Article
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verified affiliate links with guaranteed marketplace authenticity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Read Next Guides */}
        {otherPosts.length > 0 && (
          <section className="pt-12 border-t border-slate-200 space-y-6">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              More Guides You May Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {otherPosts.map((op) => (
                <div
                  key={op.id}
                  onClick={() => navigate('blog-detail', { blogId: op.id })}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-amber-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={op.coverImage}
                      alt={op.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <span className="text-[11px] font-bold text-amber-700 uppercase">
                      {op.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                      {op.title}
                    </h4>
                    <span className="text-xs text-amber-700 font-semibold pt-2">
                      Read Article &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};
