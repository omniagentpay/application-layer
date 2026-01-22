# ArcPay Merchant Checkout & QR Payment Links

This document describes the ArcPay merchant checkout integration for OmniAgentPay, enabling hosted checkout links and QR code payment links.

## Overview

ArcPay checkout allows merchants to generate shareable payment links and QR codes that can be used to receive payments without exposing API keys or requiring payer authentication. Payments are executed entirely through ArcPay's hosted checkout page.

## Architecture

```
User / Agent
   ↓
OmniAgentPay Backend (Node.js)
   ├─ Uses ArcPay API key (merchant)
   ├─ Creates checkout session via ArcPayKit
   ├─ Stores session metadata in Supabase
   ↓
ArcPay Hosted Checkout / QR Page
   ↓
Payer Wallet → USDC Payment
   ↓
ArcPay executes + settles
   ↓
Webhook / Poll → OmniAgentPay updates status
```

## Setup

### 1. Environment Variables

Add the following to your `.env` file (backend only):

```bash
# ArcPay Merchant Configuration
ARCPAY_API_KEY=sk_live_xxx
ARCPAY_ENV=production
ARCPAY_MERCHANT_ID=merchant_xxx
ARCPAY_CHECKOUT_BASE_URL=https://pay.arcpay.xyz

# Frontend URL for success/cancel redirects
FRONTEND_URL=https://your-app.com
```

**⚠️ Security:** Never expose `ARCPAY_API_KEY` to the frontend. It must remain server-side only.

### 2. Database Migration

Run the Supabase migration to add checkout columns:

```sql
-- Migration: 20240101000007_add_checkout_columns.sql
ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS checkout_url TEXT,
ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS checkout_type TEXT;
```

## API Endpoints

### 1. Generate Hosted Checkout Link

**POST** `/api/payments/:id/checkout/link`

Creates an ArcPay checkout session and returns a shareable payment link.

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://pay.arcpay.xyz/checkout/cs_1234567890",
  "sessionId": "cs_1234567890",
  "intentId": "pi_1234567890",
  "amount": 0.1,
  "currency": "USDC",
  "message": "Payment link created. Share this link to receive 0.1 USDC."
}
```

### 2. Generate QR Code Payment Link

**POST** `/api/payments/:id/checkout/qr`

Creates an ArcPay checkout session and generates a QR code.

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://pay.arcpay.xyz/checkout/cs_1234567890",
  "sessionId": "cs_1234567890",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "intentId": "pi_1234567890",
  "amount": 0.1,
  "currency": "USDC",
  "message": "QR payment link created. Scan to pay 0.1 USDC."
}
```

### 3. Check Checkout Status

**GET** `/api/payments/:id/checkout/status`

Polls ArcPay API to get current checkout session status.

**Response:**
```json
{
  "sessionId": "cs_1234567890",
  "status": "paid",
  "checkoutUrl": "https://pay.arcpay.xyz/checkout/cs_1234567890",
  "intentStatus": "succeeded",
  "lastChecked": "2024-01-22T12:00:00.000Z"
}
```

### 4. Create Payment Intent with Checkout Link

**POST** `/api/payments`

Create a payment intent and automatically generate a checkout link.

**Request Body:**
```json
{
  "amount": 0.1,
  "recipient": "Merchant Name",
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "description": "Payment for services",
  "chain": "ethereum",
  "generateCheckoutLink": true,
  "checkoutMode": "link"  // or "qr" for QR code
}
```

**Response:**
```json
{
  "id": "pi_1234567890",
  "amount": 0.1,
  "currency": "USDC",
  "status": "pending",
  "checkoutUrl": "https://pay.arcpay.xyz/checkout/cs_1234567890",
  "sessionId": "cs_1234567890",
  "message": "Payment link created. Share this link to receive 0.1 USDC."
}
```

## Usage Examples

### Example 1: Generate Payment Link via Chat

When a user or agent says:
```
Generate a payment link for 0.1 USDC
```

The backend should:
1. Create a payment intent
2. Call `/api/payments/:id/checkout/link`
3. Return the checkout URL to the chat

### Example 2: Generate QR Code via API

```typescript
// Create payment intent
const intent = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Privy-User-Id': userId,
  },
  body: JSON.stringify({
    amount: 0.1,
    recipient: 'Merchant',
    recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chain: 'ethereum',
  }),
}).then(r => r.json());

// Generate QR code
const qrResponse = await fetch(`/api/payments/${intent.id}/checkout/qr`, {
  method: 'POST',
  headers: {
    'X-Privy-User-Id': userId,
  },
}).then(r => r.json());

// Display QR code
const qrImage = document.createElement('img');
qrImage.src = qrResponse.qrCode;
document.body.appendChild(qrImage);
```

### Example 3: Poll for Payment Status

```typescript
async function checkPaymentStatus(intentId: string) {
  const status = await fetch(`/api/payments/${intentId}/checkout/status`, {
    headers: {
      'X-Privy-User-Id': userId,
    },
  }).then(r => r.json());

  if (status.status === 'paid') {
    console.log('Payment completed!');
  } else if (status.status === 'pending') {
    // Poll again after delay
    setTimeout(() => checkPaymentStatus(intentId), 5000);
  }
}
```

## Payment Flow

1. **Intent Creation**: Payment intent is created in OmniAgentPay
2. **Checkout Session**: ArcPay checkout session is created via API
3. **Link/QR Generation**: Checkout URL is generated (and optionally QR code)
4. **Payment**: Payer visits checkout URL and completes payment via ArcPay
5. **Status Update**: OmniAgentPay polls ArcPay API or receives webhook
6. **Completion**: Payment intent status is updated to `succeeded`

## Status Mapping

ArcPay checkout session statuses map to OmniAgentPay intent statuses:

- `pending` → `pending`
- `paid` → `succeeded`
- `expired` → `expired`
- `failed` → `failed`

## Security Considerations

✅ **DO:**
- Store ArcPay API key in environment variables (server-side only)
- Use service role key for Supabase operations
- Validate payment amounts before creating checkout sessions
- Set expiration times for checkout links (default: 24 hours)

❌ **DON'T:**
- Expose ArcPay API key to frontend
- Embed API keys in QR codes
- Allow arbitrary amount mutation
- Bypass OmniAgentPay for payment execution

## Database Schema

The following columns are added to `payment_intents` table:

- `checkout_url` (TEXT): ArcPay hosted checkout URL
- `checkout_session_id` (TEXT): ArcPay checkout session ID
- `checkout_type` (TEXT): Type of checkout (`'link'` or `'qr'`)

## Troubleshooting

### Error: "ARCPAY_API_KEY environment variable is required"

**Solution:** Add `ARCPAY_API_KEY` to your `.env` file and restart the server.

### Error: "Failed to create checkout link"

**Possible causes:**
- ArcPay API key is invalid
- ArcPay merchant account not configured
- Network connectivity issues

**Solution:** Verify your ArcPay merchant account and API key.

### Checkout link expires too quickly

**Solution:** Modify expiration time in `arcpay-client.ts`:

```typescript
expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Change 24 to desired hours
```

## Future Enhancements

- [ ] Webhook support for real-time status updates
- [ ] Custom checkout page styling
- [ ] Multi-currency support
- [ ] Recurring payment links
- [ ] Payment link analytics

## Notes

- The `@arcpay/kit` package is currently stubbed. When the actual package is available, update `server/lib/arcpay-client.ts` to use the real SDK.
- All checkout links expire after 24 hours by default.
- Payment execution is handled entirely by ArcPay; OmniAgentPay only tracks status.
