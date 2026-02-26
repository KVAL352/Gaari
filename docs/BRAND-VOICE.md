# Gåri — Brand Voice

**Last updated:** 2026-02-26

---

## Identity

**Name:** Gåri — from bergensk dialect "Ke det går i?" ("What's going on?")
**Tagline:** Ke det går i Bergen?
**Email:** gaari.bergen@proton.me
**Domain:** gåri.no / gaari.no

---

## Voice Attributes

| Attribute | What it means |
|-----------|---------------|
| **Local** | Rooted in Bergen — uses bergensk identity, knows the bydeler, feels like a local tip |
| **Friendly** | Warm and approachable, never corporate or stiff |
| **Functional** | Gets to the point fast — short copy, clear labels, no filler |
| **Inclusive** | Welcoming to locals, students, tourists, and expats — never exclusionary |
| **Bilingual** | Norwegian (bokmål) is the primary language; English is always available |

---

## What We Sound Like

- A friend who lives in Bergen and always knows what's happening
- Helpful without being pushy — we inform, you decide
- Casual but competent — we know the city, the venues, the calendar
- Respectful of everyone's time — no fluff, no clickbait

**Example copy:**
- "Ke det går i Bergen?" (hero tagline)
- "47 arrangementer funnet" (filter results — factual)
- "Ingen treff — prøv å justere filtrene dine" (empty state — helpful)
- "Konsert på Grieghallen" (fallback description — minimal, factual)

---

## What We Don't Sound Like

| Avoid | Why |
|-------|-----|
| Corporate jargon ("leverage", "optimize your experience") | We're a local guide, not a SaaS |
| Hype or superlatives ("THE BEST events!", "AMAZING concerts!!!") | Overpromising erodes trust |
| Overly formal Norwegian ("Herved informeres det om...") | Stiff, creates distance |
| Slang or nynorsk in UI text | Bokmål is the standard for UI; bergensk flavor is in the name and tagline only |
| Emoji-heavy copy | Clean and professional — emojis are used sparingly in category icons only |

---

## Language Principles

### Norwegian first
- `title_no` and `description_no` are always required
- English fields are optional but encouraged
- UI labels exist in both languages; Norwegian is the default

### Bilingual conventions
- Language toggle shows "Norsk" and "English" (never flags alone)
- URL prefix: `/no/...` and `/en/...`
- When a translation is missing, show the available language with a note
- Date format: `nb-NO` locale for Norwegian, `en-GB` for English

### Bergensk identity
- The bergensk dialect appears in the **brand name and tagline only**
- All UI text, descriptions, and documentation use standard bokmål
- Never write entire UI strings in dialect — it reduces accessibility

---

## Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Hero/tagline | Playful, local | "Ke det går i Bergen?" |
| Filter labels | Neutral, functional | "Kategori", "Bydel", "Pris" |
| Event descriptions | Factual, concise | "Konsert med Bergen Filharmoniske Orkester på Grieghallen." |
| Empty states | Helpful, encouraging | "Ingen treff. Prøv å fjerne 'Gratis' eller utvid datoområdet." |
| Error messages | Calm, solution-oriented | "Noe gikk galt. Prøv igjen om litt." |
| Legal/data pages | Clear, transparent | "Vi samler inn eventdata fra 45 offentlige kilder i Bergen." |
| About page | Warm, mission-driven | "Gåri samler alt som skjer i Bergen på ett sted." |
| B2B marketing page | Data-led, novel, no hype | "Når noen spør ChatGPT hva som skjer i Bergen, er det Gåri som blir sitert." |
| Venue pitch email | Personal, data-first, helpful | "Vi sendte 347 klikk til grieghallen.no forrige måned — gratis." |
| Activation confirmation | Warm, professional, clear | "Alt er klart! Din første rapport kommer innen 5. mars." |
| Monthly report | Factual, concise, trend-focused | "483 klikk (+22% fra januar). Mest klikkede: Bergen Filharmoniske." |
| Newsletter | Curated, friendly, Bergen-local | "Denne helgen har Bergen 34 arrangementer. Her er våre favoritter." |

---

## References

- See `COPY-GUIDELINES.md` for detailed writing rules
- See `design-brief.md` for component-level copy patterns
- See `project-strategy.md` for audience definitions
