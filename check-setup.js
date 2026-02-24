#!/usr/bin/env node

/**
 * TourBoost Setup Checker
 * Run this to verify your environment is configured correctly
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 TourBoost Setup Checker\n');
console.log('='.repeat(50));

let allGood = true;

// Check 1: .env.local exists
console.log('\n1. Checking .env.local file...');
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('   ❌ .env.local file not found');
  console.log('   → Run: cp .env.local.example .env.local');
  allGood = false;
} else {
  console.log('   ✅ .env.local exists');

  // Check 2: Environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');

  console.log('\n2. Checking environment variables...');

  // Viator API Key
  const hasViatorKey = envContent.includes('VIATOR_API_KEY=') &&
                       !envContent.includes('VIATOR_API_KEY=your_viator_api_key_here');
  if (hasViatorKey) {
    console.log('   ✅ VIATOR_API_KEY is set');
  } else {
    console.log('   ⚠️  VIATOR_API_KEY needs to be configured');
    console.log('   → Get your key from Viator Partner Program');
    allGood = false;
  }

  // Anthropic API Key
  const hasAnthropicKey = envContent.includes('ANTHROPIC_API_KEY=') &&
                          !envContent.includes('ANTHROPIC_API_KEY=your_anthropic_api_key_here');
  if (hasAnthropicKey) {
    console.log('   ✅ ANTHROPIC_API_KEY is set');
  } else {
    console.log('   ⚠️  ANTHROPIC_API_KEY needs to be configured');
    console.log('   → Get your key from https://console.anthropic.com/');
    allGood = false;
  }

  // Database URL
  const hasDatabaseUrl = envContent.includes('DATABASE_URL=postgresql://') &&
                         !envContent.includes('DATABASE_URL=postgresql://user:password@localhost');
  if (hasDatabaseUrl) {
    console.log('   ✅ DATABASE_URL is configured');
  } else {
    console.log('   ⚠️  DATABASE_URL needs to be configured');
    console.log('   → Update with your PostgreSQL credentials');
    allGood = false;
  }
}

// Check 3: Node modules
console.log('\n3. Checking dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('   ❌ node_modules not found');
  console.log('   → Run: npm install');
  allGood = false;
} else {
  console.log('   ✅ Dependencies installed');
}

// Check 4: Database migration files
console.log('\n4. Checking database setup...');
const drizzlePath = path.join(__dirname, 'drizzle');
if (!fs.existsSync(drizzlePath)) {
  console.log('   ⚠️  Database schema not pushed yet');
  console.log('   → Run: npm run db:push');
  allGood = false;
} else {
  console.log('   ✅ Database schema files exist');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('\n✅ All checks passed! You\'re ready to run TourBoost.\n');
  console.log('Next steps:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:3000');
  console.log('  3. Paste a Viator tour URL and analyze!\n');
} else {
  console.log('\n⚠️  Some configuration needed. See messages above.\n');
  console.log('Quick setup:');
  console.log('  1. Add API keys to .env.local');
  console.log('  2. createdb tourboost');
  console.log('  3. npm run db:push');
  console.log('  4. npm run dev\n');
  console.log('📖 For detailed help, see QUICKSTART.md\n');
}

process.exit(allGood ? 0 : 1);
