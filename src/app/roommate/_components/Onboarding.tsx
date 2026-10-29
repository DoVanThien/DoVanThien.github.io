'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  MEMBER_AVATARS,
  RoommateMember,
  STRUCTURED_COLORS,
  activeMembersOf,
  useRoommateStore,
} from '@/lib/roommate-store';
import { Avatar, Field, FieldGroup, Modal, cx, toneStyle, useConfirm } from './ui';

function NewMemberForm({
  onDone,
  submitLabel,
  allowExisting,
}: {
  onDone: () => void;
  submitLabel: string;
  allowExisting: boolean;
}) {
  const enterWithMemberName = useRoommateStore((s) => s.enterWithMemberName);
  const members = useRoommateStore((s) => s.members);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(
    () => MEMBER_AVATARS.find((av) => !members.some((m) => !m.archived && m.avatar === av)) || MEMBER_AVATARS[0]
  );
  const [color, setColor] = useState<string>(STRUCTURED_COLORS[0].hex);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = name.trim();
        if (clean.length < 1) {
          setError('Hãy nhập tên của bạn.');
          return;
        }
        if (clean.length > 30) {
          setError('Tên tối đa 30 ký tự.');
          return;
        }
        const taken = members.some(
          (m) => !m.archived && m.name.trim().toLowerCase() === clean.toLowerCase()
        );
        if (taken && !allowExisting) {
          setError('Tên này đã có trong phòng — hãy chọn tên đó ở danh sách phía trên.');
          return;
        }
        enterWithMemberName(clean, avatar, color);
        onDone();
      }}
    >
      <Field label="Tên của bạn" error={error} hint="Nếu tên đã có trong phòng, bạn sẽ vào đúng hồ sơ đó.">
        {(p) => (
          <input
            {...p}
            className="st-input"
            value={name}
            maxLength={30}
            autoComplete="nickname"
            placeholder="VD: Minh, Lan, Hùng…"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        )}
      </Field>

      <FieldGroup legend="Biểu tượng đại diện">
        <div className="flex flex-wrap gap-2">
          {MEMBER_AVATARS.map((av) => (
            <button
              key={av}
              type="button"
              className="st-swatch"
              aria-pressed={avatar === av}
              aria-label={`Biểu tượng ${av}`}
              onClick={() => setAvatar(av)}
            >
              <span aria-hidden>{av}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup legend="Màu của bạn trên lịch">
        <div className="flex flex-wrap gap-2.5">
          {STRUCTURED_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              className="st-swatch"
              aria-pressed={color === c.hex}
              aria-label={`Màu ${c.name}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => setColor(c.hex)}
            >
              {color === c.hex && (
                <span aria-hidden className="text-white text-lg font-black drop-shadow">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </FieldGroup>

      <button type="submit" className="st-btn st-btn-primary w-full !min-h-[52px] text-base">
        {submitLabel}
        <ArrowRight className="w-5 h-5" aria-hidden />
      </button>
    </form>
  );
}

function ExistingMembers({
  members,
  activeId,
  onPick,
}: {
  members: RoommateMember[];
  activeId: string | null;
  onPick: (m: RoommateMember) => void;
}) {
  if (members.length === 0) return null;
  return (
    <section aria-labelledby="existing-members-title" className="mb-6">
      <h2 id="existing-members-title" className="st-label">
        Bạn đã có tên trong phòng? Chọn tên mình:
      </h2>
      <ul className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onPick(m)}
              disabled={m.id === activeId}
              className={cx(
                'w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition min-h-[60px]',
                'border-[var(--st-border-strong)] bg-[var(--st-bg-subtle)] hover:border-[var(--st-ink-muted)]',
                m.id === activeId && 'opacity-60 cursor-default'
              )}
            >
              <Avatar member={m} size={38} />
              <span className="min-w-0">
                <span className="block font-bold truncate">{m.name}</span>
                <span className="block text-xs text-[var(--st-ink-muted)]">
                  {m.id === activeId ? 'Đang dùng trên máy này' : 'Vào bằng tên này'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Full-screen welcome when this device has no member yet. */
export function WelcomeScreen() {
  const roomName = useRoommateStore((s) => s.roomName);
  const members = useRoommateStore((s) => s.members);
  const setActiveMemberId = useRoommateStore((s) => s.setActiveMemberId);
  const active = activeMembersOf(members);

  return (
    <main id="main" className="min-h-[100dvh] flex items-center justify-center p-4 py-10">
      <div className="st-card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <span
            aria-hidden
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl tone-soft"
            style={toneStyle('#E88D72')}
          >
            🏡
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] tone-text" style={toneStyle('#E88D72')}>
              Roommate Hub
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight break-words leading-tight">{roomName}</h1>
          </div>
        </div>
        <p className="text-[15px] text-[var(--st-ink-secondary)] leading-relaxed mb-6">
          Chào mừng bạn vào phòng! Nhập tên một lần để cùng chia việc nhà và chi tiêu với mọi người — không cần mật khẩu.
        </p>

        <ExistingMembers members={active} activeId={null} onPick={(m) => setActiveMemberId(m.id)} />

        <div className={cx(active.length > 0 && 'pt-5 border-t border-[var(--st-border)]')}>
          {active.length > 0 && <h2 className="st-label">Hoặc tạo hồ sơ mới:</h2>}
          <NewMemberForm onDone={() => undefined} submitLabel="Vào phòng" allowExisting />
        </div>
      </div>
    </main>
  );
}

/** Modal to switch identity on this device — with confirmation (protects the rotation rule). */
export function SwitchMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useRoommateStore((s) => s.members);
  const activeMemberId = useRoommateStore((s) => s.activeMemberId);
  const setActiveMemberId = useRoommateStore((s) => s.setActiveMemberId);
  const notify = useRoommateStore((s) => s.notify);
  const confirm = useConfirm();
  const active = activeMembersOf(members);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đổi người dùng trên máy này"
      description="Mọi thao tác (tích việc, ghi chi tiêu) sẽ được ghi dưới tên người đang dùng."
    >
      <ExistingMembers
        members={active}
        activeId={activeMemberId}
        onPick={async (m) => {
          const ok = await confirm({
            title: `Bạn đúng là ${m.name}?`,
            message: (
              <>
                Việc bạn tích sẽ được tính là <strong>{m.name}</strong> tự làm. Dùng tên người khác để tích hộ sẽ
                không công bằng với cả phòng.
              </>
            ),
            confirmLabel: `Tôi là ${m.name}`,
          });
          if (!ok) return;
          setActiveMemberId(m.id);
          notify({ tone: 'success', message: `Đã chuyển sang ${m.name}.` });
          onClose();
        }}
      />
      <div className="pt-5 border-t border-[var(--st-border)]">
        <h3 className="st-label">Người mới vào phòng?</h3>
        <NewMemberForm onDone={onClose} submitLabel="Tạo hồ sơ & dùng tên này" allowExisting={false} />
      </div>
    </Modal>
  );
}
