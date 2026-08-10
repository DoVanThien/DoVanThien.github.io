'use client';

import React from 'react';
import Link from 'next/link';
import '@/styles/apple-theme.css';
import { useNewsStore } from '@/store/useNewsStore';
import { ArticleCard } from '@/components/tech-news/ArticleCard';
import { ReaderModal } from '@/components/tech-news/ReaderModal';
import { ArrowLeft, BookmarkCheck } from 'lucide-react';

export default function BookmarksPage() {
  const { bookmarks } = useNewsStore();

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] apple-font antialiased selection:bg-[#0071e3] selection:text-white pb-20">
      {/* Header (Light Theme) */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-gray-200/80 text-[#1d1d1f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/tech-news"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#0071e3] transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 text-[#0071e3]" />
            <span>Quay lại Trang Chủ News Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-[#0071e3]" />
            <h1 className="text-base font-bold text-[#1d1d1f]">Bài Viết Đã Lưu ({bookmarks.length})</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0071e3] block mb-1">
            Kho Lưu Trữ Bản Tin
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] tracking-tight">
            Danh Sách Bài Báo Bạn Đã Lưu
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Các bài viết được lưu trữ trực tiếp trên thiết bị của bạn giúp đọc lại bất cứ lúc nào.
          </p>
        </div>

        {bookmarks.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            <div className="p-4 rounded-full bg-gray-100 text-[#0071e3]">
              <BookmarkCheck className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-[#1d1d1f]">Chưa có bài viết nào được lưu</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Khi đọc tin tức tại trang chủ, bấm biểu tượng Bookmark trên góc bài viết để lưu lại và đọc offline tại đây.
            </p>
            <Link
              href="/tech-news"
              className="mt-4 px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0066cc] text-white text-xs font-semibold transition-all shadow-md"
            >
              Khám Phá Bài Viết Mới
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {bookmarks.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      {/* Reader Modal */}
      <ReaderModal />
    </div>
  );
}
