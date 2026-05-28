---
theme: seriph
title: AI som byggeklosser — slik bygger jeg Gåri
info: |
  Hvordan jeg bruker AI som byggeverktøy i et reelt produksjonsprosjekt.
  Faglig samling, 27. mai 2026.
class: text-center cover-tan cover-no-accent
highlighter: shiki
drawings:
  persist: false
  enabled: 'dev'
transition: slide-left
comark: true
defaults:
  layout: default
fonts:
  sans: 'Inter'
  serif: 'Barlow Condensed'
  mono: 'JetBrains Mono'
---

<!-- Background collage: gaari.no event-cards screenshot, dimmed -->
<div class="absolute inset-0" style="background-image: url('./assets/cover-collage.jpg'); background-size: cover; background-position: center top; filter: brightness(0.78) saturate(0.95);"></div>

<!-- Plaster overlay for Funkis-feel + readable text -->
<div class="absolute inset-0" style="background: rgba(245, 243, 238, 0.58);"></div>

<!-- Top accent + bottom red strip on top of overlay -->
<div class="absolute" style="top: 0; left: 0; right: 0; height: 6px; background: var(--gaari-red);"></div>
<div class="absolute" style="bottom: 0; left: 0; right: 0; height: 2px; background: var(--gaari-iron);"></div>

<div class="absolute inset-0 flex flex-col items-center justify-center" style="padding: 3rem 4rem; z-index: 10;">

<div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--gaari-iron); margin-bottom: 1.2rem; background: rgba(245, 243, 238, 0.9); padding: 0.25rem 0.7rem;">Faglig samling · 27. mai 2026</div>

<h1 style="margin: 0 !important; font-size: 3.2rem !important; line-height: 1.1; color: var(--gaari-iron) !important; text-shadow: 0 1px 2px rgba(245, 243, 238, 0.8);">AI som byggeklosser</h1>

<h2 style="margin-top: 1rem; line-height: 1.35; font-size: 1.55rem; font-weight: 500; max-width: 44rem; text-align: center; color: var(--gaari-iron) !important; text-shadow: 0 1px 2px rgba(245, 243, 238, 0.8);">Slik bruker jeg AI til å bygge og drifte Gåri — en reell nettside i daglig produksjon</h2>

<p style="font-size: 1.05rem; margin-top: 2.5rem; color: var(--gaari-iron); background: rgba(245, 243, 238, 0.85); padding: 0.35rem 0.8rem;">
Kjersti V. Therkildsen · <a href="https://gaari.no" style="color: var(--gaari-red) !important;">gaari.no</a>
</p>

</div>

<!--
Speaker notes:
- Velkommen. 15-20 minutter pluss spørsmål.
- Tittelen er bevisst: "byggeklosser" — AI er et verktøy jeg bygger MED, ikke noe jeg har slått på.
- Hovedfokus i dag: HVORDAN jeg jobber. Gåri er bare eksempelet.
- Jeg viser konkrete eksempler fra produksjon — ingen demoer på lab-nivå.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Hei, jeg er Kjersti</h1>

<p style="font-size: 0.92rem; margin: 0 0 1rem 0;">
Tre ting om meg.
</p>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1.4fr; gap: 2rem; align-items: stretch;">

<div style="display: flex; flex-direction: column; gap: 0.9rem; align-items: center; justify-content: center;">
  <img src="./assets/kjersti.jpg" style="width: 100%; aspect-ratio: 1/1; max-width: 280px; object-fit: cover; box-shadow: 0 4px 14px rgba(28,28,30,0.2);" alt="Kjersti V. Therkildsen" />
  <div style="text-align: center;">
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron); white-space: nowrap;">Kjersti V. Therkildsen</div>
    <div style="font-size: 0.8rem; color: var(--gaari-granite); margin-top: 0.2rem; white-space: nowrap;">Master-student · Keio Media Design</div>
  </div>
</div>

<div style="display: flex; flex-direction: column; gap: 0.8rem;">

<div style="flex: 1; background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 4px solid var(--gaari-red); padding: 1rem 1.2rem; box-shadow: 0 2px 6px rgba(28,28,30,0.06); display: flex; align-items: center;">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.3rem; line-height: 1.25; color: var(--gaari-iron);">Som designer har jeg brukt 1,5 år på å utforske <span style="color: var(--gaari-red);">hvordan KI kan forme en ny hverdag.</span></div>
</div>

<div style="flex: 1; background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 4px solid var(--gaari-red); padding: 1rem 1.2rem; box-shadow: 0 2px 6px rgba(28,28,30,0.06); display: flex; align-items: center;">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.3rem; line-height: 1.25; color: var(--gaari-iron);">Event-sidene i Bergen er dårlig designet — <span style="color: var(--gaari-red);">jeg tror jeg kan gjøre bedre.</span></div>
</div>

<div style="flex: 1; background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 4px solid var(--gaari-red); padding: 1rem 1.2rem; box-shadow: 0 2px 6px rgba(28,28,30,0.06); display: flex; align-items: center;">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.3rem; line-height: 1.25; color: var(--gaari-iron);">Jeg er ingen utvikler eller ekspert — <span style="color: var(--gaari-red);">men jeg er ikke redd for å lære mens jeg gjør.</span></div>
</div>

</div>

</div>
</div>

<!--
Speaker notes:
- Bombastisk åpning, men ærlig: jeg bruker KI i alt, og det er verktøyet som lar meg bygge.
- "Min måte å jobbe": masteren handler om KI, Claude Code er hovedverktøyet.
- "Hvorfor Gåri": vær direkte — sidene som finnes er dårlige. Feil designprinsipper, ikke menneske-i-sentrum. Jeg mener jeg kan bedre, så jeg prøver.
- "Hva driver meg": utålmodig, ikke utvikler, men god på ideer og logikk. Vil ikke bli stoppet av "vi har ikke tid/penger".
- Hvis spørsmål om provokativ tone: ja, det å bygge noe selv tråkker på faglig arbeid andre har gjort. Men det er sånn ny teknologi alltid har gjort — de som begynte å trykke bøker tråkket på kalligrafien. Nye verktøy gjør at nye stemmer får bygge.
- Det er en historisk mønster, ikke en personlig diss av designere/utviklere.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 1.2rem 0; flex-shrink: 0; align-self: flex-start;">Hva er Gåri?</h1>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1.7fr; gap: 1.8rem; align-items: center;">

