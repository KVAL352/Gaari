---
name: email
description: Check and triage Protonmail inbox. Use when the user says things like "sjekk epost", "la oss sjekke epost", "check email", "email", "epost", "innboks", "inbox", or similar.
user-invocable: true
argument-hint: [optional: folder to check, e.g. "inbox" or "all"]
---

# Email triage

Check, sort, and review Protonmail emails for the Gåri project.

## Step 1: Check inbox and unsorted emails

1. List emails in **INBOX** (anything here is unsorted — Sieve should catch most things)
2. List emails in each **Unresolved** folder:
   - `Folders/Gaari/Inquiries/Unresolved`
   - `Folders/Gaari/Corrections/Unresolved`
   - `Folders/Gaari/Opt-outs/Unresolved`
   - `Folders/Gaari/Submissions/Unresolved`

Run all these checks in parallel.

## Step 2: Sort any unsorted inbox emails

If there are emails in INBOX, read each one and sort it:

| Subject contains | Move to |
|-----------------|---------|
| `[Inquiry]` | `Folders/Gaari/Inquiries/Unresolved` |
| `[Correction]` | `Folders/Gaari/Corrections/Unresolved` |
| `[Opt-out]` | `Folders/Gaari/Opt-outs/Unresolved` |
| `[Submission]` | `Folders/Gaari/Submissions/Unresolved` |
| Payment/receipt/invoice/kvittering/faktura/ordrebekreftelse | `Folders/Receipts` |
| Personal (Domeneshop account, Proton onboarding, etc.) | `Folders/Personal` |

If unclear where an email belongs, **ask the user** before moving it.

## Step 3: Summarize status

Give a quick overview:
- How many new/unread items in each Unresolved folder
- Any items that need attention or action

## Step 4: Review actionable items

For each unread email in Unresolved folders:
1. Read the full email content
2. Present a brief summary to the user:
   - **From**: sender
   - **Subject**: subject
   - **Summary**: 1-2 sentence summary of what they want
   - **Suggested action**: what to do about it (reply, investigate, resolve, etc.)
3. Ask the user what they want to do (reply, mark as resolved, ignore, etc.)
4. If the user wants to reply: **always show the draft to the user before sending**. Never send emails without explicit approval.

## Rules

- **Never send emails without showing the draft first** and getting explicit approval
- **Never guess email addresses** — always ask or look them up
- Replies go from `post@gaari.no` via Resend (from: `Gåri <noreply@gaari.no>`, mention `post@gaari.no` as reply-to)
- When resolving items, move them from `Unresolved` to `Resolved` subfolder
- Keep summaries concise — the user wants a quick triage, not a novel
- Communicate in Norwegian (matching the user's language)
