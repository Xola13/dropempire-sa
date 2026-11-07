# DropEmpire SA — Production Readiness Audit

Branch: `hardening/production-readiness` · Phase 1 (read-only audit). No code has been changed.
Baseline: `tsc --noEmit` clean · `eslint` 0 errors / 12 warnings · `vitest` 36/36 pass.

Method: static review of the repo as of commit `58f1242`. Nothing was run against live Supabase, PayFast or
Vercel runtime; items marked *(verify)* need a check in the live environment.

Status legend: `[ ]` open · `[x]` done

---

## What is already good (no action needed)

- PayFast ITN: signature (PHP-urlencode, ordered), merchant ID, server-to-server `query/validate`, amount compared in cents, and an idempotent `pending|failed -> paid` claim so retries cannot double-fulfil. Raw payload is never logged.
- Yoco: atomic `pending -> processing` claim, amount read from DB, idempotency key, uncertain failures left in `processing` instead of risking a double charge.
- PayFast sandbox/live is chosen only by `NEXT_PUBLIC_PAYFAST_SANDBOX`; unset means live host. No hardcoded credentials in code.
- Checkout takes prices from the database only, caps quantities, validates with zod, rate-limits by IP.
- All `/api/admin`, `/api/ai`, `/api/cron`, `/api/suppliers`, `/api/marketplace` and `/api/fulfillment` routes are behind `requireAdmin` or `requireCron`. `/api/account/*` verifies the user with `auth.getUser()`.
- Order tracking needs order ref + matching email, with a uniform 404 and a 15/min limit. Customer responses strip cost/profit/supplier fields.
- Service-role key is only read in server code. Security headers + CSP are set in `next.config.ts`.
- Account deletion/anonymisation exists (`DELETE /api/account/profile`).
- No secrets found in tracked files or git history (`.env.example` holds placeholders only; `.env*` is git-ignored).

---

## CRITICAL

### C1. Supplier orders are placed with undefined recipient name and phone
- **Where:** `app/api/store/checkout/route.ts` (stores `delivery_address` as `{address, city, province, postalCode}`) vs `lib/agents/fulfillment-agent.ts` (reads `shippingAddr.name`, `.phone`, `.email` from that same object).
- **Problem:** name/phone/email live in `customer_name` / `customer_phone` / `customer_email` columns, not inside `delivery_address`. Every AliExpress, CJ, Takealot and Makro order is submitted with `undefined` name and phone, and the manual-order email to the owner prints "undefined" too. The courier cannot deliver.
- **Fix:** build the shipping object in the fulfilment agent from the order columns (`customer_name`, `customer_phone`, `customer_email`) merged with `delivery_address`. Add a test.
- [x] Fixed in `lib/orders/shipping.ts` (+ tests). Commit: *Fix supplier orders being placed without recipient name and phone*.

### C2. No manual-approval gate before spending real money with suppliers
- **Where:** `lib/agents/fulfillment-agent.ts`, `app/api/webhooks/payfast/route.ts`, `app/api/payments/yoco/route.ts`.
- **Problem:** the instant a payment is confirmed, the agent buys from AliExpress/CJ (and logs into Takealot/Makro with a stored account and pays). There is no switch, no approval queue, no daily spend cap. A bad price, a wrong product mapping or a fraudulent card order spends your money immediately.
- **Fix:** add an `AUTO_FULFILL_MODE` setting (`manual` default | `auto`) plus a max auto-spend per order/day. In `manual` mode the paid order lands in an admin "Approve & order" queue (reusing the existing `needs_manual_order` path). *Needs your decision on default and limits.*
- [x] Done: `FULFILLMENT_MODE` (default `manual`). Paid orders wait for **Admin → Orders → Approve & order**; owner is emailed. Also fixed the admin button, which called an endpoint needing a cron secret and sent no order id. *Not done:* a per-order/daily spend cap (needs your numbers). Set `FULFILLMENT_MODE=auto` to restore old behaviour.

