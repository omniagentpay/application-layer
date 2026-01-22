/**
 * Checkout Routes
 * 
 * API endpoints for generating ArcPay checkout payment links and QR codes.
 * These endpoints are called by the agent chat interface.
 */

import { Router } from 'express';
import { createCheckoutLink, createCheckoutQR } from '../services/arcpayCheckout.js';
import { userLimiter, strictLimiter } from '../lib/rate-limit.js';

export const checkoutRouter = Router();

/**
 * Generate checkout payment link
 * 
 * POST /api/checkout/link
 * 
 * Body:
 * {
 *   amount: number,
 *   currency: "USDC",
 *   description?: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   checkoutUrl: "https://arcpay.systems/checkout/...",
 *   sessionId: "cs_xxx",
 *   amount,
 *   currency
 * }
 */
checkoutRouter.post('/link', strictLimiter, userLimiter, async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number',
      });
    }

    // Create checkout link
    const checkout = await createCheckoutLink({
      amount,
      currency: currency || 'USDC',
      description,
    });

    // Log technical details for execution console
    console.log('[Checkout Link] Created:', {
      sessionId: checkout.sessionId,
      amount: checkout.amount,
      currency: checkout.currency,
      checkoutUrl: checkout.checkoutUrl,
    });

    res.json({
      success: true,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      amount: checkout.amount,
      currency: checkout.currency,
    });
  } catch (error) {
    console.error('[Checkout Link] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout link';

    // Check if it's a missing API key error
    if (errorMessage.includes('ARCPAY_SECRET_KEY') || errorMessage.includes('ARCPAY_API_KEY')) {
      return res.status(500).json({
        error: 'ArcPay not configured',
        message: 'ARCPAY_SECRET_KEY or ARCPAY_API_KEY environment variable is required. Please configure ArcPay merchant account.',
      });
    }

    res.status(500).json({
      error: 'Failed to create checkout link',
      message: errorMessage,
    });
  }
});

/**
 * Generate QR code checkout payment link
 * 
 * POST /api/checkout/qr
 * 
 * Body:
 * {
 *   amount: number,
 *   currency: "USDC",
 *   description?: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   checkoutUrl: "https://arcpay.systems/checkout/...",
 *   sessionId: "cs_xxx",
 *   qrCode: "data:image/png;base64,...",
 *   amount,
 *   currency
 * }
 */
checkoutRouter.post('/qr', strictLimiter, userLimiter, async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number',
      });
    }

    // Create checkout QR code
    const checkout = await createCheckoutQR({
      amount,
      currency: currency || 'USDC',
      description,
    });

    // Log technical details for execution console
    console.log('[Checkout QR] Created:', {
      sessionId: checkout.sessionId,
      amount: checkout.amount,
      currency: checkout.currency,
      checkoutUrl: checkout.checkoutUrl,
      qrCodeSize: checkout.qrCode.length,
    });

    res.json({
      success: true,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      qrCode: checkout.qrCode,
      amount: checkout.amount,
      currency: checkout.currency,
    });
  } catch (error) {
    console.error('[Checkout QR] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create QR payment link';

    // Check if it's a missing API key error
    if (errorMessage.includes('ARCPAY_SECRET_KEY') || errorMessage.includes('ARCPAY_API_KEY')) {
      return res.status(500).json({
        error: 'ArcPay not configured',
        message: 'ARCPAY_SECRET_KEY or ARCPAY_API_KEY environment variable is required. Please configure ArcPay merchant account.',
      });
    }

    res.status(500).json({
      error: 'Failed to create QR payment link',
      message: errorMessage,
    });
  }
});
