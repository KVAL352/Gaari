---
name: wrap-up
description: End-of-session checklist — commit status, docs, memory, tests, and summary. Make sure to use this skill whenever the user signals they're done — "vi er ferdige", "wrap up", "la oss runde av", "det var alt", "ferdig for nå", "ok takk", "det holder for i dag", or any sign-off phrase.
user-invocable: true
---

# Session wrap-up

Run the end-of-session quality checklist.

## Pre-loaded state

### Git status
!`git status --short 2>/dev/null`

### Changed files (full diff stat)
!`git diff --stat 2>/dev/null`

### Current branch
!`git branch --show-current 2>/dev/null`

## Steps

Run these in order. Report each as PASS / ACTION NEEDED / SKIPPED.

### 1. Uncommitted changes

Review the pre-loaded git status above. Check for:
- **Staged but uncommitted changes** — ask user if they want to commit
- **Unstaged modifications** — list files, ask if they should be staged and committed
- **Untracked files** — list them, ask if any are intentional (vs. temp/debug files that should be gitignored)

If everything is clean, report PASS.

### 2. Documentation accuracy

Check if today's work introduced changes that should be reflected in docs. Scan for:
- **New scrapers** — update `.claude/docs/scrapers.md` table and `SOURCE_RANK` in `dedup.ts`
- **New collections** — update `.claude/docs/collections.md`
- **New routes** — update `.claude/docs/routes.md`
- **New components** — update `.claude/docs/components.md`
- **New test files** — update `.claude/docs/testing.md` file list
- **New GHA workflows** — update `.claude/docs/gha.md`
- **New env vars or secrets** — update relevant memory files
- **New skills** — verify they appear in skill listing

If nothing changed, report PASS. If updates are needed, make them directly.

### 3. Memory review

Check if the session produced insights worth saving:
- **New patterns or pitfalls** discovered (API quirks, framework gotchas)
- **New operational workflows** established
- **Key decisions** made that affect future work
- **Feedback from user** about working style or preferences

Read current MEMORY.md first — avoid duplicates. Only add genuinely useful, stable knowledge.

After adding or updating any memory file, set `last_verified` in frontmatter to today's date:
```yaml
last_verified: YYYY-MM-DD
```

If nothing to add, report PASS.

### 4. Quick verification

If code was changed during the session, run type check and tests:
- `npx svelte-check --threshold error`
- `npm test`

Report results. If failures, flag them as ACTION NEEDED.

### 5. Session summary

Write a brief summary:

```
## Session summary

**What was done:**
- Bullet points of completed work

**Files changed:**
- List of modified/created/deleted files

**Open items:**
- Anything left unfinished or discovered but not addressed

**Status:** Ready to deploy / Needs verification / Work in progress
```

## Important

- **Auto-execute all steps** — commit, update docs, save memory, push without asking. Only pause if something is unclear or risky.
- **Keep memory updates minimal** — only save patterns confirmed across the session
- **Be honest about open items** — flag anything started but not finished
- Docs are now split: CLAUDE.md (core) + `.claude/docs/` (details). Update the right file.