### C3. Silent failures after a customer has paid
- **Where:** `lib/agents/fulfillment-agent.ts`.
- **Problems:**
  1. AliExpress and CJ failures are only written to `agent_logs`. There is no owner alert and no manual fallback (only Takealot/Makro fall back to the owner email).
  2. AliExpress price-mismatch path does `continue` and skips the item silently.
  3. The customer "Order Confirmed" email is sent even when nothing was ordered.
  4. At the end the order is left `fulfilling` / `confirmed` regardless of outcome. If `after()` is killed or the function times out mid-way, the order sits in `fulfilling` and the cron only *counts* it (`console.warn`); nobody is notified.
  5. A partial failure (item A ordered, item B failed) cannot be retried safely.
- **Fix:** track per-item outcome; any failed item creates a `needs_manual_order` supplier order and emails the owner; set `fulfillment_status` to a distinct `needs_attention` state; the stuck-order sweep emails the owner instead of logging.
- [x] Done: every unordered item (error, price jump, missing supplier order id, unsupported supplier, no URL) is recorded as `needs_manual_order`, the owner is emailed, and the order is flagged `needs_attention`. Daily sweep emails stuck/awaiting/attention orders. **Requires migration 006 applied before deploy.**

### C4. Footer and header link to pages that do not exist (legal + support)
- **Where:** `components/store/Footer.tsx` links to `/returns`, `/faq`, `/contact`, `/about`, `/privacy`, `/terms`. None exist under `app/` (404).
- **Problem:** a store taking money in South Africa without a privacy policy, terms, returns policy and contact details breaks POPIA (s18 notification), the CPA (s43 supplier identification, returns rights) and the ECT Act (s43 seller details). Payment providers (PayFast/Yoco) also check for these during merchant review.
- **Fix:** create the pages. **Content must come from you** (legal entity, address, return terms); I will scaffold them with clearly marked `TODO` blocks, not invented text. See section 5.
- [x] Done: `/privacy`, `/terms`, `/returns`, `/contact` created from verifiable facts; owner-only content is read from `SELLER_*` env vars or shown as a visible notice. Dead `/faq` and `/about` footer links removed. **Still needs your legal content and an attorney review.**

### C5. Order confirmation page claims success without verifying payment
- **Where:** `app/order-confirmation/page.tsx`.
- **Problem:** it shows "Order Confirmed!" and "Confirmation Email Sent" purely from a URL query string. Anyone (or a customer who cancels on PayFast and lands there, or an unpaid order) sees a success page; the order may actually be `pending`/`failed`. It also echoes the `order_id` from the URL.
- **Fix:** look up the order's real `payment_status` server-side (require order id + a signed/short-lived token or email), show "Payment pending / failed" states, and only claim an email was sent when it was.
- [x] Done: page now reads the real `payment_status`; shows paid / confirming (auto-refresh) / failed / not-found.

### N1. (New) Yoco checkout is not wired end to end
- **Where:** `app/checkout/page.tsx` (the live checkout) handles only the PayFast response; `/api/store/checkout` returns only `orderId` for Yoco; nothing collects a card token or calls `/api/payments/yoco`. `components/store/CheckoutForm.tsx` has a half-written Yoco branch but is not used anywhere.
- **Problem:** choosing Yoco creates a pending order and then nothing happens (spinner/stuck button).
- **Fix options:** hide the Yoco option until the Yoco popup/SDK flow is built (small), or build it (about half a day). *Your call.*
- [x] Done: Yoco hidden and rejected server-side until `NEXT_PUBLIC_YOCO_ENABLED=true`. Building the real Yoco flow is still open.

### N2. (New) Inconsistent support email in code
`components/store/Footer.tsx` uses `support@dropempiresa.co.za`; the old confirmation page used `support@dropempire.co.za`. Contact details now come from `SELLER_EMAIL`; the footer still needs to use it (part of H8).

---

## HIGH

