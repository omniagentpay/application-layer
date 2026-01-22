/**
 * Test script to verify ArcPay Gateway connection
 * Run with: node --loader tsx scripts/test-arcpay-connection.ts
 * Or: npm run test:arcpay (if added to package.json)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY;
const BASE_URL = process.env.ARCPAY_BASE_URL || 'https://arcpay.systems';

console.log('\n🧪 Testing ArcPay Gateway Connection\n');
console.log('Configuration:');
console.log(`  Base URL: ${BASE_URL}`);
console.log(`  API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log('');

if (!API_KEY) {
    console.error('❌ Error: ARCPAY_SECRET_KEY or ARCPAY_API_KEY not set in .env file');
    process.exit(1);
}

async function testConnection() {
    try {
        console.log('📡 Testing health endpoint...');
        const healthResponse = await fetch(`${BASE_URL}/api/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);

        if (healthResponse.ok) {
            const healthData = await healthResponse.text();
            console.log(`   ✅ Health check passed`);
            console.log(`   Response: ${healthData.substring(0, 100)}...\n`);
        } else {
            const errorText = await healthResponse.text();
            console.log(`   ⚠️  Health check returned non-200 status`);
            console.log(`   Error: ${errorText.substring(0, 200)}...\n`);
        }

        console.log('💳 Testing payment creation endpoint...');
        const paymentResponse = await fetch(`${BASE_URL}/api/payments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                amount: '10.00',
                currency: 'USDC',
                description: 'Test payment from omnipay-agent-dashboard',
            }),
        });

        console.log(`   Status: ${paymentResponse.status} ${paymentResponse.statusText}`);

        if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            console.log(`   ✅ Payment creation successful`);
            console.log(`   Payment ID: ${paymentData.id || 'N/A'}`);
            console.log(`   Checkout URL: ${paymentData.checkout_url || paymentData.checkoutUrl || 'N/A'}`);
            console.log('');
            console.log('🎉 All tests passed! ArcPay gateway is properly configured.\n');
        } else {
            const errorText = await paymentResponse.text();
            console.log(`   ❌ Payment creation failed`);
            console.log(`   Error: ${errorText.substring(0, 500)}\n`);

            // Try to parse as JSON for better error details
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                    console.log(`   Error message: ${errorJson.error}`);
                    if (errorJson.message) {
                        console.log(`   Details: ${errorJson.message}`);
                    }
                }
            } catch (e) {
                // Not JSON, already printed raw text
            }

            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Connection test failed:');
        console.error(error instanceof Error ? error.message : String(error));
        console.error('\nPossible causes:');
        console.error('  1. Network connectivity issues');
        console.error('  2. Invalid API key');
        console.error('  3. Gateway server is down');
        console.error(`  4. Incorrect BASE_URL: ${BASE_URL}\n`);
        process.exit(1);
    }
}

// Run the test
testConnection();
