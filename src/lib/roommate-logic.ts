// ============================================================================
// ROOMMATE HUB — PURE DOMAIN LOGIC (no React, no Supabase)
// Types, constants, period keys (Vietnam time), rotation engine, debt engine.
// ============================================================================

export type ChoreFrequency = 'daily' | 'weekly' | 'monthly';

export interface RoommateMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  bank_bin?: string;
  bank_short_name?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChoreSubtask {
  id: string;
  title: string;
  completed: boolean;
  completed_by_member_id: string | null;
  completed_at: string | null;
}

export type RolloverStatus = 'normal' | 'rotated' | 'held_incomplete' | 'held_delegated';

export interface ChoreTask {
  id: string;
  title: string;
  icon: string;
  color: string;
  frequency: ChoreFrequency;
  time_hint: string;
  member_order: string[];
  current_assignee_id: string | null;
  current_period_key: string;
  rollover_seq: number;
  checklist: ChoreSubtask[];
  last_rollover_note?: string;
  last_rollover_status?: RolloverStatus;
  created_at?: string;
  updated_at?: string;
}

export type ExpenseCategory = 'daily' | 'fixed_bill' | 'shopping' | 'settlement';

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paid_by_member_id: string;
  split_member_ids: string[];
  category: ExpenseCategory;
  fixed_bill_id?: string | null;
  month_key?: string | null; // YYYY-MM for fixed bills
  usage_value?: number | null;
  note?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FixedBillConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  unit_note: string;
  created_at?: string;
  updated_at?: string;
}

/** A month entry of a fixed bill — derived from the matching fixed_bill expense. */
export interface FixedBillMonthEntry {
  month_key: string;
  amount: number;
  paid_by_member_id: string;
  split_member_ids: string[];
  usage_value: number | null;
  note: string;
  expense_id: string;
}

export interface ShoppingItem {
  id: string;
  title: string;
  added_by_member_id: string | null;
  note?: string;
  urgency?: 'normal' | 'urgent';
  is_bought: boolean;
  bought_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SimplifiedDebtTransaction {
  from_member_id: string;
  to_member_id: string;
  amount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export interface VietQRBank {
  bin: string;
  shortName: string;
  name: string;
}

export const VIETQR_BANKS: VietQRBank[] = [
  { bin: '970422', shortName: 'MB', name: 'MBBank - Quân Đội' },
  { bin: '970436', shortName: 'VCB', name: 'Vietcombank - Ngoại Thương' },
  { bin: '970407', shortName: 'TCB', name: 'Techcombank - Kỹ Thương' },
  { bin: '970415', shortName: 'ICB', name: 'VietinBank - Công Thương' },
  { bin: '970418', shortName: 'BIDV', name: 'BIDV - Đầu Tư & Phát Triển' },
  { bin: '970416', shortName: 'ACB', name: 'ACB - Á Châu' },
  { bin: '970432', shortName: 'VPB', name: 'VPBank - Việt Nam Thịnh Vượng' },
  { bin: '970423', shortName: 'TPB', name: 'TPBank - Tiên Phong' },
  { bin: '970405', shortName: 'VBA', name: 'Agribank - NN & PT Nông Thôn' },
  { bin: '970403', shortName: 'STB', name: 'Sacombank - Sài Gòn Thương Tín' },
  { bin: '970441', shortName: 'VIB', name: 'VIB - Quốc Tế' },
  { bin: '970448', shortName: 'OCB', name: 'OCB - Phương Đông' },
  { bin: '970437', shortName: 'HDB', name: 'HDBank - Phát Triển TP.HCM' },
  { bin: '970426', shortName: 'MSB', name: 'MSB - Hàng Hải' },
  { bin: '970454', shortName: 'VCCB', name: 'Bản Việt (BVBank)' },
  { bin: '970431', shortName: 'EIB', name: 'Eximbank - Xuất Nhập Khẩu' },
  { bin: '970443', shortName: 'SHB', name: 'SHB - Sài Gòn Hà Nội' },
  { bin: '970440', shortName: 'SEAB', name: 'SeABank - Đông Nam Á' },
  { bin: '963388', shortName: 'TIMO', name: 'Timo by Bản Việt' },
  { bin: '546034', shortName: 'CAKE', name: 'CAKE by VPBank' },
];

/**
 * Structured palette. `hex` is the decorative pastel (fills, icons, chart),
 * `ink` is a darker shade that passes WCAG AA (≥4.5:1) as text on light surfaces,
 * `inkDark` is a lighter shade for text on dark surfaces.
 */
export const STRUCTURED_COLORS = [
  { name: 'San hô', hex: '#E88D72', ink: '#AD4A2A', inkDark: '#F0A58E' },
  { name: 'Xanh sage', hex: '#84A59D', ink: '#3F6B61', inkDark: '#9CC2B8' },
  { name: 'Vàng mật', hex: '#E9B44C', ink: '#8A5A00', inkDark: '#F2C66E' },
  { name: 'Tím lavender', hex: '#9D8189', ink: '#765A63', inkDark: '#C9AEB6' },
  { name: 'Xanh trời', hex: '#7EA8BE', ink: '#2F6684', inkDark: '#9CC4DA' },
  { name: 'Hồng đất', hex: '#E27D90', ink: '#B03A55', inkDark: '#F2A0B0' },
] as const;

export function toneOf(hex: string | undefined | null) {
  const found = STRUCTURED_COLORS.find(
    (c) => c.hex.toLowerCase() === (hex || '').toLowerCase()
  );
  return found || STRUCTURED_COLORS[0];
}

export const MEMBER_AVATARS = [
  '🧑‍💻', '👩‍🎨', '🧑‍🍳', '🦸‍♂️', '🦊', '🐱', '🐼', '🐨', '🐸', '🦁', '🐻', '🐰',
];

export const CHORE_ICONS = ['🧹', '🍽️', '🫧', '🗑️', '🧺', '🪴', '❄️', '🛋️', '🚿', '🧽', '🍳', '🐾'];
export const BILL_ICONS = ['⚡', '💧', '🏠', '📶', '🗑️', '🛵', '🔥', '🛡️', '📦'];

export const DEFAULT_ROOM_NAME = 'Nhà Chung Hạnh Phúc';

/** Balances whose absolute value is below this (VND) are treated as settled. */
export const DEBT_EPSILON = 500;

// ============================================================================
// GENERIC HELPERS
// ============================================================================

export function generateRoommateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0)) + 'đ';
}

