---
name: test
description: Run tests quickly — optionally filtered by pattern. Lighter than /verify (no lint, no build).
user_invocable: true
argument-hint: "[pattern]"
---

# Run tests

Run the Vitest test suite. If a pattern argument is given, run only matching tests.

## Steps

1. If argument provided (e.g., `/test dedup`):
   - Run `npx vitest run --reporter=verbose {pattern}`
2. If no argument:
   - Run `npm test`
3. Report results:
   - Total passed / failed / skipped
   - If failures: show the failing test names and assertion errors
   - If all pass: one-line confirmation

## Rules
- Never modify test files — just run and report
- If tests fail, suggest fixes but don't auto-apply