### H1. Playwright auto-ordering cannot run on Vercel and stores personal-account passwords
- **Where:** `lib/agents/auto-order-takealot.ts`, `auto-order-makro.ts`, `package.json` (playwright dependency), `next.config.ts` (`serverExternalPackages`).
- **Problem:** serverless functions have no Chromium; every attempt will throw and fall to the manual path (acceptable) but adds latency and noise. It also relies on `TAKEALOT_EMAIL/PASSWORD`, `MAKRO_EMAIL/PASSWORD` and a saved card on a consumer account; automating consumer checkout very likely breaches those sites' terms and risks account bans. Those env vars are also missing from `.env.example`.
- **Fix:** disable Playwright auto-order in production (feature flag, default off), keep manual-email fallback; remove the dependency from the Vercel bundle. *Business decision: confirm you want this off.*
- [ ]

### H2. Yoco: money can be taken but the order never marked paid
- **Where:** `app/api/payments/yoco/route.ts`.
- **Problem:** if the charge succeeds but the following DB update throws, or the request times out, the order stays `processing` forever; the customer has paid and nothing ships. There is no Yoco webhook and no reconciliation job.
- **Fix:** add a reconciliation step to the cron (query Yoco by `metadata.orderId` / idempotency key for orders stuck in `processing` > 10 min) and alert the owner. Optionally add a Yoco webhook as source of truth.
- [ ]

### H3. Unpaid orders accumulate and there is no stock handling
- **Where:** `app/api/store/checkout/route.ts`.
- **Problem:** every checkout attempt inserts a `pending` order and a customer row; abandoned ones are never expired. Stock is only a manual flag (`stock_status`); no re-check of supplier stock at payment time.
- **Fix:** cron to cancel `pending` orders older than 24 h; re-validate price/stock in the fulfilment step (ties into C2/C3).
- [x] Partly done: abandoned `pending` orders are cancelled after 24 h by the daily cron. *Not done:* re-checking supplier stock at payment time.

### H4. Tracking: only AliExpress/CJ; first shipped item marks the whole order fulfilled
- **Where:** `checkAndUpdateTracking()` in `lib/agents/fulfillment-agent.ts`.
- **Problems:** Takealot/Makro/manual supplier orders never get tracking (customer is never told it shipped). On a multi-supplier order the first tracking number flips the whole order to `shipped/fulfilled` and emails the customer. Bob Go (`lib/bobgo.ts`) is not referenced anywhere, so there is no courier integration. With the cron now daily (see M-note), tracking updates are slow.
- **Fix:** aggregate per supplier order before changing the order state; allow admin to enter tracking for manual orders (and email the customer); decide whether Bob Go is in scope.
- [ ]

### H5. No error tracking, no alerting
- **Problem:** there is no Sentry (0 references). Errors only go to `console.error` JSON lines in Vercel logs, which expire quickly on Hobby. Nobody is told when a webhook fails, an order sticks, or an agent errors.
- **Fix:** add `@sentry/nextjs` (free tier), tag orderId (not PII), alert on webhook/fulfilment errors; external uptime monitor on `/api/health`.
- [ ]

### H6. Rate limiting is per-instance unless Upstash is configured
- **Where:** `lib/security/rate-limit.ts`.
- **Problem:** without `UPSTASH_REDIS_REST_URL/TOKEN` the limiter falls back to an in-memory map that does not work across serverless instances. Admin brute-force protection (5/15 min) and checkout/track limits are then easy to bypass. Also `getClientIp` trusts forwarded headers; confirm it uses the Vercel-set header only *(verify)*.
- **Fix:** make Upstash a required prod env var (or fail loudly at boot in production). Add a rate limit to the unauthenticated product-search and signup paths.
- [ ]

