# Social Post Pipeline

## Overview
`scripts/social/` generates Instagram carousel images (Satori/Resvg, 1080x1080 PNG) + Stories (1080x1920 PNG, 9:16) + captions for 11 scheduled collections: denne-helgen, i-kveld, gratis, today-in-bergen, familiehelg, konserter, studentkveld, this-weekend, teater, utstillinger, mat-og-drikke.

## Posting schedule (GHA)
- **FB**: 07:00 UTC (08:00 CET) via `social-posts.yml`
- **IG carousel**: 14:00 UTC (16:00 CEST) via `social-posts.yml`
- **Stories**: Generated during FB/IG runs, posted manually
- **Bluesky**: Disabled (Mar 2026)

## Slide design (Apr 2026)
- Separated image/text layout: image fills top ~60%, text in dark area below
- Category-colored frame border for instant recognition
- Carousel = real event slides only (no hook/CTA filler slides)
- Collection label overlay on first event slide
- Minimum 4 events with images per post (fewer = skip)
- Events with images prioritized
- Green "Trolig gratis" badge on free events
- Auto venue @tagging in captions (60 verified handles in `venues.ts` `VENUE_INSTAGRAM`)
- Max 1 event per venue, "Gari.no" branding
- Stories use IG safe zones (top/bottom 200px clear)

## Rate limits & caps
- Max 3 FB posts/day, max 1 IG carousel/day, max 1 story/GHA run
- IG quota check via `content_publishing_limit` API before posting
- `--platform=fb|ig|stories|all` flag for selective posting

## Accounts
- **Instagram**: `@gaari_bergen` (Business)
- **Facebook Page**: "Gaari - Hva skjer i Bergen" (ID: 1062018946994640)
- **Meta Developer App**: "Gaari Social" (ID: 934988926120317), token expires 2026-05-26
- Graph API v22.0

## Reels
`generate-reels.ts` creates MP4 from PNG frames via FFmpeg (3s/frame, H.264, 1080x1920). Manual publishing required.

## Social insights
`fetch-social-insights.ts` fetches engagement metrics for ALL IG/FB posts. Stored in `social_insights` table (JSONB). Runs after each posting GHA job.

## Weekly batch
`weekly-reels.yml`: Sunday 18:00 UTC (full generate + assemble), Thursday 15:00 UTC (re-assemble). `assemble-week.ts` builds per-day ZIPs + manifest.
