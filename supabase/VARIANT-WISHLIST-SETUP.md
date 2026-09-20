# Variant wishlist upgrade

Run migrations/202609200002_variant_wishlists.sql once in Supabase SQL Editor after reviewing it. Migration 001 must already be installed. Do not re-run 001 or drop the table. This new migration is transactional and deliberately fails if its expected original constraint/schema is missing; review any error instead of deleting existing data.

## Existing data

Existing product-level rows have no historical variant identity. They keep their ID, owner, product metadata, timestamp and image, with variant_id `legacy-product` and the label `Original product save (no variant selected)`. They remain in the account list and can be removed, but are excluded from variant counts. They do not mark A/B/C/D as saved. Users can explicitly save desired variants then remove the old product save. No old save is guessed to be Variant A or expanded into four saves.

## Security and counts

The original SELECT/INSERT/DELETE ownership policies remain unchanged. UPDATE remains unavailable and anonymous users cannot read the table. Uniqueness is now (user_id, product_id, variant_id). The additional product/variant index supports aggregation.

`wishlist_variant_counts(p_product_id text)` is a stable SQL SECURITY DEFINER function with an empty search_path, fully qualified table, no dynamic SQL, and only product_id, variant_id and count(*) as outputs. Execute migration as the trusted database owner via SQL Editor. PUBLIC execute is revoked; anon and authenticated may execute the RPC. It exposes no user identifiers or other row data. It accepts no owner filter. Unique rows mean counts represent unique user saves. Missing groups render as zero only after a successful RPC; failed requests render --. Counts refresh once per product on load, after mutations and window focus; this is not a real-time subscription.

## Frontend

Existing variant IDs in hidden-product.js remain stable (variant-a through variant-d). Viewer buttons expose their existing names and render image paths; wishlist.js combines those with the HTML product metadata into product_id, variant_id, variant_name, product_name, product_url and product_image. The viewer emits only a variant selection event, with no database or wishlist logic added to Three.js code.

Each saved URL includes ?variant=variant-c (or the relevant stable ID); the viewer selects that ID on startup and falls back to A for unknown IDs. Account items show both product and variant name plus the correct render thumbnail. Legacy items retain their original product link.

Pending login intent stores only product ID, variant ID and timestamp in sessionStorage for up to 30 minutes. After email login or same-tab/same-origin Google return, that exact variant is saved, even if the page currently displays a different/default variant. Old product-only intents are discarded rather than guessed. Mutations capture the target variant before awaiting; switching variants mid-request cannot save/delete the new selection by accident. Auth generation checks prevent late results from an old account updating the current UI.

## Manual tests after SQL

1. Confirm original rows appear as original product saves, and do not contribute to A/B/C/D counts.
2. Logged out, load /store/diabolo.html. All four public counts should display without exposing private rows.
3. Select C, click Add Variant C to Wishlist and sign in with email. C alone is saved; A and B remain unsaved. C count increases once.
4. Save A and D too. Account should display three separate rows with corresponding thumbnails. D is still Coming Soon and can be saved.
5. Remove C from Account. A and D remain saved, only C count decreases. Refresh and log out/in; states restore per user.
6. Test rapid clicks and saving the same variant in two tabs. There must be only one (user, product, variant) row. Counts never become negative.
7. Log out, select B, click Add, then Google login. On returning to default A, B must be saved, not A. Select B to confirm.
8. Use View Product for C (save it first). ?variant=variant-c must load C. An unknown variant parameter must safely default to A.
9. Throttle network, save C, immediately select A. C is saved and A button must still show its own state. Repeat removal while switching.
10. Switch to another user while a wishlist request is pending. No old-user items may appear for the new account.
11. Verify with two real user tokens: SELECT/DELETE cannot read/affect another owner's rows; INSERT with the other owner's ID fails; UPDATE is denied. Anonymous direct table SELECT fails, while RPC returns only the three aggregate columns. Supabase Table Editor is privileged and cannot prove RLS isolation.
12. Check 320/390/820/1440px layouts, counts and active indicator; count clicks may select a variant but must never add/remove a save. Check A-C model viewing, D Coming Soon and 2D/3D switching.
13. Disconnect network: errors must not show false success or guessed zero counts. Restore connection and Retry/focus the window.

No SQL is executed, and no site is deployed by the implementation. Browser mocks can test frontend behavior but cannot validate the real database RLS or Google provider.
