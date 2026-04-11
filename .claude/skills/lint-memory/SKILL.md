---
name: lint-memory
description: Health-check the memory and docs system — find broken references, stale data, derivable info that drifted from code. Run periodically to keep the knowledge base honest.
user-invocable: true
argument-hint: "[quick | full]"
---

# Memory & Docs Lint

Run a health check on the project's knowledge system. Find problems before they cause wrong assumptions.

**Mode: $ARGUMENTS** (default: quick)

---

## Quick lint (default)

Run these checks and report a table of findings:

### 1. Broken references
- Read `MEMORY.md` — does every linked file exist on disk?
- For each memory file, check internal `[links](file.md)` — do the targets exist?
- Report: file, broken link, suggested fix

### 2. Orphan files
- List all `.md` files in the memory directory
- Are any missing from `MEMORY.md`?
- Report: orphan files

### 3. Stale data flags
- For each memory file with `type: project`, check `last_verified` in frontmatter
- If `last_verified` is older than 21 days: flag as stale
- If `last_verified` is missing: flag as "needs verification date"
- Report: file, last_verified date, days since, recommendation (verify/update/archive)
- After fixing stale files, update their `last_verified` to today

### 4. CLAUDE.md drift check
- Run `npx vitest run --reporter=verbose 2>&1 | tail -3` to get actual test count
- Run `ls scripts/scrapers/*.ts | wc -l` to get actual scraper count
- Run `grep -c "^  {" src/lib/collections.ts` or similar to get collection count
- Compare against any hardcoded numbers in CLAUDE.md and `.claude/docs/`
- Report: claimed vs actual for each metric

---

## Full lint (additional checks)

Everything in quick, plus:

### 5. Cross-reference consistency
- Do outreach-active/agreements/declined/strategy files have consistent cross-links?
- Does decisions-log.md reference files that still exist?
- Do skill files reference memory files that exist?

### 6. Duplicate information
- Scan for the same fact stated in multiple memory files (e.g., "74 kontakter" appearing in 3 files)
- Flag candidates for single-source-of-truth consolidation

### 7. Derivable info in docs
- Check `.claude/docs/` files for hardcoded counts (scraper count, test count, collection count, route count)
- Flag any that should reference code instead

---

## Output format

```
## Lint results — [date]

### Broken references: X found
| File | Broken link | Fix |
|------|-------------|-----|

### Orphan files: X found
| File | Recommendation |
|------|---------------|

### Stale data: X flagged
| File | Age | Recommendation |
|------|-----|---------------|

### CLAUDE.md drift: X mismatches
| Metric | Claimed | Actual | Location |
|--------|---------|--------|----------|

### [Full only] Duplicates: X found
| Fact | Found in | Keep in |
|------|----------|---------|

## Summary: X issues found (Y critical, Z warnings)
```

After reporting, ask the user which issues to fix. Do not auto-fix without confirmation.
