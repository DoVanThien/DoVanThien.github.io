'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import '@/styles/apple-theme.css';
import { Article, useNewsStore } from '@/store/useNewsStore';
import { NewsHeader } from '@/components/tech-news/NewsHeader';
import { CategoryTabBar } from '@/components/tech-news/CategoryTabBar';
import { HeroArticle } from '@/components/tech-news/HeroArticle';
import { ArticleCard } from '@/components/tech-news/ArticleCard';
import { ReaderModal } from '@/components/tech-news/ReaderModal';
import { Zap, SearchX, Newspaper } from 'lucide-react';

export default function TechNewsPage() {
  const { activeCategory, searchQuery, mergeArticles, storedArticles } = useNewsStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const isMounted = useRef(false);

  const fetchArticles = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== 'all') {
        params.set('category', activeCategory);
      }
      if (searchQuery) {
        params.set('q', searchQuery);
      }

      const res = await fetch(`/api/tech-news/rss?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.articles)) {
        // Merge with stored articles silently
        const merged = mergeArticles(data.articles);
        
        // Filter for local page display based on current category & search query
        let filtered = merged;
        if (activeCategory && activeCategory !== 'all') {
          filtered = filtered.filter((a) => a.category === activeCategory);
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.snippet.toLowerCase().includes(q) ||
              a.content.toLowerCase().includes(q) ||
              a.source.toLowerCase().includes(q)
          );
        }
        setArticles(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCategory, searchQuery, mergeArticles]);

  useEffect(() => {
    // Only show full skeleton loader on first initial load
    if (!isMounted.current) {
      isMounted.current = true;
      setIsLoading(true);
    }
    fetchArticles();
  }, [fetchArticles]);

  const handleRefresh = () => {
    fetchArticles(true);
  };

  const heroArticle = articles.length > 0 ? articles[0] : null;
  const gridArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] apple-font antialiased selection:bg-[#0071e3] selection:text-white pb-20">
      {/* Apple News Header */}
      <NewsHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* Segmented Category Control Tab Bar with Unread Count Badge */}
      <CategoryTabBar allArticles={storedArticles.length > 0 ? storedArticles : articles} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        
        {/* Initial Loading Skeleton */}
        {isLoading && articles.length === 0 ? (
          <div className="space-y-8 animate-pulse">
            <div className="w-full h-96 bg-gray-200 rounded-[28px]" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-[20px]" />
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          /* Empty Search / Category State */
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-gray-200 shadow-xs p-8">
            <div className="p-4 rounded-full bg-gray-100 text-gray-500">
              <SearchX className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-[#1d1d1f]">Không tìm thấy bài viết nào</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Không có bài báo nào phù hợp với từ khóa &quot;{searchQuery}&quot; hoặc danh mục đang chọn. Hãy thử tìm từ khóa khác hoặc chuyển chuyên mục.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Article Section */}
            {heroArticle && !searchQuery && (
              <section aria-label="Bài viết nổi bật nhất">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-[#0071e3] fill-current" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Tin Mới Nhất & Nổi Bật
                  </h2>
                </div>
                <HeroArticle article={heroArticle} />
              </section>
            )}

            {/* Articles Grid */}
            <section aria-label="Danh sách bài viết tin tức">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4.5 h-4.5 text-[#0071e3]" />
                  <h2 className="text-xl font-extrabold text-[#1d1d1f] tracking-tight">
                    {searchQuery
                      ? `Kết quả tìm kiếm cho "${searchQuery}" (${articles.length})`
                      : `Bài Viết Đáng Chú Ý (${gridArticles.length + (heroArticle ? 1 : 0)})`}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {(searchQuery ? articles : gridArticles).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Reader Modal Slide-Over */}
      <ReaderModal />
    </div>
  );
}
