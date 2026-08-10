import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Article {
  id: string;
  title: string;
  snippet: string;
  content: string;
  url: string;
  source: string;
  category: 'mobile' | 'pc' | 'unity' | 'csharp' | 'ai' | 'mustplay';
  publishedAt: string;
  imageUrl: string;
  readTime: string;
  aiSummary: string[];
}

export type CategoryId = 'all' | 'mobile' | 'pc' | 'unity' | 'csharp' | 'ai' | 'mustplay';

export interface CategoryOption {
  id: CategoryId;
  label: string;
  iconName: string;
}

export const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'Tất Cả Tin', iconName: 'Sparkles' },
  { id: 'mobile', label: 'Mobile Game', iconName: 'Smartphone' },
  { id: 'pc', label: 'PC Game', iconName: 'Monitor' },
  { id: 'unity', label: 'Unity Engine', iconName: 'Boxes' },
  { id: 'csharp', label: 'C# / .NET', iconName: 'Code2' },
  { id: 'ai', label: 'AI in Game Industry', iconName: 'Bot' },
  { id: 'mustplay', label: 'Game Hay Phải Chơi', iconName: 'Gamepad2' },
];

interface NewsState {
  bookmarks: Article[];
  readHistory: string[];
  storedArticles: Article[];
  categoryLastViewedTime: Record<string, string>;
  activeCategory: CategoryId;
  searchQuery: string;
  fontSizeMultiplier: number;
  selectedArticle: Article | null;
  isBookmarkDrawerOpen: boolean;

  toggleBookmark: (article: Article) => void;
  isBookmarked: (articleId: string) => boolean;
  markAsRead: (articleId: string) => void;
  mergeArticles: (incoming: Article[]) => Article[];
  markCategoryAsViewed: (catId: CategoryId) => void;
  getUnreadCount: (catId: CategoryId, articles: Article[]) => number;
  setActiveCategory: (cat: CategoryId) => void;
  setSearchQuery: (query: string) => void;
  setFontSizeMultiplier: (updater: number | ((prev: number) => number)) => void;
  setSelectedArticle: (article: Article | null) => void;
  setIsBookmarkDrawerOpen: (open: boolean) => void;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      readHistory: [],
      storedArticles: [],
      categoryLastViewedTime: {},
      activeCategory: 'all',
      searchQuery: '',
      fontSizeMultiplier: 1.0,
      selectedArticle: null,
      isBookmarkDrawerOpen: false,

      toggleBookmark: (article) => {
        const { bookmarks } = get();
        const exists = bookmarks.some((b) => b.id === article.id);
        if (exists) {
          set({ bookmarks: bookmarks.filter((b) => b.id !== article.id) });
        } else {
          set({ bookmarks: [article, ...bookmarks] });
        }
      },

      isBookmarked: (articleId) => {
        return get().bookmarks.some((b) => b.id === articleId);
      },

      markAsRead: (articleId) => {
        const { readHistory } = get();
        if (!readHistory.includes(articleId)) {
          set({ readHistory: [...readHistory, articleId] });
        }
      },

      mergeArticles: (incoming) => {
        const { storedArticles } = get();
        const map = new Map<string, Article>();

        // Add stored articles first
        storedArticles.forEach((art) => map.set(art.id, art));

        // Add or update with incoming articles
        incoming.forEach((art) => map.set(art.id, art));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        set({ storedArticles: merged });
        return merged;
      },

      markCategoryAsViewed: (catId) => {
        const { categoryLastViewedTime } = get();
        set({
          categoryLastViewedTime: {
            ...categoryLastViewedTime,
            [catId]: new Date().toISOString(),
          },
        });
      },

      getUnreadCount: (catId, articles) => {
        const { readHistory, categoryLastViewedTime } = get();
        const lastViewed = categoryLastViewedTime[catId];

        // Filter articles belonging to category
        const catArticles =
          catId === 'all'
            ? articles
            : articles.filter((art) => art.category === catId);

        if (!lastViewed) {
          // If never viewed before, count articles published in last 7 days that are unread
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
          return catArticles.filter(
            (art) =>
              new Date(art.publishedAt).getTime() > sevenDaysAgo &&
              !readHistory.includes(art.id)
          ).length;
        }

        const lastViewedTime = new Date(lastViewed).getTime();
        return catArticles.filter(
          (art) =>
            new Date(art.publishedAt).getTime() > lastViewedTime &&
            !readHistory.includes(art.id)
        ).length;
      },

      setActiveCategory: (category) => {
        get().markCategoryAsViewed(category);
        set({ activeCategory: category });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setFontSizeMultiplier: (updater) => {
        const current = get().fontSizeMultiplier;
        const next = typeof updater === 'function' ? updater(current) : updater;
        const clamped = Math.max(0.85, Math.min(1.4, next));
        set({ fontSizeMultiplier: clamped });
      },

      setSelectedArticle: (article) => {
        if (article) {
          get().markAsRead(article.id);
        }
        set({ selectedArticle: article });
      },

      setIsBookmarkDrawerOpen: (open) => set({ isBookmarkDrawerOpen: open }),
    }),
    {
      name: 'apple-tech-news-store',
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        readHistory: state.readHistory,
        storedArticles: state.storedArticles,
        categoryLastViewedTime: state.categoryLastViewedTime,
        fontSizeMultiplier: state.fontSizeMultiplier,
      }),
    }
  )
);
