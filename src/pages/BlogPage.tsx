import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Home, ChevronRight, BookOpen, Clock, User, ArrowRight } from 'lucide-react';

export const BlogPage: React.FC = () => {
  const { blogPosts, navigate } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [blogSearch, setBlogSearch] = useState<string>('');

  const blogCategories = ['All', 'Style Guides', 'Product Comparisons', 'Buying Guides', 'Heritage & Lifestyle'];

  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      if (selectedCategory !== 'All' && post.category !== selectedCategory) {
        return false;
      }
      if (blogSearch.trim()) {
        const q = blogSearch.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(q);
        const matchExcerpt = post.excerpt.toLowerCase().includes(q);
        const matchTags = post.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchExcerpt && !matchTags) return false;
      }
      return true;
    });
  }, [blogPosts, selectedCategory, blogSearch]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Blog Hero Banner */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => navigate('home')}
              className="hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-amber-400 font-semibold">Style & Buying Guides</span>
          </nav>

          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Editorial & Guides
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              APNI PEHCHAAN Journal
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              In-depth articles covering ancestral craft traditions, comparison of pure silver vs brass kadas, turban styling methods, and strategic festive savings.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Blog Filter and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {blogCategories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={blogSearch}
              onChange={(e) => setBlogSearch(e.target.value)}
              placeholder="Search articles & topics..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Blog Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                onClick={() => navigate('blog-detail', { blogId: post.id })}
                className="group cursor-pointer flex flex-col justify-between rounded-xl overflow-hidden border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 bg-white"
              >
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

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
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
                      Read Guide &rarr;
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No guides found</h3>
            <p className="text-xs text-slate-500 mt-1">Try another category or search term.</p>
          </div>
        )}
      </div>
    </div>
  );
};
