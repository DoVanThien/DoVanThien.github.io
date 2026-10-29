'use client';

import React, { useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CreditCard, Edit3, Plus, Table2, Trash2, BarChart3 } from 'lucide-react';
import {
  BILL_ICONS,
  FixedBillConfig,
  STRUCTURED_COLORS,
  activeMembersOf,
  formatMonthKey,
  formatVND,
  getCurrentMonthKey,
  getFixedBillHistory,
  shiftMonthKey,
  toneOf,
  useRoommateStore,
} from '@/lib/roommate-store';
import {
  EmptyState,
  Field,
  FieldGroup,
  MemberPickerMulti,
  MemberPickerSingle,
  Modal,
  MonthStepper,
  MoneyInput,
  SectionHeader,
  SplitPreview,
  cx,
  toneStyle,
  useConfirm,
} from './ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const shortMonth = (mk: string) => {
  const [y, m] = mk.split('-');
  return `T${Number(m)}/${y.slice(2)}`;
};

export function BillsTab() {
  const fixedBills = useRoommateStore((s) => s.fixedBills);
  const expenses = useRoommateStore((s) => s.expenses);
  const members = useRoommateStore((s) => s.members);
  const theme = useRoommateStore((s) => s.theme);
  const [month, setMonth] = useState(getCurrentMonthKey());
  const [chartFilter, setChartFilter] = useState<string>('all');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [recording, setRecording] = useState<FixedBillConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FixedBillConfig | null>(null);

  const histories = useMemo(() => {
    const map: Record<string, ReturnType<typeof getFixedBillHistory>> = {};
    for (const b of fixedBills) map[b.id] = getFixedBillHistory(b.id, expenses);
    return map;
  }, [fixedBills, expenses]);

  const months = useMemo(() => {
    const list: string[] = [];
    for (let i = 5; i >= 0; i--) list.push(shiftMonthKey(month, -i));
    return list;
  }, [month]);

  const billsShown = chartFilter === 'all' ? fixedBills : fixedBills.filter((b) => b.id === chartFilter);
  const hasChartData = billsShown.some((b) => histories[b.id]?.some((h) => months.includes(h.month_key)));
  const dark = theme === 'dark';

  const chartData = {
    labels: months.map(shortMonth),
    datasets: billsShown.map((b) => {
      const t = toneOf(b.color);
      return {
        label: `${b.icon} ${b.name}`,
        data: months.map((mk) => histories[b.id]?.find((h) => h.month_key === mk)?.amount || 0),
        backgroundColor: b.color,
        borderColor: dark ? t.inkDark : t.ink,
        borderWidth: 1.5,
        borderRadius: 8,
        maxBarThickness: 36,
      };
    }),
  };

  const monthTotal = fixedBills.reduce((sum, b) => sum + (histories[b.id]?.find((h) => h.month_key === month)?.amount || 0), 0);
  const prevTotal = fixedBills.reduce(
    (sum, b) => sum + (histories[b.id]?.find((h) => h.month_key === shiftMonthKey(month, -1))?.amount || 0),
    0
  );
  const activeCount = activeMembersOf(members).length || 1;
  const enteredCount = fixedBills.filter((b) => histories[b.id]?.some((h) => h.month_key === month)).length;

  const inkSecondary = dark ? '#C4BCB4' : '#5E5650';
  const gridColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(43,37,34,0.08)';

  const chartSummary = hasChartData
    ? `Biểu đồ cột chi phí cố định từ ${formatMonthKey(months[0])} đến ${formatMonthKey(months[5])}. ` +
      months
        .map((mk) => {
          const total = billsShown.reduce((s, b) => s + (histories[b.id]?.find((h) => h.month_key === mk)?.amount || 0), 0);
          return `${formatMonthKey(mk)}: ${formatVND(total)}`;
        })
        .join('; ')
    : 'Chưa có dữ liệu hóa đơn trong 6 tháng này.';

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Hóa đơn hằng tháng"
        title="Điện nước & hóa đơn"
        toneHex="#E9B44C"
        description="Nhập số tiền mỗi kỳ: vừa vẽ biểu đồ so sánh, vừa tự chia tiền vào công nợ chung."
        action={
          <button
            type="button"
            className="st-btn st-btn-secondary st-btn-pill"
            onClick={() => {
              setEditingConfig(null);
              setConfigOpen(true);
            }}
          >
            <Plus className="w-5 h-5" aria-hidden /> Thêm loại hóa đơn
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthStepper value={month} onChange={setMonth} />
        <button
          type="button"
          className="st-btn st-btn-secondary st-btn-pill md:hidden"
          onClick={() => {
            setEditingConfig(null);
            setConfigOpen(true);
          }}
        >
          <Plus className="w-5 h-5" aria-hidden /> Loại hóa đơn
        </button>
      </div>

      <section className="st-card p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label={`Tổng kết ${formatMonthKey(month)}`}>
        <div>
          <p className="text-sm text-[var(--st-ink-secondary)]">Tổng hóa đơn {formatMonthKey(month).toLowerCase()}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-0.5">{formatVND(monthTotal)}</p>
          {prevTotal > 0 && monthTotal > 0 && (
            <p className={cx('text-sm font-bold mt-0.5', monthTotal > prevTotal ? 'text-[var(--st-danger)]' : 'text-[var(--st-success)]')}>
              {monthTotal > prevTotal ? '▲' : '▼'} {Math.abs(Math.round(((monthTotal - prevTotal) / prevTotal) * 100))}% so với tháng trước
            </p>
          )}
        </div>
        <div>
          <p className="text-sm text-[var(--st-ink-secondary)]">Ước tính mỗi người</p>
          <p className="text-2xl font-extrabold tabular-nums mt-0.5">{formatVND(monthTotal / activeCount)}</p>
          <p className="text-sm text-[var(--st-ink-secondary)] mt-0.5">chia đều {activeCount} người</p>
        </div>
        <div>
          <p className="text-sm text-[var(--st-ink-secondary)]">Đã nhập</p>
          <p className="text-2xl font-extrabold tabular-nums mt-0.5">
            {enteredCount}/{fixedBills.length}
          </p>
          <p className="text-sm text-[var(--st-ink-secondary)] mt-0.5">loại hóa đơn</p>
        </div>
      </section>

      <section className="st-card p-5 sm:p-6 space-y-4" aria-labelledby="chart-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="chart-title" className="font-extrabold text-lg">
              Biến động 6 tháng
            </h3>
            <p className="text-sm text-[var(--st-ink-secondary)]">So sánh tiền điện, nước và các khoản cố định</p>
          </div>
          <div className="st-seg" role="group" aria-label="Kiểu hiển thị">
            <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
              <BarChart3 className="w-4 h-4 inline -mt-0.5 mr-1" aria-hidden /> Biểu đồ
            </button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
              <Table2 className="w-4 h-4 inline -mt-0.5 mr-1" aria-hidden /> Bảng
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc loại hóa đơn">
          <button type="button" className="st-chip" aria-pressed={chartFilter === 'all'} onClick={() => setChartFilter('all')}>
            Tất cả
          </button>
          {fixedBills.map((b) => (
            <button key={b.id} type="button" className="st-chip" aria-pressed={chartFilter === b.id} onClick={() => setChartFilter(b.id)}>
              <span aria-hidden>{b.icon}</span> {b.name}
            </button>
          ))}
        </div>

        {view === 'chart' ? (
          <figure className="relative h-64 sm:h-72">
            <Bar
              role="img"
              aria-label={chartSummary}
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: inkSecondary, usePointStyle: true, boxWidth: 10, font: { size: 12, weight: 'bold' } },
                  },
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatVND(Number(ctx.raw) || 0)}` },
                  },
                },
                scales: {
                  x: { stacked: chartFilter === 'all', grid: { display: false }, ticks: { color: inkSecondary, font: { size: 12 } } },
                  y: {
                    stacked: chartFilter === 'all',
                    beginAtZero: true,
                    suggestedMax: hasChartData ? undefined : 1_000_000,
                    grid: { color: gridColor },
                    ticks: {
                      color: inkSecondary,
                      font: { size: 12 },
                      callback: (v) => (Number(v) >= 1_000_000 ? `${Number(v) / 1_000_000}tr` : Number(v) >= 1000 ? `${Number(v) / 1000}k` : v),
                    },
                  },
                },
              }}
            />
            {!hasChartData && (
              <figcaption className="absolute inset-0 flex items-center justify-center p-6">
                <span className="px-5 py-4 rounded-2xl bg-[var(--st-bg-card)] border border-[var(--st-border)] shadow-sm text-center text-sm text-[var(--st-ink-secondary)] max-w-xs">
                  <span className="block text-2xl mb-1" aria-hidden>
                    📊
                  </span>
                  Chưa có số liệu. Nhập hóa đơn tháng này ở bên dưới để bắt đầu vẽ biểu đồ.
                </span>
              </figcaption>
            )}
          </figure>
        ) : (
          <div className="overflow-x-auto st-scroll">
            <table className="w-full text-sm min-w-[520px]">
              <caption className="st-sr-only">Bảng chi phí cố định 6 tháng gần nhất</caption>
              <thead>
                <tr className="text-left text-[var(--st-ink-secondary)]">
                  <th scope="col" className="py-2 pr-3 font-bold">
                    Loại
                  </th>
                  {months.map((mk) => (
                    <th key={mk} scope="col" className="py-2 px-2 font-bold text-right whitespace-nowrap">
                      {shortMonth(mk)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billsShown.map((b) => (
                  <tr key={b.id} className="border-t border-[var(--st-border)]">
                    <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
                      <span aria-hidden>{b.icon}</span> {b.name}
                    </th>
                    {months.map((mk) => {
                      const v = histories[b.id]?.find((h) => h.month_key === mk)?.amount;
                      return (
                        <td key={mk} className="py-2 px-2 text-right tabular-nums">
                          {v ? formatVND(v) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {fixedBills.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Chưa có loại hóa đơn nào"
          action={
            <button type="button" className="st-btn st-btn-primary" onClick={() => setConfigOpen(true)}>
              <Plus className="w-5 h-5" aria-hidden /> Thêm loại hóa đơn
            </button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fixedBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              month={month}
              history={histories[bill.id] || []}
              onRecord={() => setRecording(bill)}
              onEdit={() => {
                setEditingConfig(bill);
                setConfigOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <RecordBillModal bill={recording} month={month} onClose={() => setRecording(null)} />
      <BillConfigModal open={configOpen} bill={editingConfig} onClose={() => setConfigOpen(false)} />
    </div>
  );
}

function BillCard({
  bill,
  month,
  history,
  onRecord,
  onEdit,
}: {
  bill: FixedBillConfig;
  month: string;
  history: ReturnType<typeof getFixedBillHistory>;
  onRecord: () => void;
  onEdit: () => void;
}) {
  const members = useRoommateStore((s) => s.members);
  const deleteFixedBillConfig = useRoommateStore((s) => s.deleteFixedBillConfig);
  const restoreFixedBillConfig = useRoommateStore((s) => s.restoreFixedBillConfig);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();

  const current = history.find((h) => h.month_key === month);
  const prev = [...history].reverse().find((h) => h.month_key < month);
  const diff = current && prev && prev.amount > 0 ? Math.round(((current.amount - prev.amount) / prev.amount) * 100) : null;
  const payer = members.find((m) => m.id === current?.paid_by_member_id);
  const titleId = `bill-${bill.id}`;

  const onDelete = async () => {
    const ok = await confirm({
      title: `Xóa loại hóa đơn “${bill.name}”?`,
      message: 'Các khoản đã nhập trước đây vẫn được giữ trong lịch sử chi tiêu và công nợ, chỉ ẩn khỏi biểu đồ.',
      confirmLabel: 'Xóa loại hóa đơn',
      tone: 'danger',
    });
    if (!ok) return;
    const removed = deleteFixedBillConfig(bill.id);
    if (removed) notify({ tone: 'info', message: `Đã xóa “${removed.name}”.`, actionLabel: 'Hoàn tác', action: () => restoreFixedBillConfig(removed) });
  };

  return (
    <li className="st-card p-5 flex flex-col gap-4" style={toneStyle(bill.color)} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl tone-soft shrink-0">
            {bill.icon}
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="font-extrabold text-lg truncate">
              {bill.name}
            </h3>
            <p className="text-sm text-[var(--st-ink-secondary)]">Đơn vị: {bill.unit_note}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" className="st-icon-btn" aria-label={`Sửa loại hóa đơn ${bill.name}`} onClick={onEdit}>
            <Edit3 className="w-4 h-4" aria-hidden />
          </button>
          <button type="button" className="st-icon-btn is-danger" aria-label={`Xóa loại hóa đơn ${bill.name}`} onClick={onDelete}>
            <Trash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl st-subtle flex items-center justify-between gap-3 min-h-[92px]">
        {current ? (
          <div>
            <p className="text-sm font-bold text-[var(--st-success)]">✓ Đã nhập · đã chia vào công nợ</p>
            <p className="text-2xl font-extrabold tabular-nums mt-0.5">{formatVND(current.amount)}</p>
            <p className="text-sm text-[var(--st-ink-secondary)] mt-0.5">
              {payer?.name || 'Thành viên'} ứng trả
              {current.usage_value ? ` · ${current.usage_value} ${bill.unit_note}` : ''}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-bold">Chưa nhập {formatMonthKey(month).toLowerCase()}</p>
            <p className="text-sm text-[var(--st-ink-secondary)] mt-0.5">
              {prev ? `Kỳ trước (${formatMonthKey(prev.month_key)}): ${formatVND(prev.amount)}` : 'Nhập số tiền để chia tự động'}
            </p>
          </div>
        )}
        {diff !== null && (
          <span
            className={cx(
              'text-sm font-extrabold px-2.5 py-1 rounded-full shrink-0',
              diff > 0 ? 'bg-[var(--st-danger-soft)] text-[var(--st-danger)]' : diff < 0 ? 'bg-[var(--st-success-soft)] text-[var(--st-success)]' : 'st-subtle'
            )}
            aria-label={`${diff > 0 ? 'Tăng' : diff < 0 ? 'Giảm' : 'Không đổi'} ${Math.abs(diff)}% so với ${formatMonthKey(prev!.month_key)}`}
          >
            {diff > 0 ? `▲ ${diff}%` : diff < 0 ? `▼ ${Math.abs(diff)}%` : '= 0%'}
          </span>
        )}
      </div>

      <button type="button" className="st-btn st-btn-tone w-full" onClick={onRecord}>
        <CreditCard className="w-4 h-4" aria-hidden />
        {current ? 'Sửa số tiền kỳ này' : 'Nhập hóa đơn & chia tiền'}
      </button>
    </li>
  );
}

// ============================================================================
// RECORD MONTHLY BILL
// ============================================================================

function RecordBillModal({ bill, month, onClose }: { bill: FixedBillConfig | null; month: string; onClose: () => void }) {
  return (
    <Modal
      open={!!bill}
      onClose={onClose}
      title={bill ? `${bill.icon} ${bill.name} — ${formatMonthKey(month)}` : ''}
      description="Số tiền sẽ được vẽ lên biểu đồ và cộng thẳng vào công nợ chung."
    >
      {bill && <RecordBillForm key={`${bill.id}-${month}`} bill={bill} month={month} onClose={onClose} />}
    </Modal>
  );
}

function RecordBillForm({ bill, month, onClose }: { bill: FixedBillConfig; month: string; onClose: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const expenses = useRoommateStore((s) => s.expenses);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const record = useRoommateStore((s) => s.recordMonthlyFixedBill);
  const deleteExpenseRecord = useRoommateStore((s) => s.deleteExpenseRecord);
  const restoreExpenseRecord = useRoommateStore((s) => s.restoreExpenseRecord);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();
  const active = activeMembersOf(members);
  const existing = getFixedBillHistory(bill.id, expenses).find((h) => h.month_key === month);

  const [amount, setAmount] = useState(existing?.amount || 0);
  const [usage, setUsage] = useState(existing?.usage_value != null ? String(existing.usage_value) : '');
  const [paidBy, setPaidBy] = useState(existing?.paid_by_member_id || activeMemberId || active[0]?.id || '');
  const [split, setSplit] = useState<string[]>(existing?.split_member_ids?.length ? existing.split_member_ids : active.map((m) => m.id));
  const [errors, setErrors] = useState<{ amount?: string; split?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      amount: amount >= 1000 ? undefined : 'Số tiền tối thiểu 1.000đ.',
      split: split.length ? undefined : 'Chọn ít nhất 1 người cùng chia.',
    };
    setErrors(next);
    if (next.amount || next.split) return;
    const usageNum = usage.trim() ? Number(usage.replace(',', '.')) : null;
    record({
      fixedBillId: bill.id,
      monthKey: month,
      amount,
      paidByMemberId: paidBy,
      splitMemberIds: split,
      usageValue: usageNum !== null && Number.isFinite(usageNum) ? usageNum : null,
    });
    notify({ tone: 'success', message: `Đã lưu ${bill.name} ${formatMonthKey(month).toLowerCase()}: ${formatVND(amount)}.` });
    onClose();
  };

  const onDelete = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: 'Xóa hóa đơn kỳ này?',
      message: `${bill.name} ${formatMonthKey(month).toLowerCase()} (${formatVND(existing.amount)}) sẽ bị xóa khỏi biểu đồ và công nợ.`,
      confirmLabel: 'Xóa',
      tone: 'danger',
    });
    if (!ok) return;
    const removed = deleteExpenseRecord(existing.expense_id);
    onClose();
    if (removed) notify({ tone: 'info', message: 'Đã xóa hóa đơn kỳ này.', actionLabel: 'Hoàn tác', action: () => restoreExpenseRecord(removed) });
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tổng tiền hóa đơn" error={errors.amount}>
          {(p) => <MoneyInput {...p} data-autofocus value={amount} onChange={setAmount} placeholder="0" />}
        </Field>
        <Field label={`Chỉ số sử dụng (${bill.unit_note}, tùy chọn)`}>
          {(p) => (
            <input
              {...p}
              className="st-input"
              inputMode="decimal"
              value={usage}
              placeholder={`VD: 240`}
              onChange={(e) => setUsage(e.target.value.replace(/[^0-9.,]/g, ''))}
            />
          )}
        </Field>
      </div>

      <FieldGroup legend="Ai đã ứng tiền đóng?">
        <MemberPickerSingle members={active} value={paidBy} onChange={setPaidBy} />
      </FieldGroup>

      <FieldGroup
        legend={`Chia đều cho (${split.length} người)`}
        error={errors.split}
        action={
          <button type="button" className="text-sm font-bold underline underline-offset-2 st-hit px-1" onClick={() => setSplit(active.map((m) => m.id))}>
            Cả phòng
          </button>
        }
      >
        <MemberPickerMulti members={active} value={split} onChange={setSplit} />
        <SplitPreview amount={amount} count={split.length} />
      </FieldGroup>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {existing ? (
          <button type="button" className="st-btn st-btn-danger-soft" onClick={onDelete}>
            <Trash2 className="w-4 h-4" aria-hidden /> Xóa kỳ này
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="st-btn st-btn-primary">
            Lưu & chia tiền
          </button>
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// BILL CATEGORY CONFIG
// ============================================================================

function BillConfigModal({ open, bill, onClose }: { open: boolean; bill: FixedBillConfig | null; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={bill ? 'Sửa loại hóa đơn' : 'Thêm loại hóa đơn'}>
      {open && <BillConfigForm key={bill?.id || 'new'} bill={bill} onClose={onClose} />}
    </Modal>
  );
}

function BillConfigForm({ bill, onClose }: { bill: FixedBillConfig | null; onClose: () => void }) {
  const add = useRoommateStore((s) => s.addFixedBillConfig);
  const update = useRoommateStore((s) => s.updateFixedBillConfig);
  const [name, setName] = useState(bill?.name || '');
  const [unit, setUnit] = useState(bill?.unit_note || 'Tháng');
  const [icon, setIcon] = useState(bill?.icon || '⚡');
  const [color, setColor] = useState<string>(bill?.color || STRUCTURED_COLORS[2].hex);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError('Nhập tên loại hóa đơn.');
          return;
        }
        const payload = { name: name.trim(), unit_note: unit.trim() || 'Tháng', icon, color };
        if (bill) update(bill.id, payload);
        else add(payload);
        onClose();
      }}
    >
      <Field label="Tên loại hóa đơn" error={error}>
        {(p) => (
          <input
            {...p}
            data-autofocus
            className="st-input"
            value={name}
            maxLength={40}
            placeholder="VD: Gửi xe, Nước uống…"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        )}
      </Field>
      <Field label="Đơn vị chỉ số" hint="Hiển thị khi nhập chỉ số, VD: kWh, m³, bình.">
        {(p) => <input {...p} className="st-input" value={unit} maxLength={12} onChange={(e) => setUnit(e.target.value)} />}
      </Field>
      <FieldGroup legend="Biểu tượng">
        <div className="flex flex-wrap gap-2">
          {BILL_ICONS.map((ic) => (
            <button key={ic} type="button" className="st-swatch" aria-pressed={icon === ic} aria-label={`Biểu tượng ${ic}`} onClick={() => setIcon(ic)}>
              <span aria-hidden>{ic}</span>
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup legend="Màu biểu đồ">
        <div className="flex flex-wrap gap-2.5">
          {STRUCTURED_COLORS.map((c) => (
            <button key={c.hex} type="button" className="st-swatch" aria-pressed={color === c.hex} aria-label={`Màu ${c.name}`} style={{ backgroundColor: c.hex }} onClick={() => setColor(c.hex)}>
              {color === c.hex && <span aria-hidden className="text-white text-lg font-black drop-shadow">✓</span>}
            </button>
          ))}
        </div>
      </FieldGroup>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="st-btn st-btn-primary">
          {bill ? 'Lưu' : 'Thêm loại hóa đơn'}
        </button>
      </div>
    </form>
  );
}