### H7. No consent or notice at the point of collecting personal data
- **Where:** `components/store/CheckoutForm.tsx`, `app/checkout/page.tsx`, `app/(store)/account/signup/page.tsx` (no terms/privacy references at all).
- **Problem:** POPIA requires telling people what is collected, why, and who it is shared with (suppliers, courier, PayFast, Resend, Supabase, Anthropic if any customer data reaches it). Customer name, phone and address are sent to overseas suppliers (AliExpress/CJ) — that is a cross-border transfer that must be disclosed.
- **Fix:** add terms/privacy acceptance to checkout and signup; list processors in the privacy policy (content from you).
- [ ]

### H8. Fake or unverifiable claims on public pages (flagged, not replaced)
Remove or confirm each before launch. I will not invent replacements.

| File | Claim | Issue |
|---|---|---|
| `components/store/Footer.tsx:53` | `+27 (0)10 000 0000` | Placeholder phone number |
| `components/store/Footer.tsx:49` | `support@dropempiresa.co.za` | Does that mailbox/domain exist? |
| `components/store/Footer.tsx:~57` | "Johannesburg, South Africa" | No street address / registered details (required by ECT Act s43) |
| `app/page.tsx:73` | "Local customer support team" | Not true if it is just you |
| `app/page.tsx:68` | "30-Day Returns — hassle-free returns on all orders" | Contradicts a 2–25 day supplier model unless you really honour it; must match a returns policy |
| `app/page.tsx:209`, `Hero.tsx:62` | "Thousands of products" | Catalogue is currently empty |
| `app/page.tsx:~57` | "Fast SA Delivery" | Delivery from AliExpress/CJ is 15–25 days (confirmation page itself says 2–25) |
| `Footer.tsx:~34` | "South Africa's premier online store… trusted suppliers" | Marketing superlative, unsubstantiated |
| `ProductCard`/`ProductDetail` | "`{orders_count} sold`" | Shows 0 or manipulated counts; hide when low |

- [ ]

### H9. AI/agent cost and abuse controls are missing
- **Where:** `lib/agents/*.ts`, `lib/anthropic.ts`, `app/api/ai/*`, `app/api/cron/trend-scout`, `price-optimizer`.
- **Problems:** the routes are admin/cron-gated (good), but there is no per-day token or call budget, no timeout/`maxRetries` on the Anthropic client, and `pricing-agent` loops products making one model call each. A bug or a cron loop can burn credit unbounded. Model IDs are hardcoded (`claude-sonnet-4-20250514`) and duplicated across 5 files.
- **Fix:** shared Anthropic client with timeout, retry cap, and a daily call/token counter in the DB (hard stop); central model constant; set a monthly spend limit in the Anthropic console.
- [x] Done: `lib/ai.ts` (60 s timeout, 2 retries, one model constant, hard daily cap `AI_DAILY_CALL_LIMIT`, default 300, usage logged). *You should also set a monthly spend limit in the Anthropic console.*

### H10. Prompt-injection risk from supplier data, and agent output is trusted
- **Where:** `lib/agents/listing-agent.ts`, `sourcing-agent.ts`, `pricing-agent.ts`.
- **Problem:** supplier titles/descriptions are pasted directly into prompts. A malicious listing can steer output (e.g. fake claims, hidden links, price recommendations). Output is parsed from JSON and then stored and **published to the storefront** (description, FAQs, SEO fields). Check that: output length/shape is validated with zod; `is_published` stays false until an admin reviews; descriptions are rendered as text, not raw HTML.
- **Fix:** wrap supplier text in delimited data blocks with an instruction not to follow it; zod-validate the model JSON; force `is_published=false` on AI-created products; never let the agent change price without admin approval *(business logic — your call)*.
- [x] Done: supplier text fenced as untrusted data in listing/sourcing/pricing prompts; listing output zod-validated; AI price must be a finite positive number <= 3x current. AI-created listings were already saved as drafts. *Not changed (business logic): the pricing agent still writes AI prices live without a margin floor, so consider adding one.*

---

## MEDIUM

