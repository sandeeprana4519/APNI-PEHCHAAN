import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Clock, User, Calendar } from 'lucide-react';

export const BlogPreview: React.FC = () => {
  const { blogPosts, navigate } = useApp();
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
              Heritage, Trends & Advice
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              Style & Buying Guides
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
              Authentic articles exploring traditional craftsmanship, festive buying tips, product comparisons, and shopping hacks.
            </p>
          </div>
          <button
            onClick={() => navigate('blog')}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start md:self-end cursor-pointer group"
          >
            <span>Read All Articles</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Blog Post Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {latestPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => navigate('blog-detail', { blogId: post.id })}
              className="group cursor-pointer flex flex-col justify-between rounded-xl overflow-hidden border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 bg-white"
            >
              {/* Cover Image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 bg-slate-900/85 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded backdrop-blur-xs">
                  {post.category}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  {/* Clean unboxed metadata */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{post.date}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-slate-900 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">By {post.author}</span>
                  <span className="text-amber-700 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Read Story &rarr;
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
