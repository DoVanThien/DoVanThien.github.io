-- ============================================================================
-- ROOMMATE HUB — SUPABASE SCHEMA
-- Chạy toàn bộ file này 1 lần trong Supabase Dashboard → SQL Editor → Run.
-- File an toàn khi chạy lại nhiều lần (idempotent).
--
-- Thiết kế:
--   • Mỗi loại dữ liệu là 1 bảng riêng → 2 người thao tác cùng lúc không ghi đè nhau.
--   • Tích checklist dùng hàm RPC cập nhật đúng 1 mục trong JSONB (nguyên tử).
--   • Chuyển đợt việc nhà dùng cột rollover_seq để tránh 2 máy cùng xoay vòng.
--   • Lịch sử hóa đơn cố định nằm luôn trong bảng chi tiêu (1 nguồn dữ liệu duy nhất).
--   • Bật Realtime để các điện thoại trong phòng thấy thay đổi của nhau ngay lập tức.
--
-- Bảo mật: app không có đăng nhập (đúng thiết kế), nên RLS cho phép vai trò
-- anon đọc/ghi các bảng roommate_*. Ai có link app + anon key đều vào được phòng.
-- ============================================================================

-- 1. THÀNH VIÊN -----------------------------------------------------------------
create table if not exists public.roommate_members (
  id                text primary key,
  name              text not null,
  avatar            text not null default '🙂',
  color             text not null default '#E88D72',
  bank_bin          text default '',
  bank_short_name   text default '',
  bank_account_no   text default '',
  bank_account_name text default '',
  archived          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2. VIỆC NHÀ XOAY TUA ----------------------------------------------------------
create table if not exists public.roommate_chores (
  id                   text primary key,
  title                text not null,
  icon                 text not null default '🧹',
  color                text not null default '#E88D72',
  frequency            text not null check (frequency in ('daily', 'weekly', 'monthly')),
  time_hint            text default '',
  member_order         text[] not null default '{}',
  current_assignee_id  text,
  current_period_key   text not null,
  rollover_seq         integer not null default 0,
  checklist            jsonb not null default '[]'::jsonb,
  last_rollover_note   text default '',
  last_rollover_status text default 'normal',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 3. CHI TIÊU (gồm cả hóa đơn cố định, mua đồ, thanh toán nợ) ------------------
create table if not exists public.roommate_expenses (
  id                text primary key,
  title             text not null,
  amount            bigint not null check (amount > 0),
  date              text not null,               -- YYYY-MM-DD
  paid_by_member_id text not null,
  split_member_ids  text[] not null default '{}',
  category          text not null default 'daily'
                    check (category in ('daily', 'fixed_bill', 'shopping', 'settlement')),
  fixed_bill_id     text,
  month_key         text,                         -- YYYY-MM (hóa đơn cố định)
  usage_value       numeric,
  note              text default '',
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists roommate_expenses_date_idx on public.roommate_expenses (date desc);
create index if not exists roommate_expenses_bill_idx on public.roommate_expenses (fixed_bill_id, month_key);

-- 4. DANH MỤC HÓA ĐƠN CỐ ĐỊNH ---------------------------------------------------
create table if not exists public.roommate_fixed_bills (
  id         text primary key,
  name       text not null,
  icon       text not null default '⚡',
  color      text not null default '#E9B44C',
  unit_note  text not null default 'Tháng',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. ĐỒ CẦN MUA CHUNG -----------------------------------------------------------
create table if not exists public.roommate_shopping_items (
  id                 text primary key,
  title              text not null,
  note               text default '',
  urgency            text not null default 'normal' check (urgency in ('normal', 'urgent')),
  added_by_member_id text,
  is_bought          boolean not null default false,
  bought_by          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 6. CÀI ĐẶT PHÒNG (tên phòng...) -----------------------------------------------
create table if not exists public.roommate_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- NÂNG CẤP TỪ BẢN SCHEMA CŨ (id UUID, mảng JSONB, amount NUMERIC)
-- Chỉ chạy khi cột còn kiểu cũ; giữ nguyên toàn bộ dữ liệu đang có.
-- ============================================================================
create or replace function public.roommate_jsonb_to_text_array(v jsonb)
returns text[]
language sql
immutable
as $$
  select case
    when v is null then '{}'::text[]
    when jsonb_typeof(v) = 'array' then coalesce(array(select jsonb_array_elements_text(v)), '{}'::text[])
    else '{}'::text[]
  end;
$$;

do $$
declare
  t text;
begin
  -- id UUID → TEXT (để dùng được id dạng "fb-…", "fbx-…")
  foreach t in array array[
    'roommate_members', 'roommate_chores', 'roommate_expenses',
    'roommate_fixed_bills', 'roommate_shopping_items'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'id' and data_type = 'uuid'
    ) then
      execute format('alter table public.%I alter column id type text using id::text', t);
    end if;
  end loop;

  -- member_order JSONB → TEXT[]
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'roommate_chores' and column_name = 'member_order' and data_type = 'jsonb'
  ) then
    alter table public.roommate_chores alter column member_order drop default;
    alter table public.roommate_chores
      alter column member_order type text[] using public.roommate_jsonb_to_text_array(member_order);
    alter table public.roommate_chores alter column member_order set default '{}';
  end if;

  -- split_member_ids JSONB → TEXT[]
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'roommate_expenses' and column_name = 'split_member_ids' and data_type = 'jsonb'
  ) then
    alter table public.roommate_expenses alter column split_member_ids drop default;
    alter table public.roommate_expenses
      alter column split_member_ids type text[] using public.roommate_jsonb_to_text_array(split_member_ids);
    alter table public.roommate_expenses alter column split_member_ids set default '{}';
  end if;

  -- amount NUMERIC → BIGINT (làm tròn tới đồng)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'roommate_expenses' and column_name = 'amount' and data_type = 'numeric'
  ) then
    alter table public.roommate_expenses alter column amount drop default;
    alter table public.roommate_expenses alter column amount type bigint using round(amount)::bigint;
  end if;
end $$;

-- Bổ sung cột nếu bảng đã được tạo từ bản cũ -------------------------------------
alter table public.roommate_members  add column if not exists archived boolean not null default false;
alter table public.roommate_members  add column if not exists updated_at timestamptz not null default now();
alter table public.roommate_chores   add column if not exists rollover_seq integer not null default 0;
alter table public.roommate_chores   add column if not exists updated_at timestamptz not null default now();
alter table public.roommate_expenses add column if not exists usage_value numeric;
alter table public.roommate_expenses add column if not exists created_by text;
alter table public.roommate_expenses add column if not exists updated_at timestamptz not null default now();
alter table public.roommate_shopping_items add column if not exists bought_by text;
alter table public.roommate_shopping_items add column if not exists updated_at timestamptz not null default now();
alter table public.roommate_fixed_bills add column if not exists updated_at timestamptz not null default now();

-- ============================================================================
-- HÀM RPC: TÍCH / BỎ TÍCH 1 MỤC CHECKLIST (NGUYÊN TỬ)
-- Chỉ sửa đúng phần tử có id = p_subtask_id trong mảng JSONB, không đụng mục khác.
-- p_rollover_seq: chỉ áp dụng nếu việc vẫn ở đúng đợt mà người dùng đã nhìn thấy
-- (tránh tích của đợt cũ rơi vào đợt mới, kể cả khi "chốt đợt sớm").
-- Trả về dòng sau khi cập nhật (0 dòng nếu đợt đã đổi).
-- ============================================================================
drop function if exists public.roommate_set_subtask(text, text, boolean, text, timestamptz, text);

create or replace function public.roommate_set_subtask(
  p_chore_id     text,
  p_subtask_id   text,
  p_completed    boolean,
  p_actor        text,
  p_at           timestamptz,
  p_rollover_seq integer
)
returns setof public.roommate_chores
language sql
security invoker
set search_path = public
as $$
  update public.roommate_chores c
  set checklist = (
        select coalesce(
          jsonb_agg(
            case
              when t.elem ->> 'id' = p_subtask_id then
                t.elem || jsonb_build_object(
                  'completed', p_completed,
                  'completed_by_member_id', case when p_completed then to_jsonb(p_actor) else 'null'::jsonb end,
                  'completed_at',           case when p_completed then to_jsonb(p_at)    else 'null'::jsonb end
                )
              else t.elem
            end
            order by t.ord
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(c.checklist) with ordinality as t(elem, ord)
      ),
      updated_at = now()
  where c.id = p_chore_id
    and c.rollover_seq = p_rollover_seq
  returning c.*;
$$;

grant execute on function public.roommate_set_subtask(text, text, boolean, text, timestamptz, integer) to anon, authenticated;

-- ============================================================================
-- HÀM RPC: THÀNH VIÊN VÀO / RỜI VÒNG XOAY (NGUYÊN TỬ, không ghi đè thứ tự của máy khác)
-- ============================================================================
create or replace function public.roommate_join_rotation(p_member_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.roommate_chores c
  set member_order = case when p_member_id = any(c.member_order) then c.member_order
                          else array_append(c.member_order, p_member_id) end,
      current_assignee_id = coalesce(c.current_assignee_id, p_member_id),
      updated_at = now()
  where not (p_member_id = any(c.member_order)) or c.current_assignee_id is null;
$$;

create or replace function public.roommate_leave_rotation(p_member_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.roommate_chores c
  set current_assignee_id = case
        when c.current_assignee_id = p_member_id then coalesce(
          (select u.x from unnest(c.member_order) with ordinality as u(x, i)
            where u.i > coalesce(array_position(c.member_order, p_member_id), 0) and u.x <> p_member_id
            order by u.i limit 1),
          (select u.x from unnest(c.member_order) with ordinality as u(x, i)
            where u.x <> p_member_id order by u.i limit 1)
        )
        else c.current_assignee_id end,
      member_order = array_remove(c.member_order, p_member_id),
      updated_at = now()
  where p_member_id = any(c.member_order) or c.current_assignee_id = p_member_id;
$$;

grant execute on function public.roommate_join_rotation(text) to anon, authenticated;
grant execute on function public.roommate_leave_rotation(text) to anon, authenticated;

-- ============================================================================
-- HÀM RPC: "ĐÃ MUA" ĐỒ CHUNG (1 GIAO DỊCH)
-- Xóa món khỏi danh sách và ghi khoản chi cùng lúc. Nếu người khác đã mua trước → false.
-- Gọi lại nhiều lần an toàn (nếu khoản chi đã có → true).
-- ============================================================================
create or replace function public.roommate_buy_item(p_item_id text, p_expense jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if exists (select 1 from public.roommate_expenses where id = p_expense ->> 'id') then
    delete from public.roommate_shopping_items where id = p_item_id;
    return true;
  end if;

  delete from public.roommate_shopping_items where id = p_item_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    return false;
  end if;

  insert into public.roommate_expenses (
    id, title, amount, date, paid_by_member_id, split_member_ids, category, note, created_by, created_at, updated_at
  ) values (
    p_expense ->> 'id',
    p_expense ->> 'title',
    (p_expense ->> 'amount')::bigint,
    p_expense ->> 'date',
    p_expense ->> 'paid_by_member_id',
    array(select jsonb_array_elements_text(p_expense -> 'split_member_ids')),
    'shopping',
    coalesce(p_expense ->> 'note', ''),
    p_expense ->> 'created_by',
    now(),
    now()
  );
  return true;
end;
$$;

grant execute on function public.roommate_buy_item(text, jsonb) to anon, authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY (không đăng nhập → cho phép anon)
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'roommate_members', 'roommate_chores', 'roommate_expenses',
    'roommate_fixed_bills', 'roommate_shopping_items', 'roommate_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "roommate public access" on public.%I', t);
    execute format(
      'create policy "roommate public access" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- ============================================================================
-- REALTIME: các máy trong phòng nhận thay đổi của nhau ngay lập tức
-- ============================================================================
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'roommate_members', 'roommate_chores', 'roommate_expenses',
      'roommate_fixed_bills', 'roommate_shopping_items', 'roommate_settings'
    ]
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- Làm mới cache schema của API để dùng được ngay
notify pgrst, 'reload schema';
