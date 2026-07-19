# Payments — Razorpay setup

Razorpay is the platform's online payment gateway (UPI, cards, netbanking,
wallets). It is free to set up for Indian businesses; there are no setup or
annual fees — only a per-transaction fee (≈2% + GST, standard plan).

## 1. Create the account (free, ~10 minutes)

1. Go to <https://dashboard.razorpay.com/signup> and sign up with the business
   email (use the Amity Arts business email, not a personal one).
2. Verify email + mobile OTP.
3. You land in **Test Mode** immediately — you can integrate and test today,
   before KYC.

## 2. Get the TEST keys (works instantly)

1. Dashboard → **Account & Settings → API Keys** (under "Website and app settings").
2. Make sure the mode toggle (top bar) says **Test Mode**.
3. Click **Generate Test Key** → copy both values:
   - `Key Id` (starts with `rzp_test_`)
   - `Key Secret` (shown only once — copy it now)
4. Paste them into `.env`:

```env
RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXXXX"
RAZORPAY_KEY_SECRET="XXXXXXXXXXXXXXXXXXXXXXXX"
```

5. Restart the dev server. The checkout page now shows **Pay online** and the
   Razorpay modal opens with test instruments:
   - Test UPI: `success@razorpay`
   - Test card: `4111 1111 1111 1111`, any future expiry, any CVV

## 3. Webhook (recommended before go-live)

The webhook marks orders paid even if the customer closes the tab right after
paying.

1. Dashboard → **Account & Settings → Webhooks → Add New Webhook**.
2. URL: `https://YOUR-DOMAIN/api/payments/razorpay/webhook`
   (for local testing use an `ngrok`/`cloudflared` tunnel URL).
3. Set a **Secret** (any strong string) → put the same value in `.env`:

```env
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
```

4. Active events: tick **payment.captured**. Save.

## 4. Go live (needs KYC)

1. Dashboard → **Activate your account**: business PAN, bank account,
   GSTIN (you have one), address proof, and the website URL.
   Approval typically takes 2-4 working days.
2. Once activated, switch the dashboard to **Live Mode** → API Keys →
   **Generate Live Key** (`rzp_live_...`).
3. Replace the two values in the production environment, re-create the webhook
   in Live Mode, and place a ₹1 real test order.

## How it's wired in this codebase

- `src/server/adapters/razorpay.ts` — REST adapter + HMAC signature checks
  (unit-tested in `tests/razorpay.test.ts`).
- Order placement with `paymentMethod: "RAZORPAY"` creates a gateway order and
  returns it to the client; the browser opens Razorpay Checkout.
- Success → `POST /api/payments/razorpay/verify` (signature verified
  server-side, order marked PAID).
- Abandoned payment → the order stays reserved with a **Pay now** button on
  the order page (`/orders/[id]`), re-armed via `/api/payments/razorpay/session`.
- Webhook `payment.captured` is the safety net for missed callbacks.
- No keys in env → the "Pay online" option simply doesn't appear; COD and
  wholesale Pay-Later keep working.