<div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.95rem; line-height: 1.5;">

<div style="font-size: 1.05rem; line-height: 1.5;">
<strong>Ett sted hvor du finner alt som skjer i Bergen.</strong>
</div>

<div>
Arrangementer ligger spredt over mange plattformer. Det gir lite oversikt. Gåri samler dem på <a href="https://gaari.no" style="color: var(--rose-red-deep);">gaari.no</a>.
</div>

<div style="padding-top: 0.7rem; border-top: 1px solid var(--rose-canvas); font-size: 0.88rem;">
Jeg hadde en idé. Med <strong>Claude Code som verktøy</strong> klarte jeg å bygge det ved siden av studiet — og lære mens jeg laget.
</div>

</div>

<div style="display: flex; align-items: center; justify-content: center; min-height: 0; height: 100%;">
  <video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 6px 20px rgba(28,28,30,0.2); border: 1px solid var(--gaari-shadow-light);">
    <source src="./assets/gaari-forside.mp4" type="video/mp4">
  </video>
</div>

</div>
</div>

<!--
Speaker notes:
- Ikke gå dypt inn i Gåri her — én setning, så videre.
- Hvis noen spør "hvorfor" — fortell at jeg savnet det selv etter flytting tilbake til Bergen.
- "AI er den eneste grunnen til at dette finnes" — sett opp resten av foredraget.
- Sjekk at gaari.no er oppe før presentasjonen. Vis evt. nettsiden live hvis prosjektor tillater.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Én rolle, hele stacken</h1>

<p style="font-size: 0.95rem; margin: 0 0 1rem 0;">
<strong>8 fagområder</strong> — tradisjonelt 5–8 personer. Her: én student + AI, ved siden av studiet.
</p>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, auto); gap: 0.7rem; align-content: center;">

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-dev.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">Utvikling</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-svelte.svg" style="width: 20px; height: 20px;" alt="Svelte" />
<img src="./assets/icons/brand-supabase.svg" style="width: 20px; height: 20px;" alt="Supabase" />
<img src="./assets/icons/brand-vercel.svg" style="width: 20px; height: 20px;" alt="Vercel" />
<img src="./assets/icons/brand-github.svg" style="width: 20px; height: 20px;" alt="GitHub" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">SvelteKit 2 + Svelte 5 · Supabase · Vercel ISR · GitHub Actions · TypeScript</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-design.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">Design</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-tailwind.svg" style="width: 20px; height: 20px;" alt="Tailwind" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">Tailwind CSS 4 · Funkis-designsystem · Inter + Barlow Condensed · WCAG-kontrast</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-content.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">Innhold</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-gemini.svg" style="width: 20px; height: 20px;" alt="Gemini" />
<img src="./assets/icons/brand-anthropic.svg" style="width: 20px; height: 20px;" alt="Anthropic Claude" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">57 Cheerio-scrapere · Gemini 2.5 Flash · NO + EN · 50+ kuraterte tema-sider</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-seo.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">SEO &amp; data</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-googlesearch.svg" style="width: 20px; height: 20px;" alt="Google Search Console" />
<img src="./assets/icons/brand-google.svg" style="width: 20px; height: 20px;" alt="Google" />
<img src="./assets/icons/brand-umami.svg" style="width: 20px; height: 20px;" alt="Umami" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">Search Console · Bing Webmaster · Umami · søkeordsanalyse · backlink-strategi</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-comms.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">Kommunikasjon</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-proton.svg" style="width: 20px; height: 20px;" alt="Protonmail" />
<img src="./assets/icons/brand-mailerlite.svg" style="width: 20px; height: 20px;" alt="MailerLite" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">Protonmail · MailerLite · ukentlig nyhetsbrev · outreach · HTML-signatur</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-social.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">Sosiale medier</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-meta.svg" style="width: 20px; height: 20px;" alt="Meta" />
<img src="./assets/icons/brand-facebook.svg" style="width: 20px; height: 20px;" alt="Facebook" />
<img src="./assets/icons/brand-instagram.svg" style="width: 20px; height: 20px;" alt="Instagram" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">Graph API · Business Suite · carousel · captions · plakatdesign (SVG)</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-ops.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">Drift</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-uptimerobot.svg" style="width: 20px; height: 20px;" alt="UptimeRobot" />
<img src="./assets/icons/brand-vercel.svg" style="width: 20px; height: 20px;" alt="Vercel logs" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">UptimeRobot · health-endpoints · scraper-anomalier · daglig digest-mail</div>
</div>

<div class="stat-card" style="display: flex; flex-direction: column; padding: 0.5rem 0.7rem; gap: 0.3rem;">
<div style="display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/cat-biz.svg" style="width: 18px; height: 18px; flex-shrink: 0;" alt="" />
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gaari-red);">B2B &amp; jus</div>
</div>
<div style="display: flex; align-items: center; gap: 0.55rem; padding-top: 0.4rem; border-top: 1px solid var(--gaari-shadow-light);">
<img src="./assets/icons/brand-stripe.svg" style="width: 20px; height: 20px;" alt="Stripe" />
</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); line-height: 1.4;">Stripe · promo placements · prospect-rapporter · GDPR + åndsverkslov</div>
</div>

</div>

</div>

<!--
Speaker notes:
- Hele poenget med denne sliden: BREDDEN. Ikke dybden av kompetanse, men antallet roller én person nå kan dekke.
- 8 kort dekker alt fra typisk fullstack-utvikling til SoMe og juridisk arbeid.
- Pek på et par konkrete eksempler du brenner for — f.eks. at Funkis-designsystemet er bygget med AI som "designer-sparringpartner", eller at Stripe-flyten kom på plass på en kveld.
- Ikke les opp alle 32 verktøyene. Pek på blokkene; folk leser raskere enn du snakker.
- Bunntekst: tradisjonelt ville dette krevd: utvikler + designer + content/copywriter + SEO + outreach + SoMe-ansvarlig + drift + B2B-selger = 5-8 personer.
- Hvis spørsmål om læringskurve: jeg er ikke ekspert i alle 8 områdene. AI lar meg være "god nok" i hvert område til at sluttproduktet fungerer.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Alt håndteres herfra</h1>

