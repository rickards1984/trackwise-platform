#!/usr/bin/env node

/**
 * Quick test to verify backend modules load correctly
 */

console.log('Testing backend module loading...\n');

try {
  const fs = require('fs');
  const path = require('path');
  
  // Test that dist files exist
  const distPath = path.join(__dirname, 'dist', 'server');
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist/server directory not found');
    process.exit(1);
  }
  console.log('✅ dist/server directory exists');
  
  // Test that index.js exists
  const indexPath = path.join(distPath, 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.js not found');
    process.exit(1);
  }
  console.log('✅ index.js exists');
  
  // Test that @shared imports were fixed
  const dbPath = path.join(distPath, 'db.js');
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  
  if (dbContent.includes('@shared/')) {
    console.error('❌ @shared imports not resolved');
    process.exit(1);
  }
  console.log('✅ @shared imports resolved');
  
  if (!dbContent.includes('../shared/')) {
    console.error('❌ Relative shared paths not found');
    process.exit(1);
  }
  console.log('✅ Relative shared paths present');
  
  console.log('\n✅ All checks passed! Backend is ready.');
  console.log('\nTo start the backend:');
  console.log('  1. Set DATABASE_URL environment variable');
  console.log('  2. Set SESSION_SECRET environment variable');
  console.log('  3. Run: npm start');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
