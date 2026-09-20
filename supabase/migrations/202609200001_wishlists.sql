begin;
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (length(product_id) between 1 and 160),
  product_name text not null check (length(product_name) between 1 and 240),
  product_url text not null check (length(product_url) between 1 and 2048),
  product_image text check (length(product_image) <= 2048),
  created_at timestamptz not null default now(),
  constraint wishlists_user_product_unique unique (user_id, product_id)
);
alter table public.wishlists enable row level security;
revoke all on public.wishlists from anon, authenticated;
grant select, insert, delete on public.wishlists to authenticated;
create policy wishlists_select_own on public.wishlists
  for select to authenticated using ((select auth.uid()) = user_id);
create policy wishlists_insert_own on public.wishlists
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy wishlists_delete_own on public.wishlists
  for delete to authenticated using ((select auth.uid()) = user_id);
commit;