<p style="font-size: 0.95rem; color: var(--gaari-granite); margin: 0 0 0.7rem 0;">
Motherboardet — <strong>én terminal, åtte porter</strong> inn til hele Gåri.
</p>

<div style="flex: 1; min-height: 0; position: relative;">

<!-- SVG: PCB-style traces. Layout:
     Modules:  top row 0→20%, bottom row 80→100% — height 20% each
     Terminal: 30→70% vertical, 20→80% horizontal — height 40%, width 60%
     Trace gap zones: 20→30% (top), 70→80% (bottom)
     Module x-centers: 12.5%, 37.5%, 62.5%, 87.5%
     Terminal connection pads at top/bottom edges: 4 evenly-spaced pins -->
<svg viewBox="0 0 900 420" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">

  <!-- Top traces: module bottom (y=84) → midpoint (y=105) → terminal top (y=126) -->
  <path d="M 112.5 84 L 112.5 105 L 274 105 L 274 126" stroke="#C82D2D" stroke-width="1.5" fill="none" />
  <path d="M 337.5 84 L 337.5 105 L 390 105 L 390 126" stroke="#C82D2D" stroke-width="1.5" fill="none" />
  <path d="M 562.5 84 L 562.5 105 L 510 105 L 510 126" stroke="#C82D2D" stroke-width="1.5" fill="none" />
  <path d="M 787.5 84 L 787.5 105 L 626 105 L 626 126" stroke="#C82D2D" stroke-width="1.5" fill="none" />

  <!-- Bottom traces: module top (y=336) → midpoint (y=315) → terminal bottom (y=294) -->
  <path d="M 112.5 336 L 112.5 315 L 274 315 L 274 294" stroke="#C82D2D" stroke-width="1.5" fill="none" />
  <path d="M 337.5 336 L 337.5 315 L 390 315 L 390 294" stroke="#C82D2D" stroke-width="1.5" fill="none" />
  <path d="M 562.5 336 L 562.5 315 L 510 315 L 510 294" stroke="#C82D2D" stroke-width="1.5" fill="none" />
  <path d="M 787.5 336 L 787.5 315 L 626 315 L 626 294" stroke="#C82D2D" stroke-width="1.5" fill="none" />

  <!-- Connection pads on motherboard edge -->
  <circle cx="274" cy="126" r="3.5" fill="#C82D2D" />
  <circle cx="390" cy="126" r="3.5" fill="#C82D2D" />
  <circle cx="510" cy="126" r="3.5" fill="#C82D2D" />
  <circle cx="626" cy="126" r="3.5" fill="#C82D2D" />
  <circle cx="274" cy="294" r="3.5" fill="#C82D2D" />
  <circle cx="390" cy="294" r="3.5" fill="#C82D2D" />
  <circle cx="510" cy="294" r="3.5" fill="#C82D2D" />
  <circle cx="626" cy="294" r="3.5" fill="#C82D2D" />
</svg>

<!-- Top row: 4 modules -->
<div style="position: absolute; left: 0; right: 0; top: 0; height: 20%; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2rem; z-index: 1;">
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-dev.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">Utvikling</div>
  </div>
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-design.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">Design</div>
  </div>
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-content.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">Innhold</div>
  </div>
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-seo.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">SEO</div>
  </div>
</div>

<!-- Center: motherboard / terminal -->
<div style="position: absolute; left: 20%; right: 20%; top: 30%; bottom: 30%; background: var(--gaari-iron); padding: 0.9rem 1.2rem; font-family: 'JetBrains Mono', monospace; box-shadow: 0 6px 18px rgba(28,28,30,0.3); z-index: 2; display: flex; flex-direction: column;">

<div style="display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.7rem; padding-bottom: 0.55rem; border-bottom: 1px solid #3A3A3C; flex-shrink: 0;">
<div style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></div>
<div style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></div>
<div style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></div>
<div style="margin-left: auto; font-size: 0.75rem; color: #8a8a8a; letter-spacing: 0.06em;">claude · ~/Gaari</div>
</div>

<div style="font-size: 0.82rem; line-height: 1.6; color: var(--gaari-plaster); flex: 1;">
<div style="color: #E8A838;">$ claude</div>
<div style="opacity: 0.85;">&gt; sett opp ny scraper, send eposten, lag ukentlig FB-post</div>
<div style="color: var(--gaari-red);">⏺ kobler til 8 systemer …</div>
<div style="color: #27c93f;">✓ ferdig på 4 min</div>
</div>

</div>

<!-- Bottom row: 4 modules -->
<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 20%; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2rem; z-index: 1;">
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-bottom: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-comms.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">Kommunikasjon</div>
  </div>
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-bottom: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-social.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">Sosiale medier</div>
  </div>
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-bottom: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-ops.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">Drift</div>
  </div>
  <div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-bottom: 3px solid var(--gaari-red); padding: 0.35rem 0.5rem; display: flex; flex-direction: row; align-items: center; gap: 0.55rem; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
    <img src="./assets/icons/cat-biz.svg" style="width: 22px; height: 22px; flex-shrink: 0;" alt="" />
    <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gaari-iron);">B2B &amp; jus</div>
  </div>
</div>

</div>
</div>

<!--
Speaker notes:
- Motherboard-metaforen: claude-terminalen er CPU-en, de 8 fagområdene er "portene" som plugger inn.
- Pek på de røde kretsbanene: alt går INN i én sentral hub. Det er hele poenget.
- Forklar at samme verktøy (Claude Code i terminalen) kan håndtere kode, e-poster, SEO-rapporter, social posts — det er ikke 8 separate verktøy, det er ett.
- Hvis spørsmål om kostnad: ca 200 USD/mnd til Claude Max. Betaler seg inn raskt.
- Hvis spørsmål om hva som faktisk skjer på "kobler til 8 systemer ...": Claude Code har MCP (Model Context Protocol) tilkoblinger til e-post, Facebook, etc. Reell teknologi, ikke marketing.
-->

<!--
Speaker notes:
- Pek på skjermbildet: dette er hvor jeg sitter hver dag.
- Forklar de tre panelene: filer til venstre, redigering i midten, Claude-terminalen til høyre (eller nede).
- Claude Code er en CLI-agent (Anthropic). Den leser hele kodebasen, kjører kommandoer, skriver filer direkte.
- "Det jeg gjør her" — fire kategorier dekker ~90% av arbeidet mitt. Ikke bare koding.
- Folk forventer at AI = chatbot. Dette er en helt annen kategori: agent med tilgang til reelle verktøy.
- Hvis spørsmål om kostnad: ca 200 USD/mnd til Claude Max. Betaler seg inn raskt.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.3rem 0; flex-shrink: 0; align-self: flex-start;">Systemarkitektur</h1>

