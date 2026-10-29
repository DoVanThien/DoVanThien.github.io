'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Edit3, Plus, QrCode, Trash2 } from 'lucide-react';
import {
  ExpenseCategory,
  ExpenseRecord,
  RoommateMember,
  SimplifiedDebtTransaction,
  VIETQR_BANKS,
  activeMembersOf,
  buildTransferMemo,
  buildVietQRUrl,
  calculateNetBalances,
  formatMonthKey,
  formatShortDate,
  formatVND,
  getTodayDateString,
  simplifyRoommateDebts,
  useRoommateStore,
} from '@/lib/roommate-store';
import {
  Avatar,
  EmptyState,
  Field,
  FieldGroup,
  MemberPickerMulti,
  MemberPickerSingle,
  Modal,
  MoneyInput,
  QuickAmounts,
  SectionHeader,
  Segmented,
  SplitPreview,
  cx,
  toneStyle,
  useConfirm,
} from './ui';

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  daily: { label: 'Sinh hoạt', icon: '💸', color: '#E88D72' },
  fixed_bill: { label: 'Hóa đơn', icon: '🧾', color: '#E9B44C' },
  shopping: { label: 'Mua đồ chung', icon: '🛒', color: '#9D8189' },
  settlement: { label: 'Trả nợ', icon: '🤝', color: '#84A59D' },
};

const PAGE = 25;

export function useDebts() {
  const members = useRoommateStore((s) => s.members);
  const expenses = useRoommateStore((s) => s.expenses);
  const balances = useMemo(() => calculateNetBalances(members, expenses), [members, expenses]);
  const debts = useMemo(() => simplifyRoommateDebts(balances), [balances]);
  return { balances, debts };
}

