'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Notice,
  RoommateMember,
  formatMonthKey,
  formatVND,
  parseVNDInput,
  shiftMonthKey,
  toneOf,
  useRoommateStore,
} from '@/lib/roommate-store';

// ============================================================================
// TONE
// ============================================================================

/** CSS variables for a palette colour: pastel for decoration, inks for AA text. */
export function toneStyle(hex: string | undefined | null, extra?: React.CSSProperties): React.CSSProperties {
  const t = toneOf(hex);
  return {
    '--tone': hex || t.hex,
    '--tone-ink': t.ink,
    '--tone-ink-dark': t.inkDark,
    ...extra,
  } as React.CSSProperties;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ============================================================================
// MODAL — role=dialog, focus trap, Esc to close, focus restore, scroll lock
// ============================================================================

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const target =
        initialFocusRef?.current ||
        dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]') ||
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open || typeof document === 'undefined') return null;

  const shell = document.querySelector('.roommate-structured-shell') || document.body;
  const maxW = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

  return createPortal(
    <div
      className="st-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cx('st-dialog st-scroll', maxW)}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg sm:text-xl font-extrabold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-[var(--st-ink-secondary)] mt-1">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="st-icon-btn" aria-label="Đóng hộp thoại">
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    shell
  );
}

// ============================================================================
// CONFIRM DIALOG (promise based)
// ============================================================================

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    []
  );

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        initialFocusRef={state?.tone === 'danger' ? undefined : confirmBtnRef}
      >
        {state?.message && <div className="text-sm text-[var(--st-ink-secondary)] leading-relaxed">{state.message}</div>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <button type="button" className="st-btn st-btn-ghost" onClick={() => close(false)} data-autofocus>
            {state?.cancelLabel || 'Hủy'}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={cx('st-btn', state?.tone === 'danger' ? 'st-btn-danger' : 'st-btn-primary')}
            onClick={() => close(true)}
          >
            {state?.confirmLabel || 'Đồng ý'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// ============================================================================
// TOASTS (aria-live)
// ============================================================================

function ToastItem({ notice: n, onDismiss }: { notice: Notice; onDismiss: (id: string) => void }) {
  // Each toast owns its timer, so a new toast never resets (or extends) the others.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(n.id), n.action ? 8000 : 4500);
    return () => clearTimeout(timer);
  }, [n.id, n.action, onDismiss]);

  return (
    <div className="st-toast">
      <span aria-hidden className="text-base">
        {n.tone === 'success' ? '✓' : n.tone === 'warning' ? '⚠️' : n.tone === 'error' ? '⛔' : 'ℹ️'}
      </span>
      <span className="flex-1">{n.message}</span>
      {n.action && n.actionLabel && (
        <button
          type="button"
          className="st-hit px-3 py-1.5 rounded-xl font-extrabold underline underline-offset-2"
          onClick={() => {
            n.action?.();
            onDismiss(n.id);
          }}
        >
          {n.actionLabel}
        </button>
      )}
      <button
        type="button"
        className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full opacity-80 hover:opacity-100"
        aria-label="Ẩn thông báo"
        onClick={() => onDismiss(n.id)}
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}

export function Toasts() {
  const notices = useRoommateStore((s) => s.notices);
  const dismiss = useRoommateStore((s) => s.dismissNotice);
  return (
    <div className="st-toast-region" role="status" aria-live="polite">
      {notices.map((n) => (
        <ToastItem key={n.id} notice={n} onDismiss={dismiss} />
      ))}
    </div>
  );
}

// ============================================================================
// FORM FIELDS
// ============================================================================

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="st-label">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="st-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="st-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Fieldset with a visible legend — for groups of toggle buttons. */
export function FieldGroup({
  legend,
  hint,
  error,
  children,
  action,
}: {
  legend: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <legend className="st-label !mb-0">{legend}</legend>
        {action}
      </div>
      {children}
      {hint && !error && <p className="st-hint">{hint}</p>}
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Money input: shows "150.000" while typing, numeric keypad on phones. */
export function MoneyInput({
  value,
  onChange,
  ...rest
}: {
  value: number;
  onChange: (n: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cx('st-input pr-12 font-bold tabular-nums', rest.className)}
        value={value ? new Intl.NumberFormat('vi-VN').format(value) : ''}
        onChange={(e) => onChange(Math.min(parseVNDInput(e.target.value), 999_999_999_999))}
      />
      <span aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--st-ink-muted)]">
        đ
      </span>
    </div>
  );
}

export function QuickAmounts({ onPick }: { onPick: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label="Số tiền gợi ý">
      {[20000, 50000, 100000, 200000, 500000].map((n) => (
        <button key={n} type="button" className="st-chip !min-h-9 !px-3 !text-[13px]" onClick={() => onPick(n)}>
          {formatVND(n)}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MEMBERS
// ============================================================================

export function Avatar({
  member,
  size = 36,
  className,
}: {
  member?: Pick<RoommateMember, 'avatar' | 'color' | 'name'> | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx('inline-flex items-center justify-center rounded-full shrink-0 tone-soft', className)}
      style={toneStyle(member?.color, { width: size, height: size, fontSize: Math.round(size * 0.5) })}
    >
      {member?.avatar || '👤'}
    </span>
  );
}

/** Single-select member picker (radiogroup semantics via aria-pressed buttons). */
export function MemberPickerSingle({
  members,
  value,
  onChange,
}: {
  members: RoommateMember[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          className="st-chip"
          aria-pressed={value === m.id}
          onClick={() => onChange(m.id)}
        >
          <span aria-hidden>{m.avatar}</span>
          {m.name}
        </button>
      ))}
    </div>
  );
}

export function MemberPickerMulti({
  members,
  value,
  onChange,
}: {
  members: RoommateMember[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const on = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            className="st-chip"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((id) => id !== m.id) : [...value, m.id])}
          >
            <span aria-hidden>{on ? '✓' : m.avatar}</span>
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

export function SplitPreview({ amount, count }: { amount: number; count: number }) {
  if (!amount || count === 0) return null;
  return (
    <p className="st-hint">
      Mỗi người: <strong className="text-[var(--st-ink-primary)]">{formatVND(amount / count)}</strong> ({count} người)
    </p>
  );
}

// ============================================================================
// MISC
// ============================================================================

export function MonthStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 st-pill-strip" role="group" aria-label="Chọn tháng">
      <button type="button" className="st-icon-btn !bg-transparent" aria-label="Tháng trước" onClick={() => onChange(shiftMonthKey(value, -1))}>
        <ChevronLeft className="w-5 h-5" aria-hidden />
      </button>
      <span className="min-w-[118px] text-center text-sm font-extrabold tabular-nums" aria-live="polite">
        {formatMonthKey(value)}
      </span>
      <button type="button" className="st-icon-btn !bg-transparent" aria-label="Tháng sau" onClick={() => onChange(shiftMonthKey(value, 1))}>
        <ChevronRight className="w-5 h-5" aria-hidden />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="st-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-70 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 px-6 text-center rounded-3xl st-subtle">
      <div className="text-4xl mb-3" aria-hidden>
        {icon}
      </div>
      <p className="font-extrabold">{title}</p>
      {children && <div className="text-sm text-[var(--st-ink-secondary)] mt-1 max-w-sm mx-auto">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  toneHex,
}: {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  toneHex: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] tone-text" style={toneStyle(toneHex)}>
          {eyebrow}
        </p>
        <h2 className="text-[28px] sm:text-4xl font-extrabold tracking-tight mt-1 leading-tight">{title}</h2>
        {description && <p className="text-sm text-[var(--st-ink-secondary)] mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="hidden md:flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
