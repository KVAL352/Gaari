---
name: wrap-up
description: End-of-session checklist — commit status, docs, memory, tests, and summary
---

# Session wrap-up

Run the end-of-session quality checklist before closing this conversation.

## When to trigger

Activate this skill when the user signals the conversation is ending. Examples:
- "La oss avslutte samtalen"
- "Vi er ferdige"
- "Vi avslutter"
- "Wrap up"
- "La oss runde av"
- "Det var alt"
- "Ferdig for nå"

## Steps

Run these in order. Report each as PASS / ACTION NEEDED / SKIPPED.

### 1. Uncommitted changes

Run `git status` (never use `-uall` flag). Check for:
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

If nothing changed, report PASS. If updates are needed, make them (or list what needs updating and ask user).

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

### 5. Quick verification (optional)

If code was changed during the session, ask the user:
> "Want me to run `/verify` (lint → type check → tests → build) before wrapping up?"

Only run if user says yes. Don't run automatically — it takes time and the user may have already verified.

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

- **Don't auto-commit** — always ask the user first
- **Don't auto-edit CLAUDE.md** — show proposed changes and confirm
- **Keep memory updates minimal** — only save patterns confirmed across the session, not speculative notes
- **Be honest about open items** — flag anything that was started but not finished