export function ExpensesTab({ onOpenCreate }: { onOpenCreate: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const expenses = useRoommateStore((s) => s.expenses);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const { balances, debts } = useDebts();

  const [category, setCategory] = useState<'all' | ExpenseCategory>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [qr, setQr] = useState<SimplifiedDebtTransaction | null>(null);

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (category === 'all' || e.category === category) &&
          (!onlyMine || e.paid_by_member_id === activeMemberId || e.split_member_ids.includes(activeMemberId || ''))
      ),
    [expenses, category, onlyMine, activeMemberId]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRecord[]>();
    for (const e of filtered.slice(0, limit)) {
      const key = e.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered, limit]);

  const monthTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      if (e.category === 'settlement') continue;
      const k = e.date.slice(0, 7);
      totals[k] = (totals[k] || 0) + e.amount;
    }
    return totals;
  }, [expenses]);

  const visibleMembers = members.filter((m) => !m.archived || Math.abs(balances[m.id] || 0) > 500);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Chi tiêu chung"
        title="Chi tiêu & công nợ"
        toneHex="#84A59D"
        description="Mọi khoản chi, hóa đơn và đồ mua chung được cấn trừ chéo để cả phòng chuyển khoản ít lần nhất."
        action={
          <button type="button" className="st-btn st-btn-primary st-btn-pill" onClick={onOpenCreate}>
            <Plus className="w-5 h-5" aria-hidden /> Ghi khoản chi
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="st-card p-5 sm:p-6 lg:col-span-7" aria-labelledby="settle-title">
          <h3 id="settle-title" className="font-extrabold text-lg">
            Ai cần trả ai
          </h3>
          <p className="text-sm text-[var(--st-ink-secondary)] mt-0.5">Chỉ cần các lần chuyển khoản dưới đây là cả phòng hết nợ.</p>

          {debts.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon="🎉" title="Cả phòng không ai nợ ai">
                Khi có khoản chi mới, hệ thống sẽ tự tính ở đây.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {debts.map((tx) => {
                const from = members.find((m) => m.id === tx.from_member_id);
                const to = members.find((m) => m.id === tx.to_member_id);
                if (!from || !to) return null;
                const involvesMe = from.id === activeMemberId || to.id === activeMemberId;
                return (
                  <li
                    key={`${tx.from_member_id}-${tx.to_member_id}`}
                    className={cx(
                      'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      involvesMe ? 'border-[var(--st-accent)] bg-[var(--st-accent-soft)]' : 'border-[var(--st-border-strong)] st-subtle'
                    )}
                  >
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <Avatar member={from} size={28} />
                        {from.id === activeMemberId ? 'Bạn' : from.name}
                      </span>
                      <span className="text-[var(--st-ink-secondary)]">trả</span>
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <Avatar member={to} size={28} />
                        {to.id === activeMemberId ? 'bạn' : to.name}
                      </span>
                      <strong className="text-lg font-extrabold tabular-nums">{formatVND(tx.amount)}</strong>
                    </p>
                    <button type="button" className="st-btn st-btn-secondary st-btn-sm shrink-0" onClick={() => setQr(tx)}>
                      <QrCode className="w-4 h-4" aria-hidden /> Chuyển khoản
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="st-card p-5 sm:p-6 lg:col-span-5" aria-labelledby="balance-title">
          <h3 id="balance-title" className="font-extrabold text-lg">
            Số dư từng người
          </h3>
          <ul className="mt-4 space-y-2">
            {visibleMembers.map((m) => {
              const bal = balances[m.id] || 0;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl st-subtle">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Avatar member={m} size={36} />
                    <span className="min-w-0">
                      <span className="block font-bold truncate">
                        {m.name}
                        {m.id === activeMemberId && ' (bạn)'}
                      </span>
                      <span className="block text-xs text-[var(--st-ink-secondary)]">
                        {m.archived ? 'Đã rời phòng · ' : ''}
                        {bal > 500 ? 'Được nhận lại' : bal < -500 ? 'Cần trả thêm' : 'Đã cân bằng'}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cx(
                      'font-extrabold tabular-nums',
                      bal > 500 ? 'text-[var(--st-success)]' : bal < -500 ? 'text-[var(--st-danger)]' : 'text-[var(--st-ink-secondary)]'
                    )}
                  >
                    {bal > 500 ? '+' : ''}
                    {formatVND(Math.abs(bal) <= 500 ? 0 : bal)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section aria-labelledby="history-title" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 id="history-title" className="font-extrabold text-xl">
            Lịch sử chi tiêu
          </h3>
          <button type="button" className="st-chip self-start" aria-pressed={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>
            <span aria-hidden>{onlyMine ? '✓' : '👤'}</span> Chỉ khoản liên quan tới tôi
          </button>
        </div>
        <Segmented<'all' | ExpenseCategory>
          label="Lọc theo loại"
          value={category}
          onChange={(v) => {
            setCategory(v);
            setLimit(PAGE);
          }}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'daily', label: 'Sinh hoạt' },
            { value: 'fixed_bill', label: 'Hóa đơn' },
            { value: 'shopping', label: 'Mua đồ' },
            { value: 'settlement', label: 'Trả nợ' },
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon="🧾"
            title={expenses.length === 0 ? 'Chưa có khoản chi nào' : 'Không có khoản chi phù hợp bộ lọc'}
            action={
              expenses.length === 0 ? (
                <button type="button" className="st-btn st-btn-primary" onClick={onOpenCreate}>
                  <Plus className="w-5 h-5" aria-hidden /> Ghi khoản chi đầu tiên
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {groups.map(([month, list]) => (
              <section key={month} aria-label={formatMonthKey(month)}>
                <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
                  <h4 className="font-extrabold">{formatMonthKey(month)}</h4>
                  <span className="text-sm text-[var(--st-ink-secondary)]">
                    Tổng chi: <strong className="text-[var(--st-ink-primary)] tabular-nums">{formatVND(monthTotals[month] || 0)}</strong>
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {list.map((e) => (
                    <ExpenseRow key={e.id} expense={e} members={members} activeMemberId={activeMemberId} onEdit={() => setEditing(e)} />
                  ))}
                </ul>
              </section>
            ))}
            {filtered.length > limit && (
              <div className="flex justify-center">
                <button type="button" className="st-btn st-btn-secondary" onClick={() => setLimit(limit + PAGE)}>
                  Xem thêm ({filtered.length - limit} khoản)
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <ExpenseModal open={!!editing} expense={editing} onClose={() => setEditing(null)} />
      <QrModal tx={qr} onClose={() => setQr(null)} />
    </div>
  );
}

function ExpenseRow({
  expense: e,
  members,
  activeMemberId,
  onEdit,
}: {
  expense: ExpenseRecord;
  members: RoommateMember[];
  activeMemberId: string | null;
  onEdit: () => void;
}) {
  const deleteExpenseRecord = useRoommateStore((s) => s.deleteExpenseRecord);
  const restoreExpenseRecord = useRoommateStore((s) => s.restoreExpenseRecord);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();
  const meta = CATEGORY_META[e.category];
  const payer = members.find((m) => m.id === e.paid_by_member_id);
  const split = members.filter((m) => e.split_member_ids.includes(m.id));
  const perPerson = split.length ? e.amount / split.length : e.amount;
  const myShare = activeMemberId && e.split_member_ids.includes(activeMemberId) && e.category !== 'settlement' ? perPerson : 0;

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Xóa khoản chi này?',
      message: (
        <>
          <strong>{e.title}</strong> — {formatVND(e.amount)}. Công nợ của cả phòng sẽ được tính lại.
        </>
      ),
      confirmLabel: 'Xóa khoản chi',
      tone: 'danger',
    });
    if (!ok) return;
    const removed = deleteExpenseRecord(e.id);
    if (removed) {
      notify({ tone: 'info', message: 'Đã xóa khoản chi.', actionLabel: 'Hoàn tác', action: () => restoreExpenseRecord(removed) });
    }
  };

  return (
    <li className="st-card p-4 sm:p-5" style={toneStyle(meta.color)}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl tone-soft shrink-0">
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="font-extrabold leading-snug break-words">{e.title}</p>
              <p className="text-sm text-[var(--st-ink-secondary)] mt-0.5">
                <span className="tone-badge px-2 py-0.5 rounded-full text-xs font-bold mr-1.5">{meta.label}</span>
                {formatShortDate(e.date)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-extrabold text-lg tabular-nums">{formatVND(e.amount)}</p>
              {e.category !== 'settlement' && split.length > 1 && (
                <p className="text-xs text-[var(--st-ink-secondary)] tabular-nums">{formatVND(perPerson)}/người</p>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 mt-2">
            <div className="min-w-0">
              <p className="text-sm text-[var(--st-ink-secondary)]">
                <strong className="text-[var(--st-ink-primary)]">{payer?.name || 'Thành viên'}</strong>{' '}
                {e.category === 'settlement' ? 'đã trả cho' : 'trả · chia cho'}{' '}
                {split.length === activeMembersOf(members).length && split.length > 2 && e.category !== 'settlement'
                  ? 'cả phòng'
                  : split.map((m) => m.name).join(', ') || '—'}
                {myShare > 0 && e.paid_by_member_id !== activeMemberId && (
                  <span className="ml-1.5 text-[var(--st-danger)] font-bold">· phần bạn {formatVND(myShare)}</span>
                )}
              </p>
              {e.note && <p className="text-sm text-[var(--st-ink-muted)] mt-1">{e.note}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {e.category !== 'settlement' && (
                <button type="button" className="st-icon-btn" aria-label={`Sửa khoản “${e.title}”`} onClick={onEdit}>
                  <Edit3 className="w-4 h-4" aria-hidden />
                </button>
              )}
              <button type="button" className="st-icon-btn is-danger" aria-label={`Xóa khoản “${e.title}”`} onClick={onDelete}>
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// ============================================================================
// EXPENSE MODAL (create / edit)
// ============================================================================

export function ExpenseModal({
  open,
  expense,
  onClose,
}: {
  open: boolean;
  expense: ExpenseRecord | null;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Sửa khoản chi' : 'Ghi khoản chi mới'}>
      {open && <ExpenseForm key={expense?.id || 'new'} expense={expense} onClose={onClose} />}
    </Modal>
  );
}

function ExpenseForm({ expense, onClose }: { expense: ExpenseRecord | null; onClose: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const saveExpenseRecord = useRoommateStore((s) => s.saveExpenseRecord);
  const notify = useRoommateStore((s) => s.notify);
  const active = activeMembersOf(members);
  const pickable = expense ? members.filter((m) => !m.archived || m.id === expense.paid_by_member_id || expense.split_member_ids.includes(m.id)) : active;

  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense?.amount || 0);
  const [date, setDate] = useState(expense?.date || getTodayDateString());
  const [paidBy, setPaidBy] = useState(expense?.paid_by_member_id || activeMemberId || active[0]?.id || '');
  const [split, setSplit] = useState<string[]>(expense?.split_member_ids || active.map((m) => m.id));
  const [note, setNote] = useState(expense?.note || '');
  const [errors, setErrors] = useState<{ title?: string; amount?: string; split?: string; paidBy?: string }>({});

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const next = {
      title: title.trim() ? undefined : 'Nhập mô tả khoản chi.',
      amount: amount >= 1000 ? undefined : 'Số tiền tối thiểu 1.000đ.',
      paidBy: paidBy ? undefined : 'Chọn người trả tiền.',
      split: split.length ? undefined : 'Chọn ít nhất 1 người cùng chia.',
    };
    setErrors(next);
    if (next.title || next.amount || next.paidBy || next.split) return;
    saveExpenseRecord({
      ...(expense || {}),
      id: expense?.id,
      title: title.trim(),
      amount,
      date: date || getTodayDateString(),
      paid_by_member_id: paidBy,
      split_member_ids: split,
      category: expense?.category || 'daily',
      note: note.trim(),
    });
    notify({ tone: 'success', message: expense ? 'Đã cập nhật khoản chi.' : `Đã ghi ${formatVND(amount)} — công nợ đã được tính lại.` });
    onClose();
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Field label="Mô tả" error={errors.title}>
        {(p) => (
          <input
            {...p}
            data-autofocus
            className="st-input"
            value={title}
            maxLength={80}
            placeholder="VD: Đi chợ, đổi bình nước…"
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Số tiền" error={errors.amount}>
          {(p) => (
            <>
              <MoneyInput {...p} value={amount} onChange={setAmount} placeholder="0" />
              {!expense && <QuickAmounts onPick={setAmount} />}
            </>
          )}
        </Field>
        <Field label="Ngày chi">
          {(p) => <input {...p} type="date" className="st-input" value={date} max={getTodayDateString()} onChange={(e) => setDate(e.target.value)} />}
        </Field>
      </div>

      <FieldGroup legend="Ai trả tiền?" error={errors.paidBy}>
        <MemberPickerSingle members={pickable} value={paidBy} onChange={setPaidBy} />
      </FieldGroup>

      <FieldGroup
        legend={`Chia cho (${split.length} người)`}
        error={errors.split}
        action={
          <button type="button" className="text-sm font-bold underline underline-offset-2 st-hit px-1" onClick={() => setSplit(active.map((m) => m.id))}>
            Cả phòng
          </button>
        }
      >
        <MemberPickerMulti members={pickable} value={split} onChange={setSplit} />
        <SplitPreview amount={amount} count={split.length} />
      </FieldGroup>

      <Field label="Ghi chú (tùy chọn)">
        {(p) => <input {...p} className="st-input" value={note} maxLength={120} placeholder="VD: Mua ở WinMart" onChange={(e) => setNote(e.target.value)} />}
      </Field>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="st-btn st-btn-primary">
          {expense ? 'Lưu thay đổi' : 'Lưu & chia tiền'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// VIETQR / SETTLEMENT MODAL
// ============================================================================

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="st-btn st-btn-ghost st-btn-sm"
      aria-label={`Sao chép ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
      {copied ? 'Đã chép' : 'Chép'}
    </button>
  );
}

function QrModal({ tx: openedTx, onClose }: { tx: SimplifiedDebtTransaction | null; onClose: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const { debts } = useDebts();
  // Follow the live debt: another phone may have paid or added expenses while this is open.
  const tx = openedTx
    ? debts.find((d) => d.from_member_id === openedTx.from_member_id && d.to_member_id === openedTx.to_member_id) || null
    : null;
  const settledMeanwhile = !!openedTx && !tx;
  const settle = useRoommateStore((s) => s.settleDebtBetweenMembers);
  const notify = useRoommateStore((s) => s.notify);
  const [imgFailed, setImgFailed] = useState(false);

  const from = members.find((m) => m.id === tx?.from_member_id);
  const to = members.find((m) => m.id === tx?.to_member_id);
  const hasBank = !!(to?.bank_bin && to?.bank_account_no);
  const memo = from ? buildTransferMemo(from.name) : '';
  const bank = VIETQR_BANKS.find((b) => b.bin === to?.bank_bin);

  return (
    <Modal
      open={!!openedTx}
      onClose={() => {
        setImgFailed(false);
        onClose();
      }}
      title="Chuyển khoản trả nợ"
      size="sm"
    >
      {settledMeanwhile && (
        <div className="space-y-4 text-center">
          <p className="text-[var(--st-ink-secondary)]">Khoản nợ này vừa được thanh toán hoặc thay đổi trên máy khác.</p>
          <button type="button" className="st-btn st-btn-primary w-full" onClick={onClose}>
            Đóng
          </button>
        </div>
      )}
      {tx && from && to && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-[var(--st-ink-secondary)]">
              <strong className="text-[var(--st-ink-primary)]">{from.name}</strong> chuyển cho{' '}
              <strong className="text-[var(--st-ink-primary)]">{to.name}</strong>
            </p>
            <p className="text-3xl font-extrabold tabular-nums mt-1">{formatVND(tx.amount)}</p>
          </div>

          {hasBank ? (
            <>
              {!imgFailed ? (
                <div className="p-3 rounded-2xl bg-white border border-[var(--st-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildVietQRUrl({
                      bankBin: to.bank_bin!,
                      accountNo: to.bank_account_no!,
                      accountName: to.bank_account_name || to.name,
                      amount: tx.amount,
                      memo,
                    })}
                    alt={`Mã VietQR chuyển ${formatVND(tx.amount)} tới tài khoản ${bank?.shortName || ''} ${to.bank_account_no} của ${to.name}`}
                    className="w-full max-w-[280px] mx-auto rounded-xl"
                    onError={() => setImgFailed(true)}
                  />
                </div>
              ) : (
                <p className="text-sm text-[var(--st-warning)] text-center">Không tải được mã QR (mất mạng?). Dùng thông tin bên dưới để chuyển thủ công.</p>
              )}
              <dl className="text-sm space-y-2 p-3 rounded-2xl st-subtle">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <dt className="text-[var(--st-ink-secondary)]">Ngân hàng · Số tài khoản</dt>
                    <dd className="font-bold tabular-nums truncate">
                      {bank?.shortName || to.bank_short_name} · {to.bank_account_no}
                    </dd>
                  </div>
                  <CopyButton value={to.bank_account_no!} label="số tài khoản" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <dt className="text-[var(--st-ink-secondary)]">Nội dung chuyển khoản</dt>
                    <dd className="font-bold truncate">{memo}</dd>
                  </div>
                  <CopyButton value={memo} label="nội dung chuyển khoản" />
                </div>
              </dl>
            </>
          ) : (
            <div className="p-4 rounded-2xl st-subtle text-sm text-[var(--st-ink-secondary)] text-center">
              <p className="text-2xl mb-1" aria-hidden>
                🏦
              </p>
              <strong className="text-[var(--st-ink-primary)]">{to.name}</strong> chưa thêm tài khoản ngân hàng. Hãy hỏi số tài khoản hoặc trả tiền mặt, rồi bấm xác nhận bên dưới.
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              className="st-btn st-btn-primary w-full"
              onClick={() => {
                settle(from.id, to.id, tx.amount);
                notify({ tone: 'success', message: `Đã ghi nhận ${from.name} trả ${to.name} ${formatVND(tx.amount)}.` });
                setImgFailed(false);
                onClose();
              }}
            >
              <Check className="w-5 h-5" aria-hidden /> Xác nhận đã trả xong
            </button>
            <p className="text-xs text-[var(--st-ink-muted)] text-center">Chỉ bấm sau khi tiền đã chuyển. Có thể xóa bản ghi trả nợ trong lịch sử nếu bấm nhầm.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
