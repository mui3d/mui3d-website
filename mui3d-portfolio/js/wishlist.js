import { getSupabase, getAuthUser, requestSignIn, authReady } from './auth.js?v=wishlist-1';

const productElement = document.querySelector('[data-wishlist-product]');
const baseProduct = productElement ? {
  product_id: productElement.dataset.productId,
  product_name: productElement.dataset.productName,
  product_url: productElement.dataset.productUrl,
  product_image: productElement.dataset.productImage || null,
} : null;
let product = null;
const variants = new Map();
function readVariants() {
  if (!baseProduct) return;
  document.querySelectorAll('[data-variant-id]').forEach(button => {
    const url = new URL(baseProduct.product_url, location.origin);
    url.searchParams.set('variant', button.dataset.variantId);
    variants.set(button.dataset.variantId, {
      ...baseProduct,
      variant_id: button.dataset.variantId,
      variant_name: button.dataset.variantName,
      variant_status: button.dataset.variantStatus,
      product_image: button.dataset.variantImage,
      product_url: url.pathname + url.search,
    });
    if (!button.parentElement.classList.contains('variant-wishlist-row')) {
      const row = document.createElement('div');
      row.className = 'variant-wishlist-row';
      row.classList.toggle('is-selected', button.getAttribute('aria-pressed') === 'true');
      row.classList.toggle('is-coming-soon', button.dataset.variantStatus === 'coming-soon');
      button.before(row);
      row.append(button);
      const count = document.createElement('button');
      count.type = 'button';
      count.className = 'variant-wishlist-count';
      count.dataset.wishlistVariant = button.dataset.variantId;
      count.dataset.count = '--';
      if (button.dataset.variantStatus === 'coming-soon') {
        count.classList.add('variant-wishlist-count--future');
        count.innerHTML = '<span class="variant-wishlist-count__icon" aria-hidden="true">\u2728</span><span class="variant-wishlist-count__label">More Designs, Please!</span><span class="variant-wishlist-count__value">--</span>';
      } else {
        count.innerHTML = '<span class="variant-wishlist-count__icon" aria-hidden="true">\u2661</span><span class="variant-wishlist-count__value">--</span>';
      }
      count.addEventListener('click', event => {
        event.stopPropagation();
        toggleVariant(variants.get(button.dataset.variantId));
      });
      row.append(count);
    }
    button.parentElement.classList.toggle('is-selected', button.getAttribute('aria-pressed') === 'true');
    button.parentElement.classList.toggle('is-coming-soon', button.dataset.variantStatus === 'coming-soon');
    if (button.getAttribute('aria-pressed') === 'true') product = variants.get(button.dataset.variantId);
  });
}

function sameVariant(a, b) {
  return a?.product_id === b?.product_id && a?.variant_id === b?.variant_id;
}
const toggle = productElement?.querySelector('.wishlist-toggle');
const label = productElement?.querySelector('[data-wishlist-label]');
const interestIcon = productElement?.querySelector('[data-interest-icon]');
const interestCount = productElement?.querySelector('[data-interest-count]');
const status = productElement?.querySelector('[data-wishlist-status]');
const list = document.getElementById('wishlist-items');
const accountStatus = document.getElementById('wishlist-account-status');
const retry = document.getElementById('wishlist-retry');
const pendingKey = 'mui3d:wishlist-intent';
let user = null;
let rows = [];
let loading = true;
let busy = false;
let loaded = false;
let generation = 0;
let pendingMemory = null;
let countGeneration = 0;

function renderCountButtons() {
  document.querySelectorAll('.variant-wishlist-count').forEach(button => {
    const target = variants.get(button.dataset.wishlistVariant);
    const saved = Boolean(user && rows.some(row => sameVariant(row, target)));
    const isFutureInterest = target.variant_status === 'coming-soon';
    const action = isFutureInterest
      ? (saved ? 'Withdraw interest in future designs' : 'Show interest in more future designs')
      : (saved ? `Remove ${target.variant_name} from Wishlist` : `Add ${target.variant_name} to Wishlist`);
    button.disabled = loading || busy;
    button.setAttribute('aria-pressed', String(saved));
    button.querySelector('.variant-wishlist-count__icon').textContent = isFutureInterest
      ? (saved ? '\u2713' : '\u2728')
      : (saved ? '\u2665' : '\u2661');
    const buttonLabel = button.querySelector('.variant-wishlist-count__label');
    if (buttonLabel) buttonLabel.textContent = saved ? "I'm In" : 'More Designs, Please!';
    button.querySelector('.variant-wishlist-count__value').textContent = button.dataset.count;
    const countLabel = button.dataset.count === '--'
      ? 'Count unavailable'
      : (isFutureInterest ? `${button.dataset.count} people are interested` : `${button.dataset.count} users saved this variant`);
    button.setAttribute('aria-label', `${action}. ${countLabel}`);
    button.title = action;
  });
  if (interestCount && product?.variant_status === 'coming-soon') {
    interestCount.textContent = selectedCount();
    const saved = Boolean(user && rows.some(row => sameVariant(row, product)));
    toggle.setAttribute('aria-label', `${saved ? 'Withdraw interest in future designs' : 'Show interest in more future designs'}. ${selectedCount() === '--' ? 'Count unavailable' : selectedCount() + ' people are interested'}`);
  }
}

