---
name: email
description: Check and triage Protonmail inbox. Make sure to use this skill whenever email is mentioned — "sjekk epost", "check email", "epost", "inbox", "noen henvendelser?", "any messages?", "har noen svart?", or any question about incoming contact from venues or users.
user-invocable: true
argument-hint: "[folder: inbox | all]"
---

# Email triage

Check, sort, and review Protonmail emails for the Gåri project.

## Pre-loaded folder checks

Run ALL of these in parallel using MCP protonmail tools:

1. `mcp__protonmail__list_emails` with folder `INBOX`
2. `mcp__protonmail__list_emails` with folder `Folders/Gaari/Inquiries/Unresolved`
3. `mcp__protonmail__list_emails` with folder `Folders/Gaari/Submissions/Unresolved`
4. `mcp__protonmail__list_emails` with folder `Folders/Gaari/Corrections/Unresolved`
5. `mcp__protonmail__list_emails` with folder `Folders/Gaari/Opt-outs/Unresolved`

## Step 2: Summarize

Present a unified inbox summary:
- Count per folder
- For each email: sender, subject, date, one-line summary
- Flag anything urgent or time-sensitive

## Step 3: Triage

For each unresolved email, suggest one of:
- **Handle now** — reply, forward, or take action
- **Archive** — no action needed
- **Delete** — spam or handled

Ask the user how to proceed on anything non-obvious.

## Step 4: Actions

- Draft replies using `post@gaari.no` as sender
- For outreach/personal replies: use `Kjersti.Therkildsen@gaari.no` with the HTML signature (read from memory file `email-workflow.md`)
- **Always show draft before sending. Never send without explicit "send" or "ja, send".**
- Move handled Gaari emails to Resolved folders, delete spam
- Move press/media emails to `Folders/Gaari/Presse` (never delete)
- Move receipts to `Folders/Receipts` (never delete)

## Step 5: Ingest — update knowledge system

After triaging, check if any emails change the status of tracked contacts or projects. If so, update the relevant memory files:

- **Outreach reply (positive/negative/info)**: Update the contact's row in `outreach-active.md`. If they agreed to something, move to `outreach-agreements.md`. If they declined, move to `outreach-declined.md` with reason.
- **New partnership or backlink live**: Add to `outreach-agreements.md`.
- **Venue technical info** (API access, scraping permission, etc.): Note in `outreach-active.md` or `patterns.md` as appropriate.
- **Press/media reply**: Update `project_ba_article.md` or create new project memory if it's a new outlet.
- **Reminder-worthy follow-up**: Add entry to `scripts/reminders.json` with appropriate date.

After updating, set `last_verified` in the frontmatter of any memory file you touched:

```yaml
---
name: ...
description: ...
type: project
last_verified: 2026-04-10
---
```

**Only update files where something actually changed.** Don't touch files just because you read them.

## Step 6: Cleanup

Before finishing, ensure ALL Unresolved folders are empty:
- Move handled items to their corresponding `Resolved` folder
- Move test submissions and spam to `Trash`
- Move press/media to `Folders/Gaari/Presse`
- Move receipts to `Folders/Receipts`
- For user submissions: check if event exists in DB. If approved, move to Resolved. If pending, flag for review.

**Do not finish email triage with items still in Unresolved folders.**

## Rules

- Use MCP protonmail tools for all email operations
- IMAP folder paths use `Folders/` prefix (e.g. `Folders/Gaari/Inquiries/Unresolved`)
- Sieve auto-sorts `[Inquiry]`, `[Correction]`, `[Opt-out]`, `[Submission]` subjects
- IMAP deletion via Bridge is unreliable — flag for manual deletion if needed
