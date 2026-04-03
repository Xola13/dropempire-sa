# DropEmpire SA — Setup Guide

## Prerequisites

- Node.js 20+
- Supabase account (free tier works)
- Anthropic API key (Claude)
- PayFast merchant account (sandbox for testing)
- Resend account for emails
- Vercel account for deployment

---

## 1. Clone & Install

```bash
git clone <your-repo>
cd dropempire-sa
npm install
```

---

## 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **SQL Editor** and run `supabase/migrations/001_schema.sql`

---

## 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See comments for each variable.

---

## 4. PayFast Setup

1. Register at [payfast.co.za](https://payfast.co.za)
2. For testing use sandbox: merchant_id `10000100`, merchant_key `46f0cd694581a`
3. Set `NEXT_PUBLIC_PAYFAST_SANDBOX=true` while testing
4. Set your **Notify URL** in PayFast dashboard: `https://yourdomain.co.za/api/webhooks/payfast`
5. Set **Return URL**: `https://yourdomain.co.za/order-confirmation`

---

## 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the store.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for admin panel.

Default admin password = value of `ADMIN_SECRET` in `.env.local`

---

## 6. Import Your First Product

1. Go to `/admin/ai-sourcing`
2. Click **Find Trending Products** — Claude will identify opportunities
3. Click **Source This Product** on any trend — Claude compares all suppliers
4. Click **Import Product** — AI generates the listing automatically
5. Go to `/admin/products` → Publish the product

---

## 7. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in Vercel dashboard → Settings → Environment Variables.

Vercel will automatically run cron jobs as configured in `vercel.json`.

---

## 8. Business Rules Enforced in Code

| Rule | Where Enforced |
|------|---------------|
| Never forward order until PayFast/Yoco ITN confirmed | `app/api/webhooks/payfast/route.ts` |
| Minimum 20% margin | `lib/margin-calculator.ts` + fulfillment agent |
| Refund if margin goes negative | `lib/agents/fulfillment-agent.ts` |
| Honest delivery estimates | `lib/utils.ts:getDeliveryLabel()` |
| Log every AI agent action | `lib/utils.ts:logAgentAction()` |

---

## 9. Cron Jobs

| Job | Schedule | What it does |
|-----|----------|-------------|
| `/api/cron/sync-prices` | Daily 00:00 | Refreshes supplier costs |
| `/api/cron/check-orders` | Every 4h | Checks shipped order tracking |
| `/api/cron/trend-scout` | Monday 06:00 | AI scans for new product trends |
| `/api/cron/daily-report` | Daily 06:00 | Emails profit report to admin |

---

## 10. Supplier Notes

### AliExpress
- **Delivery:** 15-25 business days (ALWAYS show this to customers)
- Uses web search for product discovery (no official API required)
- Manual order placement required (no API auto-fulfillment)

### CJ Dropshipping
- **Delivery:** 7-15 business days
- Register at [cjdropshipping.com](https://cjdropshipping.com) for API keys
- Supports API order automation

### Makro SA
- **Delivery:** 2-4 business days (South African supplier)
- Uses Playwright web scraping
- Manual orders via Makro Business Account

---

## Support

For issues, check server logs in Vercel dashboard → Functions → Logs.