- **M1. Hardcoded exchange rate** `18.5` in `sourcing-agent.ts`, `fulfillment-agent.ts` (price check) and `.env.example`. The fulfilment price check also falls back to `'999'` on parse failure and then compares in ZAR. Use one rate source; do not change margins without your approval.
- **M2. `/api/fulfillment/auto-fulfill`** reads `req.json()` unvalidated and without try/catch (500 leaks nothing but crashes unhandled). Add zod + `serverError`.
- **M3. Cron schedule reduced to daily** (commit `58f1242`, Hobby plan limit). Paid-but-unstarted orders now wait up to 24 h for the recovery sweep. Either upgrade to Vercel Pro (4-hour or hourly sweep) or trigger an external pinger (e.g. cron-job.org hitting the endpoint with `CRON_SECRET`).
- **M4. PayFast source-IP check** not implemented. The server-side `query/validate` call already covers the main threat, so this is defence in depth only.
- **M5. `NEXT_PUBLIC_PAYFAST_SANDBOX`** is a build-time public variable: flipping it in Vercel requires a **redeploy**, and it is exposed to the browser. Prefer a server-only `PAYFAST_SANDBOX`. Also add a startup guard so production refuses to run with the public sandbox merchant ID `10000100`.
- **M6. (DONE 2026-11-06) RLS migration 005 applied to the live database** (together with 003, which had never been run, and 006). Original note: RLS migration 005 not yet applied to the live database (status: unknown *(verify)*). Until then, the open policies from migrations 001/003 (`USING (true)`) let anyone with the public anon key read all orders/customers and modify marketplace data via the Supabase REST API. **Highest-value database action; apply before go-live.** Also confirm the live DB matches `supabase/migrations` (the setup file moved to `supabase/dev`).
- **M7. No `sitemap.xml`** (only `robots.ts`). Add `app/sitemap.ts` listing published products.
- **M8. Images:** remotePatterns allow-list lacks some supplier hosts (e.g. DHgate/Alibaba/PnP scrapers exist). Product images from other hosts will fail to render. `WholesaleOpportunityCard` uses `<img>` (admin only; low impact).
- **M9. Empty catalogue** state: confirm `/`, `/products`, `/products/[slug]` render a friendly "coming soon" instead of blank grids; do not show "Thousands of products" (see H8).
- **M10. CSP** still allows `'unsafe-inline'` scripts (documented trade-off). Acceptable at launch; revisit with nonces later. `connect-src` allows only Supabase + Yoco — check that Sentry/analytics endpoints are added when introduced.
- **M11. Backups:** Supabase free tier has no point-in-time recovery. Enable daily backups (Pro) or schedule `pg_dump` exports before taking real money.
- **M12. `.env.example`** is missing `TAKEALOT_EMAIL/PASSWORD`, `MAKRO_EMAIL/PASSWORD`, and ships PayFast sandbox values that look like live config. Document each var as REQUIRED/OPTIONAL and add a boot-time env validator (zod) that fails the build in production when required vars are missing.
- **M13. Transactional email:** Resend needs a verified sending domain (SPF/DKIM/DMARC) or order emails land in spam. `FROM_EMAIL` defaults to `orders@<site host>`; verify the domain is set up *(verify)*.
- **M14. Logs contain `agent_logs.input/output` with order data**, including customer addresses (`shipping_address` in `supplier_orders`). Retain-and-prune policy needed (migration 005 only has a comment).
- **M15. Account deletion** anonymises the customer but historical `orders` rows keep name/email/phone/address. State the legal retention period (tax records: 5 years) in the privacy policy and anonymise after it.

## LOW

