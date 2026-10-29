'use client';

import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  CHORE_ICONS,
  ChoreFrequency,
  ChoreSubtask,
  ChoreTask,
  FREQUENCY_LABEL,
  STRUCTURED_COLORS,
  activeMembersOf,
  effectiveRotationOrder,
  evaluateChoreRotationStatus,
  formatPeriodLabel,
  generateRoommateUUID,
  predictNextAssignee,
  useRoommateStore,
} from '@/lib/roommate-store';
import {
  Avatar,
  EmptyState,
  Field,
  FieldGroup,
  Modal,
  SectionHeader,
  Segmented,
  cx,
  prefersReducedMotion,
  toneStyle,
  useConfirm,
} from './ui';

type ChoreFilter = 'all' | 'mine' | ChoreFrequency;

export function ChoresTab({ onOpenCreate }: { onOpenCreate: () => void }) {
  const chores = useRoommateStore((s) => s.chores);
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const shoppingItems = useRoommateStore((s) => s.shoppingItems);
  const [filter, setFilter] = useState<ChoreFilter>('all');
  const [editing, setEditing] = useState<ChoreTask | null>(null);

  const mine = chores.filter((c) => c.current_assignee_id === activeMemberId);
  const filtered = useMemo(() => {
    if (filter === 'all') return chores;
    if (filter === 'mine') return chores.filter((c) => c.current_assignee_id === activeMemberId);
    return chores.filter((c) => c.frequency === filter);
  }, [chores, filter, activeMemberId]);

  const myPending = mine.filter((c) => c.checklist.some((s) => !s.completed));
  const urgent = shoppingItems.filter((i) => i.urgency === 'urgent');

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Việc nhà xoay vòng"
        title="Lịch việc nhà"
        toneHex="#E88D72"
        description="Người trực tự tích đủ 100% các mục thì đợt sau mới chuyển lượt. Chưa xong hoặc có người tích hộ → đợt sau vẫn giữ nguyên."
        action={
          <button type="button" className="st-btn st-btn-primary st-btn-pill" onClick={onOpenCreate}>
            <Plus className="w-5 h-5" aria-hidden />
            Thêm việc nhà
          </button>
        }
      />

      <Segmented<ChoreFilter>
        label="Lọc việc nhà"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tất cả', count: chores.length },
          { value: 'mine', label: 'Của tôi', count: mine.length },
          { value: 'daily', label: 'Hằng ngày' },
          { value: 'weekly', label: 'Hằng tuần' },
          { value: 'monthly', label: 'Hằng tháng' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <section aria-label="Danh sách việc nhà">
          {filtered.length === 0 ? (
            <EmptyState
              icon={filter === 'mine' ? '🌿' : '🧹'}
              title={filter === 'mine' ? 'Đợt này bạn không phải trực việc nào' : 'Chưa có việc nhà nào'}
              action={
                filter !== 'mine' ? (
                  <button type="button" className="st-btn st-btn-primary" onClick={onOpenCreate}>
                    <Plus className="w-5 h-5" aria-hidden /> Thêm việc nhà đầu tiên
                  </button>
                ) : undefined
              }
            >
              {filter === 'mine' ? 'Thảnh thơi! Bạn có thể giúp mọi người — nhưng nhớ tích hộ sẽ giữ lượt của họ.' : null}
            </EmptyState>
          ) : (
            <ol className="space-y-1">
              {filtered.map((chore, idx) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  isLast={idx === filtered.length - 1}
                  members={members}
                  activeMemberId={activeMemberId}
                  onEdit={() => setEditing(chore)}
                />
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6" aria-label="Tóm tắt của bạn">
          <div className="st-card p-5">
            <h3 className="font-extrabold">Việc của bạn đợt này</h3>
            {myPending.length === 0 ? (
              <p className="text-sm text-[var(--st-ink-secondary)] mt-2">
                {mine.length > 0 ? '🎉 Bạn đã xong hết việc được giao!' : 'Bạn không trực việc nào đợt này.'}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {myPending.map((c) => {
                  const done = c.checklist.filter((s) => s.completed).length;
                  return (
                    <li key={c.id} style={toneStyle(c.color)}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-bold truncate">
                          <span aria-hidden>{c.icon}</span> {c.title}
                        </span>
                        <span className="tabular-nums text-[var(--st-ink-secondary)] shrink-0">
                          {done}/{c.checklist.length}
                        </span>
                      </div>
                      <div className="st-progress mt-1.5" aria-hidden>
                        <span style={{ width: `${(done / Math.max(c.checklist.length, 1)) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="st-card p-5 text-sm text-[var(--st-ink-secondary)] space-y-2">
            <h3 className="font-extrabold text-[var(--st-ink-primary)]">Luật xoay lượt</h3>
            <p>
              <span aria-hidden>✅</span> Tự tích đủ mọi mục → đợt sau chuyển cho người kế tiếp.
            </p>
            <p>
              <span aria-hidden>⏳</span> Còn mục chưa xong → giữ nguyên người trực.
            </p>
            <p>
              <span aria-hidden>⚡</span> Có mục người khác tích hộ → giữ nguyên người trực.
            </p>
          </div>

          {urgent.length > 0 && (
            <div className="st-card p-5">
              <h3 className="font-extrabold">🔥 Cần mua gấp</h3>
              <ul className="mt-2 text-sm text-[var(--st-ink-secondary)] list-disc pl-5">
                {urgent.slice(0, 5).map((i) => (
                  <li key={i.id}>{i.title}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <ChoreModal open={!!editing} chore={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ChoreCard({
  chore,
  isLast,
  members,
  activeMemberId,
  onEdit,
}: {
  chore: ChoreTask;
  isLast: boolean;
  members: ReturnType<typeof useRoommateStore.getState>['members'];
  activeMemberId: string | null;
  onEdit: () => void;
}) {
  const setSubtaskCompleted = useRoommateStore((s) => s.setSubtaskCompleted);
  const closeChorePeriod = useRoommateStore((s) => s.closeChorePeriod);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();

  const assignee = members.find((m) => m.id === chore.current_assignee_id);
  const evaluation = evaluateChoreRotationStatus(chore, members);
  const order = effectiveRotationOrder(chore, members);
  const nextMember = members.find((m) => m.id === predictNextAssignee(chore, members));
  const done = chore.checklist.filter((s) => s.completed).length;
  const total = chore.checklist.length;
  const isMine = chore.current_assignee_id === activeMemberId;

  const toggle = (sub: ChoreSubtask) => {
    const willComplete = !sub.completed;
    setSubtaskCompleted(chore.id, sub.id, willComplete);
    if (!willComplete) return;

    if (!isMine && assignee) {
      notify({
        tone: 'warning',
        message: `Bạn vừa tích hộ ${assignee.name}. Đợt sau ${assignee.name} vẫn giữ lượt việc này.`,
      });
    }
    const remaining = chore.checklist.filter((s) => s.id !== sub.id && !s.completed).length;
    if (remaining === 0 && isMine && !prefersReducedMotion()) {
      try {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.75 } });
      } catch {
        /* decorative only */
      }
    }
  };

  const onClosePeriod = async () => {
    const outcome = evaluation.canRotate
      ? `Lượt sẽ chuyển sang ${nextMember?.name || 'người kế tiếp'}.`
      : `${assignee?.name || 'Người trực'} sẽ giữ nguyên lượt vì ${
          evaluation.isEmpty
            ? 'chưa có mục nào'
            : evaluation.delegatedByNames.length > 0
            ? 'có mục được tích hộ'
            : `còn ${evaluation.incompleteCount} mục chưa xong`
        }.`;
    const ok = await confirm({
      title: 'Chốt đợt này ngay?',
      message: (
        <>
          <p>{outcome}</p>
          <p className="mt-2">Checklist sẽ được làm mới cho đợt tiếp theo. Không thể hoàn tác.</p>
        </>
      ),
      confirmLabel: 'Chốt đợt',
    });
    if (ok) {
      closeChorePeriod(chore.id);
      notify({ tone: 'success', message: `Đã chốt đợt “${chore.title}”.` });
    }
  };

  const bannerTone =
    chore.last_rollover_status === 'held_delegated' || chore.last_rollover_status === 'held_incomplete'
      ? 'bg-[var(--st-warning-soft)] text-[var(--st-warning)]'
      : chore.last_rollover_status === 'rotated'
      ? 'bg-[var(--st-success-soft)] text-[var(--st-success)]'
      : 'bg-[var(--st-bg-subtle)] text-[var(--st-ink-secondary)]';

  const titleId = `chore-${chore.id}-title`;

  return (
    <li className="st-timeline-node" style={toneStyle(chore.color)} aria-labelledby={titleId}>
      <div className="st-timeline-left pt-1" aria-hidden>
        <span className="text-[12px] font-extrabold text-[var(--st-ink-muted)] mb-1.5 text-center leading-tight">
          {chore.time_hint || FREQUENCY_LABEL[chore.frequency]}
        </span>
        <span className="w-12 h-12 max-[420px]:w-10 max-[420px]:h-10 rounded-full flex items-center justify-center text-xl tone-fill shadow-sm border-[3px] border-[var(--st-bg-main)]">
          {chore.icon}
        </span>
        {!isLast && <span className={cx('st-timeline-connector', !evaluation.canRotate && 'is-dashed')} />}
      </div>

      <article className="st-card flex-1 min-w-0 p-4 sm:p-6 mb-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold uppercase tracking-wide tone-badge inline-block px-2.5 py-0.5 rounded-full">
              {FREQUENCY_LABEL[chore.frequency]} · {formatPeriodLabel(chore.frequency, chore.current_period_key)}
            </p>
            <h3 id={titleId} className="text-lg sm:text-xl font-extrabold mt-1.5 leading-snug">
              {chore.title}
            </h3>
          </div>
          <button type="button" className="st-icon-btn" onClick={onEdit} aria-label={`Sửa việc “${chore.title}”`}>
            <Edit3 className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm font-bold tone-badge" style={toneStyle(assignee?.color)}>
            <Avatar member={assignee} size={28} />
            Người trực: {assignee?.name || 'Chưa gán'}
            {isMine && <span className="text-xs font-extrabold">(bạn)</span>}
          </span>
          <span className="text-sm text-[var(--st-ink-secondary)] tabular-nums">
            {done}/{total} mục
          </span>
        </div>

        <div className="st-progress mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`Tiến độ ${chore.title}`}>
          <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>

        {order.length > 1 && (
          <div className="mt-3 text-sm text-[var(--st-ink-secondary)] flex flex-wrap items-center gap-1.5">
            <span className="font-bold">Vòng xoay:</span>
            <ol className="flex flex-wrap items-center gap-1.5" aria-label="Thứ tự xoay lượt">
              {order.map((id, i) => {
                const m = members.find((x) => x.id === id);
                if (!m) return null;
                const current = id === chore.current_assignee_id;
                return (
                  <li key={id} className="inline-flex items-center gap-1.5">
                    <span
                      className={cx(
                        'px-2 py-0.5 rounded-full font-semibold',
                        current ? 'bg-[var(--st-ink-primary)] text-[var(--st-bg-main)]' : 'bg-[var(--st-bg-subtle)]'
                      )}
                      aria-current={current ? 'step' : undefined}
                    >
                      <span aria-hidden>{m.avatar}</span> {m.name}
                    </span>
                    {i < order.length - 1 && <span aria-hidden className="opacity-50">→</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {chore.last_rollover_note && (
          <p className={cx('mt-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium', bannerTone)}>{chore.last_rollover_note}</p>
        )}

        {total === 0 ? (
          <p className="mt-4 text-sm text-[var(--st-ink-secondary)]">
            Chưa có mục nhỏ nào.{' '}
            <button type="button" className="font-bold underline underline-offset-2" onClick={onEdit}>
              Thêm checklist
            </button>{' '}
            để bắt đầu xoay lượt.
          </p>
        ) : (
          <ul className="mt-4 space-y-2" aria-label={`Checklist ${chore.title}`}>
            {chore.checklist.map((sub) => {
              const by = members.find((m) => m.id === sub.completed_by_member_id);
              const delegated = sub.completed && sub.completed_by_member_id !== chore.current_assignee_id;
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={sub.completed}
                    onClick={() => toggle(sub)}
                    className={cx('st-check-row', delegated && 'is-delegated')}
                  >
                    <span className="st-circle-check" aria-hidden>
                      {sub.completed && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                    <span className={cx('flex-1 min-w-0 text-[15px] font-medium', sub.completed && 'line-through text-[var(--st-ink-muted)]')}>
                      {sub.title}
                    </span>
                    {sub.completed && (
                      <span
                        className={cx(
                          'text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
                          delegated
                            ? 'bg-[var(--st-warning-soft)] text-[var(--st-warning)]'
                            : 'bg-[var(--st-success-soft)] text-[var(--st-success)]'
                        )}
                      >
                        {delegated ? `⚡ ${by?.name || 'Người khác'} tích hộ` : '✓ Tự làm'}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-4 pt-3 border-t border-[var(--st-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          {evaluation.canRotate ? (
            <p className="font-bold text-[var(--st-success)] flex items-start gap-1.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden />
              Đủ điều kiện! Đợt sau chuyển cho {nextMember?.name || 'người kế tiếp'}.
            </p>
          ) : evaluation.delegatedByNames.length > 0 ? (
            <p className="font-bold text-[var(--st-warning)] flex items-start gap-1.5">
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
              Có mục được tích hộ → đợt sau {assignee?.name} vẫn giữ lượt.
            </p>
          ) : (
            <p className="text-[var(--st-ink-secondary)]">
              {evaluation.isEmpty
                ? 'Thêm ít nhất 1 mục để việc này xoay lượt.'
                : `Còn ${evaluation.incompleteCount} mục — hết đợt mà chưa xong, ${assignee?.name || 'người trực'} giữ nguyên lượt.`}
            </p>
          )}
          <button type="button" className="st-btn st-btn-secondary st-btn-sm shrink-0 self-start sm:self-auto" onClick={onClosePeriod}>
            <RotateCcw className="w-4 h-4" aria-hidden />
            Chốt đợt sớm
          </button>
        </footer>
      </article>
    </li>
  );
}

// ============================================================================
// CHORE MODAL (create / edit)
// ============================================================================

interface ChoreDraft {
  title: string;
  icon: string;
  color: string;
  frequency: ChoreFrequency;
  time_hint: string;
  order: string[];
  assignee: string;
  items: { id: string; title: string }[];
}

export function ChoreModal({
  open,
  chore,
  onClose,
}: {
  open: boolean;
  chore: ChoreTask | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={chore ? 'Sửa việc nhà' : 'Thêm việc nhà'}
      description="Checklist càng cụ thể thì càng dễ kiểm chứng ai đã làm."
      size="lg"
    >
      {open && <ChoreForm key={chore?.id || 'new'} chore={chore} onClose={onClose} />}
    </Modal>
  );
}

function ChoreForm({ chore, onClose }: { chore: ChoreTask | null; onClose: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const addChoreTask = useRoommateStore((s) => s.addChoreTask);
  const updateChoreTask = useRoommateStore((s) => s.updateChoreTask);
  const deleteChoreTask = useRoommateStore((s) => s.deleteChoreTask);
  const restoreChoreTask = useRoommateStore((s) => s.restoreChoreTask);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();
  const active = activeMembersOf(members);

  const [draft, setDraft] = useState<ChoreDraft>(() => {
    if (chore) {
      const order = effectiveRotationOrder(chore, members);
      return {
        title: chore.title,
        icon: chore.icon,
        color: chore.color,
        frequency: chore.frequency,
        time_hint: chore.time_hint || '',
        order,
        assignee: chore.current_assignee_id && order.includes(chore.current_assignee_id) ? chore.current_assignee_id : order[0] || '',
        items: chore.checklist.map((s) => ({ id: s.id, title: s.title })),
      };
    }
    const ids = active.map((m) => m.id);
    return {
      title: '',
      icon: '🧹',
      color: STRUCTURED_COLORS[0].hex,
      frequency: 'weekly',
      time_hint: '',
      order: ids,
      assignee: activeMemberId && ids.includes(activeMemberId) ? activeMemberId : ids[0] || '',
      items: [{ id: generateRoommateUUID(), title: '' }],
    };
  });
  const [errors, setErrors] = useState<{ title?: string; items?: string; order?: string }>({});
  const [newItem, setNewItem] = useState('');

  const patch = (p: Partial<ChoreDraft>) => setDraft((d) => ({ ...d, ...p }));

  const toggleMember = (id: string) => {
    const has = draft.order.includes(id);
    const order = has ? draft.order.filter((x) => x !== id) : [...draft.order, id];
    patch({ order, assignee: order.includes(draft.assignee) ? draft.assignee : order[0] || '' });
  };
  const move = (idx: number, dir: -1 | 1) => {
    const order = [...draft.order];
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    patch({ order });
  };
  const addItem = () => {
    const t = newItem.trim();
    if (!t) return;
    patch({ items: [...draft.items.filter((i) => i.title.trim()), { id: generateRoommateUUID(), title: t }] });
    setNewItem('');
    setErrors((e) => ({ ...e, items: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = [
      ...draft.items.filter((i) => i.title.trim()),
      ...(newItem.trim() ? [{ id: generateRoommateUUID(), title: newItem.trim() }] : []),
    ];
    const nextErrors = {
      title: draft.title.trim() ? undefined : 'Hãy đặt tên cho việc nhà.',
      items: items.length ? undefined : 'Cần ít nhất 1 mục nhỏ để kiểm chứng và xoay lượt.',
      order: draft.order.length ? undefined : 'Chọn ít nhất 1 người tham gia.',
    };
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.items || nextErrors.order) return;

    const checklist: ChoreSubtask[] = items.map((i) => {
      const prev = chore?.checklist.find((s) => s.id === i.id);
      return {
        id: i.id,
        title: i.title.trim(),
        completed: prev?.completed ?? false,
        completed_by_member_id: prev?.completed_by_member_id ?? null,
        completed_at: prev?.completed_at ?? null,
      };
    });
    const payload = {
      title: draft.title.trim(),
      icon: draft.icon,
      color: draft.color,
      frequency: draft.frequency,
      time_hint: draft.time_hint.trim(),
      member_order: draft.order,
      current_assignee_id: draft.assignee || draft.order[0] || null,
      checklist,
    };
    if (chore) {
      if (updateChoreTask(chore.id, payload, chore.rollover_seq || 0)) {
        notify({ tone: 'success', message: 'Đã lưu thay đổi.' });
      }
    } else {
      addChoreTask(payload);
      notify({ tone: 'success', message: `Đã thêm “${payload.title}”.` });
    }
    onClose();
  };

  const onDelete = async () => {
    if (!chore) return;
    const ok = await confirm({
      title: `Xóa “${chore.title}”?`,
      message: 'Việc này sẽ biến mất khỏi lịch của cả phòng.',
      confirmLabel: 'Xóa việc',
      tone: 'danger',
    });
    if (!ok) return;
    const removed = deleteChoreTask(chore.id);
    onClose();
    if (removed) {
      notify({ tone: 'info', message: `Đã xóa “${removed.title}”.`, actionLabel: 'Hoàn tác', action: () => restoreChoreTask(removed) });
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Field label="Tên việc" error={errors.title}>
        {(p) => (
          <input
            {...p}
            data-autofocus
            className="st-input"
            value={draft.title}
            maxLength={60}
            placeholder="VD: Trực nhật bếp, Cọ nhà vệ sinh…"
            onChange={(e) => patch({ title: e.target.value })}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Chu kỳ">
          {(p) => (
            <select {...p} className="st-input" value={draft.frequency} onChange={(e) => patch({ frequency: e.target.value as ChoreFrequency })}>
              <option value="daily">Hằng ngày</option>
              <option value="weekly">Hằng tuần (đổi lượt thứ Hai)</option>
              <option value="monthly">Hằng tháng (đổi lượt ngày 1)</option>
            </select>
          )}
        </Field>
        <Field label="Giờ / mốc gợi ý (tùy chọn)">
          {(p) => (
            <input {...p} className="st-input" value={draft.time_hint} maxLength={20} placeholder="VD: 20:00, Cuối tuần" onChange={(e) => patch({ time_hint: e.target.value })} />
          )}
        </Field>
      </div>
      {chore && draft.frequency !== chore.frequency && (
        <p className="text-sm text-[var(--st-warning)] -mt-2">Đổi chu kỳ sẽ bắt đầu đợt mới ngay, giữ nguyên người trực hiện tại.</p>
      )}

      <FieldGroup legend="Biểu tượng">
        <div className="flex flex-wrap gap-2">
          {CHORE_ICONS.map((ic) => (
            <button key={ic} type="button" className="st-swatch" aria-pressed={draft.icon === ic} aria-label={`Biểu tượng ${ic}`} onClick={() => patch({ icon: ic })}>
              <span aria-hidden>{ic}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup legend="Màu trên lịch">
        <div className="flex flex-wrap gap-2.5">
          {STRUCTURED_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              className="st-swatch"
              aria-pressed={draft.color === c.hex}
              aria-label={`Màu ${c.name}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => patch({ color: c.hex })}
            >
              {draft.color === c.hex && <span aria-hidden className="text-white text-lg font-black drop-shadow">✓</span>}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup legend="Ai tham gia xoay lượt?" error={errors.order}>
        <div className="flex flex-wrap gap-2">
          {active.map((m) => (
            <button key={m.id} type="button" className="st-chip" aria-pressed={draft.order.includes(m.id)} onClick={() => toggleMember(m.id)}>
              <span aria-hidden>{draft.order.includes(m.id) ? '✓' : m.avatar}</span>
              {m.name}
            </button>
          ))}
        </div>
      </FieldGroup>

      {draft.order.length > 1 && (
        <div>
          <p className="st-label">Thứ tự xoay lượt</p>
          <ol className="space-y-1.5">
            {draft.order.map((id, idx) => {
              const m = members.find((x) => x.id === id);
              return (
                <li key={id} className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl st-subtle">
                  <span className="w-6 text-sm font-extrabold text-[var(--st-ink-muted)] tabular-nums">{idx + 1}.</span>
                  <span className="flex-1 font-semibold truncate">
                    <span aria-hidden>{m?.avatar}</span> {m?.name}
                  </span>
                  <button type="button" className="st-icon-btn !bg-transparent" disabled={idx === 0} aria-label={`Đưa ${m?.name} lên trước`} onClick={() => move(idx, -1)}>
                    <ArrowUp className="w-4 h-4" aria-hidden />
                  </button>
                  <button type="button" className="st-icon-btn !bg-transparent" disabled={idx === draft.order.length - 1} aria-label={`Đưa ${m?.name} xuống sau`} onClick={() => move(idx, 1)}>
                    <ArrowDown className="w-4 h-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <Field label="Người trực đợt này">
        {(p) => (
          <select {...p} className="st-input" value={draft.assignee} onChange={(e) => patch({ assignee: e.target.value })}>
            {draft.order.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <option key={id} value={id}>
                  {m?.avatar} {m?.name}
                </option>
              );
            })}
          </select>
        )}
      </Field>

      <FieldGroup legend="Checklist các việc nhỏ" error={errors.items}>
        <ul className="space-y-2">
          {draft.items.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                className="st-input"
                aria-label={`Mục ${idx + 1}`}
                value={item.title}
                maxLength={80}
                placeholder={`Mục ${idx + 1}`}
                onChange={(e) => patch({ items: draft.items.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)) })}
              />
              <button
                type="button"
                className="st-icon-btn is-danger"
                aria-label={`Xóa mục ${idx + 1}${item.title ? `: ${item.title}` : ''}`}
                onClick={() => patch({ items: draft.items.filter((x) => x.id !== item.id) })}
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input
            className="st-input"
            aria-label="Thêm mục mới"
            value={newItem}
            maxLength={80}
            placeholder="Thêm mục mới rồi nhấn Enter…"
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <button type="button" className="st-btn st-btn-ghost shrink-0" onClick={addItem}>
            <Plus className="w-4 h-4" aria-hidden /> Thêm
          </button>
        </div>
      </FieldGroup>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--st-border)]">
        {chore ? (
          <button type="button" className="st-btn st-btn-danger-soft" onClick={onDelete}>
            <Trash2 className="w-4 h-4" aria-hidden /> Xóa việc này
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="st-btn st-btn-primary">
            {chore ? 'Lưu thay đổi' : 'Thêm việc nhà'}
          </button>
        </div>
      </div>
    </form>
  );
}
