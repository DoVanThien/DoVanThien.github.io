import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  ChoreFrequency,
  ChoreSubtask,
  ChoreTask,
  DEFAULT_ROOM_NAME,
  ExpenseRecord,
  FixedBillConfig,
  RoommateMember,
  SEED_FIXED_BILLS,
  ShoppingItem,
  activeMembersOf,
  createDefaultChores,
  effectiveRotationOrder,
  fixedBillExpenseId,
  formatMonthKey,
  generateRoommateUUID,
  getPeriodKey,
  getTodayDateString,
  performChoreRollover,
  removeDiacritics,
} from './roommate-logic';

export * from './roommate-logic';

// ============================================================================
// SYNC TYPES
// ============================================================================

type TableName =
  | 'roommate_members'
  | 'roommate_chores'
  | 'roommate_expenses'
  | 'roommate_fixed_bills'
  | 'roommate_shopping_items'
  | 'roommate_settings';

type Row = Record<string, unknown>;

export type PendingOp =
  | { id: string; kind: 'upsert'; table: TableName; row: Row }
  /** Insert only if the primary key does not exist yet — never overwrites (used for seeds & first upload). */
  | { id: string; kind: 'insert_ignore'; table: TableName; row: Row }
  /** Plain update; with `expectSeq` it only applies if the chore is still on that rollover_seq. */
  | { id: string; kind: 'update'; table: TableName; rowId: string; patch: Row; expectSeq?: number; label?: string }
  | { id: string; kind: 'delete'; table: TableName; rowId: string }
  | {
      id: string;
      kind: 'set_subtask';
      choreId: string;
      subtaskId: string;
      completed: boolean;
      actorId: string | null;
      at: string;
      rolloverSeq: number;
    }
  | { id: string; kind: 'rollover'; choreId: string; expectedSeq: number; patch: Row }
  | { id: string; kind: 'join_rotation'; memberId: string }
  | { id: string; kind: 'leave_rotation'; memberId: string }
  | { id: string; kind: 'buy_shopping'; itemId: string; itemTitle: string; expenseRow: Row };

type RefreshOutcome = 'ok-data' | 'ok-empty' | 'missing' | 'offline' | 'error' | 'skipped';

export type SyncMode = 'local' | 'cloud';
export type SyncStatus = 'idle' | 'saving' | 'offline' | 'error';

export interface Notice {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  actionLabel?: string;
  action?: () => void;
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

const LS = {
  active: 'roommate_active_member_id_v1',
  room: 'roommate_room_name_v1',
  members: 'roommate_members_v1',
  chores: 'roommate_chores_v1',
  expenses: 'roommate_expenses_v1',
  bills: 'roommate_fixed_bills_v1',
  shopping: 'roommate_shopping_v1',
  pending: 'roommate_pending_ops_v2',
  failed: 'roommate_failed_ops_v2',
  theme: 'roommate_theme_v1',
};

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLSString(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Storage full or blocked — app keeps working in memory.
  }
}

// ============================================================================
// NORMALIZERS (server/local rows → typed objects) & ROW MAPPERS (→ DB columns)
// ============================================================================

/** Timestamps may arrive as ISO strings (PostgREST) or Date objects — always store ISO strings. */
const ts = (v: unknown): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
  return String(v);
};

const asArray = <T>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

function normMember(r: Row): RoommateMember {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    avatar: String(r.avatar ?? '🙂'),
    color: String(r.color ?? '#E88D72'),
    bank_bin: String(r.bank_bin ?? ''),
    bank_short_name: String(r.bank_short_name ?? ''),
    bank_account_no: String(r.bank_account_no ?? ''),
    bank_account_name: String(r.bank_account_name ?? ''),
    archived: Boolean(r.archived),
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  };
}

function normChore(r: Row): ChoreTask {
  const frequency = (['daily', 'weekly', 'monthly'].includes(String(r.frequency))
    ? r.frequency
    : 'weekly') as ChoreFrequency;
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    icon: String(r.icon ?? '🧹'),
    color: String(r.color ?? '#E88D72'),
    frequency,
    time_hint: String(r.time_hint ?? ''),
    member_order: asArray<string>(r.member_order).map(String),
    current_assignee_id: (r.current_assignee_id as string) || null,
    current_period_key: String(r.current_period_key ?? getPeriodKey(frequency)),
    rollover_seq: Number(r.rollover_seq) || 0,
    checklist: asArray<ChoreSubtask>(r.checklist).map((s) => ({
      id: String(s.id),
      title: String(s.title ?? ''),
      completed: Boolean(s.completed),
      completed_by_member_id: s.completed_by_member_id || null,
      completed_at: ts(s.completed_at) || null,
    })),
    last_rollover_note: String(r.last_rollover_note ?? ''),
    last_rollover_status: (r.last_rollover_status as ChoreTask['last_rollover_status']) || 'normal',
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  };
}

function normExpense(r: Row): ExpenseRecord {
  const usage = r.usage_value;
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    amount: Math.round(Number(r.amount) || 0),
    date: String(r.date ?? getTodayDateString()).slice(0, 10),
    paid_by_member_id: String(r.paid_by_member_id ?? ''),
    split_member_ids: asArray<string>(r.split_member_ids).map(String),
    category: (['daily', 'fixed_bill', 'shopping', 'settlement'].includes(String(r.category))
      ? r.category
      : 'daily') as ExpenseRecord['category'],
    fixed_bill_id: (r.fixed_bill_id as string) || null,
    month_key: (r.month_key as string) || null,
    usage_value: usage === null || usage === undefined || usage === '' ? null : Number(usage),
    note: String(r.note ?? ''),
    created_by: (r.created_by as string) || null,
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  };
}

function normBill(r: Row): FixedBillConfig {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    icon: String(r.icon ?? '⚡'),
    color: String(r.color ?? '#E9B44C'),
    unit_note: String(r.unit_note ?? 'Tháng'),
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  };
}

function normShopping(r: Row): ShoppingItem {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    note: String(r.note ?? ''),
    urgency: r.urgency === 'urgent' ? 'urgent' : 'normal',
    added_by_member_id: (r.added_by_member_id as string) || null,
    is_bought: Boolean(r.is_bought),
    bought_by: (r.bought_by as string) || null,
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  };
}

const nowIso = () => new Date().toISOString();

