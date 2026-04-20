-- ============================================================
-- 歩数バトル Supabase スキーマ
-- Supabase SQL Editor で実行してください
-- ============================================================

-- profiles: ユーザープロフィール（ユーザーネームのみ）
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- google_fit_tokens: Google Fit OAuth トークン
create table public.google_fit_tokens (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

-- api_tokens: iOS ショートカット用 APIトークン
create table public.api_tokens (
  user_id uuid references auth.users(id) on delete cascade primary key,
  token text unique not null,
  created_at timestamptz default now()
);

-- daily_steps: 日別歩数データ
create table public.daily_steps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  steps integer not null check (steps >= 0),
  source text not null check (source in ('ios', 'google_fit')),
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.google_fit_tokens enable row level security;
alter table public.api_tokens enable row level security;
alter table public.daily_steps enable row level security;

-- profiles: 全認証ユーザーが読める、自分のものだけ書ける
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- google_fit_tokens: 自分のものだけ操作可能
create policy "fit_tokens_select" on public.google_fit_tokens
  for select to authenticated using (user_id = auth.uid());

create policy "fit_tokens_all" on public.google_fit_tokens
  for all to authenticated using (user_id = auth.uid());

-- api_tokens: 自分のものだけ操作可能
create policy "api_tokens_select" on public.api_tokens
  for select to authenticated using (user_id = auth.uid());

create policy "api_tokens_insert" on public.api_tokens
  for insert to authenticated with check (user_id = auth.uid());

-- daily_steps: 全認証ユーザーが読める（ランキング表示のため）
create policy "steps_select" on public.daily_steps
  for select to authenticated using (true);

create policy "steps_self_write" on public.daily_steps
  for all to authenticated using (user_id = auth.uid());
