# Databehandleravtaler (DPA)

Register over signerte/aksepterte DPA-er per GDPR Art. 28.

**Behandlingsansvarlig:** Kjersti V. Therkildsen (personlig prosjekt, Bergen)

## Status

| Tjeneste    | Type avtale                  | Status     | Dato lagret | Fil                                |
|-------------|------------------------------|------------|-------------|------------------------------------|
| MailerLite  | Automatisk via ToU (§16.7.1) | Aktiv      | 2026-05-26  | `MailerLite_DPA_2026-05-26.pdf`    |
| Stripe      | Automatisk via SSA           | Aktiv      | 2026-05-26  | `Stripe_DPA_2026-05-26.pdf`        |
| Supabase    | Krever signering via PandaDoc| Forespurt  | 2026-05-26  | (venter på PandaDoc)               |
| Vercel      | Hobby — krever henvendelse   | Forespurt  | 2026-05-26  | (venter på svar fra privacy@vercel.com) |
| Resend      | Krever henvendelse           | Forespurt  | 2026-05-26  | (venter på svar fra support@resend.com) |

## Hva en DPA er

En databehandleravtale er en kontrakt som regulerer hvordan en tjeneste behandler personopplysninger på dine vegne. GDPR Art. 28 krever at slike avtaler er på plass før behandling starter. For SaaS-tjenester er DPA-en typisk en standardavtale du aksepterer i dashbordet.

## Praktiske notater

- DPA-er som er "automatisk i kraft" via Terms of Use trenger ikke signering, men det er lurt å lagre en PDF som dokumentasjon av tekstinnholdet på den datoen du registrerte deg.
- Bruk filnavn `{Tjeneste}_DPA_{YYYY-MM-DD}.pdf` (dato = dato lagret/signert).
- Hvis en tjeneste oppdaterer sin DPA, last ned ny versjon med ny dato. Ikke slett gamle — de dokumenterer hva som var gjeldende i ulike perioder.
