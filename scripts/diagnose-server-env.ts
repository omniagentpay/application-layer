/**
 * Server environment diagnostic
 * Run this to see what environment variables the backend server sees
 */

// Simulate how the backend server loads the .env
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// mimic exactly what server/index.ts does
const envPath = resolve(__dirname, '../.env');
console.log('\n📍 Loading .env from:', envPath);
console.log('');

const result = config({ path: envPath });

if (result.error) {
    console.error('❌ Error loading .env:', result.error);
    process.exit(1);
}

console.log('✅ .env file loaded successfully\n');

// Check the exact variables the server needs
const checks = {
    'ARCPAY_SECRET_KEY': process.env.ARCPAY_SECRET_KEY,
    'ARCPAY_API_KEY': process.env.ARCPAY_API_KEY,
    'ARCPAY_BASE_URL': process.env.ARCPAY_BASE_URL,
    'ARCPAY_ENV': process.env.ARCPAY_ENV,
    'AGENT_CIRCLE_WALLET_ID': process.env.AGENT_CIRCLE_WALLET_ID,
};

console.log('Environment Variables (as server sees them):\n');

Object.entries(checks).forEach(([name, value]) => {
    if (value) {
        const displayValue = name.includes('KEY') || name.includes('SECRET')
            ? value.substring(0, 20) + '...'
            : value;
        console.log(`  ✅ ${name} = ${displayValue}`);
    } else {
        console.log(`  ❌ ${name} = undefined`);
    }
});

console.log('');

// Check what getArcPayClient would see
const apiKey = process.env.ARCPAY_SECRET_KEY || process.env.ARCPAY_API_KEY;
const baseUrl = process.env.ARCPAY_BASE_URL || 'https://arcpay.systems';
const environment = process.env.ARCPAY_ENV || 'testnet';

console.log('ArcPay Client Configuration (what arcpayCheckout.ts sees):\n');
console.log(`  API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : '❌ NOT SET'}`);
console.log(`  Base URL: ${baseUrl}`);
console.log(`  Environment: ${environment}`);
console.log('');

if (!apiKey) {
    console.log('❌ PROBLEM FOUND: API key is not being loaded!');
    console.log('');
    console.log('This is why the gateway returns "Provide API key" error.');
    console.log('');
    console.log('Solution: The backend server needs to be restarted.');
    console.log('1. Stop the server (Ctrl+C)');
    console.log('2. Run: npm run dev');
    console.log('');
} else {
    console.log('✅ All ArcPay configuration looks good!');
    console.log('');
    console.log('If you still get API key errors:');
    console.log('1. Make sure the backend server has been restarted');
    console.log('2. Check that arcpayCheckout.ts is using the correct env vars');
    console.log('');
}