/** Parses "150.000", "150,000đ", "150000" → 150000. Returns 0 when invalid. */
export function parseVNDInput(raw: string): number {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Removes Vietnamese diacritics (for bank transfer memos and account names). */
export function removeDiacritics(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function buildVietQRUrl(params: {
  bankBin: string;
  accountNo: string;
  accountName?: string;
  amount: number;
  memo: string;
}): string {
  const memo = removeDiacritics(params.memo).replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50).trim();
  const name = removeDiacritics(params.accountName || '').toUpperCase();
  const qs = new URLSearchParams({
    amount: String(Math.round(params.amount)),
    addInfo: memo,
  });
  if (name) qs.set('accountName', name);
  return `https://img.vietqr.io/image/${encodeURIComponent(params.bankBin)}-${encodeURIComponent(
    params.accountNo.replace(/\s+/g, '')
  )}-compact2.png?${qs.toString()}`;
}

// ============================================================================
// DATES & PERIOD KEYS — always computed in Vietnam time (Asia/Ho_Chi_Minh)
// ============================================================================

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function getVNDateParts(refDate: Date = new Date()): { y: number; m: number; d: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: VN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(refDate);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return { y: get('year'), m: get('month'), d: get('day') };
  } catch {
    // Fallback: UTC+7 arithmetic
    const shifted = new Date(refDate.getTime() + 7 * 3600 * 1000);
    return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function getTodayDateString(refDate: Date = new Date()): string {
  const { y, m, d } = getVNDateParts(refDate);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function getCurrentMonthKey(refDate: Date = new Date()): string {
  const { y, m } = getVNDateParts(refDate);
  return `${y}-${pad2(m)}`;
}

/** ISO week (Monday-based) for a calendar date. */
function isoWeekOf(y: number, m: number, d: number): { year: number; week: number } {
  const temp = new Date(Date.UTC(y, m - 1, d));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: temp.getUTCFullYear(), week };
}

export function getPeriodKey(frequency: ChoreFrequency, refDate: Date = new Date()): string {
  const { y, m, d } = getVNDateParts(refDate);
  if (frequency === 'daily') return `${y}-${pad2(m)}-${pad2(d)}`;
  if (frequency === 'monthly') return `${y}-${pad2(m)}`;
  const { year, week } = isoWeekOf(y, m, d);
  return `${year}-W${pad2(week)}`;
}

/** Monday..Sunday dates of an ISO week key like "2026-W44". */
export function isoWeekRange(weekKey: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const start = new Date(jan4);
  start.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

export function formatPeriodLabel(frequency: ChoreFrequency, periodKey: string): string {
  if (frequency === 'daily') {
    const [y, m, d] = periodKey.split('-');
    return y && m && d ? `Ngày ${d}/${m}` : periodKey;
  }
  if (frequency === 'weekly') {
    const range = isoWeekRange(periodKey);
    if (!range) return periodKey;
    const f = (dt: Date) => `${pad2(dt.getUTCDate())}/${pad2(dt.getUTCMonth() + 1)}`;
    return `Tuần ${f(range.start)} – ${f(range.end)}`;
  }
  const [y, m] = periodKey.split('-');
  return y && m ? `Tháng ${Number(m)}/${y}` : periodKey;
}

export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return y && m ? `Tháng ${Number(m)}/${y}` : monthKey;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = (dateStr || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : dateStr;
}

export const FREQUENCY_LABEL: Record<ChoreFrequency, string> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
};

// ============================================================================
// MEMBERS
// ============================================================================

export const activeMembersOf = (members: RoommateMember[]) => members.filter((m) => !m.archived);

// ============================================================================
// CHORE ROTATION ENGINE
// ============================================================================

export interface RotationEvaluation {
  canRotate: boolean;
  allCompleted: boolean;
  isEmpty: boolean;
  delegatedByNames: string[];
  incompleteCount: number;
}

/**
 * Spec 5.2 — rotation is allowed only when:
 *  - the checklist has at least one item, AND
 *  - every item is completed, AND
 *  - every item was ticked by the current assignee (nobody ticked on their behalf).
 */
export function evaluateChoreRotationStatus(
  chore: ChoreTask,
  members: RoommateMember[]
): RotationEvaluation {
  const total = chore.checklist.length;
  if (total === 0) {
    return { canRotate: false, allCompleted: false, isEmpty: true, delegatedByNames: [], incompleteCount: 0 };
  }

  let incompleteCount = 0;
  const delegated = new Set<string>();

  for (const item of chore.checklist) {
    if (!item.completed) {
      incompleteCount++;
    } else if (item.completed_by_member_id !== chore.current_assignee_id) {
      const helper = members.find((m) => m.id === item.completed_by_member_id);
      delegated.add(helper ? helper.name : 'Thành viên khác');
    }
  }

  const allCompleted = incompleteCount === 0;
  const delegatedByNames = Array.from(delegated);
  return {
    canRotate: allCompleted && delegatedByNames.length === 0,
    allCompleted,
    isEmpty: false,
    delegatedByNames,
    incompleteCount,
  };
}

/** Rotation order restricted to active (non-archived) members that still exist. */
export function effectiveRotationOrder(chore: ChoreTask, members: RoommateMember[]): string[] {
  const active = activeMembersOf(members);
  const valid = chore.member_order.filter((id) => active.some((m) => m.id === id));
  return valid.length > 0 ? valid : active.map((m) => m.id);
}

export function predictNextAssignee(chore: ChoreTask, members: RoommateMember[]): string | null {
  const order = effectiveRotationOrder(chore, members);
  if (order.length === 0) return null;
  const idx = order.indexOf(chore.current_assignee_id || '');
  return order[idx === -1 ? 0 : (idx + 1) % order.length];
}

/** Applies the rollover rules and returns the chore for `newPeriodKey`. */
export function performChoreRollover(
  chore: ChoreTask,
  newPeriodKey: string,
  members: RoommateMember[]
): ChoreTask {
  const order = effectiveRotationOrder(chore, members);
  const currentAssignee = members.find((m) => m.id === chore.current_assignee_id);
  const currentName = currentAssignee ? currentAssignee.name : 'người trực cũ';
  const assigneeStillActive =
    !!chore.current_assignee_id && order.includes(chore.current_assignee_id);
  const evaluation = evaluateChoreRotationStatus(chore, members);

  let nextAssigneeId: string | null = chore.current_assignee_id;
  let note: string;
  let status: RolloverStatus;

  if (!assigneeStillActive) {
    nextAssigneeId = order[0] ?? null;
    const nextName = members.find((m) => m.id === nextAssigneeId)?.name;
    note = nextName ? `Bắt đầu lượt trực với ${nextName}.` : 'Chưa có thành viên để phân công.';
    status = 'normal';
  } else if (evaluation.canRotate) {
    nextAssigneeId = predictNextAssignee(chore, members);
    const nextName = members.find((m) => m.id === nextAssigneeId)?.name || 'người kế tiếp';
    note = `Đợt trước ${currentName} đã tự hoàn thành 100% — chuyển lượt sang ${nextName}.`;
    status = 'rotated';
  } else if (evaluation.isEmpty) {
    note = `Đầu việc chưa có mục nhỏ nào nên ${currentName} giữ nguyên lượt. Hãy thêm checklist.`;
    status = 'held_incomplete';
  } else if (evaluation.delegatedByNames.length > 0 && !evaluation.allCompleted) {
    note = `Đợt trước chưa xong và có mục do ${evaluation.delegatedByNames.join(', ')} tích hộ — ${currentName} giữ nguyên lượt.`;
    status = 'held_delegated';
  } else if (evaluation.delegatedByNames.length > 0) {
    note = `Đợt trước có mục do ${evaluation.delegatedByNames.join(', ')} tích hộ — ${currentName} giữ nguyên lượt.`;
    status = 'held_delegated';
  } else {
    note = `Đợt trước còn ${evaluation.incompleteCount} mục chưa xong — ${currentName} giữ nguyên lượt.`;
    status = 'held_incomplete';
  }

  return {
    ...chore,
    member_order: order,
    current_assignee_id: nextAssigneeId,
    current_period_key: newPeriodKey,
    rollover_seq: (chore.rollover_seq || 0) + 1,
    checklist: chore.checklist.map((item) => ({
      ...item,
      completed: false,
      completed_by_member_id: null,
      completed_at: null,
    })),
    last_rollover_note: note,
    last_rollover_status: status,
  };
}

// ============================================================================
// DEBT ENGINE
// ============================================================================

/**
 * Net balance per member. Positive = the room owes them, negative = they owe.
 * Archived members are included so history stays consistent after someone leaves.
 * Expenses whose payer or split members no longer exist at all are skipped as a whole
 * (never half-applied), so balances always sum to ~0.
 */
export function calculateNetBalances(
  members: RoommateMember[],
  expenses: ExpenseRecord[]
): Record<string, number> {
  const known = new Set(members.map((m) => m.id));
  const balances: Record<string, number> = {};
  for (const m of members) balances[m.id] = 0;

  for (const exp of expenses) {
    const amount = Number(exp.amount);
    if (!amount || amount <= 0) continue;
    if (!known.has(exp.paid_by_member_id)) continue;
    const split = (exp.split_member_ids || []).filter((id) => known.has(id));
    if (split.length === 0) continue;

    balances[exp.paid_by_member_id] += amount;
    const share = amount / split.length;
    for (const id of split) balances[id] -= share;
  }

  for (const id of Object.keys(balances)) balances[id] = Math.round(balances[id]);
  return balances;
}

/** Greedy matching of largest debtor ↔ largest creditor → minimal transfers. */
export function simplifyRoommateDebts(balances: Record<string, number>): SimplifiedDebtTransaction[] {
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, bal] of Object.entries(balances)) {
    if (bal > DEBT_EPSILON) creditors.push({ id, amount: bal });
    else if (bal < -DEBT_EPSILON) debtors.push({ id, amount: -bal });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedDebtTransaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const settle = Math.min(debtors[i].amount, creditors[j].amount);
    if (settle >= DEBT_EPSILON) {
      transactions.push({
        from_member_id: debtors[i].id,
        to_member_id: creditors[j].id,
        amount: Math.round(settle),
      });
    }
    debtors[i].amount -= settle;
    creditors[j].amount -= settle;
    if (debtors[i].amount < DEBT_EPSILON) i++;
    if (creditors[j].amount < DEBT_EPSILON) j++;
  }
  return transactions;
}

