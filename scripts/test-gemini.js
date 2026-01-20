/**
 * Test Gemini API Key and List Available Models
 * 
 * Usage: node scripts/test-gemini.js
 * 
 * Make sure VITE_GEMINI_API_KEY is set in your .env file
 * or pass it as an environment variable:
 * GEMINI_API_KEY=your_key node scripts/test-gemini.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config({ path: join(__dirname, '..', '.env') });

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: No API key found!');
  console.log('\nPlease set one of:');
  console.log('  - GEMINI_API_KEY in your .env file');
  console.log('  - VITE_GEMINI_API_KEY in your .env file');
  console.log('  - Or pass it as: GEMINI_API_KEY=your_key node scripts/test-gemini.js');
  process.exit(1);
}

console.log('🔑 API Key found:', API_KEY.substring(0, 10) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('');

const genAI = new GoogleGenerativeAI(API_KEY);

// List of models to test (updated with newer model names)
const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
  'gemini-pro-latest',
  'gemini-2.0-flash-exp',
];

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say "Hello" in one word.');
    const response = await result.response;
    const text = response.text();
    
    return {
      success: true,
      accessible: true,
      response: text.trim(),
    };
  } catch (error) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return {
        success: false,
        accessible: false,
        error: 'Model not found or not accessible',
      };
    } else if (error.message?.includes('403') || error.message?.includes('permission')) {
      return {
        success: false,
        accessible: false,
        error: 'Permission denied - API key may not have access',
      };
    } else if (error.message?.includes('429') || error.message?.includes('quota')) {
      return {
        success: false,
        accessible: false,
        error: 'Quota exceeded',
      };
    } else {
      return {
        success: false,
        accessible: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

async function listModelsFromAPI() {
  console.log('📡 Fetching available models from API...\n');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    if (models.length === 0) {
      console.log('⚠️  No models found via API listing.');
      return [];
    }
    
    // Filter models that support generateContent
    const supportedModels = models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.startsWith('gemini'));
    
    console.log(`✅ Found ${supportedModels.length} available Gemini models:\n`);
    supportedModels.forEach(model => {
      console.log(`   • ${model}`);
    });
    console.log('');
    
    return supportedModels;
  } catch (error) {
    console.log('⚠️  Could not fetch models from API:');
    console.log(`   ${error.message}\n`);
    return [];
  }
}

async function testBasicConnection(availableModels = []) {
  console.log('🧪 Testing basic API connection...\n');
  
  // Try models in order of preference
  const modelsToTry = availableModels.length > 0 
    ? availableModels 
    : ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro', 'gemini-1.5-pro'];
  
  let lastError = null;
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello');
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ API Key is valid and working with ${modelName}!`);
      console.log('📝 Test response:', text.trim());
      console.log('');
      return { success: true, workingModel: modelName };
    } catch (error) {
      lastError = error;
      // Try next model
      continue;
    }
  }
  
  console.log('❌ API Key test failed with all attempted models:');
  console.log('   Tried:', modelsToTry.join(', '));
  if (lastError) {
    console.log('   Last error:', lastError.message);
  }
  console.log('');
  return { success: false, workingModel: null };
}

async function listAvailableModels(modelsList = modelsToTest) {
  console.log('📋 Testing available models...\n');
  
  const results = [];
  
  for (const modelName of modelsList) {
    process.stdout.write(`   Testing ${modelName}... `);
    const result = await testModel(modelName);
    results.push({ model: modelName, ...result });
    
    if (result.accessible) {
      console.log('✅ Accessible');
    } else {
      console.log(`❌ ${result.error}`);
    }
  }
  
  console.log('\n');
  console.log('📊 Summary:');
  console.log('─'.repeat(60));
  
  const accessible = results.filter(r => r.accessible);
  const notAccessible = results.filter(r => !r.accessible);
  
  if (accessible.length > 0) {
    console.log('\n✅ Accessible Models:');
    accessible.forEach(r => {
      console.log(`   • ${r.model}`);
      if (r.response) {
        console.log(`     Sample response: "${r.response}"`);
      }
    });
  }
  
  if (notAccessible.length > 0) {
    console.log('\n❌ Not Accessible:');
    notAccessible.forEach(r => {
      console.log(`   • ${r.model} - ${r.error}`);
    });
  }
  
  console.log('\n');
  console.log('💡 Recommended model for this project:');
  if (accessible.find(r => r.model.includes('1.5-pro'))) {
    console.log('   → gemini-1.5-pro (best for function calling)');
  } else if (accessible.find(r => r.model.includes('1.5-flash'))) {
    console.log('   → gemini-1.5-flash (faster, good for function calling)');
  } else if (accessible.length > 0) {
    console.log(`   → ${accessible[0].model} (first available)`);
  } else {
    console.log('   → No accessible models found. Check your API key permissions.');
  }
  
  return results;
}

async function main() {
  console.log('🚀 Gemini API Key Tester\n');
  console.log('='.repeat(60));
  console.log('');
  
  // First, try to list available models from the API
  const availableModels = await listModelsFromAPI();
  
  // Test basic connection with available models
  const basicTest = await testBasicConnection(availableModels);
  
  if (!basicTest.success) {
    console.log('⚠️  Basic connection failed. Trying individual model tests...\n');
  }
  
  // Test all models (use API list if available, otherwise use our list)
  const modelsToTestList = availableModels.length > 0 ? availableModels : modelsToTest;
  const results = await listAvailableModels(modelsToTestList);
  
  // Save results to a file for reference
  const accessibleModels = results.filter(r => r.accessible).map(r => r.model);
  
  if (accessibleModels.length > 0) {
    console.log('💾 Accessible models saved to: .gemini-models.json');
    writeFileSync(
      join(__dirname, '..', '.gemini-models.json'),
      JSON.stringify({ 
        accessibleModels, 
        workingModel: basicTest.workingModel,
        testedAt: new Date().toISOString() 
      }, null, 2)
    );
  }
  
  console.log('\n✨ Test complete!');
  
  if (accessibleModels.length === 0) {
    console.log('\n⚠️  No accessible models found.');
    console.log('   Please check:');
    console.log('   1. Your API key is valid and active');
    console.log('   2. Billing is enabled (if required)');
    console.log('   3. The Gemini API is enabled in your Google Cloud project');
    process.exit(1);
  }
}

main().catch(console.error);