- **L1.** ESLint warnings (12): unused imports in `lib/suppliers/*`, an `<img>`. Clean up.
- **L2.** `lib/supabase.ts` `Database` types are stale (supplier enum lacks takealot/game etc.; `payment_status` lacks `processing`). Regenerate with `supabase gen types`.
- **L3.** `PROFIT_STRATEGY.md` and `SETUP_GUIDE.md` in repo root — review for private business info before the repo goes public (it is public if GitHub repo visibility is public *(verify)*).
- **L4.** `/api/health` does no dependency check by design; add an authenticated deep-check (DB ping) for monitoring.
- **L5.** Add `app/not-found.tsx` and `app/error.tsx` with branded fallbacks; add `manifest`/OG image metadata.
- **L6.** n8n: no n8n workflows or references exist in this repo, so there was nothing to audit there. If n8n calls these APIs, it must send `CRON_SECRET` / `x-admin-token`; keep those credentials in n8n's credential store and never inside exported workflow JSON.
- **L7.** No CI deploy gate: `.github/workflows/ci.yml` runs checks but Vercel deploys regardless. Make the `check` job a required status on `main`.

---

## Items I could not verify from the repo (need you or live access)

1. Is migration 005 applied in Supabase? Do RLS policies in the live DB match the repo?
2. Is Upstash configured in Vercel? Which env vars are set in Vercel production vs preview?
3. Resend domain verification; PayFast merchant account status (live credentials, ITN URL whitelisted, passphrase set to the same value in dashboard and env).
4. GitHub repo visibility (public/private).
5. Legal entity and the true contact details to put on the site.
6. Whether the first Vercel build now succeeds (last status: building).

---

## Phase 2 — prioritised fix plan (awaiting your approval)

| # | Item | Effort | Needs your decision? |
|---|---|---|---|
| 1 | C1 shipping name/phone bug + test | 1 h | No |
| 2 | M6 apply migration 005 in Supabase (SQL Editor) | 20 min | You run it / confirm |
| 3 | C2 manual-approval toggle + admin approve queue | 4–6 h | **Yes**: default mode, spend cap |
| 4 | C3 per-item outcomes, owner alerts, `needs_attention` state | 4–6 h | No |
| 5 | C5 truthful order-confirmation page | 2 h | No |
| 6 | C4 + H7 legal/support pages scaffolded, consent checkboxes | 3–4 h + your content | **Yes**: all legal text/details |
| 7 | H8 remove placeholders/false claims | 1 h | **Yes**: what is true |
| 8 | H1 disable Playwright auto-order in prod by flag | 1 h | **Yes**: confirm |
| 9 | H2 Yoco reconciliation | 3 h | No |
| 10 | H5 Sentry + uptime monitor | 2 h | Need Sentry DSN |
| 11 | H6 require Upstash in prod, boot-time env validation (M12, M5) | 2 h | No |
| 12 | H9 + H10 AI budget, timeouts, prompt-injection hardening, forced unpublished | 4 h | **Yes**: budget numbers |
| 13 | H3 expire stale pending orders | 1.5 h | No |
| 14 | H4 tracking aggregation, manual tracking entry, Bob Go decision | 4–8 h | **Yes**: Bob Go in scope? |
| 15 | M7 sitemap, M9 empty states, M2, L1, L5 | 3 h | No |
| 16 | Go-live checklist, R10 test script, rollback plan | 2 h | No |

Order: 1 → 2 → 3/4 (together) → 5 → 6/7 → 8 → 9 → 10/11 → 12 → 13 → 14 → 15 → 16.
Critical + High total: roughly 35–50 hours; the first five items (the "do not take money until these are done" set) are roughly 12–16 hours.

---

## Progress log

- Criticals C1-C5: done on branch `hardening/production-readiness` (not yet merged or deployed).
- Live Supabase: migrations 003 + 005 + 006 applied; test customer/orders removed; products kept (207, all unpublished).
- Also done: N1, H3 (partial), H9, H10, config check endpoint (`/api/admin/config-check`).
- Still open: H1 (Playwright, needs decision), H2 (Yoco reconciliation, moot while Yoco is hidden), H4 (tracking/Bob Go, decision), H5 (Sentry, needs DSN), H6 (needs Upstash account), H7 (checkout consent boxes), H8 (placeholder claims, needs your answers), Mediums and Lows.
- Found, not ours: the Supabase project also holds `profiles`, `events` and a vector `match_products` function from another app; `profiles`/`events` policies are open to everyone (both tables empty).