function selectedCount() {
  if (!product) return '--';
  return document.querySelector(`[data-wishlist-variant="${product.variant_id}"]`)?.dataset.count || '--';
}

async function refreshCounts() {
  const token = ++countGeneration;
  try {
    const client = await getSupabase();
    if (!client || !baseProduct) return;
    const { data, error } = await client.rpc('wishlist_variant_counts', { p_product_id: baseProduct.product_id });
    if (token !== countGeneration) return;
    if (error) throw error;
    const counts = new Map((data || []).map(row => [row.variant_id, String(row.wishlist_count)]));
    document.querySelectorAll('[data-variant-id]').forEach(button => {
      const count = button.parentElement.querySelector('.variant-wishlist-count');
      const value = counts.get(button.dataset.variantId) || '0';
      count.dataset.count = value;
    });
    renderCountButtons();
  } catch {
    if (token !== countGeneration) return;
    document.querySelectorAll('.variant-wishlist-count').forEach(count => {
      count.dataset.count = '--';
    });
    renderCountButtons();
  }
}

function pendingIntent(value) {
  if (arguments.length) {
    pendingMemory = value;
    try {
      if (value) sessionStorage.setItem(pendingKey, JSON.stringify(value));
      else sessionStorage.removeItem(pendingKey);
    } catch { /* Login still works when browser storage is restricted. */ }
    return value;
  }
  try { return JSON.parse(sessionStorage.getItem(pendingKey)) || pendingMemory; }
  catch { return pendingMemory; }
}

function localPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}

function message(text) {
  if (status) status.textContent = text;
  accountStatus.textContent = text;
}

function render() {
  renderCountButtons();
  const saved = Boolean(user && rows.some(row => sameVariant(row, product)));
  const isFutureInterest = product?.variant_status === 'coming-soon';
  if (toggle) {
    productElement.hidden = !isFutureInterest;
    toggle.disabled = loading || busy || !isFutureInterest;
    toggle.setAttribute('aria-pressed', String(saved));
    label.textContent = busy ? 'Updating...' : saved ? "I'm In" : 'Count Me In';
    interestIcon.textContent = saved ? '\u2713' : '\u2728';
    interestCount.textContent = selectedCount();
    toggle.setAttribute('aria-label', `${saved ? 'Withdraw interest in future designs' : 'Show interest in more future designs'}. ${selectedCount() === '--' ? 'Count unavailable' : selectedCount() + ' people are interested'}`);
  }
  list.replaceChildren();
  if (!user) { accountStatus.textContent = ''; return; }
  if (loading) { accountStatus.textContent = 'Loading wishlist...'; return; }
  if (loaded) accountStatus.textContent = rows.length ? '' : 'Your wishlist is empty.';
  for (const row of rows) {
    const isFutureInterest = variants.get(row.variant_id)?.variant_status === 'coming-soon';
    const item = document.createElement('li');
    item.className = 'wishlist-item';
    const imagePath = localPath(row.product_image);
    const imageSlot = document.createElement('div');
    if (imagePath) {
      const img = document.createElement('img');
      img.src = imagePath;
      img.alt = '';
      img.loading = 'lazy';
      imageSlot.append(img);
    }
    const copy = document.createElement('div');
    const name = document.createElement('h4');
    name.textContent = isFutureInterest ? 'More Designs, Please!' : row.product_name;
    const variantName = document.createElement('p');
    variantName.className = 'wishlist-item__variant';
    variantName.textContent = isFutureInterest ? 'Interest in future creative directions' : row.variant_name;
    const actions = document.createElement('div');
    actions.className = 'wishlist-item__actions';
    const path = localPath(row.product_url);
    if (path) {
      const link = document.createElement('a');
      link.href = path;
      link.textContent = 'View Product';
      actions.append(link);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'wishlist-remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', isFutureInterest ? 'Withdraw interest in future designs' : `Remove ${row.product_name} ${row.variant_name} from wishlist`);
    remove.disabled = busy;
    remove.addEventListener('click', () => mutate(row, false));
    actions.append(remove);
    copy.append(name, variantName, actions);
    item.append(imageSlot, copy);
    list.append(item);
  }
}

