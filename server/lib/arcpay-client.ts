/**
 * ArcPay Client Integration
 * 
 * This module provides integration with ArcPay merchant checkout API.
 * ArcPayKit is used to create hosted checkout sessions and QR payment links.
 * 
 * IMPORTANT: ArcPay API key must be stored in environment variables and never exposed to frontend.
 */

// ArcPay client interface (stub until @arcpay/kit package is available)
// This matches the expected API structure from the requirements
interface ArcPayCheckoutSession {
  id: string;
  url: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  metadata?: Record<string, any>;
}

interface ArcPayCheckoutCreateParams {
  amount: number;
  currency: string;
  description?: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, any>;
}

/**
 * ArcPay Client class
 * 
 * Wraps ArcPayKit SDK for creating checkout sessions.
 * All API keys are server-side only.
 */
class ArcPayClient {
  private apiKey: string;
  private environment: string;
  private merchantId?: string;
  private checkoutBaseUrl: string;

  constructor(config: {
    apiKey: string;
    environment: string;
    merchantId?: string;
    checkoutBaseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.environment = config.environment;
    this.merchantId = config.merchantId;
    this.checkoutBaseUrl = config.checkoutBaseUrl || 'https://pay.arcpay.xyz';
  }

  /**
   * Create a checkout session via ArcPayKit
   * 
   * @param params Checkout session parameters
   * @returns Checkout session with URL and ID
   */
  async createCheckoutSession(params: ArcPayCheckoutCreateParams): Promise<ArcPayCheckoutSession> {
    // TODO: Replace with actual ArcPayKit SDK call when package is available
    // const { ArcPayClient } = await import('@arcpay/kit');
    // const client = new ArcPayClient({ apiKey: this.apiKey, environment: this.environment });
    // return await client.checkout.create(params);

    // Temporary implementation: Create a mock checkout session
    // In production, this will call the actual ArcPayKit SDK
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const checkoutUrl = `${this.checkoutBaseUrl}/checkout/${sessionId}`;

    console.log('[ArcPay] Creating checkout session:', {
      sessionId,
      amount: params.amount,
      currency: params.currency,
      environment: this.environment,
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      id: sessionId,
      url: checkoutUrl,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
      metadata: params.metadata,
    };
  }

  /**
   * Get checkout session status
   * 
   * @param sessionId Checkout session ID
   * @returns Session status
   */
  async getCheckoutSessionStatus(sessionId: string): Promise<ArcPayCheckoutSession> {
    // TODO: Implement actual ArcPayKit status check
    // const client = new ArcPayClient({ apiKey: this.apiKey, environment: this.environment });
    // return await client.checkout.retrieve(sessionId);

    // Temporary mock implementation
    return {
      id: sessionId,
      url: `${this.checkoutBaseUrl}/checkout/${sessionId}`,
      amount: 0,
      currency: 'USDC',
      status: 'pending',
    };
  }
}

/**
 * Initialize ArcPay client from environment variables
 * 
 * Required env vars:
 * - ARCPAY_API_KEY: ArcPay merchant API key (server-side only)
 * - ARCPAY_ENV: Environment (production/sandbox)
 * - ARCPAY_MERCHANT_ID: Merchant ID (optional)
 * - ARCPAY_CHECKOUT_BASE_URL: Base URL for checkout (default: https://pay.arcpay.xyz)
 */
let arcpayClient: ArcPayClient | null = null;

export function getArcPayClient(): ArcPayClient {
  if (!arcpayClient) {
    const apiKey = process.env.ARCPAY_API_KEY;
    const environment = process.env.ARCPAY_ENV || 'production';
    const merchantId = process.env.ARCPAY_MERCHANT_ID;
    const checkoutBaseUrl = process.env.ARCPAY_CHECKOUT_BASE_URL || 'https://pay.arcpay.xyz';

    if (!apiKey) {
      throw new Error(
        'ARCPAY_API_KEY environment variable is required. ' +
        'Please set it in your .env file. ArcPay checkout features will be disabled.'
      );
    }

    arcpayClient = new ArcPayClient({
      apiKey,
      environment,
      merchantId,
      checkoutBaseUrl,
    });

    console.log('[ArcPay] Client initialized:', {
      environment,
      merchantId: merchantId || 'not set',
      checkoutBaseUrl,
    });
  }

  return arcpayClient;
}

/**
 * Create ArcPay checkout session for a payment intent
 * 
 * @param params Checkout creation parameters
 * @returns Checkout session details
 */
export async function createArcPayCheckout(params: {
  amount: number;
  currency: string;
  description?: string;
  userId: string;
  intentId: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{
  checkoutUrl: string;
  sessionId: string;
}> {
  const client = getArcPayClient();
  const appUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

  const session = await client.createCheckoutSession({
    amount: params.amount,
    currency: params.currency,
    description: params.description || `Payment for ${params.intentId}`,
    success_url: params.successUrl || `${appUrl}/checkout/success?intent=${params.intentId}`,
    cancel_url: params.cancelUrl || `${appUrl}/checkout/cancel?intent=${params.intentId}`,
    metadata: {
      intent_id: params.intentId,
      user_id: params.userId,
      source: 'omniagentpay',
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export type { ArcPayCheckoutSession, ArcPayCheckoutCreateParams };