<p style="font-size: 0.88rem; margin: 0 0 0.6rem 0;">
Tjenestene er plattformen — koden, scriptene og dataen har jeg bygget. <span style="background: rgba(200,45,45,0.15); padding: 0 0.3rem;"><strong>Rødt</strong></span> = kjernestacken · <span style="background: #1C1C1E; color: #F5F3EE; padding: 0 0.3rem;">Mørkt</span> = AI i kjøretiden.
</p>

<div style="flex: 1; min-height: 0; position: relative;">

<!-- SVG: 2 main flow arrows + observability "watches"-line -->
<svg viewBox="0 0 900 460" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none;">

  <!-- INGEST → CORE (thick red) -->
  <line x1="245" y1="170" x2="298" y2="170" stroke="#C82D2D" stroke-width="3" marker-end="url(#flowArrow)" />
  <!-- CORE → DISTRIBUTION (thick red) -->
  <line x1="602" y1="170" x2="655" y2="170" stroke="#C82D2D" stroke-width="3" marker-end="url(#flowArrow)" />

  <!-- Drift bus pattern: rail in the gap above Drift-band (no overlap with title text) -->
  <line x1="165" y1="358" x2="165" y2="350" stroke="#1C1C1E" stroke-width="1.2" stroke-dasharray="4,3" />
  <line x1="450" y1="358" x2="450" y2="350" stroke="#1C1C1E" stroke-width="1.2" stroke-dasharray="4,3" />
  <line x1="745" y1="358" x2="745" y2="350" stroke="#1C1C1E" stroke-width="1.2" stroke-dasharray="4,3" />
  <line x1="160" y1="350" x2="780" y2="350" stroke="#1C1C1E" stroke-width="1.2" stroke-dasharray="4,3" />
  <line x1="780" y1="350" x2="780" y2="336" stroke="#1C1C1E" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#watchArrow)" />

  <defs>
    <marker id="flowArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#C82D2D" />
    </marker>
    <marker id="watchArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#1C1C1E" />
    </marker>
  </defs>
</svg>

<!-- ========== INGEST ZONE (left) — GREY tint ========== -->
<div style="position: absolute; left: 0; top: 0; width: 27%; height: 73%; z-index: 1; background: rgba(107,104,98,0.07); border: 1px solid rgba(107,104,98,0.15); padding: 0.5rem 0.6rem; display: flex; flex-direction: column; gap: 0.45rem;">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gaari-granite); padding-bottom: 0.25rem; border-bottom: 1px solid rgba(107,104,98,0.3);">Inntak</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; flex-direction: column; justify-content: center;">
<strong>57 venue-nettsider</strong>
<div style="color: var(--gaari-granite); font-size: 0.65rem;">Cheerio HTML-scrape</div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; flex-direction: column; justify-content: center;">
<strong>/submit-skjema</strong>
<div style="color: var(--gaari-granite); font-size: 0.65rem;">Brukerinnsendelser</div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-stripe.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Stripe webhook</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">B2B-kjøp</div></div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-proton.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Protonmail Bridge</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">innkommende e-post</div></div>
</div>
</div>

<!-- ========== CORE ZONE (middle) — RED tint, trust boundary ========== -->
<div style="position: absolute; left: 33%; top: 0; width: 34%; height: 73%; z-index: 1; background: rgba(200, 45, 45, 0.08); border: 1.5px dashed var(--gaari-red); padding: 0.5rem 0.6rem; display: flex; flex-direction: column; gap: 0.45rem;">

<div style="padding-bottom: 0.25rem; border-bottom: 1px solid rgba(200,45,45,0.25);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gaari-red);">Kjernestack</div>
</div>

<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-red); padding: 0.5rem 0.65rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-github.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>GitHub Actions</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">13 cron-workflows</div></div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; flex: 1;">
<div style="background: var(--gaari-iron); padding: 0.4rem 0.55rem; font-size: 0.68rem; line-height: 1.3; display: flex; align-items: center; gap: 0.35rem;">
<img src="./assets/icons/brand-gemini.svg" style="width: 15px; height: 15px; flex-shrink: 0; filter: invert(1);" alt="" />
<div style="color: var(--gaari-plaster); min-width: 0;"><strong style="color: var(--gaari-red);">Gemini</strong><div style="color: var(--gaari-shadow-light); font-size: 0.6rem;">tekst NO+EN</div></div>
</div>
<div style="background: var(--gaari-iron); padding: 0.4rem 0.55rem; font-size: 0.68rem; line-height: 1.3; display: flex; align-items: center; gap: 0.35rem;">
<img src="./assets/icons/brand-anthropic.svg" style="width: 15px; height: 15px; flex-shrink: 0; filter: invert(1);" alt="" />
<div style="color: var(--gaari-plaster); min-width: 0;"><strong style="color: var(--gaari-red);">Claude</strong><div style="color: var(--gaari-shadow-light); font-size: 0.6rem;">utvikling</div></div>
</div>
</div>

<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-red); padding: 0.5rem 0.65rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-supabase.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Supabase</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">Postgres · Storage · 9 tabeller</div></div>
</div>

<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-red); padding: 0.5rem 0.65rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-vercel.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Vercel</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">SvelteKit · ISR-cache</div></div>
</div>

</div>

<!-- ========== DISTRIBUTION ZONE (right) — GREY tint ========== -->
<div style="position: absolute; right: 0; top: 0; width: 27%; height: 73%; z-index: 1; background: rgba(107,104,98,0.07); border: 1px solid rgba(107,104,98,0.15); padding: 0.5rem 0.6rem; display: flex; flex-direction: column; gap: 0.45rem;">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gaari-granite); padding-bottom: 0.25rem; border-bottom: 1px solid rgba(107,104,98,0.3);">Distribusjon</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; flex-direction: column; justify-content: center;">
<strong>gaari.no</strong>
<div style="color: var(--gaari-granite); font-size: 0.65rem;">SvelteKit · NO + EN</div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-resend.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<img src="./assets/icons/brand-mailerlite.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>E-post</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">Resend + MailerLite</div></div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-granite); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; flex: 1; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-meta.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Meta Graph API</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">FB + Instagram</div></div>
</div>
</div>