const memberRow = (m: RoommateMember): Row => ({
  id: m.id,
  name: m.name,
  avatar: m.avatar,
  color: m.color,
  bank_bin: m.bank_bin || '',
  bank_short_name: m.bank_short_name || '',
  bank_account_no: m.bank_account_no || '',
  bank_account_name: m.bank_account_name || '',
  archived: !!m.archived,
  created_at: m.created_at || nowIso(),
  updated_at: nowIso(),
});

const choreRow = (c: ChoreTask): Row => ({
  id: c.id,
  title: c.title,
  icon: c.icon,
  color: c.color,
  frequency: c.frequency,
  time_hint: c.time_hint || '',
  member_order: c.member_order,
  current_assignee_id: c.current_assignee_id,
  current_period_key: c.current_period_key,
  rollover_seq: c.rollover_seq || 0,
  checklist: c.checklist,
  last_rollover_note: c.last_rollover_note || '',
  last_rollover_status: c.last_rollover_status || 'normal',
  created_at: c.created_at || nowIso(),
  updated_at: nowIso(),
});

const expenseRow = (e: ExpenseRecord): Row => ({
  id: e.id,
  title: e.title,
  amount: Math.round(e.amount),
  date: e.date,
  paid_by_member_id: e.paid_by_member_id,
  split_member_ids: e.split_member_ids,
  category: e.category,
  fixed_bill_id: e.fixed_bill_id || null,
  month_key: e.month_key || null,
  usage_value: e.usage_value ?? null,
  note: e.note || '',
  created_by: e.created_by || null,
  created_at: e.created_at || nowIso(),
  updated_at: e.updated_at || nowIso(),
});

const billRow = (b: FixedBillConfig): Row => ({
  id: b.id,
  name: b.name,
  icon: b.icon,
  color: b.color,
  unit_note: b.unit_note,
  created_at: b.created_at || nowIso(),
  updated_at: nowIso(),
});

const shoppingRow = (s: ShoppingItem): Row => ({
  id: s.id,
  title: s.title,
  note: s.note || '',
  urgency: s.urgency || 'normal',
  added_by_member_id: s.added_by_member_id,
  is_bought: !!s.is_bought,
  bought_by: s.bought_by || null,
  created_at: s.created_at || nowIso(),
  updated_at: nowIso(),
});

// ============================================================================
// LEGACY MIGRATION (v1 localStorage → v2 model)
// ============================================================================

interface LegacyBillHistory {
  month_key: string;
  amount: number;
  paid_by_member_id: string;
  split_member_ids: string[];
  usage_value?: number | null;
  note?: string;
  expense_id?: string | null;
}

function migrateLegacyLocal(
  rawBills: (Row & { history?: LegacyBillHistory[] })[],
  expenses: ExpenseRecord[]
): { bills: FixedBillConfig[]; expenses: ExpenseRecord[] } {
  const nextExpenses = [...expenses];
  for (const b of rawBills) {
    for (const h of b.history || []) {
      const linked = nextExpenses.find(
        (e) =>
          (h.expense_id && e.id === h.expense_id) ||
          (e.fixed_bill_id === b.id && e.month_key === h.month_key)
      );
      if (linked) {
        if (linked.usage_value == null && h.usage_value != null) linked.usage_value = Number(h.usage_value);
      } else if (h.amount > 0) {
        nextExpenses.push(
          normExpense({
            id: fixedBillExpenseId(String(b.id), h.month_key),
            title: `${b.icon} ${b.name} (${formatMonthKey(h.month_key)})`,
            amount: h.amount,
            date: `${h.month_key}-01`,
            paid_by_member_id: h.paid_by_member_id,
            split_member_ids: h.split_member_ids,
            category: 'fixed_bill',
            fixed_bill_id: b.id,
            month_key: h.month_key,
            usage_value: h.usage_value ?? null,
            note: h.note || '',
          })
        );
      }
    }
  }
  return { bills: rawBills.map(normBill), expenses: nextExpenses };
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

interface SbError {
  message?: string;
  code?: string;
  details?: string | null;
}

function isNetworkError(err: SbError | null | undefined): boolean {
  if (!err) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = `${err.message || ''} ${err.details || ''}`;
  return !err.code && /fetch|network|timeout|Failed|ECONN|abort/i.test(msg);
}

function isMissingSchemaError(err: SbError | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    err.code === 'PGRST202' ||
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    /does not exist|Could not find the (table|function)|schema cache/i.test(err.message || '')
  );
}

function describeError(err: SbError): string {
  if (isMissingSchemaError(err)) {
    return 'Supabase chưa có bảng của Roommate Hub. Hãy chạy file supabase/roommate_schema.sql.';
  }
  return err.message || 'Lỗi không xác định';
}

// ============================================================================
// STORE
// ============================================================================

export interface RoommateHubState {
  roomName: string;
  members: RoommateMember[];
  activeMemberId: string | null;
  chores: ChoreTask[];
  expenses: ExpenseRecord[];
  fixedBills: FixedBillConfig[];
  shoppingItems: ShoppingItem[];

  loading: boolean;
  initialized: boolean;
  theme: 'light' | 'dark';

  syncMode: SyncMode;
  syncStatus: SyncStatus;
  cloudConfigured: boolean;
  cloudSetupMissing: boolean;
  pendingOps: PendingOp[];
  failedOps: PendingOp[];
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  notices: Notice[];

  // lifecycle
  initializeRoommateApp: () => Promise<void>;
  refreshFromCloud: () => Promise<RefreshOutcome>;
  flushPendingOps: () => Promise<void>;
  retryFailedOps: () => Promise<void>;
  runRolloverCheck: () => void;
  startLiveSync: () => () => void;

  // ui
  toggleTheme: () => void;
  notify: (n: Omit<Notice, 'id'>) => void;
  dismissNotice: (id: string) => void;

  // room & members
  setRoomName: (name: string) => void;
  enterWithMemberName: (name: string, avatar?: string, color?: string) => RoommateMember | null;
  setActiveMemberId: (id: string) => void;
  updateMemberProfile: (id: string, updates: Partial<Omit<RoommateMember, 'id'>>) => void;
  addRoommateMember: (name: string, avatar: string, color: string) => RoommateMember | null;
  archiveRoommateMember: (id: string) => void;
  restoreRoommateMember: (id: string) => void;

