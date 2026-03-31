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
- **Staged but uncommitted changes** → ask user if they want to commit
- **Unstaged modifications** → list files, ask if they should be staged and committed
- **Untracked files** → list them, ask if any are intentional (vs. temp/debug files that should be gitignored)

If everything is clean, report PASS.

### 2. CLAUDE.md accuracy

Check if today's work introduced changes that should be reflected in CLAUDE.md. Scan for:
- **New scrapers** added → update scraper table + total count (3 places: intro sentence, `## Scraper sources` heading, datainnsamling page count)
- **New collections** added → update collection list in `## Architecture` → Collection pages
- **New routes** added → update `## Frontend routes`
- **New components** added → update `## Frontend components`
- **New test files or test count changes** → run `npm test` and compare actual count to documented count in `## Testing`
- **New env vars or secrets** → update relevant sections
- **New skills** added → mention in `new-skill` reference table if relevant

If nothing changed, report PASS. If updates are needed, make them directly.

### 3. Verify skill test count

Run `npm test` and check if the total test count matches what's documented in `.claude/skills/verify/SKILL.md` (line mentioning "All X tests must pass"). Update if different.

### 4. Memory review

Check if the session produced insights worth saving to `~/.claude/projects/c--Users-kjers-Projects-Gaari/memory/MEMORY.md`:
- **New patterns or pitfalls** discovered (e.g., API quirks, framework gotchas)
- **New operational workflows** established
- **Key decisions** made that affect future work
- **Completed features** that were previously tracked as in-progress

Read current MEMORY.md first — avoid duplicates. Only add genuinely useful, stable knowledge.

If nothing to add, report PASS.

### 5. Quick verification

If code was changed during the session, run type check and tests automatically (`svelte-check --threshold error` + `npm test`).

### 6. Session summary

Write a brief summary:

```
## Session summary

**What was done:**
- Bullet points of completed work

**Files changed:**
- List of modified/created/deleted files (from git diff --stat against the starting state)

**Open items:**
- Anything left unfinished or discovered but not addressed
- Follow-up tasks for next session

**Status:** Ready to deploy / Needs verification / Work in progress
```

## Important

- **Auto-execute all steps** — commit session changes, update CLAUDE.md, save memory patterns, and push without asking. Only pause if something is unclear or risky (e.g., unrecognized untracked files).
- **Keep memory updates minimal** — only save patterns confirmed across the session, not speculative notes
- **Be honest about open items** — flag anything that was started but not finished