<!-- ========== OBSERVABILITY BAND (bottom) ========== -->
<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 22%; z-index: 1; display: flex; flex-direction: column; gap: 0.35rem;">
<div style="display: flex; align-items: center; gap: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1.5px solid var(--gaari-iron);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gaari-iron);">Drift</div>
<div style="font-size: 0.7rem; color: var(--gaari-granite); font-style: italic;">— overvåker gaari.no fra ulike vinkler (liveness, trafikk, SEO)</div>
</div>
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; flex: 1;">
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-iron); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-uptimerobot.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>UptimeRobot</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">/api/health hver 5 min</div></div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-iron); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-umami.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Umami</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">trafikk · klikk · events</div></div>
</div>
<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-top: 3px solid var(--gaari-iron); padding: 0.5rem 0.7rem; font-size: 0.72rem; line-height: 1.35; display: flex; align-items: center; gap: 0.4rem;">
<img src="./assets/icons/brand-googlesearch.svg" style="width: 16px; height: 16px; flex-shrink: 0;" alt="" />
<div><strong>Google Search Console</strong><div style="color: var(--gaari-granite); font-size: 0.65rem;">SEO + Bing API</div></div>
</div>
</div>
</div>

</div>
</div>

<!--
Speaker notes:
- Helhetlig systemarkitektur — fra venstre til høyre: kilder, pipeline+AI, kjerne, mottakere.
- Pek på rødt: pipeline-stegene som AI driver (Gemini for tekst, Claude for utvikling).
- Kjerne: Supabase er "hjertet" — alt går igjennom databasen. Vercel er hosting + ISR-cache.
- Mottakere: gaari.no, e-post (Resend transaksjonell, MailerLite nyhetsbrev), Meta (FB/IG), Stripe (B2B).
- Drift-stripen: alle 4 observerer kontinuerlig — UptimeRobot pinger hvert 5. min, Umami måler trafikk, Search Console/Bing for SEO, daglig digest summerer alt.
- Hvis spørsmål om kostnad: Vercel + Supabase free tier + Claude Max ~200 USD/mnd + Gemini ~5 USD/mnd + MailerLite gratis tier.
- Hvis spørsmål om mer detalj: 9 Supabase-tabeller (events, scraper_runs, social_posts, social_insights, promoted_placements, placement_log, edit_suggestions, opt_out_requests, organizer_inquiries).
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.6rem 0; flex-shrink: 0; align-self: flex-start;">En typisk økt</h1>

<p style="font-size: 0.95rem; margin: 0 0 0.8rem 0;">
Menneske og AI bytter på. <strong>Tre menneskeoverganger per økt</strong> — beskrive, godkjenne, verifisere. Der lever dømmekraften. <strong>Minutter, ikke dager.</strong>
</p>

<div style="flex: 1; min-height: 0; position: relative;">

<!-- DU lane: label column + bg -->
<div style="position: absolute; left: 0; right: 0; top: 7%; height: 32%; display: flex; align-items: stretch; z-index: 0;">
  <div style="width: 9%; display: flex; align-items: center; justify-content: center; border-right: 2px solid var(--gaari-red);">
    <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.8rem; color: var(--gaari-iron); letter-spacing: 0.1em;">DU</span>
  </div>
  <div style="flex: 1; background: rgba(249, 238, 238, 0.55);"></div>
</div>

<!-- AI lane: label column + bg -->
<div style="position: absolute; left: 0; right: 0; top: 57%; height: 32%; display: flex; align-items: stretch; z-index: 0;">
  <div style="width: 9%; display: flex; align-items: center; justify-content: center; border-right: 2px solid var(--gaari-iron);">
    <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.8rem; color: var(--gaari-iron); letter-spacing: 0.1em;">AI</span>
  </div>
  <div style="flex: 1; background: rgba(237, 234, 227, 0.7);"></div>
</div>

<!-- SVG: only connecting arrows -->
<svg viewBox="0 0 900 420" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none;">

  <!-- All paths: L-shaped PCB-style steps with sharp corners -->
  <!-- 1→2 (DU bottom → AI top) -->
  <path d="M 157 147 L 157 195 L 288 195 L 288 244" stroke="#6B6862" stroke-width="1.5" fill="none" marker-end="url(#arr)" />
  <!-- 2→3 (AI top → DU bottom) -->
  <path d="M 288 244 L 288 195 L 418 195 L 418 147" stroke="#6B6862" stroke-width="1.5" fill="none" marker-end="url(#arr)" />
  <!-- 3→4 (DU bottom → AI top) -->
  <path d="M 418 147 L 418 195 L 549 195 L 549 244" stroke="#6B6862" stroke-width="1.5" fill="none" marker-end="url(#arr)" />
  <!-- 4→5 (AI top → DU bottom) -->
  <path d="M 549 244 L 549 195 L 679 195 L 679 147" stroke="#6B6862" stroke-width="1.5" fill="none" marker-end="url(#arr)" />
  <!-- 5→6 (DU bottom → AI top, red — final deploy) -->
  <path d="M 679 147 L 679 195 L 810 195 L 810 244" stroke="#C82D2D" stroke-width="2" fill="none" marker-end="url(#arrRed)" />

  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B6862" />
    </marker>
    <marker id="arrRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#C82D2D" />
    </marker>
  </defs>
</svg>

<!-- Step boxes -->

<!-- Step 1: DU -->
<div style="position: absolute; left: 11%; top: 9%; width: 13%; height: 26%; background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-red); padding: 0.45rem 0.6rem; z-index: 2; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--gaari-red); letter-spacing: 0.04em;">1 · Beskrive</div>
<div style="font-size: 0.7rem; color: var(--gaari-iron); margin-top: 0.2rem; line-height: 1.35;">Problem på norsk, med kontekst.</div>
</div>

<!-- Step 2: AI -->
<div style="position: absolute; left: 25.5%; top: 58%; width: 13%; height: 26%; background: var(--gaari-iron); padding: 0.45rem 0.6rem; z-index: 2; box-shadow: 0 1px 3px rgba(28,28,30,0.15);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--gaari-plaster); letter-spacing: 0.04em;">2 · Plan</div>
<div style="font-size: 0.7rem; color: var(--gaari-shadow-light); margin-top: 0.2rem; line-height: 1.35;">Leser filer, foreslår tilnærming.</div>
</div>

