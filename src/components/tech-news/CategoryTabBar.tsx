'use client';

import React from 'react';
import { CATEGORIES, useNewsStore, Article } from '@/store/useNewsStore';
import { Zap, Smartphone, Laptop, Layers, Code2, Cpu, Flame } from 'lucide-react';

const MODERN_ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Zap className="w-3.5 h-3.5" />,
  Smartphone: <Smartphone className="w-3.5 h-3.5" />,
  Monitor: <Laptop className="w-3.5 h-3.5" />,
  Boxes: <Layers className="w-3.5 h-3.5" />,
  Code2: <Code2 className="w-3.5 h-3.5" />,
  Bot: <Cpu className="w-3.5 h-3.5" />,
  Gamepad2: <Flame className="w-3.5 h-3.5" />,
};

interface CategoryTabBarProps {
  allArticles?: Article[];
}

export const CategoryTabBar: React.FC<CategoryTabBarProps> = ({ allArticles = [] }) => {
  const { activeCategory, setActiveCategory, getUnreadCount } = useNewsStore();

  return (
    <div className="w-full bg-white/90 border-b border-gray-200/80 py-3 sticky top-16 z-30 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav 
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 scroll-smooth"
          aria-label="Danh mục tin tức"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const unreadCount = getUnreadCount(cat.id, allArticles);

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-250 apple-font focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]
                  ${
                    isActive
                      ? 'bg-[#0071e3] text-white shadow-md shadow-[#0071e3]/25 scale-[1.02]'
                      : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 hover:text-gray-900 border border-gray-200/60'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={isActive ? 'text-white' : 'text-gray-500'}>
                  {MODERN_ICON_MAP[cat.iconName]}
                </span>
                <span>{cat.label}</span>

                {/* Unread Articles Count Badge */}
                {unreadCount > 0 && !isActive && (
                  <span className="ml-1 bg-red-500 text-white font-extrabold rounded-full px-1.5 py-0.5 text-[10px] leading-none shadow-xs animate-bounce">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
