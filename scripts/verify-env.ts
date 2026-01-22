/**
 * Quick env verification script
 * Checks if ARCPAY environment variables are loaded correctly
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

console.log('\n🔍 Checking Environment Variables\n');
console.log(`Loading from: ${envPath}\n`);

// Load .env file
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
    process.exit(1);
}

// Check required variables
const checks = [
    { name: 'ARCPAY_SECRET_KEY', required: true },
    { name: 'ARCPAY_BASE_URL', required: true },
    { name: 'ARCPAY_ENV', required: false },
    { name: 'VITE_API_URL', required: false },
];

let allGood = true;

checks.forEach(({ name, required }) => {
    const value = process.env[name];
    if (value) {
        // Mask sensitive values
        const displayValue = name.includes('KEY') || name.includes('SECRET')
            ? value.substring(0, 20) + '...'
            : value;
        console.log(`✅ ${name}: ${displayValue}`);
    } else {
        const status = required ? '❌' : '⚠️';
        console.log(`${status} ${name}: NOT SET ${required ? '(REQUIRED)' : '(optional)'}`);
        if (required) allGood = false;
    }
});

console.log('');

if (allGood) {
    console.log('✅ All required environment variables are set!');
    console.log('');
    console.log('🎯 ArcPay Configuration:');
    console.log(`   Gateway URL: ${process.env.ARCPAY_BASE_URL}`);
    console.log(`   Environment: ${process.env.ARCPAY_ENV || 'default (testnet)'}`);
    console.log(`   API Key: ${process.env.ARCPAY_SECRET_KEY?.substring(0, 15)}...`);
    console.log('');
    console.log('✨ Ready to generate payment links!\n');
} else {
    console.log('❌ Missing required environment variables. Please check your .env file.\n');
    process.exit(1);
}
