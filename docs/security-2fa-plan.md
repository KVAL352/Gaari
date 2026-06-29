# 2FA-plan for Gåri — gjør det i to korte økter

**Mål:** to-faktor (2FA) på alle kontoer som kan skade prosjektet hvis de kaptes.
**Prinsipp:** rekkefølgen er etter «blast radius» — hvor mye en angriper kan nå
hvis kontoen tas. Gjør Tier 1 først; da er det verste dekket selv om du stopper der.

**Engangsforberedelse (5 min):**
- Installer én autentiserings-app på telefonen (TOTP) — f.eks. Proton Authenticator,
  Ente Auth, eller Google Authenticator. Den genererer 6-sifrede koder.
- Foretrekk **app eller passkey** framfor **SMS** (SMS kan kapres via SIM-bytte).
- For HVER tjeneste under: når du skrur på 2FA, får du **recovery-koder** — lagre dem
  ett sted (Proton Pass, eller skriv dem ned i en safe). Uten dem kan du låse deg ute.

---

## Tier 1 — størst skade hvis kapret (gjør først, ~15 min)

- [ ] **Proton (e-post)** — hovednøkkelen. Kaprer noen denne, kan de tilbakestille
      passord på nesten alt annet. Settings → Account & password → Two-factor auth.
- [ ] **Domeneshop (domeneregistrar)** — styrer gaari.no. Kapret = angriper kan peke
      domenet hvor som helst eller stjele det. Logg inn → kontoinnstillinger → 2FA.
- [ ] **GitHub** — kildekode + alle GHA-secrets + kan de, deploye. Settings → Password
      and authentication → Two-factor authentication. (GitHub støtter passkeys.)

## Tier 2 — drift og data (~15 min)

- [ ] **Vercel** — hosting/deploy. Account Settings → Authentication → 2FA.
- [ ] **Supabase** — hele databasen (alle data + PII). Account → Security → MFA.
- [ ] **Stripe** — betalinger/penger. Settings → Security → Two-step authentication.
      (Stripe krever vanligvis 2FA allerede — bekreft at det er en app, ikke SMS.)

## Tier 3 — verktøy (når du orker)

- [ ] **Google** (konto bak GSC, Gemini, Calendar) — sannsynligvis allerede på; bekreft.
- [ ] **Meta / Facebook** (FB-side + IG business) — Business-konto = følgere/rekkevidde.
- [ ] **MailerLite** — abonnentlista (PII). Settings → Security.

---

## Etter at alt er gjort
- Noter i `reminders.json` en årlig sjekk: «er recovery-kodene fortsatt trygge, og
  er 2FA aktivt overalt?»
- Hvis en tjeneste tilbyr **passkey** (Face ID / fingeravtrykk / Yubikey), er det
  enda bedre enn TOTP-app — bruk det der det finnes (GitHub, Google, Vercel).

## Status (fyll inn etter hvert)
Sist oppdatert: _ikke startet_
