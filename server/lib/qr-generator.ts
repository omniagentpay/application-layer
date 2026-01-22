/**
 * QR Code Generator Utility
 * 
 * Generates QR codes for payment checkout URLs.
 * QR codes encode the hosted checkout URL and are wallet-agnostic.
 */

import QRCode from 'qrcode';

/**
 * Generate QR code as data URL (base64 image)
 * 
 * @param url URL to encode in QR code
 * @param options QR code generation options
 * @returns Data URL string (can be used directly in <img src>)
 */
export async function generateQRCodeDataURL(
  url: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const qrOptions = {
    width: options?.width || 300,
    margin: options?.margin || 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  };

  try {
    const dataURL = await QRCode.toDataURL(url, qrOptions);
    return dataURL;
  } catch (error) {
    console.error('[QR Generator] Failed to generate QR code:', error);
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate QR code as SVG string
 * 
 * @param url URL to encode in QR code
 * @param options QR code generation options
 * @returns SVG string
 */
export async function generateQRCodeSVG(
  url: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const qrOptions = {
    width: options?.width || 300,
    margin: options?.margin || 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  };

  try {
    const svg = await QRCode.toString(url, { type: 'svg', ...qrOptions });
    return svg;
  } catch (error) {
    console.error('[QR Generator] Failed to generate QR code SVG:', error);
    throw new Error(`Failed to generate QR code SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate QR code for payment checkout URL
 * 
 * @param checkoutUrl ArcPay hosted checkout URL
 * @returns QR code data URL
 */
export async function generatePaymentQRCode(checkoutUrl: string): Promise<string> {
  return generateQRCodeDataURL(checkoutUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
