'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Cloud,
  CloudOff,
  HardDrive,
  Loader2,
  Moon,
  Plus,
  ShoppingBag,
  Sun,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { formatVND, useRoommateStore } from '@/lib/roommate-store';
import { Avatar, ConfirmProvider, Toasts, cx, toneStyle } from './ui';
import { SwitchMemberModal, WelcomeScreen } from './Onboarding';
import { ChoreModal, ChoresTab } from './ChoresTab';
import { ExpenseModal, ExpensesTab, useDebts } from './ExpensesTab';
import { BillsTab } from './BillsTab';
import { ShoppingSettingsTab } from './ShoppingSettingsTab';

type TabId = 'viec-nha' | 'chi-tieu' | 'hoa-don' | 'can-mua';

const TABS: { id: TabId; label: string; short: string; icon: typeof Calendar; color: string }[] = [
  { id: 'viec-nha', label: 'Việc nhà', short: 'Việc nhà', icon: Calendar, color: '#E88D72' },
  { id: 'chi-tieu', label: 'Chi tiêu & công nợ', short: 'Chi tiêu', icon: Wallet, color: '#84A59D' },
  { id: 'hoa-don', label: 'Điện nước & hóa đơn', short: 'Hóa đơn', icon: TrendingUp, color: '#E9B44C' },
  { id: 'can-mua', label: 'Cần mua & cài đặt', short: 'Cần mua', icon: ShoppingBag, color: '#9D8189' },
];

// ---------------------------------------------------------------------------
// Tab ⇄ URL hash (keeps the tab on refresh and when sharing a link)
// ---------------------------------------------------------------------------

const TAB_EVENT = 'roommate-tab-change';
const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  window.addEventListener(TAB_EVENT, cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener(TAB_EVENT, cb);
  };
};
const readHashTab = (): TabId => {
  const h = window.location.hash.replace('#', '') as TabId;
  return TABS.some((t) => t.id === h) ? h : 'viec-nha';
};

function useTab(): [TabId, (t: TabId) => void] {
  const tab = useSyncExternalStore(subscribeHash, readHashTab, () => 'viec-nha' as TabId);
  const setTab = useCallback((t: TabId) => {
    window.history.replaceState(null, '', `#${t}`);
    window.dispatchEvent(new Event(TAB_EVENT));
    window.scrollTo({ top: 0 });
  }, []);
  return [tab, setTab];
}

// ---------------------------------------------------------------------------

function SyncBadge({ compact = false }: { compact?: boolean }) {
  const cloudConfigured = useRoommateStore((s) => s.cloudConfigured);
  const cloudSetupMissing = useRoommateStore((s) => s.cloudSetupMissing);
  const syncStatus = useRoommateStore((s) => s.syncStatus);
  const pending = useRoommateStore((s) => s.pendingOps.length);

  let icon = <Cloud className="w-4 h-4" aria-hidden />;
  let text = 'Đã đồng bộ';
  let tone = 'text-[var(--st-success)]';
  if (!cloudConfigured) {
    icon = <HardDrive className="w-4 h-4" aria-hidden />;
    text = 'Lưu trên máy';
    tone = 'text-[var(--st-ink-secondary)]';
  } else if (cloudSetupMissing) {
    icon = <AlertTriangle className="w-4 h-4" aria-hidden />;
    text = 'Chưa có Cloud';
    tone = 'text-[var(--st-danger)]';
  } else if (syncStatus === 'offline') {
    icon = <CloudOff className="w-4 h-4" aria-hidden />;
    text = pending ? `Ngoại tuyến · ${pending} chờ` : 'Ngoại tuyến';
    tone = 'text-[var(--st-warning)]';
  } else if (syncStatus === 'saving') {
    icon = <Loader2 className="w-4 h-4 animate-spin" aria-hidden />;
    text = 'Đang lưu…';
    tone = 'text-[var(--st-ink-secondary)]';
  } else if (syncStatus === 'error') {
    icon = <AlertTriangle className="w-4 h-4" aria-hidden />;
    text = 'Lỗi đồng bộ';
    tone = 'text-[var(--st-danger)]';
  }

  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[13px] font-bold', tone)} title={text}>
      {icon}
      <span className={compact ? 'st-sr-only' : ''}>{text}</span>
    </span>
  );
}

function ThemeToggle() {
  const theme = useRoommateStore((s) => s.theme);
  const toggle = useRoommateStore((s) => s.toggleTheme);
  return (
    <button type="button" className="st-icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
      {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden /> : <Moon className="w-5 h-5" aria-hidden />}
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4" aria-busy="true" aria-live="polite">
      <span className="st-sr-only">Đang tải dữ liệu phòng…</span>
      <div className="st-skeleton h-10 w-56" />
      <div className="st-skeleton h-12 w-full max-w-md" />
      <div className="st-skeleton h-56 w-full" />
      <div className="st-skeleton h-56 w-full" />
    </div>
  );
}

