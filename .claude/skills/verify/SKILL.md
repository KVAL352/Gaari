---
name: verify
description: Run the full pre-deploy verification pipeline — lint, type check, tests, and build
disable-model-invocation: true
allowed-tools: Bash(npm run *)
---

# Pre-deploy verification

Run the full verification pipeline and report results.

## Pipeline

Run these sequentially — stop on first failure:

1. **Lint**: `npm run lint`
   - 0 errors required (warnings are OK)
   - If errors in `scripts/`: check if they're real issues or false positives from new ESLint coverage

2. **Type check**: `npm run check`
   - 0 errors required (threshold is set to error)
   - Common issue: missing env vars in `.env` — check against `.env.ci` for required vars

3. **Tests**: `npm test`
   - All 355 tests must pass
   - Test files are in `src/lib/__tests__/` and `scripts/lib/__tests__/`

4. **Build**: `npm run build`
   - Must complete without errors
   - Note: requires all `$env/static/private` vars to be set (ADMIN_PASSWORD, ADMIN_SESSION_SECRET, RESEND_API_KEY, etc.)
   - If build fails on missing env vars, that's a local env issue — not a code problem

## Report format

Summarize results:
- Lint: PASS/FAIL (X errors, Y warnings)
- Type check: PASS/FAIL (X errors)
- Tests: PASS/FAIL (X/208 passed)
- Build: PASS/FAIL

If all pass: "Ready to deploy."
If any fail: explain what failed and suggest fixes.
