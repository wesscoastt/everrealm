// The Everrealm store: cosmetics for real money, to keep the realm running. Nothing in it makes
// anyone stronger: mounts all keep the same pace, and the rest is looks.
//
// How a purchase stays safe:
//  - The game never sees a card. "Buy" asks this server for a checkout; the server asks Stripe for a
//    Checkout Session (Stripe's own hosted payment page) and sends the player there. Card numbers are
//    typed into Stripe's page, never into ours.
//  - The server decides the price. The player only names what they want; the amount comes from the
//    catalog below, so a doctored request can't buy anything cheaper.
//  - Nothing is granted when the player comes back from the payment page (that page can be faked).
//    It's granted when Stripe tells the server the payment went through, in a webhook signed with a
//    secret only Stripe and the server know. The signature and its timestamp are checked before
//    anything is read, and each payment is granted once however many times Stripe repeats it.
//  - What you own lives with your account on the server, so it follows you to every character and
//    device, and the game asks the server what you own rather than trusting the browser.
//
// The keys are the owner's: STRIPE_SECRET_KEY (sk_test_... while testing, sk_live_... once open),
// STRIPE_WEBHOOK_SECRET (whsec_..., from the webhook's page in Stripe's dashboard, pointed at
// <realm>/api/store/webhook for checkout.session.completed), and STORE_RETURN_URL (the game's page).
// They're set in the host's environment (Render), never in the repository or the browser. Without
// them the store shows its goods and says it isn't open yet.

import crypto from 'node:crypto';

/** What's for sale, by its id: the price in cents (USD), and the game items it grants. */
export const CATALOG = {
  starstag: { cat: 'mounts', name: 'Starlit stag', price: 999, items: ['mount_store_starstag'], blurb: 'A stag the colour of the night sky, its antlers lit from within. Keeps the same pace as every other mount.' },
  lanterncat: { cat: 'mounts', name: 'Lantern kilncat', price: 999, items: ['mount_store_lanterncat'], blurb: 'A kilncat whose stripes glow like coals in a lantern. Keeps the same pace as every other mount.' },
  gildgriffin: { cat: 'mounts', name: 'Gilded griffin', price: 1499, items: ['mount_store_gildgriffin'], blurb: 'A tower griffin in gold and white, its eyes bright. Keeps the same pace as every other mount.' },
  hen: { cat: 'pets', name: 'Speckled hen', price: 0, items: ['pet_hen'], blurb: 'A pet hen who has decided you\'re hers. She follows you everywhere, dungeons included, and is no help at all. Free, once per account.' },
  kitten: { cat: 'pets', name: 'Hearth kitten', price: 399, items: ['pet_kitten'], blurb: 'A ginger kitten at your heels. Sits on every warm stone you pass. Looks only: pets never fight.' },
  pup: { cat: 'pets', name: 'Shepherd\'s pup', price: 399, items: ['pet_pup'], blurb: 'A black and white collie pup from the fells, too young to work and too keen to sit still. Looks only.' },
  duckling: { cat: 'pets', name: 'Puddle duckling', price: 399, items: ['pet_duckling'], blurb: 'A yellow duckling who thinks you\'re its mother. Waddles to keep up. Looks only.' },
  hare: { cat: 'pets', name: 'Moon hare', price: 499, items: ['pet_hare'], blurb: 'A white hare the dales say is a witch who forgot her way home. Looks only.' },
  piglet: { cat: 'pets', name: 'Truffle piglet', price: 399, items: ['pet_piglet'], blurb: 'A small pink piglet, certain there\'s something buried under every tree you stop by. Looks only.' },
  petpack: { cat: 'bundles', name: 'The whole litter', price: 1299, items: ['pet_kitten', 'pet_pup', 'pet_duckling', 'pet_hare', 'pet_piglet'], blurb: 'All five store pets at once, for less than four of them. Change which one follows you any time.' },
  founders: { cat: 'bundles', name: 'Founder\'s pack', price: 2499, items: ['mount_store_starstag', 'mount_store_lanterncat', 'mount_store_gildgriffin', 'cape_founder'], blurb: 'All three store mounts and the Founder\'s cloak, a lamp with its light round it, to say you were here early and helped keep the lights on.' },
};

const SKEY = () => process.env.STRIPE_SECRET_KEY ?? '';
const WHSEC = () => process.env.STRIPE_WEBHOOK_SECRET ?? '';
const RETURN = () => process.env.STORE_RETURN_URL ?? '';
/** How old a webhook's signature may be before it's turned away (seconds). */
const TOLERANCE = 300;

