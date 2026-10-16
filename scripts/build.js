import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read modules
const rulesContent = fs.readFileSync(path.join(rootDir, 'src', 'rules.js'), 'utf-8');
const classifierContent = fs.readFileSync(path.join(rootDir, 'src', 'classifier.js'), 'utf-8');
const engineContent = fs.readFileSync(path.join(rootDir, 'src', 'engine.js'), 'utf-8');
const indexContent = fs.readFileSync(path.join(rootDir, 'src', 'index.js'), 'utf-8');

// Helper to strip imports and export keywords for unified bundle
function stripImportsAndExports(code) {
  return code
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^export\s+default\s+.*?;?\s*$/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
}

const cleanedRules = stripImportsAndExports(rulesContent);
const cleanedClassifier = stripImportsAndExports(classifierContent);
const cleanedEngine = stripImportsAndExports(engineContent);
const cleanedIndex = stripImportsAndExports(indexContent);

const coreCode = `
${cleanedRules}

${cleanedClassifier}

${cleanedEngine}

${cleanedIndex}
`;

// 1. IIFE / Browser Standalone Bundle
const browserBundle = `/**
 * iframe-shield v1.0.0
 * Lightweight ad-blocking & iframe sanitization engine for web developers
 * Developed by JOJIN JOHN
 * (c) 2026 MIT License
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IframeShield = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';
${coreCode}
  return IframeShield;
}));
`;

// 2. ESM Bundle
const esmBundle = `/**
 * iframe-shield v1.0.0 (ES Module)
 * Developed by JOJIN JOHN
 * (c) 2026 MIT License
 */
${coreCode}
export { IframeShield, DEFAULT_TRUSTED_DOMAINS, DEFAULT_AD_DOMAINS };
export default IframeShield;
`;

// 3. CommonJS Bundle
const cjsBundle = `/**
 * iframe-shield v1.0.0 (CommonJS)
 * Developed by JOJIN JOHN
 * (c) 2026 MIT License
 */
${coreCode}
module.exports = IframeShield;
module.exports.IframeShield = IframeShield;
module.exports.DEFAULT_TRUSTED_DOMAINS = DEFAULT_TRUSTED_DOMAINS;
module.exports.DEFAULT_AD_DOMAINS = DEFAULT_AD_DOMAINS;
`;

fs.writeFileSync(path.join(distDir, 'iframe-shield.min.js'), browserBundle);
fs.writeFileSync(path.join(distDir, 'iframe-shield.esm.js'), esmBundle);
fs.writeFileSync(path.join(distDir, 'iframe-shield.cjs.js'), cjsBundle);

console.log('✅ Successfully built:');
console.log(' - dist/iframe-shield.min.js (Browser IIFE / <script> tag)');
console.log(' - dist/iframe-shield.esm.js (Modern ES Module)');
console.log(' - dist/iframe-shield.cjs.js (CommonJS / Node)');