  // chores
  setSubtaskCompleted: (choreId: string, subtaskId: string, completed: boolean) => void;
  closeChorePeriod: (choreId: string) => void;
  addChoreTask: (
    chore: Omit<ChoreTask, 'id' | 'current_period_key' | 'rollover_seq' | 'last_rollover_status'>
  ) => void;
  updateChoreTask: (
    id: string,
    updates: Partial<Omit<ChoreTask, 'id' | 'rollover_seq' | 'current_period_key'>>,
    baseSeq?: number
  ) => boolean;
  deleteChoreTask: (id: string) => ChoreTask | null;
  restoreChoreTask: (chore: ChoreTask) => void;

  // expenses
  saveExpenseRecord: (expense: Omit<ExpenseRecord, 'id'> & { id?: string }) => ExpenseRecord;
  deleteExpenseRecord: (id: string) => ExpenseRecord | null;
  restoreExpenseRecord: (expense: ExpenseRecord) => void;
  settleDebtBetweenMembers: (fromMemberId: string, toMemberId: string, amount: number) => void;

  // fixed bills
  addFixedBillConfig: (config: Omit<FixedBillConfig, 'id'>) => void;
  updateFixedBillConfig: (id: string, updates: Partial<Omit<FixedBillConfig, 'id'>>) => void;
  deleteFixedBillConfig: (id: string) => FixedBillConfig | null;
  restoreFixedBillConfig: (bill: FixedBillConfig) => void;
  recordMonthlyFixedBill: (params: {
    fixedBillId: string;
    monthKey: string;
    amount: number;
    paidByMemberId: string;
    splitMemberIds: string[];
    usageValue?: number | null;
    note?: string;
  }) => void;

  // shopping
  addShoppingItem: (title: string, note?: string, urgency?: 'normal' | 'urgent') => void;
  deleteShoppingItem: (id: string) => ShoppingItem | null;
  restoreShoppingItem: (item: ShoppingItem) => void;
  convertShoppingItemToExpense: (params: {
    itemId: string;
    amount: number;
    paidByMemberId: string;
    splitMemberIds: string[];
  }) => void;
}

let flushing = false;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let channel: RealtimeChannel | null = null;
let initPromise: Promise<void> | null = null;
/** Bumped on every local write; a refresh that started before a write must not overwrite it. */
let writeVersion = 0;