function SetupBanner() {
  const missing = useRoommateStore((s) => s.cloudSetupMissing);
  const [hidden, setHidden] = useState(false);
  if (!missing || hidden) return null;
  return (
    <div role="alert" className="mb-5 p-4 rounded-2xl bg-[var(--st-danger-soft)] text-[var(--st-ink-primary)] flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-[var(--st-danger)] shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-bold">Chưa đồng bộ được với cả phòng</p>
        <p className="text-[var(--st-ink-secondary)] mt-0.5">
          Supabase chưa có bảng của Roommate Hub. Người quản trị cần chạy file <code>supabase/roommate_schema.sql</code> trong Supabase SQL Editor. Trong lúc chờ, dữ liệu vẫn được lưu an toàn trên máy này và sẽ tự gửi lên khi sẵn sàng.
        </p>
      </div>
      <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={() => setHidden(true)}>
        Ẩn
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Shell() {
  const [tab, setTab] = useTab();
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const roomName = useRoommateStore((s) => s.roomName);
  const chores = useRoommateStore((s) => s.chores);
  const shoppingItems = useRoommateStore((s) => s.shoppingItems);
  const { balances, debts } = useDebts();

  const [switchOpen, setSwitchOpen] = useState(false);
  const [createChore, setCreateChore] = useState(false);
  const [createExpense, setCreateExpense] = useState(false);
  const shoppingInputRef = useRef<HTMLInputElement>(null);

  const me = members.find((m) => m.id === activeMemberId) || null;
  const myBalance = me ? balances[me.id] || 0 : 0;
  const myOpenChores = useMemo(
    () => chores.filter((c) => c.current_assignee_id === activeMemberId && c.checklist.some((s) => !s.completed)).length,
    [chores, activeMemberId]
  );
  const myDebts = debts.filter((d) => d.from_member_id === activeMemberId).length;

  const badges: Partial<Record<TabId, number>> = {
    'viec-nha': myOpenChores,
    'chi-tieu': myDebts,
    'can-mua': shoppingItems.length,
  };

  const fabLabel =
    tab === 'viec-nha' ? 'Thêm việc nhà' : tab === 'chi-tieu' ? 'Ghi khoản chi mới' : tab === 'can-mua' ? 'Thêm món cần mua' : null;
  const onFab = () => {
    if (tab === 'viec-nha') setCreateChore(true);
    else if (tab === 'chi-tieu') setCreateExpense(true);
    else if (tab === 'can-mua') {
      const input = shoppingInputRef.current;
      input?.focus();
      input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <a href="#main" className="st-skip-link">
        Bỏ qua tới nội dung chính
      </a>

      <div className="max-w-7xl mx-auto md:flex min-h-[100dvh]">
        {/* ---------------- Desktop sidebar ---------------- */}
        <aside className="hidden md:flex md:w-72 lg:w-80 flex-col justify-between gap-6 p-6 border-r border-[var(--st-border)] shrink-0 md:sticky md:top-0 md:h-[100dvh] overflow-y-auto st-scroll">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--st-ink-secondary)] hover:text-[var(--st-ink-primary)] st-hit">
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Trang chủ
              </Link>
              <ThemeToggle />
            </div>

            <div className="st-card p-5">
              <p className="text-[13px] font-bold text-[var(--st-ink-secondary)] truncate">{roomName}</p>
              <div className="flex items-center gap-3 mt-2">
                <Avatar member={me} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-lg truncate">{me?.name}</p>
                  <button type="button" className="text-sm font-bold underline underline-offset-2 text-[var(--st-ink-secondary)] hover:text-[var(--st-ink-primary)]" onClick={() => setSwitchOpen(true)}>
                    Đổi người dùng
                  </button>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--st-border)]">
                <div className="p-3 rounded-2xl st-subtle">
                  <dt className="text-xs font-bold text-[var(--st-ink-secondary)]">Việc cần làm</dt>
                  <dd className="font-extrabold mt-0.5">{myOpenChores} việc</dd>
                </div>
                <div className="p-3 rounded-2xl st-subtle">
                  <dt className="text-xs font-bold text-[var(--st-ink-secondary)]">Số dư của bạn</dt>
                  <dd className={cx('font-extrabold mt-0.5 tabular-nums', myBalance > 500 ? 'text-[var(--st-success)]' : myBalance < -500 ? 'text-[var(--st-danger)]' : '')}>
                    {myBalance > 500 ? '+' : ''}
                    {formatVND(Math.abs(myBalance) <= 500 ? 0 : myBalance)}
                  </dd>
                </div>
              </dl>
            </div>

            <nav aria-label="Điều hướng chính">
              <ul className="space-y-1.5">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  const badge = badges[t.id];
                  return (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          setTab(t.id);
                        }}
                        style={toneStyle(t.color)}
                        className={cx(
                          'w-full flex items-center gap-3 px-4 min-h-[52px] rounded-2xl font-bold transition',
                          active ? 'st-btn-tone shadow-sm' : 'text-[var(--st-ink-secondary)] hover:bg-[var(--st-bg-secondary)] hover:text-[var(--st-ink-primary)]'
                        )}
                      >
                        <Icon className="w-5 h-5" aria-hidden />
                        <span className="flex-1">{t.label}</span>
                        {!!badge && (
                          <span className={cx('text-xs min-w-6 h-6 px-1.5 rounded-full inline-flex items-center justify-center tabular-nums', active ? 'bg-white/25' : 'bg-[var(--st-bg-secondary)] text-[var(--st-ink-primary)]')}>
                            {badge}
                            <span className="st-sr-only"> mục cần chú ý</span>
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--st-border)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--st-ink-secondary)]">Thành viên ({members.filter((m) => !m.archived).length})</p>
              <SyncBadge />
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {members
                .filter((m) => !m.archived)
                .map((m) => (
                  <li key={m.id} className={cx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold', m.id === activeMemberId ? 'bg-[var(--st-bg-card)] ring-2 ring-[var(--st-accent)]' : 'bg-[var(--st-bg-secondary)]')}>
                    <span aria-hidden>{m.avatar}</span>
                    {m.name}
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        {/* ---------------- Main ---------------- */}
        <div className="flex-1 min-w-0">
          <header className="md:hidden sticky top-0 z-30 backdrop-blur-xl bg-[color-mix(in_srgb,var(--st-bg-main)_88%,transparent)] border-b border-[var(--st-border)] px-3 py-2 pt-[calc(8px+env(safe-area-inset-top))]">
            <div className="flex items-center gap-2">
              <Link href="/" className="st-icon-btn" aria-label="Về trang chủ">
                <ArrowLeft className="w-5 h-5" aria-hidden />
              </Link>
              <button type="button" onClick={() => setSwitchOpen(true)} className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-2xl px-1.5 py-1 st-hit">
                <Avatar member={me} size={34} />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[var(--st-ink-secondary)] truncate">{roomName}</span>
                  <span className="block font-extrabold truncate leading-tight">{me?.name}</span>
                </span>
                <span className="st-sr-only">— đổi người dùng</span>
              </button>
              <SyncBadge compact />
              <ThemeToggle />
            </div>
          </header>

          <main id="main" tabIndex={-1} className="p-4 sm:p-6 lg:p-10 pb-36 md:pb-12 max-w-5xl mx-auto w-full outline-none">
            <h1 className="st-sr-only">
              {roomName} — {current.label}
            </h1>
            <SetupBanner />
            {tab === 'viec-nha' && <ChoresTab onOpenCreate={() => setCreateChore(true)} />}
            {tab === 'chi-tieu' && <ExpensesTab onOpenCreate={() => setCreateExpense(true)} />}
            {tab === 'hoa-don' && <BillsTab />}
            {tab === 'can-mua' && <ShoppingSettingsTab shoppingInputRef={shoppingInputRef} />}
          </main>
        </div>
      </div>

      {/* ---------------- Mobile bottom navigation + FAB ---------------- */}
      <nav className="md:hidden st-bottom-nav" aria-label="Thanh điều hướng dưới">
        {TABS.map((t) => {
          const Icon = t.icon;
          const badge = badges[t.id];
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              aria-current={tab === t.id ? 'page' : undefined}
              style={toneStyle(t.color)}
              onClick={(e) => {
                e.preventDefault();
                setTab(t.id);
              }}
            >
              <Icon className="w-5 h-5" aria-hidden />
              {t.short}
              {!!badge && (
                <span className="st-nav-badge">
                  {badge}
                  <span className="st-sr-only"> mục cần chú ý</span>
                </span>
              )}
            </a>
          );
        })}
      </nav>
      {fabLabel && (
        <button type="button" className="md:hidden st-fab" aria-label={fabLabel} onClick={onFab}>
          <Plus className="w-7 h-7" aria-hidden />
        </button>
      )}

      <SwitchMemberModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
      <ChoreModal open={createChore} chore={null} onClose={() => setCreateChore(false)} />
      <ExpenseModal open={createExpense} expense={null} onClose={() => setCreateExpense(false)} />
    </>
  );
}

export default function RoommateApp() {
  const initialized = useRoommateStore((s) => s.initialized);
  const theme = useRoommateStore((s) => s.theme);
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const init = useRoommateStore((s) => s.initializeRoommateApp);
  const startLiveSync = useRoommateStore((s) => s.startLiveSync);

  useEffect(() => {
    void init();
    return startLiveSync();
  }, [init, startLiveSync]);

  const me = members.find((m) => m.id === activeMemberId && !m.archived);

  return (
    <div className={cx('roommate-structured-shell', theme === 'dark' && 'structured-dark')}>
      <ConfirmProvider>
        {!initialized ? <LoadingScreen /> : !me ? <WelcomeScreen /> : <Shell />}
        <Toasts />
      </ConfirmProvider>
    </div>
  );
}