async function refresh() {
  const token = ++generation;
  const owner = user.id;
  loading = true;
  loaded = false;
  rows = [];
  retry.hidden = true;
  render();
  try {
    const client = await getSupabase();
    if (!client) throw new Error('Unavailable');
    const { data, error } = await client.from('wishlists')
      .select('product_id,variant_id,variant_name,product_name,product_url,product_image,created_at')
      .eq('user_id', owner).order('created_at', { ascending: false });
    if (token !== generation) return;
    if (error) throw error;
    rows = data || [];
    loaded = true;
    loading = false;
    render();
    const intent = pendingIntent();
    if (intent && intent.product === baseProduct?.product_id && variants.has(intent.variant) && Date.now() - intent.at < 30 * 60 * 1000) {
      pendingIntent(null);
      const target = variants.get(intent.variant);
      if (!rows.some(row => sameVariant(row, target))) await mutate(target, true);
    } else if (intent) pendingIntent(null);
  } catch {
    if (token !== generation) return;
    loading = false;
    render();
    message('Could not load your wishlist. Please retry.');
    retry.hidden = false;
  }
}

async function mutate(target, add) {
  if (!user || busy || loading) return;
  if (!loaded) { await refresh(); return; }
  const token = generation;
  const owner = user.id;
  const targetStatus = target.variant_status || variants.get(target.variant_id)?.variant_status;
  busy = true;
  render();
  try {
    const client = await getSupabase();
    if (token !== generation) return;
    const query = client.from('wishlists');
    const { variant_status: _variantStatus, ...databaseRecord } = target;
    const { error } = add
      ? await query.insert({ ...databaseRecord, user_id: owner })
      : await query.delete().eq('user_id', owner).eq('product_id', target.product_id).eq('variant_id', target.variant_id);
    if (token !== generation) return;
    if (error && !(add && error.code === '23505')) throw error;
    if (add && !rows.some(row => sameVariant(row, target))) rows.unshift({ ...target });
    if (!add) rows = rows.filter(row => !sameVariant(row, target));
    busy = false;
    render();
    if (status) {
      status.textContent = targetStatus === 'coming-soon'
        ? (add ? 'Thanks! Your interest in more future designs has been counted.' : 'Your future-design interest has been removed.')
        : (add ? `${target.variant_name} saved to your wishlist.` : `${target.variant_name} removed from your wishlist.`);
    }
    void refreshCounts();
  } catch {
    if (token !== generation) return;
    busy = false;
    render();
    message('Could not update your wishlist. Please try again.');
  }
}

function syncUser(next) {
  if (!variants.size) return;
  if (user?.id === next?.id && !loading) return;
  if (user?.id === next?.id && user) return;
  const previous = user;
  user = next;
  ++generation;
  busy = false;
  loading = false;
  loaded = false;
  rows = [];
  message('');
  retry.hidden = true;
  if (!user && previous) pendingIntent(null);
  render();
  if (user) void refresh();
}

function toggleVariant(target) {
  if (!target || busy || loading) return;
  if (!user) {
    pendingIntent({ product: target.product_id, variant: target.variant_id, at: Date.now() });
    requestSignIn('Sign in to save products to your wishlist.');
    return;
  }
  void mutate({ ...target }, !rows.some(row => sameVariant(row, target)));
}
toggle?.addEventListener('click', () => toggleVariant(product));
retry.addEventListener('click', () => { if (user && !busy) void refresh(); });
window.addEventListener('mui3d:auth', event => syncUser(event.detail.user));
window.addEventListener('mui3d:variant-change', () => {
  const first = variants.size === 0;
  readVariants();
  if (status) status.textContent = '';
  render();
  if (first) {
    void refreshCounts();
    void authReady.then(() => syncUser(getAuthUser()));
  }
});
readVariants();
if (variants.size) void refreshCounts();
window.addEventListener('focus', () => { void refreshCounts(); });
await authReady;
syncUser(getAuthUser());
