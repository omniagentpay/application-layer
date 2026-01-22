/**
 * ArcPay Checkout Service
 * 
 * Service for generating ArcPay checkout payment links and QR codes.
 * Uses ArcPayKit (npm) internally to create checkout sessions.
 * 
 * IMPORTANT: API keys are server-only and never exposed to frontend.
 */

import { ArcPay } from 'arcpaykit';
import { generatePaymentQRCode } from '../lib/qr-generator.js';

/**
 * Initialize ArcPay client from environment variables
 */
function getArcPayClient(): ArcPay {
  // Log raw env vars for debugging
  console.log('[ArcPay Checkout] Raw environment variables:');
  console.log('  ARCPAY_SECRET_KEY:', process.env.ARCPAY_SECRET_KEY ? `${process.env.ARCPAY_SECRET_KEY.substring(0, 20)}...` : 'undefined');
  console.log('  ARCPAY_API_KEY:', process.env.ARCPAY_API_KEY ? `${process.env.ARCPAY_API_KEY.substring(0, 20)}...` : 'undefined');
  console.log('  ARCPAY_BASE_URL:', process.env.ARCPAY_BASE_URL || 'undefined');

  const apiKey = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY;
  const environment = process.env.ARCPAY_ENV || 'testnet';
  // IMPORTANT: Fallback to deployed gateway URL - ensures it always works
  const baseUrl = process.env.ARCPAY_BASE_URL || 'https://arcpay.systems';

  console.log('[ArcPay Checkout] Resolved values:');
  console.log('  apiKey:', apiKey ? `${apiKey.substring(0, 20)}...` : '❌ NOT SET');
  console.log('  baseUrl:', baseUrl);

  if (!apiKey) {
    throw new Error(
      'ARCPAY_SECRET_KEY or ARCPAY_API_KEY environment variable is required. ' +
      'Please set it in your .env file. ArcPay checkout features will be disabled.'
    );
  }

  // Trim any whitespace from API key
  const trimmedApiKey = apiKey.trim();

  console.log('[ArcPay Checkout] Creating ArcPay client with:');
  console.log('  trimmedApiKey:', trimmedApiKey ? `${trimmedApiKey.substring(0, 20)}...` : '❌ EMPTY');
  console.log('  baseUrl:', baseUrl);

  // ArcPayKit automatically infers environment from API key prefix
  // sk_arc_test_* = testnet, sk_arc_live_* = production
  // Pass baseUrl to ArcPay constructor to use deployed gateway
  const client = new ArcPay(trimmedApiKey, baseUrl);

  console.log('[ArcPay Checkout] Client initialized successfully');

  return client;
}

/**
 * Create ArcPay checkout session and return checkout URL
 * 
 * @param params Checkout creation parameters
 * @returns Checkout URL and session ID
 */
export async function createCheckoutLink(params: {
  amount: number;
  currency: string;
  description?: string;
}): Promise<{
  checkoutUrl: string;
  sessionId: string;
  amount: number;
  currency: string;
}> {
  const client = getArcPayClient();

  try {
    console.log('[ArcPay Checkout] Creating payment:', {
      amount: params.amount.toFixed(2),
      currency: params.currency || 'USDC',
    });

    // Create payment using ArcPayKit
    const payment = await client.payments.create({
      amount: params.amount.toFixed(2),
      currency: params.currency || 'USDC',
      description: params.description || `Payment of ${params.amount} ${params.currency || 'USDC'}`,
    });

    // Extract checkout URL and session ID from payment response
    const checkoutUrl = payment.checkout_url || payment.checkoutUrl || '';
    const sessionId = payment.id || payment.session_id || `cs_${Date.now()}`;

    if (!checkoutUrl) {
      throw new Error('ArcPay did not return a checkout URL');
    }

    console.log('[ArcPay Checkout] Checkout link created:', {
      sessionId,
      amount: params.amount,
      currency: params.currency,
      checkoutUrl: checkoutUrl.substring(0, 50) + '...',
    });

    return {
      checkoutUrl,
      sessionId,
      amount: params.amount,
      currency: params.currency || 'USDC',
    };
  } catch (error) {
    console.error('[ArcPay Checkout] Failed to create checkout link:', error);
    console.error('[ArcPay Checkout] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Parse error message more carefully
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Try to parse JSON error response if present
      try {
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          const errorObj = JSON.parse(jsonMatch[0]);
          errorMessage = errorObj.message || errorObj.error || errorMessage;
        }
      } catch (e) {
        // If parsing fails, use original message
      }
    }

    throw new Error(`Failed to create checkout link: ${errorMessage}`);
  }
}

/**
 * Create ArcPay checkout session and generate QR code
 * 
 * @param params Checkout creation parameters
 * @returns Checkout URL, session ID, and QR code data URL
 */
export async function createCheckoutQR(params: {
  amount: number;
  currency: string;
  description?: string;
}): Promise<{
  checkoutUrl: string;
  sessionId: string;
  qrCode: string;
  amount: number;
  currency: string;
}> {
  // First create the checkout link
  const checkout = await createCheckoutLink(params);

  // Generate QR code for the checkout URL
  const qrCode = await generatePaymentQRCode(checkout.checkoutUrl);

  console.log('[ArcPay Checkout] QR code generated:', {
    sessionId: checkout.sessionId,
    qrCodeSize: qrCode.length,
  });

  return {
    ...checkout,
    qrCode,
  };
}
