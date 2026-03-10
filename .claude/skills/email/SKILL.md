---
name: email
description: Check and triage Protonmail inbox. Make sure to use this skill whenever email is mentioned — "sjekk epost", "check email", "epost", "inbox", "noen henvendelser?", "any messages?", "har noen svart?", or any question about incoming contact from venues or users.
user-invocable: true
argument-hint: "[folder: inbox | all]"
---

# Email triage

Check, sort, and review Protonmail emails for the Gåri project.

## Step 1: Check all folders

List emails in **all** of these folders in parallel:

**Unsorted:**
- `INBOX` (anything here is unsorted — Sieve should catch most things)

**Gåri project (Unresolved):**
- `Folders/Gaari/Inquiries/Unresolved`

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
- For outreach/personal replies: use `Kjersti.Therkildsen@gaari.no` with the HTML signature from MEMORY.md
- **Always show draft before sending. Never send without explicit "send" or "ja, send".**
- Delete emails after they are handled

## Rules

- Use MCP protonmail tool for all email operations
- IMAP folder paths use `Folders/` prefix (e.g. `Folders/Gaari/Inquiries/Unresolved`)
- Sieve auto-sorts `[Inquiry]`, `[Correction]`, `[Opt-out]`, `[Submission]` subjects
