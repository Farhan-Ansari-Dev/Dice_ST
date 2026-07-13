#!/usr/bin/env node
/**
 * Postinstall patches applied after every npm install:
 * 1. Injects DOMException polyfill into RN's setUpGlobals.js
 *    (must run before RN's webapis, which reference DOMException)
 */
const fs = require('fs');
const path = require('path');

// --- Patch 1: DOMException polyfill in setUpGlobals.js ---
const setUpGlobalsPath = path.join(
  __dirname, '..', 'node_modules', 'react-native',
  'Libraries', 'Core', 'setUpGlobals.js'
);

const DOMEXCEPTION_POLYFILL = `
// DOMException polyfill (injected by postinstall)
if (typeof global.DOMException === 'undefined') {
  function DOMException(message, name) {
    this.message = message || '';
    this.name = name || 'Error';
    this.code = 0;
  }
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;
  global.DOMException = DOMException;
}
`;

try {
  let content = fs.readFileSync(setUpGlobalsPath, 'utf8');
  if (!content.includes('DOMException polyfill')) {
    // Insert after the first global.window setup block
    content = content.replace(
      "if (global.window === undefined) {",
      DOMEXCEPTION_POLYFILL + "\nif (global.window === undefined) {"
    );
    fs.writeFileSync(setUpGlobalsPath, content);
    console.log('✅ DOMException polyfill patched into setUpGlobals.js');
  } else {
    console.log('  DOMException patch already applied');
  }
} catch (e) {
  console.log('⚠️  Could not patch setUpGlobals.js:', e.message);
}

// --- Patch 2: Fix TS parameter property in expo/src/winter/TextDecoder.ts ---
// `constructor(private options: ...)` is a TypeScript parameter property that
// plugin-transform-classes can't handle after the TS strip.
const textDecoderPath = path.join(
  __dirname, '..', 'node_modules', 'expo', 'src', 'winter', 'TextDecoder.ts'
);
try {
  let src = fs.readFileSync(textDecoderPath, 'utf8');
  if (src.includes('constructor(private options:')) {
    src = src.replace(
      'constructor(private options: { fatal: boolean }) {}',
      'constructor(options: { fatal: boolean }) { this.options = options; }'
    );
    fs.writeFileSync(textDecoderPath, src);
    console.log('✅ TextDecoder.ts private parameter patched');
  } else {
    console.log('  TextDecoder.ts patch already applied');
  }
} catch (e) {
  console.log('⚠️  Could not patch TextDecoder.ts:', e.message);
}

// --- Patch 3: Strip TS access modifiers from expo/src constructor params ---
try {
  const { execSync } = require('child_process');
  execSync('python3 ' + path.join(__dirname, 'patch-ts-params.py'), { stdio: 'inherit' });
} catch (e) {
  console.log('⚠️  Could not run patch-ts-params.py:', e.message);
}

// --- Patch 4: Make Event.js phase constants writable+configurable ---
// RN 0.81 defines Event.NONE etc. as non-writable, which conflicts with
// Babel's loose class field transform (this.NONE = void 0).
const eventPath = path.join(
  __dirname, '..', 'node_modules', 'react-native',
  'src', 'private', 'webapis', 'dom', 'events', 'Event.js'
);
try {
  let src = fs.readFileSync(eventPath, 'utf8');
  const before = src;
  src = src.replace(
    /Object\.defineProperty\((Event|Event\.prototype), '(NONE|CAPTURING_PHASE|AT_TARGET|BUBBLING_PHASE)', \{\s*enumerable: true,\s*value: (\d+),?\s*\}\);/g,
    "Object.defineProperty($1, '$2', { enumerable: true, value: $3, writable: true, configurable: true });"
  );
  if (src !== before) {
    fs.writeFileSync(eventPath, src);
    console.log('✅ Event.js phase constants patched');
  } else {
    console.log('  Event.js patch already applied');
  }
} catch (e) {
  console.log('⚠️  Could not patch Event.js:', e.message);
}
