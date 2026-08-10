'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bookmark, RefreshCw, Zap, X } from 'lucide-react';
import { useNewsStore } from '@/store/useNewsStore';

interface NewsHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const NewsHeader: React.FC<NewsHeaderProps> = ({ onRefresh, isRefreshing }) => {
  const { searchQuery, setSearchQuery, bookmarks } = useNewsStore();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-gray-200/80 text-[#1d1d1f] transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & App Name (Removed APPLE VIỆT NAM label, updated with Modern Icon) */}
        <Link 
          href="/tech-news" 
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] rounded-xl p-1 transition-all"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071e3] via-[#0080ff] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-[#0071e3]/25 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-[#1d1d1f] apple-font">
              Tech & Game News
            </span>
          </div>
        </Link>

        {/* Search Bar (Light Theme) */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tin tức mobile, PC, Unity, C#, AI..."
              className="w-full bg-gray-100/90 hover:bg-gray-100 text-sm text-[#1d1d1f] placeholder-gray-500 pl-10 pr-9 py-2 rounded-full border border-gray-200 focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/30 transition-all apple-font"
              aria-label="Tìm kiếm tin tức"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-0.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Bookmark Drawer & Refresh */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1d1d1f] border border-gray-200/80 transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              title="Cập nhật tin mới"
              aria-label="Cập nhật tin tức mới"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0071e3]' : 'text-gray-700'}`} />
            </button>
          )}

          <Link
            href="/tech-news/bookmarks"
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0066cc] text-white text-xs font-semibold transition-all shadow-md shadow-[#0071e3]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0071e3]"
            aria-label={`Bài viết đã lưu (${bookmarks.length})`}
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Đã Lưu</span>
            {bookmarks.length > 0 && (
              <span className="ml-0.5 bg-white text-[#0071e3] font-bold rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tin game, Unity, C#..."
            className="w-full bg-gray-100 text-sm text-[#1d1d1f] placeholder-gray-500 pl-10 pr-9 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-[#0071e3] apple-font"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-0.5 rounded-full text-gray-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