export const useRoommateStore = create<RoommateHubState>((set, get) => {
  // --------------------------------------------------------------------------
  // internal helpers
  // --------------------------------------------------------------------------

  const persistAll = () => {
    const s = get();
    writeLS(LS.members, s.members);
    writeLS(LS.chores, s.chores);
    writeLS(LS.expenses, s.expenses);
    writeLS(LS.bills, s.fixedBills);
    writeLS(LS.shopping, s.shoppingItems);
    writeLS(LS.room, s.roomName);
  };

  const enqueue = (...ops: PendingOp[]) => {
    writeVersion++;
    // Pure local mode (no Supabase, or tables not created yet): this device is the source of truth.
    if (!supabase || get().syncMode !== 'cloud' || ops.length === 0) return;
    const next = [...get().pendingOps, ...ops];
    writeLS(LS.pending, next);
    set({ pendingOps: next, syncStatus: 'saving' });
    void get().flushPendingOps();
  };

  const opId = () => generateRoommateUUID();

  const scheduleRefresh = (delay = 400) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void get().refreshFromCloud();
    }, delay);
  };

  const pushNotice = (n: Omit<Notice, 'id'>) => {
    const notice = { ...n, id: generateRoommateUUID() };
    set({ notices: [...get().notices, notice].slice(-4) });
  };

  /** Insert-only ops for the whole current state (first upload of a room). Never overwrites cloud rows. */
  const snapshotOps = (): PendingOp[] => {
    const s = get();
    const ins = (table: TableName, row: Row): PendingOp => ({ id: opId(), kind: 'insert_ignore', table, row });
    return [
      ...s.members.map((m) => ins('roommate_members', memberRow(m))),
      ...s.fixedBills.map((b) => ins('roommate_fixed_bills', billRow(b))),
      ...s.chores.map((c) => ins('roommate_chores', choreRow(c))),
      ...s.expenses.map((e) => ins('roommate_expenses', expenseRow(e))),
      ...s.shoppingItems.map((it) => ins('roommate_shopping_items', shoppingRow(it))),
      ins('roommate_settings', { key: 'room_name', value: s.roomName, updated_at: nowIso() }),
      ins('roommate_settings', { key: 'seeded', value: '1', updated_at: nowIso() }),
    ];
  };

  const seedLocally = () => {
    const s = get();
    const patch: Partial<RoommateHubState> = {};
    if (s.fixedBills.length === 0) patch.fixedBills = SEED_FIXED_BILLS;
    if (s.chores.length === 0) patch.chores = createDefaultChores(activeMembersOf(s.members).map((m) => m.id));
    if (Object.keys(patch).length) set(patch);
  };

  type OpResult = { result: 'ok' | 'network' | 'failed'; error?: SbError };

  /** Executes one op against Supabase. */
  const executeOp = async (op: PendingOp): Promise<OpResult> => {
    if (!supabase) return { result: 'network' };
    const sb = supabase;
    const check = (error: SbError | null, status?: number): OpResult => {
      if (!error) return { result: 'ok' };
      // Gateway errors, rate limits and dropped connections are temporary → keep the op and retry later.
      if (isNetworkError(error) || status === 0 || status === 429 || (status !== undefined && status >= 500)) {
        return { result: 'network', error };
      }
      return { result: 'failed', error };
    };

    try {
      switch (op.kind) {
        case 'upsert': {
          const { error, status } = await sb.from(op.table).upsert(op.row);
          return check(error, status);
        }
        case 'insert_ignore': {
          const { error, status } = await sb
            .from(op.table)
            .upsert(op.row, { onConflict: op.table === 'roommate_settings' ? 'key' : 'id', ignoreDuplicates: true });
          return check(error, status);
        }
        case 'update': {
          let q = sb.from(op.table).update(op.patch).eq('id', op.rowId);
          if (op.expectSeq !== undefined) q = q.eq('rollover_seq', op.expectSeq);
          const { data, error, status } = await q.select('id');
          if (!error && op.expectSeq !== undefined && Array.isArray(data) && data.length === 0) {
            pushNotice({
              tone: 'warning',
              message: `${op.label ? `“${op.label}”` : 'Việc này'} vừa được cập nhật ở máy khác nên thay đổi của bạn chưa được lưu. Hãy kiểm tra và sửa lại.`,
            });
            scheduleRefresh(50);
          }
          return check(error, status);
        }
        case 'delete': {
          const { error, status } = await sb.from(op.table).delete().eq('id', op.rowId);
          return check(error, status);
        }
        case 'set_subtask': {
          const { data, error, status } = await sb.rpc('roommate_set_subtask', {
            p_chore_id: op.choreId,
            p_subtask_id: op.subtaskId,
            p_completed: op.completed,
            p_actor: op.actorId,
            p_at: op.at,
            p_rollover_seq: op.rolloverSeq,
          });
          if (!error && Array.isArray(data) && data.length === 0) {
            // The chore already moved to a new period on another device — this tick belongs to the old one.
            scheduleRefresh(50);
          }
          return check(error, status);
        }
        case 'rollover': {
          const { data, error, status } = await sb
            .from('roommate_chores')
            .update({ ...op.patch, updated_at: nowIso() })
            .eq('id', op.choreId)
            .eq('rollover_seq', op.expectedSeq)
            .select('id');
          if (!error && Array.isArray(data) && data.length === 0) {
            // Another device already rolled this chore over — take the server version.
            scheduleRefresh(50);
          }
          return check(error, status);
        }
        case 'join_rotation':
        case 'leave_rotation': {
          const { error, status } = await sb.rpc(
            op.kind === 'join_rotation' ? 'roommate_join_rotation' : 'roommate_leave_rotation',
            { p_member_id: op.memberId }
          );
          return check(error, status);
        }
        case 'buy_shopping': {
          // One transaction on the server: remove the item and record the expense; only one buyer wins.
          const { data, error, status } = await sb.rpc('roommate_buy_item', {
            p_item_id: op.itemId,
            p_expense: op.expenseRow,
          });
          if (error) return check(error, status);
          if (data === false) {
            const expId = String(op.expenseRow.id);
            set({ expenses: get().expenses.filter((e) => e.id !== expId) });
            persistAll();
            pushNotice({
              tone: 'warning',
              message: `“${op.itemTitle}” đã được người khác đánh dấu mua trước — không ghi trùng khoản chi.`,
            });
          }
          return { result: 'ok' };
        }
      }
    } catch (e) {
      return { result: 'network', error: { message: String(e) } };
    }
  };

  // Applies a rollover locally and queues the conditional cloud update.
  const applyRollover = (chore: ChoreTask, newKey: string): ChoreTask => {
    const rolled = performChoreRollover(chore, newKey, get().members);
    enqueue({
      id: opId(),
      kind: 'rollover',
      choreId: chore.id,
      expectedSeq: chore.rollover_seq || 0,
      // member_order is intentionally not written here: rotation membership is managed atomically
      // by join/leave RPCs so a stale device can never drop a newly added member.
      patch: {
        current_assignee_id: rolled.current_assignee_id,
        current_period_key: rolled.current_period_key,
        rollover_seq: rolled.rollover_seq,
        checklist: rolled.checklist,
        last_rollover_note: rolled.last_rollover_note,
        last_rollover_status: rolled.last_rollover_status,
      },
    });
    return { ...rolled, member_order: chore.member_order };
  };

  const actorId = () => {
    const { activeMemberId, members } = get();
    return activeMemberId && members.some((m) => m.id === activeMemberId) ? activeMemberId : null;
  };

  return {
    roomName: DEFAULT_ROOM_NAME,
    members: [],
    activeMemberId: null,
    chores: [],
    expenses: [],
    fixedBills: [],
    shoppingItems: [],
    loading: true,
    initialized: false,
    theme: 'light',
    syncMode: 'local',
    syncStatus: 'idle',
    cloudConfigured: !!supabase,
    cloudSetupMissing: false,
    pendingOps: [],
    failedOps: [],
    lastSyncedAt: null,
    lastSyncError: null,
    notices: [],

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    initializeRoommateApp: () => {
      if (get().initialized) {
        return get().refreshFromCloud().then(() => undefined);
      }
      // Guard against concurrent calls (React StrictMode runs effects twice in development).
      if (initPromise) return initPromise;
      initPromise = (async () => {
        // ---- 1. Local snapshot (instant first paint, offline support) ----
        const savedTheme = readLSString(LS.theme);
        const prefersDark =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme: 'light' | 'dark' =
          savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : prefersDark ? 'dark' : 'light';

        const members = readLS<Row[]>(LS.members, []).map(normMember);
        const chores = readLS<Row[]>(LS.chores, []).map(normChore);
        const legacyExpenses = readLS<Row[]>(LS.expenses, []).map(normExpense);
        const rawBills = readLS<(Row & { history?: LegacyBillHistory[] })[]>(LS.bills, []);
        const { bills, expenses } = migrateLegacyLocal(rawBills, legacyExpenses);
        const shoppingItems = readLS<Row[]>(LS.shopping, []).map(normShopping).filter((s) => !s.is_bought);

        set({
          theme,
          roomName: readLSString(LS.room) || DEFAULT_ROOM_NAME,
          members,
          chores,
          expenses,
          fixedBills: bills,
          shoppingItems,
          pendingOps: readLS<PendingOp[]>(LS.pending, []),
          failedOps: readLS<PendingOp[]>(LS.failed, []),
          activeMemberId: readLSString(LS.active),
          syncMode: supabase ? 'cloud' : 'local',
        });

        // ---- 2. Cloud: only ever write to the cloud after a successful read ----
        if (supabase) {
          const outcome = await get().refreshFromCloud();
          if (outcome === 'ok-empty') {
            // Brand-new room in the cloud: upload this device's data, or seed defaults.
            set({ members, chores, expenses, fixedBills: bills, shoppingItems });
            seedLocally();
            enqueue(...snapshotOps());
          } else if (outcome !== 'ok-data') {
            // Cloud unreachable / not set up: keep local data; seed only on this device, never upload blindly.
            // The room-wide 'seeded' flag uploads defaults later if the cloud room still lacks them.
            seedLocally();
          }
        } else {
          seedLocally();
        }

        // ---- 3. Validate active member on this device ----
        const active = get().members.find((m) => m.id === get().activeMemberId && !m.archived);
        set({ activeMemberId: active ? active.id : null, loading: false, initialized: true });

        get().runRolloverCheck();
        persistAll();
      })();
      return initPromise;
    },

    refreshFromCloud: async () => {
      if (!supabase) {
        set({ syncMode: 'local', loading: false });
        return 'skipped';
      }
      // Never overwrite local unsynced work: push it first.
      if (get().syncMode === 'cloud' && get().pendingOps.length > 0) {
        await get().flushPendingOps();
        if (get().pendingOps.length > 0) return 'skipped';
      }

      const versionAtStart = writeVersion;
      try {
        const [m, c, e, b, s, st] = await Promise.all([
          supabase.from('roommate_members').select('*').order('created_at', { ascending: true }),
          supabase.from('roommate_chores').select('*').order('created_at', { ascending: true }),
          supabase.from('roommate_expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('roommate_fixed_bills').select('*').order('created_at', { ascending: true }),
          supabase.from('roommate_shopping_items').select('*').order('created_at', { ascending: false }),
          supabase.from('roommate_settings').select('*'),
        ]);
        const failedRes = [m, c, e, b, s, st].find((r) => r.error);
        const firstError = failedRes?.error as SbError | undefined;

        if (firstError) {
          if (isMissingSchemaError(firstError)) {
            set({ syncMode: 'local', cloudSetupMissing: true, syncStatus: 'idle', lastSyncError: describeError(firstError) });
            return 'missing';
          }
          if (isNetworkError(firstError) || (failedRes?.status ?? 0) === 0 || (failedRes?.status ?? 0) >= 500 || failedRes?.status === 429) {
            set({ syncStatus: 'offline', lastSyncError: null });
            return 'offline';
          }
          set({ syncStatus: 'error', lastSyncError: describeError(firstError) });
          return 'error';
        }

        // A write happened (or is being flushed) while we were reading: this snapshot is stale.
        if (writeVersion !== versionAtStart || flushing || (get().syncMode === 'cloud' && get().pendingOps.length > 0)) {
          scheduleRefresh(300);
          return 'skipped';
        }

        const server = {
          members: ((m.data as Row[]) || []).map(normMember),
          chores: ((c.data as Row[]) || []).map(normChore),
          expenses: ((e.data as Row[]) || []).map(normExpense),
          fixedBills: ((b.data as Row[]) || []).map(normBill),
          shoppingItems: ((s.data as Row[]) || []).map(normShopping).filter((it) => !it.is_bought),
        };
        const serverEmpty =
          server.members.length === 0 && server.chores.length === 0 && server.fixedBills.length === 0 && server.expenses.length === 0;

        const wasLocal = get().syncMode !== 'cloud';
        set({ syncMode: 'cloud', cloudSetupMissing: false });

        if (serverEmpty && get().initialized) {
          // Tables were just created (or the room was emptied) and this device has data: upload it once.
          const s0 = get();
          if (s0.members.length || s0.chores.length || s0.expenses.length) {
            enqueue(...snapshotOps());
            return 'ok-empty';
          }
        }
        if (serverEmpty) {
          return 'ok-empty';
        }

        // One-time defaults for rooms that never got them (offline first open, or the old schema
        // rejected the seed ids). A room-wide flag prevents re-seeding after users delete them on purpose.
        const settingsRows = (st.data as Row[] | null) || [];
        const seedOps: PendingOp[] = [];
        if (!settingsRows.some((r) => r.key === 'seeded')) {
          if (server.fixedBills.length === 0) {
            server.fixedBills = SEED_FIXED_BILLS;
            seedOps.push(...SEED_FIXED_BILLS.map((x) => ({ id: opId(), kind: 'insert_ignore' as const, table: 'roommate_fixed_bills' as const, row: billRow(x) })));
          }
          if (server.chores.length === 0) {
            server.chores = createDefaultChores(activeMembersOf(server.members).map((x) => x.id));
            seedOps.push(...server.chores.map((x) => ({ id: opId(), kind: 'insert_ignore' as const, table: 'roommate_chores' as const, row: choreRow(x) })));
          }
          seedOps.push({ id: opId(), kind: 'insert_ignore', table: 'roommate_settings', row: { key: 'seeded', value: '1', updated_at: nowIso() } });
        }

        if (wasLocal && get().initialized && (get().members.length > 0 || get().expenses.length > 0)) {
          pushNotice({ tone: 'info', message: 'Đã kết nối dữ liệu chung của phòng. Ứng dụng đang hiển thị dữ liệu trên Cloud.' });
        }

        const roomSetting = (st.data as Row[] | null)?.find((r) => r.key === 'room_name');
        set({
          ...server,
          roomName: roomSetting ? String(roomSetting.value) || DEFAULT_ROOM_NAME : get().roomName,
          syncStatus: get().failedOps.length > 0 ? 'error' : 'idle',
          lastSyncedAt: nowIso(),
          lastSyncError: get().failedOps.length > 0 ? get().lastSyncError : null,
        });
        persistAll();
        if (seedOps.length) enqueue(...seedOps);
        if (get().initialized) get().runRolloverCheck();
        return 'ok-data';
      } catch {
        set({ syncStatus: 'offline' });
        return 'offline';
      }
    },

    flushPendingOps: async () => {
      if (flushing || !supabase || get().syncMode !== 'cloud') return;
      flushing = true;
      try {
        while (get().pendingOps.length > 0) {
          const op = get().pendingOps[0];
          set({ syncStatus: 'saving' });
          const { result, error } = await executeOp(op);
          if (result === 'network') {
            set({ syncStatus: 'offline' });
            break;
          }
          const rest = get().pendingOps.filter((p) => p.id !== op.id);
          writeLS(LS.pending, rest);
          if (result === 'failed') {
            const failed = [...get().failedOps, op];
            writeLS(LS.failed, failed);
            const missing = isMissingSchemaError(error);
            set({
              pendingOps: rest,
              failedOps: failed,
              lastSyncError: error ? describeError(error) : 'Không lưu được thay đổi',
              cloudSetupMissing: missing || get().cloudSetupMissing,
            });
            pushNotice({ tone: 'error', message: 'Một thay đổi chưa lưu được lên Cloud. Xem mục “Đồng bộ & dữ liệu” để thử lại.' });
          } else {
            set({ pendingOps: rest });
          }
        }
        if (get().pendingOps.length === 0) {
          set({
            syncStatus: get().failedOps.length > 0 ? 'error' : 'idle',
            lastSyncedAt: get().failedOps.length > 0 ? get().lastSyncedAt : nowIso(),
          });
        }
      } finally {
        flushing = false;
      }
    },

    retryFailedOps: async () => {
      const failed = get().failedOps;
      writeLS(LS.failed, []);
      // Failed ops are older than anything still pending: keep the original order.
      const pending = [...failed, ...get().pendingOps];
      writeLS(LS.pending, pending);
      set({ failedOps: [], pendingOps: pending, lastSyncError: null, syncMode: supabase ? 'cloud' : 'local', cloudSetupMissing: false });
      await get().flushPendingOps();
      await get().refreshFromCloud();
    },

    runRolloverCheck: () => {
      const { chores } = get();
      let changed = false;
      const next = chores.map((chore) => {
        const target = getPeriodKey(chore.frequency);
        if (chore.current_period_key !== target) {
          changed = true;
          return applyRollover(chore, target);
        }
        return chore;
      });
      if (changed) {
        set({ chores: next });
        persistAll();
      }
    },

    startLiveSync: () => {
      if (typeof window === 'undefined') return () => undefined;

      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          get().runRolloverCheck();
          void get().refreshFromCloud();
        }
      };
      const onOnline = () => {
        if (get().syncMode === 'cloud' || supabase) {
          set({ syncMode: supabase && !get().cloudSetupMissing ? 'cloud' : get().syncMode });
          void get().flushPendingOps().then(() => get().refreshFromCloud());
        }
      };
      const onOffline = () => set({ syncStatus: 'offline' });

      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);

      // Period changes while the app stays open (midnight, Monday, 1st of month).
      const rolloverTimer = window.setInterval(() => get().runRolloverCheck(), 60_000);
      // Fallback polling in case Realtime is disabled for the project.
      const pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void get().refreshFromCloud();
      }, 45_000);

      if (supabase && !channel) {
        channel = supabase.channel(`roommate-hub-${generateRoommateUUID().slice(0, 8)}`);
        const tables: TableName[] = [
          'roommate_members',
          'roommate_chores',
          'roommate_expenses',
          'roommate_fixed_bills',
          'roommate_shopping_items',
          'roommate_settings',
        ];
        for (const table of tables) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => scheduleRefresh());
        }
        channel.subscribe();
      }

      return () => {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.clearInterval(rolloverTimer);
        window.clearInterval(pollTimer);
        if (channel && supabase) {
          void supabase.removeChannel(channel);
          channel = null;
        }
      };
    },

    // ========================================================================
    // UI
    // ========================================================================

    toggleTheme: () => {
      const theme = get().theme === 'dark' ? 'light' : 'dark';
      writeLS(LS.theme, theme);
      set({ theme });
    },

    notify: (n) => pushNotice(n),

    dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),

    // ========================================================================
    // ROOM & MEMBERS
    // ========================================================================

    setRoomName: (name) => {
      const trimmed = name.trim() || DEFAULT_ROOM_NAME;
      set({ roomName: trimmed });
      writeLS(LS.room, trimmed);
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_settings', row: { key: 'room_name', value: trimmed, updated_at: nowIso() } });
    },

    enterWithMemberName: (name, avatar = '🧑‍💻', color = '#E88D72') => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!cleanName) return null;
      const { members } = get();
      const existing = members.find((m) => m.name.trim().toLowerCase() === cleanName.toLowerCase());

      if (existing) {
        if (existing.archived) {
          get().restoreRoommateMember(existing.id);
        }
        get().setActiveMemberId(existing.id);
        return { ...existing, archived: false };
      }

      const member = get().addRoommateMember(cleanName, avatar, color);
      if (member) get().setActiveMemberId(member.id);
      return member;
    },

    setActiveMemberId: (id) => {
      writeLS(LS.active, id);
      set({ activeMemberId: id });
    },

    updateMemberProfile: (id, updates) => {
      const nextMembers = get().members.map((m) => (m.id === id ? { ...m, ...updates } : m));
      set({ members: nextMembers });
      persistAll();
      const updated = nextMembers.find((m) => m.id === id);
      if (updated) enqueue({ id: opId(), kind: 'upsert', table: 'roommate_members', row: memberRow(updated) });
    },

    addRoommateMember: (name, avatar, color) => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!cleanName) return null;
      const dup = get().members.find((m) => m.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (dup) {
        if (dup.archived) get().restoreRoommateMember(dup.id);
        return dup;
      }

      const member: RoommateMember = {
        id: generateRoommateUUID(),
        name: cleanName,
        avatar,
        color,
        bank_bin: '',
        bank_short_name: '',
        bank_account_no: '',
        bank_account_name: '',
        archived: false,
        created_at: nowIso(),
      };

      // Join every chore rotation; give unassigned chores an owner.
      const nextChores = get().chores.map((chore) => {
        const order = chore.member_order.includes(member.id) ? chore.member_order : [...chore.member_order, member.id];
        const activeIds = activeMembersOf([...get().members, member]).map((m) => m.id);
        const assigneeValid = !!chore.current_assignee_id && activeIds.includes(chore.current_assignee_id);
        return { ...chore, member_order: order, current_assignee_id: assigneeValid ? chore.current_assignee_id : member.id };
      });

      set({ members: [...get().members, member], chores: nextChores });
      persistAll();
      enqueue(
        { id: opId(), kind: 'upsert', table: 'roommate_members', row: memberRow(member) },
        { id: opId(), kind: 'join_rotation', memberId: member.id }
      );
      return member;
    },

    archiveRoommateMember: (id) => {
      const { members, chores } = get();
      if (activeMembersOf(members).length <= 1) return;
      const nextMembers = members.map((m) => (m.id === id ? { ...m, archived: true } : m));

      // Hand over chores currently assigned to the leaving member.
      const nextChores = chores.map((chore) => {
        const order = chore.member_order.filter((mId) => mId !== id);
        if (chore.current_assignee_id !== id && order.length === chore.member_order.length) return chore;
        let assignee = chore.current_assignee_id;
        if (assignee === id) {
          const oldOrder = effectiveRotationOrder(chore, members);
          const idx = oldOrder.indexOf(id);
          const candidates = [...oldOrder.slice(idx + 1), ...oldOrder.slice(0, idx)].filter((x) => x !== id);
          assignee = candidates[0] ?? activeMembersOf(nextMembers)[0]?.id ?? null;
        }
        return { ...chore, member_order: order, current_assignee_id: assignee };
      });

      const nextActive = get().activeMemberId === id ? null : get().activeMemberId;
      if (nextActive === null) {
        try {
          window.localStorage.removeItem(LS.active);
        } catch {
          /* ignore */
        }
      }
      set({ members: nextMembers, chores: nextChores, activeMemberId: nextActive });
      persistAll();
      const archived = nextMembers.find((m) => m.id === id);
      enqueue(
        ...(archived ? [{ id: opId(), kind: 'upsert' as const, table: 'roommate_members' as const, row: memberRow(archived) }] : []),
        { id: opId(), kind: 'leave_rotation', memberId: id }
      );
    },

    restoreRoommateMember: (id) => {
      const nextMembers = get().members.map((m) => (m.id === id ? { ...m, archived: false } : m));
      const nextChores = get().chores.map((c) =>
        c.member_order.includes(id) ? c : { ...c, member_order: [...c.member_order, id] }
      );
      set({ members: nextMembers, chores: nextChores });
      persistAll();
      const restored = nextMembers.find((m) => m.id === id);
      enqueue(
        ...(restored ? [{ id: opId(), kind: 'upsert' as const, table: 'roommate_members' as const, row: memberRow(restored) }] : []),
        { id: opId(), kind: 'join_rotation', memberId: id }
      );
    },

    // ========================================================================
    // CHORES
    // ========================================================================

    setSubtaskCompleted: (choreId, subtaskId, completed) => {
      const actor = actorId();
      const at = nowIso();
      const chore = get().chores.find((c) => c.id === choreId);
      if (!chore) return;
      const nextChores = get().chores.map((c) =>
        c.id !== choreId
          ? c
          : {
              ...c,
              checklist: c.checklist.map((item) =>
                item.id !== subtaskId
                  ? item
                  : {
                      ...item,
                      completed,
                      completed_by_member_id: completed ? actor : null,
                      completed_at: completed ? at : null,
                    }
              ),
            }
      );
      set({ chores: nextChores });
      persistAll();
      enqueue({
        id: opId(),
        kind: 'set_subtask',
        choreId,
        subtaskId,
        completed,
        actorId: actor,
        at,
        rolloverSeq: chore.rollover_seq || 0,
      });
    },

    closeChorePeriod: (choreId) => {
      const chore = get().chores.find((c) => c.id === choreId);
      if (!chore) return;
      const rolled = applyRollover(chore, getPeriodKey(chore.frequency));
      set({ chores: get().chores.map((c) => (c.id === choreId ? rolled : c)) });
      persistAll();
    },

    addChoreTask: (data) => {
      const active = activeMembersOf(get().members).map((m) => m.id);
      const order = data.member_order.length > 0 ? data.member_order : active;
      const chore: ChoreTask = {
        ...data,
        id: generateRoommateUUID(),
        member_order: order,
        current_assignee_id: data.current_assignee_id || order[0] || null,
        current_period_key: getPeriodKey(data.frequency),
        rollover_seq: 0,
        last_rollover_note: data.last_rollover_note || 'Đầu việc mới — tự tích đủ các mục để đợt sau chuyển lượt.',
        last_rollover_status: 'normal',
        created_at: nowIso(),
      };
      set({ chores: [...get().chores, chore] });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_chores', row: choreRow(chore) });
    },

    updateChoreTask: (id, updates, baseSeq) => {
      const prev = get().chores.find((c) => c.id === id);
      if (!prev) return false;
      if (baseSeq !== undefined && (prev.rollover_seq || 0) !== baseSeq) {
        pushNotice({
          tone: 'warning',
          message: `“${prev.title}” vừa chuyển sang đợt mới trong lúc bạn đang sửa. Hãy mở lại để sửa trên dữ liệu mới nhất.`,
        });
        return false;
      }
      const freqChanged = !!updates.frequency && updates.frequency !== prev.frequency;

      // Checklist: keep titles/order from the form, but take tick state from the *latest* data.
      let checklist = prev.checklist;
      if (updates.checklist) {
        checklist = updates.checklist.map((item) => {
          const live = prev.checklist.find((x) => x.id === item.id);
          return live && !freqChanged
            ? { ...item, completed: live.completed, completed_by_member_id: live.completed_by_member_id, completed_at: live.completed_at }
            : { ...item, completed: false, completed_by_member_id: null, completed_at: null };
        });
      }

      const next: ChoreTask = {
        ...prev,
        ...updates,
        checklist,
        // Switching frequency starts a fresh cycle now (new period key + seq) instead of an instant rollover.
        current_period_key: freqChanged ? getPeriodKey(updates.frequency as ChoreFrequency) : prev.current_period_key,
        rollover_seq: freqChanged ? (prev.rollover_seq || 0) + 1 : prev.rollover_seq || 0,
        last_rollover_note: freqChanged ? 'Đã đổi chu kỳ — bắt đầu đợt mới.' : prev.last_rollover_note,
        last_rollover_status: freqChanged ? 'normal' : prev.last_rollover_status,
      };
      set({ chores: get().chores.map((c) => (c.id === id ? next : c)) });
      persistAll();

      const patch: Row = { updated_at: nowIso() };
      for (const key of ['title', 'icon', 'color', 'frequency', 'time_hint'] as const) {
        if (updates[key] !== undefined && updates[key] !== prev[key]) patch[key] = next[key];
      }
      if (updates.checklist) patch.checklist = next.checklist;
      if (updates.member_order && JSON.stringify(updates.member_order) !== JSON.stringify(prev.member_order)) {
        patch.member_order = next.member_order;
      }
      if (updates.current_assignee_id !== undefined && updates.current_assignee_id !== prev.current_assignee_id) {
        patch.current_assignee_id = next.current_assignee_id;
      }
      if (freqChanged) {
        patch.current_period_key = next.current_period_key;
        patch.rollover_seq = next.rollover_seq;
        patch.last_rollover_note = next.last_rollover_note;
        patch.last_rollover_status = next.last_rollover_status;
      }
      enqueue({
        id: opId(),
        kind: 'update',
        table: 'roommate_chores',
        rowId: id,
        patch,
        expectSeq: prev.rollover_seq || 0,
        label: next.title,
      });
      return true;
    },

    deleteChoreTask: (id) => {
      const target = get().chores.find((c) => c.id === id) || null;
      set({ chores: get().chores.filter((c) => c.id !== id) });
      persistAll();
      enqueue({ id: opId(), kind: 'delete', table: 'roommate_chores', rowId: id });
      return target;
    },

    restoreChoreTask: (chore) => {
      set({ chores: [...get().chores.filter((c) => c.id !== chore.id), chore] });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_chores', row: choreRow(chore) });
    },

    // ========================================================================
    // EXPENSES
    // ========================================================================

    saveExpenseRecord: (data) => {
      const existing = data.id ? get().expenses.find((e) => e.id === data.id) : undefined;
      const record: ExpenseRecord = {
        ...existing,
        ...data,
        id: data.id || generateRoommateUUID(),
        amount: Math.round(Number(data.amount) || 0),
        created_by: existing?.created_by ?? actorId(),
        created_at: existing?.created_at || nowIso(),
        updated_at: nowIso(),
      };
      const others = get().expenses.filter((e) => e.id !== record.id);
      const next = [record, ...others].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || '')
      );
      set({ expenses: next });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_expenses', row: expenseRow(record) });
      return record;
    },

    deleteExpenseRecord: (id) => {
      const target = get().expenses.find((e) => e.id === id) || null;
      set({ expenses: get().expenses.filter((e) => e.id !== id) });
      persistAll();
      enqueue({ id: opId(), kind: 'delete', table: 'roommate_expenses', rowId: id });
      return target;
    },

    restoreExpenseRecord: (expense) => {
      get().saveExpenseRecord(expense);
    },

    settleDebtBetweenMembers: (fromMemberId, toMemberId, amount) => {
      const { members } = get();
      const from = members.find((m) => m.id === fromMemberId);
      const to = members.find((m) => m.id === toMemberId);
      get().saveExpenseRecord({
        title: `${from?.name || 'Thành viên'} trả ${to?.name || 'thành viên'}`,
        amount: Math.round(amount),
        date: getTodayDateString(),
        paid_by_member_id: fromMemberId,
        split_member_ids: [toMemberId],
        category: 'settlement',
        note: 'Thanh toán công nợ',
      });
    },

    // ========================================================================
    // FIXED BILLS
    // ========================================================================

    addFixedBillConfig: (config) => {
      const bill: FixedBillConfig = { ...config, id: generateRoommateUUID(), created_at: nowIso() };
      set({ fixedBills: [...get().fixedBills, bill] });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_fixed_bills', row: billRow(bill) });
    },

    updateFixedBillConfig: (id, updates) => {
      const next = get().fixedBills.map((b) => (b.id === id ? { ...b, ...updates } : b));
      set({ fixedBills: next });
      persistAll();
      const updated = next.find((b) => b.id === id);
      if (updated) enqueue({ id: opId(), kind: 'upsert', table: 'roommate_fixed_bills', row: billRow(updated) });
    },

    deleteFixedBillConfig: (id) => {
      // Expenses created from this bill are kept: they are part of the room's debt history.
      const target = get().fixedBills.find((b) => b.id === id) || null;
      set({ fixedBills: get().fixedBills.filter((b) => b.id !== id) });
      persistAll();
      enqueue({ id: opId(), kind: 'delete', table: 'roommate_fixed_bills', rowId: id });
      return target;
    },

    restoreFixedBillConfig: (bill) => {
      set({ fixedBills: [...get().fixedBills.filter((b) => b.id !== bill.id), bill] });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_fixed_bills', row: billRow(bill) });
    },

    recordMonthlyFixedBill: ({ fixedBillId, monthKey, amount, paidByMemberId, splitMemberIds, usageValue, note }) => {
      const bill = get().fixedBills.find((b) => b.id === fixedBillId);
      if (!bill) return;
      const existing = get().expenses.find(
        (e) => e.category === 'fixed_bill' && e.fixed_bill_id === fixedBillId && e.month_key === monthKey
      );
      const usage = usageValue === undefined || usageValue === null || Number.isNaN(usageValue) ? null : usageValue;
      get().saveExpenseRecord({
        id: existing?.id || fixedBillExpenseId(fixedBillId, monthKey),
        title: `${bill.icon} ${bill.name} (${formatMonthKey(monthKey)})`,
        amount,
        date: existing?.date || (monthKey === getTodayDateString().slice(0, 7) ? getTodayDateString() : `${monthKey}-01`),
        paid_by_member_id: paidByMemberId,
        split_member_ids: splitMemberIds,
        category: 'fixed_bill',
        fixed_bill_id: fixedBillId,
        month_key: monthKey,
        usage_value: usage,
        note: note?.trim() || (usage !== null ? `Chỉ số: ${usage} ${bill.unit_note}` : ''),
      });
    },

    // ========================================================================
    // SHOPPING
    // ========================================================================

    addShoppingItem: (title, note = '', urgency = 'normal') => {
      const clean = title.trim();
      if (!clean) return;
      const item: ShoppingItem = {
        id: generateRoommateUUID(),
        title: clean,
        added_by_member_id: actorId(),
        note: note.trim(),
        urgency,
        is_bought: false,
        created_at: nowIso(),
      };
      set({ shoppingItems: [item, ...get().shoppingItems] });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_shopping_items', row: shoppingRow(item) });
    },

    deleteShoppingItem: (id) => {
      const target = get().shoppingItems.find((i) => i.id === id) || null;
      set({ shoppingItems: get().shoppingItems.filter((i) => i.id !== id) });
      persistAll();
      enqueue({ id: opId(), kind: 'delete', table: 'roommate_shopping_items', rowId: id });
      return target;
    },

    restoreShoppingItem: (item) => {
      set({ shoppingItems: [item, ...get().shoppingItems.filter((i) => i.id !== item.id)] });
      persistAll();
      enqueue({ id: opId(), kind: 'upsert', table: 'roommate_shopping_items', row: shoppingRow(item) });
    },

    convertShoppingItemToExpense: ({ itemId, amount, paidByMemberId, splitMemberIds }) => {
      const item = get().shoppingItems.find((i) => i.id === itemId);
      if (!item) return;
      const expense: ExpenseRecord = {
        id: generateRoommateUUID(),
        title: `🛒 ${item.title}`,
        amount: Math.round(amount),
        date: getTodayDateString(),
        paid_by_member_id: paidByMemberId,
        split_member_ids: splitMemberIds,
        category: 'shopping',
        note: item.note || 'Từ danh sách cần mua',
        created_by: actorId(),
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      set({
        shoppingItems: get().shoppingItems.filter((i) => i.id !== itemId),
        expenses: [expense, ...get().expenses],
      });
      persistAll();
      enqueue({ id: opId(), kind: 'buy_shopping', itemId, itemTitle: item.title, expenseRow: expenseRow(expense) });
    },
  };
});

/** Bank memo helper exposed for the QR modal. */
export function buildTransferMemo(fromName: string): string {
  return `${removeDiacritics(fromName)} tra tien phong`;
}
