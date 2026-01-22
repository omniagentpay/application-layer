-- Add ArcPay checkout columns to payment_intents table
-- These columns store checkout session metadata for hosted checkout and QR payment links

ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS checkout_url TEXT,
ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS checkout_type TEXT; -- 'link' | 'qr'

-- Add index for checkout session lookups
CREATE INDEX IF NOT EXISTS idx_payment_intents_checkout_session_id ON payment_intents(checkout_session_id);

-- Add comment for documentation
COMMENT ON COLUMN payment_intents.checkout_url IS 'ArcPay hosted checkout URL for payment link';
COMMENT ON COLUMN payment_intents.checkout_session_id IS 'ArcPay checkout session ID';
COMMENT ON COLUMN payment_intents.checkout_type IS 'Type of checkout: link (hosted) or qr (QR code)';
