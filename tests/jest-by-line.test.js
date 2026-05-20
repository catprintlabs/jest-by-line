// Tests for jest-by-line
// Uses a real fixture test file so we test actual file discovery and line parsing

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BIN      = path.resolve(__dirname, '../bin/jest-by-line.js');
const FIXTURES = path.resolve(__dirname, 'fixtures');

function run(...args) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: FIXTURES,
    encoding: 'utf8',
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
describe('--help', () => {
  test('exits 0 and prints usage', () => {
    const { stdout, status } = run('--help');
    expect(status).toBe(0);
    expect(stdout).toMatch(/jest-by-line/);
    expect(stdout).toMatch(/Usage/);
  });
});

describe('--version', () => {
  test('exits 0 and prints a semver string', () => {
    const { stdout, status } = run('--version');
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('no arguments', () => {
  test('exits 0 and prints help', () => {
    const { stdout, status } = run();
    expect(status).toBe(0);
    expect(stdout).toMatch(/Usage/);
  });
});

// ---------------------------------------------------------------------------
// Argument validation
// ---------------------------------------------------------------------------
describe('missing line number', () => {
  test('exits 1 with error message', () => {
    const { stderr, status } = run('api');
    expect(status).toBe(1);
    expect(stderr).toMatch(/line number required/);
  });
});

describe('invalid line number', () => {
  test('exits 1 with error message', () => {
    const { stderr, status } = run('api:abc');
    expect(status).toBe(1);
    expect(stderr).toMatch(/invalid line number/);
  });
});

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
describe('file not found', () => {
  test('exits 1 with error message', () => {
    const { stderr, status } = run('nonexistent:10');
    expect(status).toBe(1);
    expect(stderr).toMatch(/no test file found/);
  });
});

describe('file discovery by short name', () => {
  test('finds sample.test.js from short name "sample"', () => {
    const { stdout, status } = run('sample:1');
    expect(stdout).toMatch(/sample\.test\.js/);
  });
});

describe('file discovery by explicit path', () => {
  test('finds file when full relative path is given', () => {
    const { stdout } = run('unit/sample.test.js:1');
    expect(stdout).toMatch(/sample\.test\.js/);
  });
});

// ---------------------------------------------------------------------------
// Line-to-test resolution
// ---------------------------------------------------------------------------
describe('line resolution', () => {
  test('resolves line 1 to the first test', () => {
    const { stdout } = run('sample:1');
    expect(stdout).toMatch(/adds numbers/);
  });

  test('resolves a line inside a test block to that test', () => {
    // line 3 is inside "adds numbers"
    const { stdout } = run('sample:3');
    expect(stdout).toMatch(/adds numbers/);
  });

  test('resolves a line past the first test to the nearest preceding test', () => {
    // line 7 is inside "subtracts numbers"
    const { stdout } = run('sample:7');
    expect(stdout).toMatch(/subtracts numbers/);
  });

  test('resolves a line in the second describe block', () => {
    // line 13 is inside "concatenates"
    const { stdout } = run('sample:13');
    expect(stdout).toMatch(/concatenates/);
  });

  test('resolves a line beyond the last test to the last test', () => {
    const { stdout } = run('sample:999');
    expect(stdout).toMatch(/concatenates/);
  });
});
