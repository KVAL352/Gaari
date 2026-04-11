---
name: page-audit
description: Multi-role audit framework for landing pages and product pages. Use when the user wants a deep structured analysis of a page — "analyser siden", "rollebasert analyse", "se over siden med rollene", "audit", "page review". Runs 12 distinct roles in a specific order to catch different kinds of problems.
user-invocable: true
argument-hint: "[page or section to audit]"
---

# Page Audit — Multi-Role Analysis Framework

You run structured audits of landing pages and product pages by taking on 12 distinct roles in sequence. Each role sees different problems. Together they give a 360° view.

**Task: $ARGUMENTS**

---

## When to use

- User asks for a deep page analysis ("analyser siden", "rollebasert analyse")
- Before shipping a new landing page
- When a page isn't converting and you need to find why
- When the user says "siden føles feil men jeg vet ikke hvorfor"

## How to run an audit

1. **Read the page or section first.** Know what you're analyzing before picking roles.
2. **Pick roles strategically** — not all 12 on every section. Use the guide below.
3. **One role at a time.** Present findings, get user alignment, implement before moving on. Don't batch all findings at once — quality drops.
4. **End with a summary** showing which roles agreed on priorities.

## The 12 roles

### Tier 1: Personas (who actually reads this)

**1. Kultursjef / First-time visitor (persona)**
- Reads the page as the primary buyer with 30 seconds
- Asks: do I understand what this is in 3 seconds? What's the next step?
- Catches: unclear positioning, missing context, friction in the first scroll
- When to use: always first, especially on heroes

**2. Daglig leder / Økonomiansvarlig (persona)**
- The person who approves the budget but doesn't find the page
- Scrolls straight to pricing
- Catches: missing price indicators, unclear ROI, hidden costs
- When to use: when pricing is involved

**3. Festivalsjef / Edge-case buyer (persona)**
- Someone whose needs don't fit the default packages
- Catches: rigid product structure, missing alternatives
- When to use: when there's a pricing or subscription model

### Tier 2: Communication (what it says)

**4. Narrativ designer**
- Treats the page as a story from top to bottom
- Asks: does each section build on the previous? Are there bridges between sections?
- Catches: abrupt transitions, missing logical connections, broken arc
- When to use: early, to check structural flow

**5. Retoriker (logos/pathos/ethos)**
- Evaluates each section against the three classical persuasion modes
- Logos: facts, numbers, data. Pathos: emotion, identification. Ethos: credibility, trust.
- Catches: missing proof, no emotional hook, weak authority
- When to use: after narrative is fixed — to strengthen arguments

**6. Merkevarestrateg**
- Asks: does this feel like the brand? Would someone recognize it without the logo?
- Catches: generic SaaS voice, mismatch with other pages, no personality
- When to use: when the page feels too corporate or too casual

**7. Bergen-kjenner / Local identity**
- Does this speak the local language? Does it feel like it's from here?
- Catches: missing local warmth, tourist-cliché risks, voice mismatch with homepage
- When to use: pair with merkevarestrateg — they're symbiotic

**8. Innholdsstrategist / Copywriter**
- Headlines benefit-driven? Body paragraphs one idea each? Direct address ("du")?
- Catches: feature-speak instead of benefit-speak, burying the lede, sentence bloat
- When to use: whenever text matters — FAQs, CTAs, headings

### Tier 3: Function (does it work)

**9. Konverteringsoptimerer**
- CTA placement, scroll dead zones, decision fatigue, eye-tracking prognosis
- Catches: sections without handoff, competing CTAs, missing urgency
- When to use: when conversion is the goal

**10. Responsiv designer / Mobile-user**
- 375px, 768px, 1440px breakpoints. Tests touch targets, wrapping, overflow.
- Catches: content hidden on mobile, text breaking badly, cramped touch targets
- When to use: always check mobile — majority traffic

**11. Layout-arkitekt**
- Horizontal widths across sections, vertical spacing rhythm, container consistency
- Catches: section widths that hop, inconsistent max-w, dead zones
- When to use: when the page feels "rotete" or sections "jump" in width

**12. Art Director**
- Visual weight, composition, hierarchy, white space, rhythm
- Treats the page as a picture — looks at gray boxes, not text
- Catches: monotonous sections, weak visual anchors, unbalanced compositions
- When to use: when "something feels off" but everything else is solid

### Bonus roles (situational)

**Djevelens advokat** — worst-case interpretation of every claim. Catches overclaiming, vague disclaimers, unproven assertions. Use last.

**Tilgjengelighetsrevisor (WCAG)** — contrast, focus indicators, ARIA, touch targets. Catches accessibility gaps.

**Prispsykolog** — pricing structure, anchoring, decision architecture. Use on pricing sections.

**Konkurranseanalytiker** — how does this compare to similar pages in the space? Catches missing common patterns or copycat weaknesses.

---

## Recommended run order

For a **full audit**, run roles in this order:

1. **Kultursjef** (primary persona) — grounds everything in the real user
2. **Narrativ designer** — structural flow
3. **Retoriker** — argument strength
4. **Merkevarestrateg + Bergen-kjenner** — voice and identity
5. **Konverteringsoptimerer** — action-driving
6. **Daglig leder** (secondary persona) — budget reality check
7. **Festivalsjef / edge-case** — packaging breadth
8. **Responsiv designer** — breakpoint check
9. **Layout-arkitekt** — width/rhythm check
10. **Art Director** — visual composition
11. **Djevelens advokat** — final skeptic pass

For a **quick section audit**, pick 3-4 roles that match the section's weakness:
- Hero broken? → Kultursjef + Copywriter + Art Director
- Pricing confusing? → Daglig leder + Prispsykolog + Copywriter
- "Something feels off"? → Art Director + Layout-arkitekt
- Not converting? → Konverteringsoptimerer + Narrativ + Kultursjef

## Output format per role

For each role, structure feedback as:

```
### [Role name]

**What I see:** Concrete description of the section as this role
**What works:** What's functioning correctly
**What doesn't:** Specific problems, not vague complaints
**Concrete change:** What to do about it — implementable, not abstract
```

End each role with: **Should I implement [specific changes]?** Get alignment, don't batch.

## Key principle

**One role at a time.** Running all 12 roles simultaneously produces shallow analysis. The user's feedback has been clear: take the capacity to dive deep into each role rather than surveying everything at once. Quality over coverage.

## Also see

- `/designer` — creative direction and Funkis design system reference
- `/color-strategy` — color palette and functional-first color analysis
- `/copywriter` — Bergen bilingual copy writing
