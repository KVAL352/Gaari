# Gåri — Sieve-filter for å holde innboksen ren
#
# FORMÅL: rute automatiske varsler (Gåris egne rapporter + eksterne tjenester)
# rett til mapper, så INNBOKSEN bare inneholder ekte henvendelser fra mennesker.
# Sikkerhetsnett mot tapte feil ligger i /morgen ("Failed workflows"-sjekken),
# som leser GitHub-status direkte — ikke fra e-post. Derfor trygt å arkivere
# disse varslene automatisk.
#
# SLIK TAR DU DEN I BRUK (engangsjobb, ~2 min):
#   1. Proton: Settings → Filters → "Add sieve filter"
#   2. Lim inn alt under streken.
#   3. VIKTIG REKKEFØLGE: plasser dette filteret NEDENFOR de eksisterende
#      [Inquiry]/[Submission]/[Correction]/[Opt-out]-filtrene i filterlista,
#      så innsendinger fortsatt havner i .../Unresolved. (Reglene her matcher
#      uansett bare på andre emner/avsendere, så de svelger ikke innsendinger.)
#   4. Lagre. Nye e-poster sorteres automatisk; gamle påvirkes ikke.
#
# Sieve bruker mappenavn UTEN "Folders/"-prefiks (IMAP bruker prefikset).
# ----------------------------------------------------------------------------

require ["fileinto"];

# --- Gåris egne auto-rapporter → Notifications ---
if anyof (
  header :contains "subject" "[Daglig oversikt]",
  header :contains "subject" "[Ukerapport]",
  header :contains "subject" "[Nyhetsbrev-kopi]",
  header :contains "subject" "[Ukens reels]",
  header :contains "subject" "[Ukens reels klar]",
  header :contains "subject" "[Månedlig kvalitetssjekk]",
  header :contains "subject" "[SEO VARSEL]",
  header :contains "subject" "stale event"
) {
  fileinto "Gaari/Notifications";
  stop;
}

# --- Eksterne systemvarsler → Notifications ---
if anyof (
  address :domain :is "from" "github.com",
  address :domain :is "from" "mailerlite.com",
  address :is "from" "no-reply@calendar.proton.me",
  address :is "from" "info@uptimerobot.com",
  address :is "from" "bingwb@microsoft.com",
  address :is "from" "ship@info.vercel.com"
) {
  fileinto "Gaari/Notifications";
  stop;
}

# --- Kvitteringer → Receipts ---
if address :is "from" "invoice+statements@vercel.com" {
  fileinto "Receipts";
  stop;
}

# --- Ren markedsføring → Archive ---
if anyof (
  address :domain :is "from" "offers.proton.me",
  address :domain :is "from" "news.proton.me",
  address :domain :is "from" "updates.resend.com"
) {
  fileinto "Archive";
  stop;
}
