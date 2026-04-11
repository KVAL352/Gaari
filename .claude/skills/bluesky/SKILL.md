---
name: bluesky
description: Gåri's Bluesky account (posting paused since March 2026). Feed, follow, and search still work. Use this skill whenever Bluesky is mentioned — "bluesky", "sjekk bluesky", "følg på bluesky".
user-invocable: true
argument-hint: "[post | feed | follow | search <query>]"
---

# Bluesky Management for @gaari.no

> **STATUS (mars 2026): Posting deaktivert.** Konto `@gaari.no` eksisterer men er pa pause. GHA workflow-steget er kommentert ut. Ikke foreslå Bluesky-posting med mindre brukeren eksplisitt reaktiverer. Feed/follow/search fungerer fortsatt.

Manage the Gåri Bluesky account using MCP tools.

## Account

- Handle: `@gaari.no`
- Strategy: English for tech/indie maker audience, Norwegian for Bergen-specific content

## Commands

### `post` — Create a new post

1. If the user provides text, review it for length (max 300 chars) and tone
2. If no text, ask what they want to post about and draft it
3. Show the draft and character count
4. Post with `mcp__bluesky__create-post` after approval
5. Include `gaari.no` link when relevant

### `feed` — Check timeline and mentions

1. Use `mcp__bluesky__get-timeline-posts` to check recent feed
2. Summarize interesting posts to engage with
3. Suggest replies that are genuine, not promotional

### `follow <query>` — Find and follow relevant accounts

1. Use `mcp__bluesky__search-people` with the query
2. Present results with bio and follower count
3. Follow selected accounts with `mcp__bluesky__follow-user`

### `search <query>` — Search posts for topics

1. Use `mcp__bluesky__search-posts` with the query
2. Summarize relevant posts
3. Suggest engagement opportunities (replies, reposts)

### No argument — Status overview

1. Check `mcp__bluesky__get-profile` for gaari.no (follower count, post count)
2. Check `mcp__bluesky__get-timeline-posts` for recent activity
3. Suggest next action (post idea, someone to engage with)

## Voice guidelines

This is Kjersti's personal voice. Write like a real person, not a brand account.

- **Tone**: Casual, curious, genuine. Like talking to a friend who codes.
- **OK**: "Oh cool", "honestly", "would be wild", "haha", contractions, lowercase starts
- **NOT OK**: "Incredible!", "game-changer!", "excited to announce", stiff marketing tone, "leveraging"
- **English posts**: Short, warm, conversational. "I built...", "TIL...", "This is so interesting."
- **Norwegian posts**: Bergen-warm, casual. Helgeguider, lokale tips.
- **Never**: Corporate speak, excessive hashtags (max 2-3), emoji spam, self-promotion in every reply
- **Replies**: Add value or genuine reaction. Don't shoehorn gaari.no into every comment. It's OK to just be helpful or curious.
- **Always**: Genuine, useful, specific. Share real data and insights from the project.

## Content calendar (suggestions)

- **Monday**: Tech insight or build update (EN)
- **Wednesday**: Data finding or interesting stat (EN)
- **Friday**: Weekend guide with link to denne-helgen (NO)

## Currently following

Svelte: Rich Harris, Hendrik Mans, Thilo Maier, Jesper Ordrup
Platforms: Supabase, Vercel, Anthropic
Bergen: Alex Sørlie, Bergit (NRK Vestland)
Indie: Jakub Skałecki, Aleksei Morozov