<!-- Step 3: DU -->
<div style="position: absolute; left: 40%; top: 9%; width: 13%; height: 26%; background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-red); padding: 0.45rem 0.6rem; z-index: 2; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--gaari-red); letter-spacing: 0.04em;">3 · Godkjenne</div>
<div style="font-size: 0.7rem; color: var(--gaari-iron); margin-top: 0.2rem; line-height: 1.35;">Veto, scope-kutt, korreksjon.</div>
</div>

<!-- Step 4: AI -->
<div style="position: absolute; left: 54.5%; top: 58%; width: 13%; height: 26%; background: var(--gaari-iron); padding: 0.45rem 0.6rem; z-index: 2; box-shadow: 0 1px 3px rgba(28,28,30,0.15);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--gaari-plaster); letter-spacing: 0.04em; white-space: nowrap;">4 · Kode</div>
<div style="font-size: 0.7rem; color: var(--gaari-shadow-light); margin-top: 0.2rem; line-height: 1.35;">Skriver, tester, retter feil selv.</div>
</div>

<!-- Step 5: DU -->
<div style="position: absolute; left: 69%; top: 9%; width: 13%; height: 26%; background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 3px solid var(--gaari-red); padding: 0.45rem 0.6rem; z-index: 2; box-shadow: 0 1px 3px rgba(28,28,30,0.08);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--gaari-red); letter-spacing: 0.04em;">5 · Verifisere</div>
<div style="font-size: 0.7rem; color: var(--gaari-iron); margin-top: 0.2rem; line-height: 1.35;">I nettleseren — føles det riktig?</div>
</div>

<!-- Step 6: AI (auto-deploy) — AI-lane style, red title as the "exit" marker -->
<div style="position: absolute; left: 83.5%; top: 58%; width: 13%; height: 26%; background: var(--gaari-iron); border-left: 3px solid var(--gaari-red); padding: 0.45rem 0.6rem; z-index: 2; box-shadow: 0 2px 6px rgba(28,28,30,0.2);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--gaari-red); letter-spacing: 0.04em; white-space: nowrap;">6 · Live</div>
<div style="font-size: 0.7rem; color: var(--gaari-shadow-light); margin-top: 0.2rem; line-height: 1.35;">Vercel bygger og publiserer. ~90 sek.</div>
</div>

</div>
</div>

<!--
Speaker notes:
- Den viktigste sliden. Hvis publikum bare husker én ting, så er det denne flyten.
- Pek på de to lanes: "Du" oppe i rødt, "AI" nede i mørkt. Stegene veksler.
- Steg 1 og 3 (mine) — der jeg styrer scope og retning. Naturlig språk, ikke kode.
- Steg 5 — verifisering — det jeg MÅ gjøre selv. AI ser ikke om noe "føles" feil.
- Steg 6 er svart med rød kant fordi det er "exit"-steget. Commit + push.
- Bunntekst: tre menneskeoverganger. Det er der dømmekraften, smaken og ansvaret lever.
- Tidsbruk per feature: minutter til timer, sjelden dager.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<div style="display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0 0.25rem 0;">
<img src="./assets/icons/cat-dev.svg" style="width: 18px; height: 18px;" alt="" />
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; color: var(--gaari-red); text-transform: uppercase;">Utvikling</span>
</div>

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Ny scraper på 20 min</h1>

<p style="font-size: 0.9rem; margin: 0 0 0.7rem 0;">
Det jeg ber om i terminalen — og resultatet på siden. <strong>Hver av de 57 kildene ble bygget slik.</strong>
</p>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.8rem; align-items: center;">

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">1</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Terminal — prompt til Claude</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18);">
<source src="./assets/claude-terminal.mp4" type="video/mp4">
</video>
</div>
</div>

<div style="display: flex; align-items: center; justify-content: center; font-size: 3rem; line-height: 1; color: var(--gaari-red); padding: 0 0.3rem; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;">→</div>

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">2</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Litteraturhuset live på gaari.no</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18); border: 1px solid var(--gaari-shadow-light);">
<source src="./assets/litthus-events.mp4" type="video/mp4">
</video>
</div>
</div>

</div>
</div>

<!--
Speaker notes:
- Pek på videoen: dette er HVA Claude Code faktisk gjør. Ikke en chatbot — en agent som leser, skriver, kjører kode.
- Web scraping er kjent som repetitivt utviklingsarbeid — perfekt eksempel for å vise effekten.
- 4-8 timer tradisjonelt er konservativt — kan være verre med kompleks DOM.
- Det endrer hva som er MULIG, ikke bare hvor raskt det går.
- Hvis spørsmål om kvalitet: jeg leser alltid gjennom koden før commit. Mer kommer på slide 9 (prinsipper).
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<div style="display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0 0.25rem 0;">
<img src="./assets/icons/cat-seo.svg" style="width: 18px; height: 18px;" alt="" />
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; color: var(--gaari-red); text-transform: uppercase;">SEO &amp; data</span>
</div>

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Fra rapport til morgenrutine</h1>

<p style="font-size: 0.9rem; margin: 0 0 0.7rem 0;">
Hver morgen <strong>kl 07:00</strong> ligger en datadrevet rapport i innboksen. <strong>Claude leser den</strong> og foreslår dagens prioriteringer.
</p>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr auto 1.25fr; gap: 0.8rem; align-items: center;">

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">1</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Daglig digest på epost</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="max-width: 100%; max-height: 100%; aspect-ratio: 1/1; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18); border: 1px solid var(--gaari-shadow-light);">
<source src="./assets/seo-digest.mp4" type="video/mp4">
</video>
</div>
</div>

<div style="display: flex; align-items: center; justify-content: center; font-size: 3rem; line-height: 1; color: var(--gaari-red); padding: 0 0.3rem; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;">→</div>

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">2</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Claude leser, prioriterer</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18);">
<source src="./assets/morning-terminal.mp4" type="video/mp4">
</video>
</div>
</div>

</div>
</div>