export function storeInit({ loadAccount, storeAccount, log }) {
  /** Gives an account what a paid order bought, once per order. */
  function grant(user, sku, order) {
    const acc = loadAccount(user);
    const item = CATALOG[sku];
    if (!acc || !item) { log(`store: order ${order} for unknown ${user}/${sku}`); return false; }
    acc.store ??= { owned: [], orders: {} };
    if (acc.store.orders[order]) return true; // already granted (Stripe repeats itself)
    acc.store.orders[order] = { sku, at: Date.now() };
    for (const id of item.items) if (!acc.store.owned.includes(id)) acc.store.owned.push(id);
    storeAccount(acc);
    log(`store: ${user} bought ${sku} (${order})`);
    return true;
  }

  /** Stripe's signature on a webhook: v1 = HMAC-SHA256(secret, timestamp + "." + body), recent. */
  function verified(raw, header) {
    const secret = WHSEC();
    if (!secret || !header) return false;
    const parts = Object.fromEntries(String(header).split(',').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
    const t = Number(parts.t);
    if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCE) return false;
    const want = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
    const sigs = String(header).split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
    return sigs.some((s) => s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
  }

  /** Asks Stripe for a hosted checkout page for one item; the price comes from the catalog. */
  async function checkout(user, sku) {
    const item = CATALOG[sku];
    const form = new URLSearchParams({
      mode: 'payment',
      success_url: `${RETURN()}?store=thanks`,
      cancel_url: `${RETURN()}?store=cancelled`,
      client_reference_id: user,
      'metadata[user]': user,
      'metadata[sku]': sku,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(item.price),
      'line_items[0][price_data][product_data][name]': `Everrealm: ${item.name}`,
      'line_items[0][price_data][product_data][description]': item.blurb,
    });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${SKEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { log('store: checkout refused', r.status, j.error?.message ?? ''); return null; }
    return j.url;
  }

  return {
    /** The goods, for the store page (no account needed to look). */
    catalog() {
      return { open: !!(SKEY() && WHSEC() && RETURN()), items: Object.entries(CATALOG).map(([id, c]) => ({ id, cat: c.cat ?? 'other', name: c.name, price: c.price, blurb: c.blurb, items: c.items })) };
    },
    /** What an account owns, for the game to hand out. */
    owned(acc) { return acc.store?.owned ?? []; },
    /** Every item the store sells: the owner's account (DEV_ACCOUNTS) has them all, without paying. */
    everything() { return [...new Set(Object.values(CATALOG).flatMap((c) => c.items))]; },
    /** A free item: given at once, once per account, no payment page. */
    claim(user, sku) {
      const item = CATALOG[sku];
      if (!item) return { status: 400, body: { error: 'Nothing like that in the store.' } };
      if (item.price !== 0) return { status: 400, body: { error: 'That one isn\'t free.' } };
      const acc = loadAccount(user);
      if (acc?.store?.orders?.['free:' + sku]) return { status: 200, body: { ok: true, again: true } };
      grant(user, sku, 'free:' + sku);
      return { status: 200, body: { ok: true } };
    },
    async checkout(user, sku) {
      if (!CATALOG[sku]) return { status: 400, body: { error: 'Nothing like that for sale.' } };
      if (CATALOG[sku].price === 0) return { status: 400, body: { error: 'That one\'s free: claim it instead.' } };
      if (!SKEY() || !RETURN()) return { status: 503, body: { error: 'The store isn\'t open yet.' } };
      const url = await checkout(user, sku);
      return url ? { status: 200, body: { url } } : { status: 502, body: { error: 'The payment page couldn\'t be opened just now. Nothing was charged.' } };
    },
    /** Stripe's word that a payment went through (raw body, its signature header). */
    webhook(raw, sig) {
      if (!verified(raw, sig)) return { status: 400, body: { error: 'bad signature' } };
      let ev;
      try { ev = JSON.parse(raw); } catch { return { status: 400, body: { error: 'bad body' } }; }
      const s = ev?.data?.object;
      if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && s?.payment_status === 'paid') {
        const user = s.metadata?.user ?? s.client_reference_id, sku = s.metadata?.sku;
        if (user && sku) grant(user, sku, s.id);
      }
      return { status: 200, body: { received: true } };
    },
  };
}
