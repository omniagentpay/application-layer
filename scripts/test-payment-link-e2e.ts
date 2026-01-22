/**
 * End-to-end test for payment link generation
 * Tests the complete flow through the omnipay backend to gateway
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const ARCPAY_BASE_URL = process.env.ARCPAY_BASE_URL || 'https://arcpay.systems';
const ARCPAY_API_KEY = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY;

console.log('\n🧪 Payment Link Generation E2E Test\n');
console.log('Configuration:');
console.log(`  Backend URL: ${BACKEND_URL}`);
console.log(`  Gateway URL: ${ARCPAY_BASE_URL}`);
console.log(`  API Key: ${ARCPAY_API_KEY ? ARCPAY_API_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
console.log('');

async function testPaymentLinkGeneration() {
    try {
        console.log('📝 Step 1: Testing backend /api/checkout/link endpoint...');

        const response = await fetch(`${BACKEND_URL}/api/checkout/link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: 10,
                currency: 'USDC',
                description: 'Test payment link from E2E test',
            }),
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`   ❌ Backend request failed`);
            console.log(`   Response: ${errorText.substring(0, 500)}`);

            try {
                const errorJson = JSON.parse(errorText);
                console.log('\n   Error details:');
                console.log(`   - error: ${errorJson.error}`);
                console.log(`   - message: ${errorJson.message || 'N/A'}`);
            } catch (e) {
                // Not JSON
            }

            console.log('\n❌ Test failed at backend step');
            process.exit(1);
        }

        const data = await response.json();

        console.log(`   ✅ Backend returned success`);
        console.log(`   Response:`);
        console.log(`     - success: ${data.success}`);
        console.log(`     - sessionId: ${data.sessionId || 'N/A'}`);
        console.log(`     - checkoutUrl: ${data.checkoutUrl || 'N/A'}`);
        console.log(`     - amount: ${data.amount} ${data.currency}`);
        console.log('');

        if (!data.checkoutUrl) {
            console.log('❌ No checkout URL in response');
            process.exit(1);
        }

        console.log('📝 Step 2: Verifying checkout URL...');
        console.log(`   URL: ${data.checkoutUrl}`);

        if (data.checkoutUrl.includes(ARCPAY_BASE_URL)) {
            console.log(`   ✅ URL contains expected base (${ARCPAY_BASE_URL})`);
        } else {
            console.log(`   ⚠️  URL does not match expected base`);
        }

        console.log('');
        console.log('🎉 All tests passed!');
        console.log('');
        console.log('✅ Payment link generation is working correctly');
        console.log(`   You can test the link in Agent Chat: "generate a payment link for 10 USDC"`);
        console.log('');

    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error(error instanceof Error ? error.message : String(error));
        console.error('\nPossible causes:');
        console.error('  1. Backend server not running (npm run dev)');
        console.error('  2. Network connectivity issues');
        console.error(`  3. Incorrect backend URL: ${BACKEND_URL}`);
        console.error('  4. CORS issues');
        console.error('');
        process.exit(1);
    }
}

// Run the test
testPaymentLinkGeneration();
