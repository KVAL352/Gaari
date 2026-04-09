---
name: email
description: Check and triage Protonmail inbox. Make sure to use this skill whenever email is mentioned — "sjekk epost", "check email", "epost", "inbox", "noen henvendelser?", "any messages?", "har noen svart?", or any question about incoming contact from venues or users.
user-invocable: true
argument-hint: "[folder: inbox | all]"
---

# Email triage

Check, sort, and review Protonmail emails for the Gåri project.

## Pre-loaded folder checks

Run all folder reads in parallel using MCP protonmail tools:

1. `mcp__protonmail__list_emails` with folder `INBOX`
2. `mcp__protonmail__list_emails` with folder `Folders/Gaari/Inquiries/Unresolved`

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

## Rules

- Use MCP protonmail tools for all email operations
- IMAP folder paths use `Folders/` prefix (e.g. `Folders/Gaari/Inquiries/Unresolved`)
- Sieve auto-sorts `[Inquiry]`, `[Correction]`, `[Opt-out]`, `[Submission]` subjects
- IMAP deletion via Bridge is unreliable — flag for manual deletion if needed
