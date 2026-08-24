---
name: email
description: Check and triage Protonmail inbox. Make sure to use this skill whenever email is mentioned — "sjekk epost", "check email", "epost", "inbox", "noen henvendelser?", "any messages?", "har noen svart?", or any question about incoming contact from venues or users.
user-invocable: true
argument-hint: "[folder: inbox | all]"
---

# Email triage

Check, sort, and review Protonmail emails for the Gåri project.

## Step 1: Discover folders, then check them

**Never work from a hardcoded folder list.** Start every run with
`mcp__protonmail__list_folders`, then derive what to check from the result.

The old version of this skill named four Unresolved folders directly. Two more
were created later — `Outreach/Unresolved` and `Partnerships/Unresolved` — and
neither was ever checked. Nine emails sat unseen, the oldest from 21 April, and
several of them were tied to reminders that had already fallen overdue. A list
that must be edited by hand will drift; a rule will not.

### Always check

- `INBOX`
- **Every** folder whose path ends in `/Unresolved` — no exceptions, including
  ones created after this file was written
- **Every active Gåri folder**: any folder under `Folders/Gaari/` that holds
  messages and is not excluded below. These are flat folders without an
  Unresolved/Resolved pair, so nothing else will ever surface them.

Read them in parallel with `mcp__protonmail__list_emails`.

### Excluded, and why

| Folder | Reason |
|---|---|
| `*/Resolved` | Already handled |
| `Folders/Gaari/Notifications` | Automated alerts; `/morgen` reads these, triage does not |
| `Folders/Gaari/Avtaler` | Samtykkebevis. Read when a permission is in question, never triage, never delete |
| `Folders/Receipts` | Bookkeeping archive |
| `Folders/Personal`, `Folders/Rosemaling` | Not Gåri |
| `Archive`, `Sent`, `Drafts`, `Spam`, `Trash`, `All Mail` | Not incoming work |
| Container folders with 0 messages | `Folders`, `Folders/Gaari`, `Folders/Gaari/Inquiries` etc. hold nothing themselves |

### Report the gap

After deriving the two sets, list any folder that is **neither checked nor
excluded** and say so in the summary. That is how a new folder announces itself
instead of being silently skipped — which is exactly what went wrong before.

## Step 2: Summarize

Present a unified inbox summary:
- Count per folder, including the folders discovered in step 1
- Any folder that was neither checked nor excluded, flagged explicitly
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

Before finishing, ensure **every** Unresolved folder found in step 1 is empty —
not just the ones this file happens to name:
- Move handled items to their corresponding `Resolved` folder
- Move test submissions and spam to `Trash`
- Move press/media to `Folders/Gaari/Presse`
- Move receipts to `Folders/Receipts`
- For user submissions: check if event exists in DB. If approved, move to Resolved. If pending, flag for review.

**Do not finish email triage with items still in Unresolved folders.**

Flat Gåri folders (`Bookibud`, `Juridisk`, `Presse`, `Pristilbud`) have no
Resolved counterpart, so nothing moves out of them. Leave the mail where it is;
the job there is to notice what needs an answer and to say so.

## Rules

- Use MCP protonmail tools for all email operations
- IMAP folder paths use `Folders/` prefix (e.g. `Folders/Gaari/Inquiries/Unresolved`)
- Sieve auto-sorts `[Inquiry]`, `[Correction]`, `[Opt-out]`, `[Submission]` subjects.
  Outreach, Partnerships and the flat folders are sorted by hand, which is why
  they are easy to forget and why step 1 derives them instead of naming them.
- IMAP deletion via Bridge is unreliable — flag for manual deletion if needed
