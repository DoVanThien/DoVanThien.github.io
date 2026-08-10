'use client';

import React from 'react';
import { Article, useNewsStore } from '@/store/useNewsStore';
import { Bookmark, Clock, Zap, Calendar } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
}

const CATEGORY_LABELS: Record<string, string> = {
  mobile: 'Mobile Game',
  pc: 'PC Game',
  unity: 'Unity Engine',
  csharp: 'C# / .NET',
  ai: 'AI in Game Industry',
  mustplay: 'Game Hay Phải Chơi',
};

export const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const { setSelectedArticle, toggleBookmark, isBookmarked } = useNewsStore();
  const bookmarked = isBookmarked(article.id);
  const year = new Date(article.publishedAt).getFullYear();

  return (
    <div
      onClick={() => setSelectedArticle(article)}
      className="group relative flex flex-col justify-between rounded-[20px] bg-white text-[#1d1d1f] border border-gray-200/80 shadow-xs overflow-hidden cursor-pointer transition-all duration-320 hover:-translate-y-1 hover:shadow-xl hover:border-[#0071e3]/40 apple-font focus-within:ring-2 focus-within:ring-[#0071e3]"
    >
      {/* Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-gray-900 text-[11px] font-bold tracking-wide shadow-xs border border-gray-200">
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {year}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(article);
            }}
            className={`p-2 rounded-full backdrop-blur-md border transition-all ${
              bookmarked
                ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-md'
                : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-white'
            }`}
            aria-label={bookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between text-left">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 font-medium">
            <span className="text-gray-700 font-semibold">{article.source}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#0071e3]" />
              {article.readTime}
            </span>
          </div>

          <h3 className="text-base font-bold text-[#1d1d1f] line-clamp-2 mb-2 group-hover:text-[#0071e3] transition-colors leading-snug">
            {article.title}
          </h3>

          <p className="text-xs text-[#333336] line-clamp-3 leading-relaxed mb-4">
            {article.snippet}
          </p>
        </div>

        {/* Card Footer: AI Key Takeaways Badge */}
        {article.aiSummary && article.aiSummary.length > 0 && (
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#0071e3] font-semibold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Tóm tắt AI có sẵn
            </span>
            <span className="text-gray-500 group-hover:translate-x-0.5 transition-transform">
              Đọc tiếp →
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
