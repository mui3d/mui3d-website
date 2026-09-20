begin;

alter table public.wishlists add column variant_id text;
alter table public.wishlists add column variant_name text;

-- Old product-level saves contain no evidence of which variant was intended.
-- Preserve them as explicitly labelled legacy saves, outside variant counts.
update public.wishlists
set variant_id = 'legacy-product', variant_name = 'Original product save (no variant selected)';

alter table public.wishlists alter column variant_id set not null;
alter table public.wishlists alter column variant_name set not null;
alter table public.wishlists add constraint wishlists_variant_id_length check (length(variant_id) between 1 and 160);
alter table public.wishlists add constraint wishlists_variant_name_length check (length(variant_name) between 1 and 240);
alter table public.wishlists drop constraint wishlists_user_product_unique;
alter table public.wishlists add constraint wishlists_user_product_variant_unique unique (user_id, product_id, variant_id);
create index wishlists_product_variant_idx on public.wishlists (product_id, variant_id);

-- Keep all existing owner-only RLS policies. No public table access is added.
alter table public.wishlists enable row level security;
revoke all on public.wishlists from public, anon;
revoke update on public.wishlists from authenticated;

create function public.wishlist_variant_counts(p_product_id text)
returns table (product_id text, variant_id text, wishlist_count bigint)
language sql stable security definer
set search_path = ''
as $$
  select w.product_id, w.variant_id, count(*)
  from public.wishlists as w
  where w.product_id = p_product_id
    and w.variant_id <> 'legacy-product'
  group by w.product_id, w.variant_id;
$$;

revoke all on function public.wishlist_variant_counts(text) from public;
grant execute on function public.wishlist_variant_counts(text) to anon, authenticated;

commit;