// ============================================================================
// FIXED BILLS (history derived from expenses — single source of truth)
// ============================================================================

export function fixedBillExpenseId(billId: string, monthKey: string): string {
  return `fbx-${billId}-${monthKey}`;
}

export function getFixedBillHistory(billId: string, expenses: ExpenseRecord[]): FixedBillMonthEntry[] {
  const byMonth = new Map<string, ExpenseRecord>();
  for (const e of expenses) {
    if (e.category !== 'fixed_bill' || e.fixed_bill_id !== billId || !e.month_key) continue;
    const prev = byMonth.get(e.month_key);
    if (!prev || (e.updated_at || e.created_at || '') > (prev.updated_at || prev.created_at || '')) {
      byMonth.set(e.month_key, e);
    }
  }
  return Array.from(byMonth.values())
    .map((e) => ({
      month_key: e.month_key as string,
      amount: Number(e.amount),
      paid_by_member_id: e.paid_by_member_id,
      split_member_ids: e.split_member_ids,
      usage_value: e.usage_value ?? null,
      note: e.note || '',
      expense_id: e.id,
    }))
    .sort((a, b) => a.month_key.localeCompare(b.month_key));
}

// ============================================================================
// DEFAULT SEED DATA
// ============================================================================

export const SEED_FIXED_BILLS: FixedBillConfig[] = [
  { id: 'fb-11111111-1111-4111-a111-111111111101', name: 'Tiền điện', icon: '⚡', color: '#E9B44C', unit_note: 'kWh' },
  { id: 'fb-11111111-1111-4111-a111-111111111102', name: 'Tiền nước', icon: '💧', color: '#7EA8BE', unit_note: 'm³' },
  { id: 'fb-11111111-1111-4111-a111-111111111103', name: 'Tiền phòng', icon: '🏠', color: '#E88D72', unit_note: 'Tháng' },
  { id: 'fb-11111111-1111-4111-a111-111111111104', name: 'Wifi / Internet', icon: '📶', color: '#84A59D', unit_note: 'Tháng' },
  { id: 'fb-11111111-1111-4111-a111-111111111105', name: 'Phí vệ sinh / Rác', icon: '🗑️', color: '#9D8189', unit_note: 'Tháng' },
];

