#!/usr/bin/env node

/**
 * Post-build script to replace @shared/* imports with relative paths
 */

const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace require("@shared/...") with relative path
  let newContent = content.replace(
    /require\("@shared\/(.*?)"\)/g,
    (match, p1) => {
      modified = true;
      return `require("../shared/${p1}")`;
    }
  );
  
  // Also handle ES6 import statements (though we use CommonJS)
  newContent = newContent.replace(
    /from\s+["']@shared\/(.*?)["']/g,
    (match, p1) => {
      modified = true;
      return `from "../shared/${p1}"`;
    }
  );
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed paths in: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js')) {
      replaceInFile(filePath);
    }
  });
}

// Start from dist/server directory
const distPath = path.join(__dirname, 'dist', 'server');
if (fs.existsSync(distPath)) {
  console.log('Fixing @shared imports in compiled files...');
  walkDir(distPath);
  console.log('Done!');
} else {
  console.error(`dist/server directory not found at: ${distPath}`);
  console.error('Please run "tsc" first to compile the TypeScript files.');
  process.exit(1);
}
