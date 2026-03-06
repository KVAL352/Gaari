---
name: print-marketing
description: Generate print-ready marketing assets — stickers and posters with Gåri branding and QR code. Use when user says "lag stickere", "lag plakater", "print", "markedsmateriell", or similar.
disable-model-invocation: true
allowed-tools: Bash(npx tsx *)
---

# Generate print marketing assets

Generate Gåri stickers and posters as print-ready PNG files.

## Command

```bash
cd scripts && npx tsx generate-print.ts
```

## Output

Files written to `print/` (gitignored):

| File | Format | Use |
|------|--------|-----|
| `sticker-circle.png` | 886×886px (75mm @ 300dpi) | Laptop sticker, byrom |
| `sticker-rect.png` | 1063×650px (90×55mm @ 300dpi) | Info-stand, oppslagstavle |
| `poster-a4.png` | 1240×1754px (A4 @ 150dpi) | Kafé, bibliotek, oppslagstavle |
| `poster-a3.png` | 1754×2480px (A3 @ 150dpi) | Større oppslag, plakattrykkeri |

## Copy (settled)

Edit constants at top of `scripts/generate-print.ts` to change text:

- `STICKER_TAGLINE` — "Alt som skjer i Bergen — på ett sted"
- `POSTER_HEADLINE` — "Hva skjer i Bergen?"
- `POSTER_BODY_1` — "Skodde eller sol — det er alltid noe som skjer i Bergen."
- `POSTER_BODY_2` — "Finn alt på gaari.no"

## Design

Funkis style — white background, red (#C82D2D) accents, Barlow Condensed headings, Inter body. QR code points to `https://gaari.no`.

## Print tips

- **Stickere**: Send PNG til [Stickermule](https://stickermule.com) eller [StickerApp](https://stickerapp.com). Velg "die-cut" for rund sticker.
- **A4 plakater**: Skriv ut på laserskriver, eller send til Grafisk Senter / Officenter Bergen.
- **A3 plakater**: Send til kopieringsbutikk (Officenter, Copy Stop) eller plakattrykkeri.
- **Viktig**: PNG-filene er 300/150 dpi — trykkklare som de er. Ikke skaler opp i Word/PowerPoint.