const sub = (id: string, title: string): ChoreSubtask => ({
  id,
  title,
  completed: false,
  completed_by_member_id: null,
  completed_at: null,
});

export function createDefaultChores(memberIds: string[], now: Date = new Date()): ChoreTask[] {
  const pick = (i: number) => (memberIds.length ? memberIds[i % memberIds.length] : null);
  const base = { member_order: memberIds, rollover_seq: 0, last_rollover_status: 'normal' as const };
  return [
    {
      ...base,
      id: 'ch-22222222-2222-4222-a222-222222222201',
      title: 'Trực nhật bếp & đổ rác',
      icon: '🍽️',
      color: '#E88D72',
      frequency: 'daily',
      time_hint: '20:30',
      current_assignee_id: pick(0),
      current_period_key: getPeriodKey('daily', now),
      checklist: [
        sub('sub-101', 'Rửa bát / dọn bồn rửa'),
        sub('sub-102', 'Lau bàn ăn & mặt bếp'),
        sub('sub-103', 'Buộc và mang rác đi đổ'),
      ],
      last_rollover_note: 'Tự tích đủ 100% các mục để ngày mai chuyển lượt.',
    },
    {
      ...base,
      id: 'ch-22222222-2222-4222-a222-222222222202',
      title: 'Tổng vệ sinh phòng & nhà tắm',
      icon: '🧹',
      color: '#84A59D',
      frequency: 'weekly',
      time_hint: 'Cuối tuần',
      current_assignee_id: pick(1),
      current_period_key: getPeriodKey('weekly', now),
      checklist: [
        sub('sub-201', 'Quét và lau sàn nhà'),
        sub('sub-202', 'Cọ bồn cầu & lavabo'),
        sub('sub-203', 'Lau gương & kệ đồ'),
      ],
      last_rollover_note: 'Xoay lượt vào thứ Hai hằng tuần nếu đã tự làm xong.',
    },
    {
      ...base,
      id: 'ch-22222222-2222-4222-a222-222222222204',
      title: 'Vệ sinh định kỳ cuối tháng',
      icon: '❄️',
      color: '#9D8189',
      frequency: 'monthly',
      time_hint: 'Cuối tháng',
      current_assignee_id: pick(2),
      current_period_key: getPeriodKey('monthly', now),
      checklist: [
        sub('sub-401', 'Lau quạt / lưới lọc điều hòa'),
        sub('sub-402', 'Dọn tủ lạnh & bỏ đồ hết hạn'),
      ],
      last_rollover_note: 'Xoay lượt vào ngày đầu tháng nếu đã tự làm xong.',
    },
  ];
}
