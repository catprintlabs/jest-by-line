#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const VERSION = require('../package.json').version;

const args     = process.argv.slice(2);
const debug    = args.includes('--debug');
const showHelp = args.includes('--help') || args.includes('-h');
const showVer  = args.includes('--version') || args.includes('-v');
const posArgs  = args.filter(a => !a.startsWith('--') && a !== '-h' && a !== '-v');

if (showVer) { console.log(VERSION); process.exit(0); }

if (showHelp || posArgs.length === 0) {
  console.log(`
jest-by-line v${VERSION}
Run a single Jest test by file and line number — like RSpec.

Usage:
  jest-by-line <file>:<line> [--debug]

Arguments:
  <file>   Test file name (with or without path/extension)
  <line>   Line number inside the file

Options:
  --debug    Attach Chrome DevTools inspector (pauses at start)
  --help     Show this help
  --version  Show version

Examples:
  jest-by-line api:60
  jest-by-line auth:30
  jest-by-line tests/api.test.js:60
  jest-by-line api:60 --debug
`);
  process.exit(0);
}

const arg      = posArgs[0];
const colonIdx = arg.lastIndexOf(':');
if (colonIdx === -1) {
  console.error('Error: line number required. Example: jest-by-line api:60');
  process.exit(1);
}

const fileArg = arg.slice(0, colonIdx);
const lineNum = parseInt(arg.slice(colonIdx + 1), 10);
if (isNaN(lineNum)) {
  console.error(`Error: invalid line number "${arg.slice(colonIdx + 1)}"`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Find the test file — search recursively from cwd
// ---------------------------------------------------------------------------
const TEST_EXTENSIONS = [
  '.test.js',  '.spec.js',
  '.test.ts',  '.spec.ts',
  '.test.jsx', '.spec.jsx',
  '.test.tsx', '.spec.tsx',
  '.test.mjs', '.spec.mjs',
];

function findTestFiles(name, searchRoot) {
  if (fs.existsSync(name))              return [path.resolve(name)];
  if (fs.existsSync(path.resolve(name))) return [path.resolve(name)];

  const results = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (entry.name === name) { results.push(full); continue; }
        for (const ext of TEST_EXTENSIONS) {
          if (entry.name === `${name}${ext}`) { results.push(full); break; }
        }
      }
    }
  }

  walk(searchRoot);
  return results;
}

const cwd     = process.cwd();
const matches = findTestFiles(fileArg, cwd);

if (matches.length === 0) {
  console.error(`Error: no test file found matching "${fileArg}"`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`Error: multiple matches — be more specific:\n  ${matches.join('\n  ')}`);
  process.exit(1);
}

const filePath = matches[0];

// ---------------------------------------------------------------------------
// Find the test name at or before the given line
// ---------------------------------------------------------------------------
const source  = fs.readFileSync(filePath, 'utf8');
const lines   = source.split('\n');
const tests   = [];
const TEST_RE = /^\s*(?:test|it)\s*\(\s*(['"`])(.*?)\1/;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(TEST_RE);
  if (match) tests.push({ line: i + 1, name: match[2] });
}

if (tests.length === 0) {
  console.error(`Error: no tests found in ${filePath}`);
  process.exit(1);
}

let target = tests[0];
for (const t of tests) {
  if (t.line <= lineNum) target = t;
  else break;
}

console.log(`\nRunning: "${target.name}"`);
console.log(`  File:  ${path.relative(cwd, filePath)}`);
console.log(`  Line:  ${target.line}\n`);

// ---------------------------------------------------------------------------
// Find jest binary — walk up from cwd, then global, then npx
// ---------------------------------------------------------------------------
function findJest() {
  let dir = cwd;
  while (true) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'jest');
    if (fs.existsSync(candidate)) return { bin: process.execPath, jestArgs: [candidate] };
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  try { execSync('jest --version', { stdio: 'ignore' }); return { bin: 'jest', jestArgs: [] }; } catch {}
  return { bin: 'npx', jestArgs: ['jest'] };
}

const jest     = findJest();
const jestArgs = [...jest.jestArgs, '--runInBand', '--forceExit', '--verbose', filePath, '-t', target.name];
const nodeArgs = (jest.bin === process.execPath && debug)
  ? ['--inspect-brk', ...jestArgs]
  : jestArgs;

const result = spawnSync(jest.bin, nodeArgs, { stdio: 'inherit', cwd });
process.exit(result.status ?? 1);