<!--
Speaker notes:
- Pek på videoen — det er en EKTE rapport jeg får hver morgen. Ikke en mockup.
- Hele scriptet (seo-weekly-report.ts + send-daily-digest.ts) ble bygget av Claude Code på én ettermiddag. Jeg beskrev hva jeg ville se, AI hentet integrasjonene, sendte e-post.
- Verdien: jeg er ikke en heltidsanalytiker. Men jeg har et heltids-analyseverktøy i innboksen.
- Hvis spørsmål om data: kommer fra reelle integrasjoner — Search Console-API, Umami-API, direkte SQL mot Supabase. Ingen mock.
- Dette er rollen jeg vanligvis ville hyret en analytiker for. AI gjør det for 0 kr/mnd.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<div style="display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0 0.25rem 0;">
<img src="./assets/icons/cat-social.svg" style="width: 18px; height: 18px;" alt="" />
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; color: var(--gaari-red); text-transform: uppercase;">Sosiale medier</span>
</div>

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Fra terminal til admin</h1>

<p style="font-size: 0.9rem; margin: 0 0 0.7rem 0;">
AI velger events, lager bilder, skriver caption. <strong>Hovedside: auto via Graph API. Resten manuelt i Business Suite.</strong> <strong>~30% av trafikken kommer herfra.</strong>
</p>

<div style="flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.7rem;">

<!-- Two videos side-by-side with red arrow between -->
<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.8rem; align-items: center;">

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">1</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Terminal</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18);">
<source src="./assets/meta-cli.mp4" type="video/mp4">
</video>
</div>
</div>

<div style="display: flex; align-items: center; justify-content: center; font-size: 3rem; line-height: 1; color: var(--gaari-red); padding: 0 0.3rem; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;">→</div>

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">2</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Admin-siden — last ned</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18); border: 1px solid var(--gaari-shadow-light);">
<source src="./assets/admin-social.mp4" type="video/mp4">
</video>
</div>
</div>

</div>

</div>

</div>

<!--
Speaker notes:
- Det eksempelet som overrasker folk mest. "Du har en social media manager?" Nei, jeg har en pipeline.
- Pek på videoen: én kommando velger, lager bilde, skriver caption, publiserer.
- Hele løpet tar 5-10 min per uke. Vs. minst 5 timer hvis jeg gjorde alt manuelt.
- Stilguiden ligger som memory-fil i prosjektet. AI henter den, følger den.
- Autenticitet: jeg leser hver post før publisering. AI er forfatter-assistent, ikke ghost-writer.
- 30%-tallet er reelt — fra Umami-analytics, ikke estimat.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<div style="display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0 0.25rem 0;">
<img src="./assets/icons/cat-comms.svg" style="width: 18px; height: 18px;" alt="" />
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; color: var(--gaari-red); text-transform: uppercase;">Kommunikasjon</span>
</div>

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Ukentlig nyhetsbrev — på autopilot</h1>

<p style="font-size: 0.9rem; margin: 0 0 0.7rem 0;">
Satt opp én gang. <strong>Sender seg selv hver mandag</strong> — AI velger events, skriver intro på norsk og engelsk, bygger HTML per abonnent og sender via MailerLite. Jeg trenger ikke å være der.
</p>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.8rem; align-items: center;">

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">1</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Scheduled — kjøres automatisk</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18);">
<source src="./assets/newsletter-cli.mp4" type="video/mp4">
</video>
</div>
</div>

<div style="display: flex; align-items: center; justify-content: center; font-size: 3rem; line-height: 1; color: var(--gaari-red); padding: 0 0.3rem; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;">→</div>

<div style="display: flex; flex-direction: column; gap: 0.4rem; height: 100%;">
<div style="display: flex; align-items: center; gap: 0.5rem;">
<div style="background: var(--gaari-red); color: var(--gaari-white); font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; letter-spacing: 0.08em;">2</div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gaari-iron);">Ferdig nyhetsbrev i innboksen</div>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
<video autoplay muted loop playsinline style="width: 100%; max-height: 100%; aspect-ratio: 16/9; object-fit: contain; box-shadow: 0 4px 14px rgba(28,28,30,0.18); border: 1px solid var(--gaari-shadow-light);">
<source src="./assets/newsletter-preview.mp4" type="video/mp4">
</video>
</div>
</div>

</div>

</div>

<!--
Speaker notes:
- Nyhetsbrev er en annen typisk "person-rolle" som AI tar over.
- Bygget pipelinen én gang. Nå kjører den automatisk hver mandag via GitHub Actions cron.
- Per uke: AI velger events for hvert segment (familie/voksen/ungdom), skriver intro på begge språk, bygger HTML, sender.
- Jeg er ikke involvert i selve sendingen. Sjekker bare metrics etterpå hvis jeg vil.
- Memory-fil med segment-stilguide: AI vet hva hver målgruppe forventer.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Hva jeg har lært</h1>

<p style="font-size: 0.95rem; margin: 0 0 1rem 0;">
Med Claude kommer jeg raskere fra idé til prototype. Jeg har fortsatt ansvaret for <strong>design, funksjonalitet og logikk.</strong>
</p>

<div style="flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem;">

<div style="display: flex; flex-direction: column; gap: 0.7rem;">

<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gaari-red); padding-bottom: 0.3rem; border-bottom: 2px solid var(--gaari-red);">Med Claude</div>

<div class="findings-card" style="display: flex; align-items: center; gap: 0.85rem; padding: 0.7rem 0.95rem;">
<img src="./assets/icons/s10-speed.svg" style="width: 40px; height: 40px; flex-shrink: 0;" alt="" />
<div style="min-width: 0;">
<strong>Raskere fra idé til prototype</strong>
<div style="font-size: 0.82rem; margin-top: 0.15rem; line-height: 1.35;">Jeg får testet en idé mens den ennå er fersk.</div>
</div>
</div>

<div class="findings-card" style="display: flex; align-items: center; gap: 0.85rem; padding: 0.7rem 0.95rem;">
<img src="./assets/icons/s10-flow.svg" style="width: 40px; height: 40px; flex-shrink: 0;" alt="" />
<div style="min-width: 0;">
<strong>Færre stoppere underveis</strong>
<div style="font-size: 0.82rem; margin-top: 0.15rem; line-height: 1.35;">Implementering og repetitivt arbeid tar mindre tid.</div>
</div>
</div>

