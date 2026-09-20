# Wishlist setup

Run migrations/202609200001_wishlists.sql once in the existing Supabase project's SQL Editor. This transaction creates a new table and policies; it deletes no existing data. If wishlists already exists, it deliberately fails rather than silently trusting an unknown schema. Do not drop an existing table to retry. No Auth settings or keys need changing.

The unique (user_id, product_id) index prevents duplicate saves and supports per-user queries. RLS allows authenticated users to select, insert and delete only their own rows. Anonymous users have no access. UPDATE is not granted and has no policy. The browser uses the existing public configuration and Auth session; no service key is needed.

Product metadata is supplied through data-product-id, data-product-name, data-product-url and data-product-image on [data-wishlist-product] in store/diabolo.html. Diabolo uses /assets/images/products/variant-a-render.webp. Variants share the product ID diabolo. Future pages can use the same module and account markup with their own metadata and root-relative image/page URLs. wishlist.js imports auth.js, so do not also load a differently versioned auth.js module on those pages.

Only a pending product ID and timestamp are temporarily stored in sessionStorage for login continuation (30 minutes, same tab and origin). The actual wishlist exists solely in Supabase. No password or custom session is stored by the wishlist module. Email login and Google returns both resume the intent. Failed database writes show an error and can be retried; they are never displayed as successfully saved.

## Manual verification

1. Open http://127.0.0.1:8081/store/diabolo.html after running the SQL.
2. Log out; click Add to Wishlist. Confirm the existing sign-in dialog and explanatory message appear.
3. Sign in with email. Diabolo should automatically become In Wishlist. Open Account and see its thumbnail, View Product and Remove.
4. Refresh and reopen the page. Confirm it remains saved. Log out and verify saved state and account list disappear; log in again and confirm restoration.
5. Remove using the account list. Confirm the product button changes too. Add with the product button, then click In Wishlist to remove.
6. Rapidly double-click Add. While pending it must be disabled. Use two tabs to save the same product; check Table Editor for only one row for that user and product.
7. Remove Diabolo, log out, click Add, and choose Google. After authorization returns to the same origin, the item should be automatically saved.
8. Log in as a different user. Their list should be empty unless that account independently saved the product. Saving/removing for this user must not affect the first.
9. With two real test-user sessions, attempt SELECT/INSERT/DELETE targeting the other user's ID through the public client. SELECT/DELETE must expose/affect no rows; INSERT must fail RLS. UPDATE must be denied. Table Editor runs with administrative privileges, so it cannot prove RLS isolation.
10. Test with network offline: no false success, a readable error, and retry after restoring the connection.
11. Check 320px, 390px, tablet and desktop: modal scrolls, no horizontal overflow, and product variants and 2D/3D switching still work.

Automated browser checks use a mocked Supabase client and do not validate the deployed database policies or real Google authorization. Complete the real-account checks above after applying SQL. Nothing is deployed automatically.
