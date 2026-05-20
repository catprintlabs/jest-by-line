# jest-by-line

Run a single Jest test by file and line number — just like RSpec.

```bash
jest-by-line api:60
```

## Installation

```bash
npm install -g jest-by-line
```

## Usage

```bash
jest-by-line <file>:<line> [--debug]
```

Point at any line inside or near a test and it will run that test. You don't need to know the exact test name.

```bash
# Short name — searches for api.test.js / api.spec.js etc. in your project
jest-by-line api:60

# Explicit path
jest-by-line tests/api.test.js:60

# Attach Chrome DevTools inspector (pauses before running)
jest-by-line api:60 --debug
```

## How it works

1. Searches recursively from your current directory for a file matching the name you gave (trying `.test.js`, `.spec.js`, `.test.ts`, `.spec.ts`, and other common extensions)
2. Parses the file to find all `test(...)` and `it(...)` calls and their line numbers
3. Runs the test at or before the line you specified
4. Finds your local Jest binary automatically (walks up from cwd), falls back to global Jest or `npx jest`

## Options

| Flag | Description |
|------|-------------|
| `--debug` | Attach Chrome DevTools inspector (`--inspect-brk`) |
| `--version` | Show version |
| `--help` | Show help |

## Examples

```bash
# Run the test nearest to line 60 in api.test.js
jest-by-line api:60

# Run the test nearest to line 30 in auth.test.js
jest-by-line auth:30

# Use the full path
jest-by-line src/__tests__/users.test.ts:120

# Debug with Chrome inspector
jest-by-line api:60 --debug
# Then open chrome://inspect in Chrome
```

## Development

```bash
npm test             # run all tests
npm test -- --verbose  # with per-test output
```

## License

MIT
