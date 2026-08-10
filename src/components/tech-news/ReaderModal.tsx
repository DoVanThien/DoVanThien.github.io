'use client';

import React, { useEffect } from 'react';
import { useNewsStore } from '@/store/useNewsStore';
import { AISummaryBox } from './AISummaryBox';
import { X, Bookmark, ExternalLink, Minus, Plus, Clock, Share2 } from 'lucide-react';

export const ReaderModal: React.FC = () => {
  const {
    selectedArticle,
    setSelectedArticle,
    toggleBookmark,
    isBookmarked,
    fontSizeMultiplier,
    setFontSizeMultiplier,
  } = useNewsStore();

  const article = selectedArticle;
  const bookmarked = article ? isBookmarked(article.id) : false;

  // Keyboard Shortcuts: Esc to close, B to bookmark
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!article) return;
      if (e.key === 'Escape') {
        setSelectedArticle(null);
      } else if (e.key === 'b' || e.key === 'B') {
        toggleBookmark(article);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [article, setSelectedArticle, toggleBookmark]);

  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Backdrop Click */}
      <div
        className="absolute inset-0"
        onClick={() => setSelectedArticle(null)}
        aria-hidden="true"
      />

      {/* Modal Window Container (Light Theme) */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white text-[#1d1d1f] rounded-[28px] border border-gray-200 shadow-2xl overflow-hidden flex flex-col z-10 apple-font animate-slideUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-modal-title"
      >
        {/* Modal Toolbar Header */}
        <div className="sticky top-0 z-20 px-6 py-4 bg-white/90 backdrop-blur-md border-b border-gray-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#0071e3] text-white text-xs font-bold uppercase tracking-wider">
              {article.category}
            </span>
            <span className="text-xs text-gray-500 font-semibold hidden sm:inline">{article.source}</span>
          </div>

          {/* Font Controls & Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Font Size Adjuster */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 border border-gray-200 mr-2 text-xs">
              <button
                onClick={() => setFontSizeMultiplier((prev) => prev - 0.1)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
                title="Giảm cỡ chữ"
                aria-label="Giảm cỡ chữ"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-bold text-gray-900">
                {Math.round(fontSizeMultiplier * 100)}%
              </span>
              <button
                onClick={() => setFontSizeMultiplier((prev) => prev + 0.1)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
                title="Tăng cỡ chữ"
                aria-label="Tăng cỡ chữ"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bookmark Toggle */}
            <button
              onClick={() => toggleBookmark(article)}
              className={`p-2 rounded-full border transition-all ${
                bookmarked
                  ? 'bg-[#0071e3] border-[#0071e3] text-white'
                  : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
              }`}
              title={bookmarked ? 'Bỏ lưu' : 'Lưu bài'}
              aria-label="Lưu bài viết"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={() => setSelectedArticle(null)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              title="Đóng (Esc)"
              aria-label="Đóng bài viết"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Article Content Scrollable Container */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-6">
          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
            <span className="font-bold text-[#0071e3]">{article.source}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
              {article.readTime} đọc
            </span>
            <span>•</span>
            <span>{new Date(article.publishedAt).toLocaleDateString('vi-VN')}</span>
          </div>

          {/* Title */}
          <h1
            id="reader-modal-title"
            className="text-2xl sm:text-4xl font-extrabold text-[#1d1d1f] tracking-tight leading-tight"
          >
            {article.title}
          </h1>

          {/* Main Image */}
          <div className="w-full h-64 sm:h-96 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* AI Summary Box */}
          <AISummaryBox points={article.aiSummary} />

          {/* Article Full Body Text with Custom Font Size */}
          <div
            className="prose max-w-none text-[#333336] leading-relaxed space-y-4"
            style={{ fontSize: `${17 * fontSizeMultiplier}px` }}
          >
            {article.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xl font-bold text-[#1d1d1f] mt-6 mb-2">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
                return (
                  <div key={idx} className="pl-4 border-l-3 border-[#0071e3] text-gray-800 py-1 font-medium bg-[#0071e3]/5 rounded-r-lg">
                    {paragraph}
                  </div>
                );
              }
              return <p key={idx}>{paragraph}</p>;
            })}
          </div>

          {/* Footer Action Links */}
          <div className="pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0066cc] text-white text-xs font-semibold transition-all shadow-md"
            >
              <span>Xem bài viết gốc tại {article.source}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: article.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Đã sao chép liên kết bài viết!');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium border border-gray-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ bài viết</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
