'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Languages, Calendar, Images, ArrowRight } from 'lucide-react';

export default function PortalPage() {
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans relative overflow-x-hidden flex flex-col justify-between bg-[#080b11]">
      {/* Ambient Glow Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Blob 1 - Indigo */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-40 bg-radial from-indigo-600 to-transparent animate-float" style={{ animationDuration: '25s' }} />
        {/* Blob 2 - Emerald */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-40 bg-radial from-emerald-600 to-transparent animate-float" style={{ animationDuration: '30s', animationDelay: '-5s' }} />
        {/* Blob 3 - Rose */}
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-40 bg-radial from-rose-600 to-transparent animate-float" style={{ animationDuration: '22s', animationDelay: '-10s' }} />
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl w-full mx-auto px-6 py-16 flex-grow flex flex-col justify-center relative z-10">
        <header className="text-center mb-16 animate-fadeInDown">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/85 px-4 py-1.5 rounded-full text-sm font-medium text-slate-400 backdrop-blur-md mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Do Van Thien's App Space</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-indigo-200 to-indigo-300 bg-clip-text text-transparent mb-5">
            Ứng Dụng Độc Bản
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
            Khám phá các dự án web cá nhân được tối ưu hóa giao diện và trải nghiệm người dùng tích hợp công nghệ hiện đại.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full animate-fadeInUp">
          {/* App 1: AI English Mentor Pro */}
          <Link
            href="/ai-english"
            className="group relative flex flex-col p-10 rounded-[24px] border border-white/8 bg-slate-900/60 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/40 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] overflow-hidden"
            onMouseMove={handleMouseMove}
            style={{
              // Spotlight effect styling
              backgroundImage: 'radial-gradient(800px circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.06), transparent 40%)'
            } as React.CSSProperties}
          >
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Languages className="w-8 h-8" />
            </div>
            <span className="self-start text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 mb-4">
              AI & Education
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mb-3 group-hover:text-white transition-colors">
              AI English Mentor
            </h2>
            <p className="text-sm text-slate-400 font-light leading-relaxed mb-8 flex-grow">
              Ứng dụng đồng hành học tiếng Anh thông minh. Tích hợp AI hỗ trợ chữa bài, giải thích ngữ pháp và ôn tập từ vựng cá nhân hóa.
            </p>
            <div className="flex gap-1.5 flex-wrap mb-8 pt-4 border-t border-white/5">
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Gemini AI</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">React / Next.js</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Supabase Cloud</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Speech API</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold p-3.5 px-5 rounded-[12px] bg-white/5 border border-white/6 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:border-white group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.25)]">
              <span>Mở Ứng Dụng</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>

          {/* App 2: Poop Tracker */}
          <a
            href="/DI_IA_CALENDER/index.html"
            className="group relative flex flex-col p-10 rounded-[24px] border border-white/8 bg-slate-900/60 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-emerald-500/40 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] overflow-hidden"
            onMouseMove={handleMouseMove}
            style={{
              backgroundImage: 'radial-gradient(800px circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.06), transparent 40%)'
            } as React.CSSProperties}
          >
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Calendar className="w-8 h-8" />
            </div>
            <span className="self-start text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 mb-4">
              Health & PWA
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mb-3 group-hover:text-white transition-colors">
              Poop Tracker
            </h2>
            <p className="text-sm text-slate-400 font-light leading-relaxed mb-8 flex-grow">
              Nhật ký theo dõi sức khỏe tiêu hóa cá nhân. Tích hợp phân tích dữ liệu trực quan bằng biểu đồ, quản lý nhiều hồ sơ và hỗ trợ PWA offline.
            </p>
            <div className="flex gap-1.5 flex-wrap mb-8 pt-4 border-t border-white/5">
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">PWA Support</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Cloud Sync</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Chart.js</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Multi-Profile</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold p-3.5 px-5 rounded-[12px] bg-white/5 border border-white/6 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:border-white group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.25)]">
              <span>Mở Ứng Dụng</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </a>

          {/* App 3: Demon Slayer Gallery */}
          <a
            href="/hw1/index.html"
            className="group relative flex flex-col p-10 rounded-[24px] border border-white/8 bg-slate-900/60 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-rose-500/40 hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.15)] overflow-hidden"
            onMouseMove={handleMouseMove}
            style={{
              backgroundImage: 'radial-gradient(800px circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.06), transparent 40%)'
            } as React.CSSProperties}
          >
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mb-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Images className="w-8 h-8" />
            </div>
            <span className="self-start text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 mb-4">
              Creative Gallery
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mb-3 group-hover:text-white transition-colors">
              Demon Slayer Hub
            </h2>
            <p className="text-sm text-slate-400 font-light leading-relaxed mb-8 flex-grow">
              Bộ sưu tập hình ảnh chất lượng cao về bộ truyện Anime nổi tiếng Kimetsu no Yaiba. Thiết kế layout trực quan và chuyển động mượt mà.
            </p>
            <div className="flex gap-1.5 flex-wrap mb-8 pt-4 border-t border-white/5">
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">HTML5 / CSS3</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Grid Layout</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Responsive</span>
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded">Anime Theme</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold p-3.5 px-5 rounded-[12px] bg-white/5 border border-white/6 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:border-white group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.25)]">
              <span>Mở Ứng Dụng</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </a>
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-slate-500 border-t border-white/5 backdrop-blur-md relative z-10">
        <p>&copy; 2026 Do Van Thien. Built for premium web experience.</p>
      </footer>
    </div>
  );
}
