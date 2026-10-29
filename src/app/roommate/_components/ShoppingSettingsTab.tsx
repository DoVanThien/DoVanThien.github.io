'use client';

import React, { useMemo, useState } from 'react';
import { Check, Download, Link2, Plus, RefreshCw, Share2, ShoppingCart, Trash2, UserMinus, UserPlus } from 'lucide-react';
import {
  MEMBER_AVATARS,
  RoommateMember,
  STRUCTURED_COLORS,
  VIETQR_BANKS,
  activeMembersOf,
  calculateNetBalances,
  formatVND,
  removeDiacritics,
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
  SplitPreview,
  cx,
  useConfirm,
} from './ui';

export function ShoppingSettingsTab({ shoppingInputRef }: { shoppingInputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Đồ dùng chung & cài đặt"
        title="Cần mua & cài đặt"
        toneHex="#9D8189"
        description="Ai thấy sắp hết đồ thì ghi lên đây. Người đi mua bấm “Đã mua” là tiền tự vào công nợ chung."
      />
      <ShoppingSection inputRef={shoppingInputRef} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-5">
          <ProfileSection />
          <SyncSection />
        </div>
        <div className="lg:col-span-5 space-y-5">
          <MembersSection />
          <InviteSection />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHOPPING
// ============================================================================

function ShoppingSection({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const items = useRoommateStore((s) => s.shoppingItems);
  const members = useRoommateStore((s) => s.members);
  const add = useRoommateStore((s) => s.addShoppingItem);
  const remove = useRoommateStore((s) => s.deleteShoppingItem);
  const restore = useRoommateStore((s) => s.restoreShoppingItem);
  const notify = useRoommateStore((s) => s.notify);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<{ id: string; title: string } | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(b.urgency === 'urgent') - Number(a.urgency === 'urgent')),
    [items]
  );

  return (
    <section className="st-card p-5 sm:p-6 space-y-4" aria-labelledby="shopping-title">
      <h3 id="shopping-title" className="font-extrabold text-lg">
        <span aria-hidden>🛒</span> Danh sách cần mua ({items.length})
      </h3>

      <form
        noValidate
        className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)] gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) {
            setError('Nhập tên món cần mua.');
            inputRef.current?.focus();
            return;
          }
          add(title, note, urgent ? 'urgent' : 'normal');
          notify({ tone: 'success', message: `Đã thêm “${title.trim()}” vào danh sách.` });
          setTitle('');
          setNote('');
          setUrgent(false);
          setError(null);
        }}
      >
        <Field label="Món cần mua" error={error}>
          {(p) => (
            <input
              {...p}
              ref={inputRef}
              className="st-input"
              value={title}
              maxLength={60}
              placeholder="VD: Nước rửa chén, giấy vệ sinh…"
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
            />
          )}
        </Field>
        <Field label="Ghi chú (tùy chọn)">
          {(p) => <input {...p} className="st-input" value={note} maxLength={80} placeholder="VD: loại 2 lít" onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="st-chip" aria-pressed={urgent} onClick={() => setUrgent(!urgent)}>
            <span aria-hidden>🔥</span> Cần gấp
          </button>
          <button type="submit" className="st-btn st-btn-primary">
            <Plus className="w-5 h-5" aria-hidden /> Thêm vào danh sách
          </button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <EmptyState icon="🧺" title="Phòng chưa thiếu món nào" />
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => {
            const adder = members.find((m) => m.id === item.added_by_member_id);
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl st-subtle">
                <div className="min-w-0">
                  <p className="font-bold flex flex-wrap items-center gap-2">
                    {item.title}
                    {item.urgency === 'urgent' && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--st-danger-soft)] text-[var(--st-danger)]">🔥 Gấp</span>
                    )}
                  </p>
                  <p className="text-sm text-[var(--st-ink-secondary)]">
                    {adder ? `${adder.name} báo` : 'Thành viên báo'}
                    {item.note ? ` · ${item.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" className="st-btn st-btn-primary st-btn-sm" onClick={() => setBuying({ id: item.id, title: item.title })}>
                    <ShoppingCart className="w-4 h-4" aria-hidden /> Đã mua
                  </button>
                  <button
                    type="button"
                    className="st-icon-btn is-danger"
                    aria-label={`Xóa “${item.title}” khỏi danh sách`}
                    onClick={() => {
                      const removed = remove(item.id);
                      if (removed) notify({ tone: 'info', message: `Đã xóa “${removed.title}”.`, actionLabel: 'Hoàn tác', action: () => restore(removed) });
                    }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!buying} onClose={() => setBuying(null)} title={buying ? `Đã mua: ${buying.title}` : ''} description="Khoản này sẽ được chia vào công nợ chung.">
        {buying && <BuyForm key={buying.id} item={buying} onClose={() => setBuying(null)} />}
      </Modal>
    </section>
  );
}

function BuyForm({ item, onClose }: { item: { id: string; title: string }; onClose: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const convert = useRoommateStore((s) => s.convertShoppingItemToExpense);
  const notify = useRoommateStore((s) => s.notify);
  const active = activeMembersOf(members);
  const [amount, setAmount] = useState(0);
  const [paidBy, setPaidBy] = useState(activeMemberId || active[0]?.id || '');
  const [split, setSplit] = useState<string[]>(active.map((m) => m.id));
  const [errors, setErrors] = useState<{ amount?: string; split?: string }>({});

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const next = {
          amount: amount >= 1000 ? undefined : 'Số tiền tối thiểu 1.000đ.',
          split: split.length ? undefined : 'Chọn ít nhất 1 người cùng chia.',
        };
        setErrors(next);
        if (next.amount || next.split) return;
        convert({ itemId: item.id, amount, paidByMemberId: paidBy, splitMemberIds: split });
        notify({ tone: 'success', message: `Đã ghi ${formatVND(amount)} cho “${item.title}”.` });
        onClose();
      }}
    >
      <Field label="Giá tiền" error={errors.amount}>
        {(p) => (
          <>
            <MoneyInput {...p} data-autofocus value={amount} onChange={setAmount} placeholder="0" />
            <QuickAmounts onPick={setAmount} />
          </>
        )}
      </Field>
      <FieldGroup legend="Ai trả tiền?">
        <MemberPickerSingle members={active} value={paidBy} onChange={setPaidBy} />
      </FieldGroup>
      <FieldGroup legend={`Chia cho (${split.length} người)`} error={errors.split}>
        <MemberPickerMulti members={active} value={split} onChange={setSplit} />
        <SplitPreview amount={amount} count={split.length} />
      </FieldGroup>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="st-btn st-btn-primary">
          Ghi vào chi tiêu chung
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// PROFILE
// ============================================================================

function ProfileSection() {
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const me = members.find((m) => m.id === activeMemberId);
  if (!me) return null;
  // Re-mount the form whenever the profile changes elsewhere (other device / switch user).
  return <ProfileForm key={`${me.id}-${me.updated_at || ''}`} me={me} />;
}

function ProfileForm({ me }: { me: RoommateMember }) {
  const members = useRoommateStore((s) => s.members);
  const roomName = useRoommateStore((s) => s.roomName);
  const update = useRoommateStore((s) => s.updateMemberProfile);
  const setRoomName = useRoommateStore((s) => s.setRoomName);
  const notify = useRoommateStore((s) => s.notify);

  const [name, setName] = useState(me.name);
  const [room, setRoom] = useState(roomName);
  const [avatar, setAvatar] = useState(me.avatar);
  const [color, setColor] = useState(me.color);
  const [bin, setBin] = useState(me.bank_bin || '');
  const [acc, setAcc] = useState(me.bank_account_no || '');
  const [accName, setAccName] = useState(me.bank_account_name || '');
  const [errors, setErrors] = useState<{ name?: string; acc?: string }>({});

  return (
    <form
      noValidate
      className="st-card p-5 sm:p-6 space-y-5"
      aria-labelledby="profile-title"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = name.trim().replace(/\s+/g, ' ');
        const dup = members.some((m) => m.id !== me.id && !m.archived && m.name.trim().toLowerCase() === clean.toLowerCase());
        const accClean = acc.replace(/\s+/g, '');
        const next = {
          name: !clean ? 'Tên không được để trống.' : dup ? 'Đã có người dùng tên này trong phòng.' : undefined,
          acc:
            (bin && !accClean) || (!bin && accClean)
              ? 'Chọn ngân hàng và nhập số tài khoản (hoặc để trống cả hai).'
              : accClean && !/^[0-9A-Za-z]{4,20}$/.test(accClean)
              ? 'Số tài khoản chỉ gồm chữ số, 4–20 ký tự.'
              : undefined,
        };
        setErrors(next);
        if (next.name || next.acc) return;
        const bank = VIETQR_BANKS.find((b) => b.bin === bin);
        update(me.id, {
          name: clean,
          avatar,
          color,
          bank_bin: bin,
          bank_short_name: bank?.shortName || '',
          bank_account_no: accClean,
          bank_account_name: removeDiacritics(accName.trim()).toUpperCase(),
        });
        if (room.trim() !== roomName) setRoomName(room);
        notify({ tone: 'success', message: 'Đã lưu hồ sơ.' });
      }}
    >
      <div>
        <h3 id="profile-title" className="font-extrabold text-lg">
          Hồ sơ của bạn
        </h3>
        <p className="text-sm text-[var(--st-ink-secondary)]">Tên, biểu tượng và tài khoản nhận tiền (tùy chọn).</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tên của bạn" error={errors.name}>
          {(p) => <input {...p} className="st-input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Tên phòng" hint="Cả phòng đều thấy tên này.">
          {(p) => <input {...p} className="st-input" value={room} maxLength={40} onChange={(e) => setRoom(e.target.value)} />}
        </Field>
      </div>

      <FieldGroup legend="Biểu tượng">
        <div className="flex flex-wrap gap-2">
          {MEMBER_AVATARS.map((av) => (
            <button key={av} type="button" className="st-swatch" aria-pressed={avatar === av} aria-label={`Biểu tượng ${av}`} onClick={() => setAvatar(av)}>
              <span aria-hidden>{av}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup legend="Màu của bạn">
        <div className="flex flex-wrap gap-2.5">
          {STRUCTURED_COLORS.map((c) => (
            <button key={c.hex} type="button" className="st-swatch" aria-pressed={color === c.hex} aria-label={`Màu ${c.name}`} style={{ backgroundColor: c.hex }} onClick={() => setColor(c.hex)}>
              {color === c.hex && <span aria-hidden className="text-white text-lg font-black drop-shadow">✓</span>}
            </button>
          ))}
        </div>
      </FieldGroup>

      <fieldset className="pt-4 border-t border-[var(--st-border)] space-y-4">
        <legend className="font-extrabold">Nhận tiền qua VietQR (không bắt buộc)</legend>
        <p className="text-sm text-[var(--st-ink-secondary)] -mt-2">Bạn cùng phòng sẽ quét mã để trả nợ cho bạn đúng số tiền.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ngân hàng">
            {(p) => (
              <select {...p} className="st-input" value={bin} onChange={(e) => setBin(e.target.value)}>
                <option value="">— Chưa chọn —</option>
                {VIETQR_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.shortName} · {b.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Số tài khoản" error={errors.acc}>
            {(p) => <input {...p} className="st-input tabular-nums" inputMode="numeric" autoComplete="off" value={acc} maxLength={24} placeholder="VD: 0987654321" onChange={(e) => setAcc(e.target.value)} />}
          </Field>
        </div>
        <Field label="Tên chủ tài khoản" hint="Tự chuyển sang chữ in hoa không dấu.">
          {(p) => (
            <input {...p} className="st-input uppercase" value={accName} maxLength={50} placeholder="VD: DO VAN THIEN" onChange={(e) => setAccName(e.target.value)} />
          )}
        </Field>
      </fieldset>

      <button type="submit" className="st-btn st-btn-primary w-full">
        <Check className="w-5 h-5" aria-hidden /> Lưu hồ sơ
      </button>
    </form>
  );
}

// ============================================================================
// MEMBERS
// ============================================================================

function MembersSection() {
  const members = useRoommateStore((s) => s.members);
  const expenses = useRoommateStore((s) => s.expenses);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const addMember = useRoommateStore((s) => s.addRoommateMember);
  const archive = useRoommateStore((s) => s.archiveRoommateMember);
  const restore = useRoommateStore((s) => s.restoreRoommateMember);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const active = activeMembersOf(members);
  const freeAvatar = MEMBER_AVATARS.find((av) => !active.some((m) => m.avatar === av)) || MEMBER_AVATARS[4];
  const [avatarPick, setAvatar] = useState<string | null>(null);
  const avatar = avatarPick && !active.some((m) => m.avatar === avatarPick) ? avatarPick : freeAvatar;
  const [error, setError] = useState<string | null>(null);
  const archived = members.filter((m) => m.archived);
  const balances = useMemo(() => calculateNetBalances(members, expenses), [members, expenses]);

  const onArchive = async (m: RoommateMember) => {
    const bal = balances[m.id] || 0;
    const ok = await confirm({
      title: `${m.name} rời phòng?`,
      message: (
        <>
          <p>{m.name} sẽ không còn trong vòng xoay việc nhà và danh sách chia tiền mới. Lịch sử chi tiêu vẫn được giữ nguyên.</p>
          {Math.abs(bal) > 500 && (
            <p className="mt-2 font-bold text-[var(--st-danger)]">
              Lưu ý: {m.name} đang {bal > 0 ? `được nhận lại ${formatVND(bal)}` : `nợ ${formatVND(-bal)}`}. Khoản này vẫn hiển thị ở bảng “Ai cần trả ai”.
            </p>
          )}
        </>
      ),
      confirmLabel: 'Cho rời phòng',
      tone: 'danger',
    });
    if (!ok) return;
    archive(m.id);
    notify({ tone: 'info', message: `${m.name} đã rời phòng.`, actionLabel: 'Hoàn tác', action: () => restore(m.id) });
  };

  return (
    <section className="st-card p-5 sm:p-6 space-y-4" aria-labelledby="members-title">
      <h3 id="members-title" className="font-extrabold text-lg">
        Thành viên ({active.length})
      </h3>
      <ul className="space-y-2">
        {active.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 p-2.5 pl-3 rounded-2xl st-subtle">
            <span className="flex items-center gap-2.5 min-w-0">
              <Avatar member={m} size={36} />
              <span className="min-w-0">
                <span className="block font-bold truncate">
                  {m.name}
                  {m.id === activeMemberId && <span className="ml-1.5 text-xs font-extrabold px-2 py-0.5 rounded-full bg-[var(--st-accent-soft)] text-[var(--st-accent)]">Bạn</span>}
                </span>
                <span className="block text-xs text-[var(--st-ink-secondary)] truncate">
                  {m.bank_account_no ? `${m.bank_short_name} · ${m.bank_account_no}` : 'Chưa thêm tài khoản nhận tiền'}
                </span>
              </span>
            </span>
            {active.length > 1 && m.id !== activeMemberId && (
              <button type="button" className="st-icon-btn is-danger" aria-label={`Cho ${m.name} rời phòng`} onClick={() => onArchive(m)}>
                <UserMinus className="w-4 h-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-bold text-[var(--st-ink-secondary)] st-hit flex items-center">Đã rời phòng ({archived.length})</summary>
          <ul className="mt-2 space-y-2">
            {archived.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 p-2.5 pl-3 rounded-2xl st-subtle">
                <span className="flex items-center gap-2.5 min-w-0">
                  <Avatar member={m} size={32} />
                  <span className="font-semibold truncate">{m.name}</span>
                </span>
                <button type="button" className="st-btn st-btn-secondary st-btn-sm" onClick={() => restore(m.id)}>
                  Thêm lại
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <form
        noValidate
        className="pt-4 border-t border-[var(--st-border)] space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = name.trim();
          if (!clean) {
            setError('Nhập tên thành viên.');
            return;
          }
          if (active.some((m) => m.name.trim().toLowerCase() === clean.toLowerCase())) {
            setError('Tên này đã có trong phòng.');
            return;
          }
          addMember(clean, avatar, STRUCTURED_COLORS[(members.length + 1) % STRUCTURED_COLORS.length].hex);
          notify({ tone: 'success', message: `Đã thêm ${clean} vào phòng.` });
          setName('');
          setAvatar(null);
          setError(null);
        }}
      >
        <p className="font-bold text-sm">Thêm bạn cùng phòng</p>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <Field label={<span className="st-sr-only">Biểu tượng</span>}>
            {(p) => (
              <select {...p} className="st-input !px-3 text-lg" value={avatar} onChange={(e) => setAvatar(e.target.value)}>
                {MEMBER_AVATARS.map((av) => (
                  <option key={av} value={av}>
                    {av}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={<span className="st-sr-only">Tên thành viên mới</span>} error={error}>
            {(p) => (
              <input
                {...p}
                className="st-input"
                value={name}
                maxLength={30}
                placeholder="Tên thành viên mới"
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
              />
            )}
          </Field>
        </div>
        <button type="submit" className="st-btn st-btn-secondary w-full">
          <UserPlus className="w-5 h-5" aria-hidden /> Thêm thành viên
        </button>
      </form>
    </section>
  );
}

// ============================================================================
// INVITE
// ============================================================================

function InviteSection() {
  const roomName = useRoommateStore((s) => s.roomName);
  const notify = useRoommateStore((s) => s.notify);
  const [copied, setCopied] = useState(false);

  const link = typeof window !== 'undefined' ? `${window.location.origin}/roommate` : '/roommate';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <section className="st-card p-5 sm:p-6 space-y-3" aria-labelledby="invite-title">
      <h3 id="invite-title" className="font-extrabold text-lg">
        Mời bạn cùng phòng
      </h3>
      <p className="text-sm text-[var(--st-ink-secondary)]">Gửi link này cho mọi người. Mở trên điện thoại, nhập tên là dùng được ngay. Có thể “Thêm vào màn hình chính” để dùng như app.</p>
      <div className="flex items-center gap-2 p-2 pl-3 rounded-2xl st-subtle">
        <Link2 className="w-4 h-4 text-[var(--st-ink-secondary)] shrink-0" aria-hidden />
        <span className="text-sm font-semibold truncate flex-1">{link}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          className="st-btn st-btn-secondary flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              notify({ tone: 'warning', message: 'Trình duyệt chặn sao chép — hãy chép link thủ công.' });
            }
          }}
        >
          {copied ? <Check className="w-5 h-5" aria-hidden /> : <Link2 className="w-5 h-5" aria-hidden />}
          {copied ? 'Đã chép link' : 'Chép link'}
        </button>
        {canShare && (
          <button
            type="button"
            className="st-btn st-btn-primary flex-1"
            onClick={() => navigator.share({ title: roomName, text: `Vào phòng “${roomName}” trên Roommate Hub`, url: link }).catch(() => undefined)}
          >
            <Share2 className="w-5 h-5" aria-hidden /> Chia sẻ
          </button>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// SYNC & DATA
// ============================================================================

function SyncSection() {
  const s = useRoommateStore();
  const label = !s.cloudConfigured
    ? 'Chỉ lưu trên máy này'
    : s.cloudSetupMissing
    ? 'Chưa kết nối được Cloud'
    : s.syncStatus === 'offline'
    ? 'Đang ngoại tuyến'
    : s.syncStatus === 'error'
    ? 'Có thay đổi chưa lưu lên Cloud'
    : s.syncStatus === 'saving'
    ? 'Đang lưu…'
    : 'Đã đồng bộ với cả phòng';

  const exportData = () => {
    const data = {
      exported_at: new Date().toISOString(),
      room_name: s.roomName,
      members: s.members,
      chores: s.chores,
      expenses: s.expenses,
      fixed_bills: s.fixedBills,
      shopping_items: s.shoppingItems,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roommate-hub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="st-card p-5 sm:p-6 space-y-3" aria-labelledby="sync-title">
      <h3 id="sync-title" className="font-extrabold text-lg">
        Đồng bộ & dữ liệu
      </h3>
      <p className={cx('font-bold', s.syncStatus === 'error' || s.cloudSetupMissing ? 'text-[var(--st-danger)]' : s.syncStatus === 'offline' ? 'text-[var(--st-warning)]' : 'text-[var(--st-success)]')}>
        {label}
      </p>
      {s.lastSyncedAt && s.syncMode === 'cloud' && (
        <p className="text-sm text-[var(--st-ink-secondary)]">Lần đồng bộ gần nhất: {new Date(s.lastSyncedAt).toLocaleTimeString('vi-VN')}</p>
      )}
      {s.pendingOps.length > 0 && <p className="text-sm text-[var(--st-ink-secondary)]">{s.pendingOps.length} thay đổi đang chờ gửi — sẽ tự gửi khi có mạng.</p>}
      {s.lastSyncError && <p className="text-sm text-[var(--st-danger)]">{s.lastSyncError}</p>}
      {!s.cloudConfigured && (
        <p className="text-sm text-[var(--st-ink-secondary)]">
          Dữ liệu chỉ nằm trên máy này. Để cả phòng dùng chung, cần cấu hình Supabase (xem hướng dẫn trong DEPLOY.md).
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {s.cloudConfigured && (
          <button type="button" className="st-btn st-btn-secondary flex-1" onClick={() => void s.retryFailedOps()}>
            <RefreshCw className="w-5 h-5" aria-hidden /> Đồng bộ lại
          </button>
        )}
        <button type="button" className="st-btn st-btn-ghost flex-1" onClick={exportData}>
          <Download className="w-5 h-5" aria-hidden /> Tải bản sao lưu
        </button>
      </div>
    </section>
  );
}
