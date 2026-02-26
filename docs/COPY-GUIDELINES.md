# Gåri — Copy Guidelines

**Last updated:** 2026-02-26

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

## Answer Capsules (Collection Pages)

Every collection page includes 3–5 answer capsules for SEO and AI search citation. These are the #1 driver of ChatGPT citations.

### Format
- **H2 heading**: A natural-language question matching a real search query
- **Paragraph immediately below**: A direct answer in 20–25 words, containing zero links
- **Expansion**: Additional detail below the answer capsule (optional)

### Rules
1. The H2 must be a question someone would actually search for
2. The answer paragraph must be self-contained — an AI engine should be able to extract it as a complete answer
3. No links inside the answer paragraph (links break AI extraction)
4. Include concrete numbers when possible (event counts, injected server-side via `data.events.length`)
5. Write in the collection page's language (Norwegian for NO collections, English for EN)
6. Keep answers factual — no hype, no superlatives

### Example (Norwegian — `denne-helgen` collection)
```html
<h2>Hva skjer i Bergen denne helgen?</h2>
<p>Bergen har {eventCount} arrangementer denne helgen, inkludert konserter, kunstutstillinger, familieaktiviteter og mye mer.</p>
```

### Example (English — `this-weekend` collection)
```html
<h2>What's happening in Bergen this weekend?</h2>
<p>Bergen has {eventCount} events this weekend, including concerts, exhibitions, family activities, and more.</p>
```

### Per-collection question targets

| Collection | Target query (H2) |
|------------|-------------------|
| `denne-helgen` | Hva skjer i Bergen denne helgen? |
| `i-kveld` | Hva skjer i Bergen i kveld? |
| `gratis` | Finnes det gratis arrangementer i Bergen? |
| `i-dag` | Hva skjer i Bergen i dag? |
| `familiehelg` | Hva kan barn gjøre i Bergen denne helgen? |
| `konserter` | Hvilke konserter er i Bergen denne uken? |
| `studentkveld` | Hva skjer for studenter i Bergen i kveld? |
| `regndagsguide` | Hva kan man gjøre i Bergen når det regner? |
| `sentrum` | Hva skjer i Bergen sentrum? |
| `voksen` | Hva skjer for voksne i Bergen? |
| `today-in-bergen` | What's happening in Bergen today? |
| `this-weekend` | What's happening in Bergen this weekend? |
| `free-things-to-do-bergen` | Are there free things to do in Bergen? |

Each collection should have 3–5 answer capsules targeting related queries (e.g., `gratis` also targets "Er det gratis konserter i Bergen?" and "Gratis aktiviteter for barn i Bergen").

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

## B2B Copy (Venue Communications)

### Pitch emails
- Lead with specific data, not features ("Vi sendte X klikk" not "Vi tilbyr synlighet")
- Include AI citation angle — it's the differentiator
- Close with soft CTA: "Kan vi ta en prat?" (never "Bestill nå!")
- Subject: "Gåri sendte [X] klikk til [venue] i [måned]"
- Keep under 150 words

### Activation emails
- Confirm exactly what's activated (which collection pages)
- State when the first report arrives
- Under 150 words

### Monthly reports
- Lead with headline number (total clicks)
- Show trend vs previous month (% change)
- Top 3 events by clicks
- AI visibility section (for Standard + Partner)
- No commentary or upselling in the report itself

### Newsletter
- Short intro paragraph (2–3 sentences, manually written)
- 10–15 events with title, venue, time, price
- Promoted events labeled "Fremhevet"
- CTA: link to relevant collection page on gaari.no

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
- See `seo-ai-playbook.md` for the full SEO and AI search strategy
