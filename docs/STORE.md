# The Everrealm store

Cosmetics for real money, to pay for the realm. **Looks, never strength**: every mount keeps the same pace, and nothing sold makes anyone hit harder, level faster or skip a step.

## What's built

- **Store tab** on the front page (`src/ui/Frontend.ts`): the goods, their prices, and Buy.
- **Server** (`server/store.mjs`, wired into `server/server.mjs`):
  - `GET /api/store/catalog`: what's for sale, and whether payments are open.
  - `POST /api/store/checkout` (signed in): opens a Stripe Checkout page for one item.
  - `POST /api/store/webhook`: Stripe's word that a payment went through.
  - `GET /api/store/owned` (signed in): what the account owns.
- **Delivery** (`src/game/Game.ts`): on entering the world, every character on the account receives what the account owns, once each.
- **Goods** (`src/data/content/storeItems.ts`, prices in `server/store.mjs` CATALOG):

  | Item | Price |
  | --- | --- |
  | Starlit stag | US$9.99 |
  | Lantern kilncat | US$9.99 |
  | Gilded griffin | US$14.99 |
  | Founder's pack: all three mounts and the Founder's cloak | US$24.99 |
  | Speckled hen (a pet): claimed once per account | Free |

  Free goods have a **Claim for free** button. `POST /api/store/claim` (signed in) grants them at once, once per account, with no payment page. Checkout refuses them.

## Why it's safe

- **The card never touches Everrealm.** Buy sends the player to Stripe's own hosted payment page.
- **The server sets the price.** The browser only names the item; the amount comes from the catalog on the server, so a doctored request can't buy anything cheaper.
- **Nothing is granted on the "thank you" page,** because that page can be faked. Goods are granted only when Stripe calls the webhook, and only after checks:
  - The webhook is signed with a secret only Stripe and the server know.
  - The signature and its timestamp (five minutes' tolerance) are checked before anything is read.
  - Each payment is granted once, however many times Stripe retries.
- **Ownership lives on the server, with the account.** It follows the player to every device, and the game asks the server rather than trusting the browser.
- **Tested locally**, all refused with a 400:
  - a webhook with no signature;
  - a webhook signed with the wrong secret;
  - a replayed webhook an hour old;
  - a webhook whose body was changed after signing.

  A genuine webhook grants once, and a retry doesn't grant again. "Owned" needs sign-in. Checkout refuses unknown items, and stays shut without keys.

## What the owner has to do to open it

These steps are yours: they need your identity, your bank details and your keys. Nobody else should hold the keys.

1. **Make a Stripe account** at stripe.com.
2. **Test first.** In test mode, copy the secret key (`sk_test_...`).
3. **Set the keys on Render.** In the everrealm-realm service, under Environment, set:
   - `STRIPE_SECRET_KEY`: the key from step 2.
   - `STORE_RETURN_URL`: the game's page, `https://everrealm.quest/`.
4. **Add the webhook.** In Stripe, go to Developers, then Webhooks, and add an endpoint:
   - URL: `https://everrealm-realm.onrender.com/api/store/webhook`.
   - Event: `checkout.session.completed` (add `checkout.session.async_payment_succeeded` too).
   - Copy its signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` on Render.
5. **Try a test purchase** with Stripe's test card `4242 4242 4242 4242`, any future date and any CVC. The item should arrive the next time you enter the world.
6. **Go live.** Swap in the live keys (`sk_live_...`, and the live webhook's secret) once Stripe has verified your business.

Before taking real money:

- **Refunds and terms.** Write a short refund policy and terms of sale for the store page. Stripe asks for them, and so does the law in most places.
- **Sales tax and VAT.** Stripe Tax can work out and collect them. Alternatively, a merchant of record (Paddle, Lemon Squeezy, or Tebex, which is built for games) sells on your behalf and handles tax for you. Moving to one of them only changes `server/store.mjs`.
- **Refunds and chargebacks don't take items back yet.** That's a later step: listen for `charge.refunded` and `charge.dispute.created` and revoke.
