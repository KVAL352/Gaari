---
name: fb-post
description: Generate Facebook group post captions for Gåri collection pages. Follows per-group content rules and caption style guidelines.
user_invocable: true
---

# FB Group Post Generator

Generate ready-to-post captions for Facebook groups based on a Gåri collection page.

## Input
The user specifies which collection to post about (e.g., "denne-helgen", "i-kveld", "gratis"). If not specified, pick the most contextually relevant:
- Friday-Sunday → `denne-helgen`
- Weekday before 16:00 → `i-dag`  
- Weekday after 16:00 → `i-kveld`

## FB Groups and their rules

Read the memory file `fb-group-rules.md` for current per-group content rules. Key groups:
- **Hva skjer i bergen i dag** — ONLY today-content (i-dag, i-kveld)
- **Hva skjer i Bergen** — Any collection, most flexible
- **Ting å gjøre i Bergen** — Any collection
- **Bergen** — Any collection, keep it casual

## Caption style (from feedback)

1. **Open with a question** that hooks the reader (e.g., "Lurer du på hva som skjer i Bergen i helgen?")
2. **Line 2 = link** to the collection page with UTM: `https://gaari.no/no/{collection}?utm_source=facebook&utm_medium=social&utm_campaign=group`
3. **"Utvalgte godbiter"** intro, then list 3-5 events
4. **Max 1 event per venue** — variety matters
5. **No emojis** ever
6. **No dashes/hyphens** in running text (use commas or periods instead)
7. **End with a soft CTA** pointing to Gåri for the full list

## Process

1. Read the collection config from `$lib/collections.ts` to understand what events are included.
2. Fetch current events from the homepage or collection data (read `+page.server.ts` if needed).
3. Generate one caption per eligible FB group.
4. Present all captions to the user for review before any posting.

## Output format

For each group, output:
```
### [Group name]
[Ready-to-copy caption text]
```

Do NOT post anything. Just generate the text for the user to copy-paste.