<div class="findings-card" style="display: flex; align-items: center; gap: 0.85rem; padding: 0.7rem 0.95rem;">
<img src="./assets/icons/s10-iterate.svg" style="width: 40px; height: 40px; flex-shrink: 0;" alt="" />
<div style="min-width: 0;">
<strong>Rom til å prøve flere løsninger</strong>
<div style="font-size: 0.82rem; margin-top: 0.15rem; line-height: 1.35;">Lettere å vurdere alternativer når de ikke koster en hel dag.</div>
</div>
</div>

</div>

<div style="display: flex; flex-direction: column; gap: 0.7rem;">

<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gaari-iron); padding-bottom: 0.3rem; border-bottom: 2px solid var(--gaari-iron);">Mitt ansvar</div>

<div class="findings-card" style="border-left-color: var(--gaari-iron); display: flex; align-items: center; gap: 0.85rem; padding: 0.7rem 0.95rem;">
<img src="./assets/icons/s10-design.svg" style="width: 40px; height: 40px; flex-shrink: 0;" alt="" />
<div style="min-width: 0;">
<strong style="color: var(--gaari-iron);">Hvordan det ser ut</strong>
<div style="font-size: 0.82rem; margin-top: 0.15rem; line-height: 1.35;">Visuell identitet, farger, typografi, hva som føles riktig.</div>
</div>
</div>

<div class="findings-card" style="border-left-color: var(--gaari-iron); display: flex; align-items: center; gap: 0.85rem; padding: 0.7rem 0.95rem;">
<img src="./assets/icons/s10-func.svg" style="width: 40px; height: 40px; flex-shrink: 0;" alt="" />
<div style="min-width: 0;">
<strong style="color: var(--gaari-iron);">Funksjonaliteten</strong>
<div style="font-size: 0.82rem; margin-top: 0.15rem; line-height: 1.35;">Hva systemet skal kunne — og hva det ikke skal være.</div>
</div>
</div>

<div class="findings-card" style="border-left-color: var(--gaari-iron); display: flex; align-items: center; gap: 0.85rem; padding: 0.7rem 0.95rem;">
<img src="./assets/icons/s10-logic.svg" style="width: 40px; height: 40px; flex-shrink: 0;" alt="" />
<div style="min-width: 0;">
<strong style="color: var(--gaari-iron);">Logikken</strong>
<div style="font-size: 0.82rem; margin-top: 0.15rem; line-height: 1.35;">Hvordan delene henger sammen og hva som styrer flyten.</div>
</div>
</div>

</div>

</div>
</div>

<!--
Speaker notes:
- Vinklingen: ikke "AI vs menneske" — men hva samarbeidet betyr i praksis.
- Venstre: hva Claude bidrar med — fart og lavere terskel for å prøve.
- Høyre: hva jeg fortsatt har ansvaret for. Design, funksjonalitet og logikk er menneskeavgjørelser.
- "Rom til å prøve flere løsninger" — tidligere kunne jeg bygge én løsning. Nå kan jeg vurdere flere før jeg velger.
- Hvis spørsmål om grenser: Claude kan foreslå design, men jeg gjør valget. Claude kan kode logikken, men jeg avgjør hva den skal være.
-->

---

<div style="position: absolute; inset: 2.5rem 4rem; display: flex; flex-direction: column; overflow: hidden;">

<h1 style="margin: 0 0 0.5rem 0; flex-shrink: 0; align-self: flex-start;">Oppsummering</h1>

<p style="font-size: 0.95rem; margin: 0 0 1rem 0;">
Tre observasjoner etter ett år med Claude som verktøy.
</p>

<div style="flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.8rem; justify-content: center;">

<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 4px solid var(--gaari-red); padding: 0.9rem 1.1rem; box-shadow: 0 2px 6px rgba(28, 28, 30, 0.08);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.3rem; color: var(--gaari-red); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.02em;">Terskelen er lavere</div>
<div style="font-size: 0.95rem; line-height: 1.45;">Ideer jeg tidligere ville sagt nei til fordi de tok for lang tid, kan jeg nå prøve.</div>
</div>

<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 4px solid var(--gaari-red); padding: 0.9rem 1.1rem; box-shadow: 0 2px 6px rgba(28, 28, 30, 0.08);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.3rem; color: var(--gaari-red); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.02em;">Dømmekraften teller mer</div>
<div style="font-size: 0.95rem; line-height: 1.45;">Når Claude skriver koden, må jeg være tydelig på hva jeg ønsker. Det krever klarere tanker.</div>
</div>

<div style="background: var(--gaari-white); border: 1px solid var(--gaari-shadow-light); border-left: 4px solid var(--gaari-red); padding: 0.9rem 1.1rem; box-shadow: 0 2px 6px rgba(28, 28, 30, 0.08);">
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.3rem; color: var(--gaari-red); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.02em;">Retning betyr mer enn fart</div>
<div style="font-size: 0.95rem; line-height: 1.45;">Det viktigste er ikke hvor raskt jeg kan bygge, men hva jeg velger å bruke tiden på.</div>
</div>

</div>

<div style="margin-top: 1rem; padding-top: 0.9rem; border-top: 2px solid var(--gaari-iron); display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-shrink: 0;">
<div>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.5rem; color: var(--gaari-red); text-transform: uppercase; letter-spacing: 0.04em;">Spørsmål?</div>
</div>
<div style="text-align: right; font-size: 0.9rem;">
<div><strong>Kjersti V. Therkildsen</strong></div>
<div style="font-size: 0.8rem; color: var(--gaari-granite);">gaari.no · gaari.bergen@proton.me</div>
</div>
</div>

</div>

<!--
Speaker notes:
- Tre observasjoner som er sanne for meg, kan være sanne for andre. Denne sliden blir stående gjennom Q&A.
- "Terskelen er lavere": ikke at "alt er enkelt nå", men at terskelen for å prøve har gått ned.
- "Dømmekraften teller mer": når implementering blir billigere, blir det å velge HVA man skal lage, det dyreste.
- "Retning betyr mer enn fart": prinsipp som gjelder utover bare AI-koding.
- Sannsynlige spørsmål:
  - "Hvilken modell?" → Claude Opus til koding, Gemini 2.5 Flash til tekstgenerering
  - "Hva koster det?" → ~200 USD/mnd til Claude Max, <5 USD til Gemini
  - "Hvor begynner jeg?" → Claude Code, ett konkret prosjekt, små iterasjoner
-->
