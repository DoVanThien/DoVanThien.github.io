'use client';

import React from 'react';
import { Article, useNewsStore } from '@/store/useNewsStore';
import { Bookmark, Clock, Zap, ArrowUpRight } from 'lucide-react';

interface HeroArticleProps {
  article: Article;
}

export const HeroArticle: React.FC<HeroArticleProps> = ({ article }) => {
  const { setSelectedArticle, toggleBookmark, isBookmarked } = useNewsStore();
  const bookmarked = isBookmarked(article.id);

  return (
    <div className="relative group w-full rounded-[28px] overflow-hidden bg-white border border-gray-200/80 shadow-xl transition-all duration-320 hover:shadow-2xl hover:border-[#0071e3]/40">
      {/* Background Image with Ambient Gradient Overlay */}
      <div className="relative h-[380px] sm:h-[460px] w-full overflow-hidden bg-gray-900">
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>

      {/* Hero Badge & Top Actions */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-[#0071e3] text-white text-xs font-bold tracking-wide shadow-lg flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current text-white" />
            Nổi Bật Nhất
          </span>
          <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-medium">
            {article.source}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(article);
          }}
          className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
            bookmarked
              ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-lg shadow-[#0071e3]/40'
              : 'bg-black/40 border-white/30 text-white hover:bg-white/20'
          }`}
          aria-label={bookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Hero Content Overlay */}
      <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 z-10 flex flex-col justify-end text-white">
        <div className="flex items-center gap-3 text-xs text-gray-300 mb-2 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
            {article.readTime} đọc
          </span>
          <span>•</span>
          <span>{new Date(article.publishedAt).toLocaleDateString('vi-VN')}</span>
        </div>

        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight mb-3 text-white line-clamp-2 apple-font group-hover:text-blue-300 transition-colors">
          {article.title}
        </h2>

        <p className="text-sm text-gray-200 line-clamp-2 sm:line-clamp-3 mb-5 font-normal max-w-4xl leading-relaxed">
          {article.snippet}
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedArticle(article)}
            className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0066cc] text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[#0071e3]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Đọc Toàn Bộ Bài Viết</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
