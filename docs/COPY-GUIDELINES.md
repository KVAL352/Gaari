# Gåri — Copy Guidelines

**Last updated:** 2026-02-23

---

## General Rules

1. **Norwegian first** — `title_no` and `description_no` are required. English is optional.
2. **Bokmål for all UI** — bergensk dialect only in the brand name/tagline.
3. **Concise** — every word earns its place. No filler.
4. **Factual** — never invent details. Only use information from the source.
5. **Accessible** — write for the broadest audience (locals, tourists, students, families).

---

## UI Text Conventions

### Labels and buttons
- Use imperative or noun form: "Vis flere", "Fjern alle", "Søk"
- Keep button text under 3 words where possible
- Always provide both NO and EN: `"Vis flere" / "Show More"`

### Filter labels (11 categories)

| Database value | Norwegian | English |
|---------------|-----------|---------|
| `music` | Musikk & Konserter | Music & Concerts |
| `culture` | Kunst & Kultur | Arts & Culture |
| `theatre` | Teater & Scenekunst | Theatre & Performing Arts |
| `family` | Familie & Barn | Family & Kids |
| `food` | Mat & Drikke | Food & Drink |
| `festival` | Festivaler & Markeder | Festivals & Markets |
| `sports` | Sport & Friluft | Sports & Outdoors |
| `nightlife` | Uteliv | Nightlife |
| `workshop` | Kurs & Workshops | Workshops & Classes |
| `student` | Studentarrangementer | Student Events |
| `tours` | Turer & Sightseeing | Tours & Sightseeing |

### Bydel names (8 areas)
Always use the official spelling: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna.

These are not translated — they remain the same in English.

---

## Date and Time Formatting

| Language | Locale | Format | Example |
|----------|--------|--------|---------|
| Norwegian | `nb-NO` | DD.MM.YYYY, 24-hour | 21.02.2026 kl. 19:00 |
| English | `en-GB` | DD Month YYYY, 24-hour | 21 Feb 2026, 19:00 |

### Relative dates (event cards)
- Today → "I dag" / "Today"
- Tomorrow → "I morgen" / "Tomorrow"
- 2–6 days away → weekday name ("Lørdag" / "Saturday")
- 7+ days → short date ("lør. 21. feb" / "Sat 21 Feb")

Always wrap dates in `<time datetime="YYYY-MM-DDTHH:MM">`.

---

## Price Formatting

| Case | Norwegian | English |
|------|-----------|---------|
| Free | Gratis | Free |
| Fixed price | kr 250 | kr 250 |
| Range | kr 100–300 | kr 100–300 |
| Unknown | Se billettlenke | See ticket link |

Use `kr` (lowercase), not `NOK` or `,-` suffix. Use en-dash (–), not hyphen (-).

---

## AI-Generated Descriptions

Gåri uses **Gemini 2.5 Flash** to generate bilingual event descriptions.

### Prompt constraints
- 1–2 sentences per language
- Under **160 characters** each (SEO meta description limit)
- Factual only — uses title, venue, category, date, price
- Output format: `{"no": "...", "en": "..."}`
- Norwegian uses bokmål

### Fallback template (`makeDescription`)
When the AI is unavailable, descriptions use this pattern:
```
{CATEGORY_LABEL_NO} på {venue_name}
```
Example: "Konsert på Grieghallen"

### Category labels for fallback

| Category | Norwegian label |
|----------|----------------|
| music | Konsert |
| culture | Kulturarrangement |
| theatre | Teater/scenekunst |
| family | Familieaktivitet |
| food | Mat og drikke |
| festival | Festival/marked |
| sports | Sport/friluft |
| nightlife | Uteliv |
| workshop | Kurs/workshop |
| student | Studentarrangement |
| tours | Tur/omvisning |

### Quality rules
- Never copy creative text from sources (åndsverkloven §§ 2–3)
- Only factual information: title, date, venue, price, category
- English description is empty string when AI is unavailable (no machine translation of Norwegian)
- Descriptions are truncated to 157 chars + "..." if they exceed 160

---

## Slug Format

```
{slugified-title}-{YYYY-MM-DD}
```

Slugify rules:
- Lowercase, NFD normalized (accents removed)
- æ → ae, ø → o, å → a
- Non-alphanumeric → hyphens, max 80 chars

Example: `bergenfest-opening-night-2026-06-15`

---

## Status Badge Copy

| Badge | Norwegian | English | Color |
|-------|-----------|---------|-------|
| Today | I dag | Today | Funkis red |
| Free | Gratis | Free | Green |
| Sold Out | Utsolgt | Sold Out | Dark red |
| Last Tickets | Siste billetter | Last Tickets | Amber |
| Cancelled | Avlyst | Cancelled | Granite grey |

Every badge uses color + icon + text (never color alone — WCAG requirement).

---

## Dos and Don'ts

### Do
- Write short, scannable copy
- Use standard bokmål for all UI text
- Include both languages for all user-facing strings
- Use tabular numbers for dates, times, prices (`font-variant-numeric: tabular-nums`)
- Use the `<time>` element for all dates

### Don't
- Copy descriptions from source websites
- Use hype language ("Amazing!", "Don't miss!")
- Write in nynorsk or dialect (except the brand name)
- Use "NOK" — always "kr"
- Use flags for language switching — use text labels
- Add emoji to UI text (only in category placeholder icons)

---

## References

- See `BRAND-VOICE.md` for tone and personality
- See `ai-descriptions.ts` for the Gemini prompt and fallback logic
- See `utils.ts` for `makeDescription()`, `slugify()`, `CATEGORY_LABELS_NO`
