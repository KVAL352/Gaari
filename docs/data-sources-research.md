# Bergen Municipality – Activity & Events Websites Research

## Purpose
This document lists all known websites, platforms, and apps that show what's happening in Bergen municipality (Norway) — activities, events, concerts, sports, family outings, and more. Use this as a data source for building an aggregator, scraper, or recommendation tool.

---

> **Note (2026-02-26):** This is the original research document from the planning phase. For the actual active scrapers and their current status, see `CLAUDE.md` (scraper sources section) and `scraping-strategy.md`. Not all sources listed here were implemented — some were found to be infeasible (Vue.js SPAs, no structured data), and some platforms (Ticketmaster, Songkick, Bandsintown, Billetto) were not pursued in favor of direct venue scrapers.

---

## 1. Official / Government Sources

| Name | URL | What it covers | Notes |
|------|-----|----------------|-------|
| Bergen Municipality – What's On | https://www.bergen.kommune.no/hvaskjer/kultur-og-idrett | Cultural programs, sports, leisure for all ages | Official municipal calendar |
| Bergen Municipality – Leisure | https://www.bergen.kommune.no/innbyggerhjelpen/kultur-idrett-og-fritid/fritid/fritidstilbud | Leisure activities for residents | Includes pools, sports halls |
| Bergen Municipality – Youth Activities | https://www.bergen.kommune.no/innbyggerhjelpen/hvem-er-du/ung/fritid/fritidsaktiviteter-for-ungdom | Activities for youth (teens) | |
| Bergen Municipality – Culture | https://www.bergen.kommune.no/innbyggerhjelpen/kultur-idrett-og-fritid/kultur/kulturtilbud | Cultural offerings | |
| Aktivitetskortet (Activity Card) | https://www.bergen.kommune.no/innbyggerhjelpen/kultur-idrett-og-fritid/fritid/fritidstilbud/aktivitetskortet-for-barn-og-ungdom | Free activities for children 0–17 from low-income families | Has a mobile app (iOS/Android) |

---

## 2. Main Event Calendars (Start Here)

| Name | URL | What it covers | Language | Update frequency |
|------|-----|----------------|----------|-----------------|
| Visit Bergen – Hva skjer | https://www.visitbergen.com/hva-skjer | Broadest Bergen event calendar – concerts, festivals, sport, family, food, exhibitions | Norwegian | Daily |
| Visit Bergen – What's On | https://en.visitbergen.com/whats-on | Same as above | English | Daily |
| Bergen Sentrum – Activity Calendar | https://www.bergensentrum.no/byliv_bergen/kultur-opplevelser/hva-skjer-aktivitetskalender/ | Auto-aggregates from Ticketmaster, Songkick, Eventim, TicketCo, Facebook Events | Norwegian | Automated |
| Kultur i Kveld – Bergen | https://kulturikveld.no/arrangementer/bergen | Concerts, theatre, comedy, shows with ticket links | Norwegian | Daily |
| Friskus Bergen | https://bergen.friskus.com | Community activity calendar, volunteering | Norwegian | Ongoing |

---

## 3. Ticket Platforms (also usable as event discovery)

| Name | URL | Notes |
|------|-----|-------|
| Ticketmaster Norway – Bergen | https://www.ticketmaster.no/discover/bergen | Largest platform, hundreds of Bergen listings |
| TicketCo | https://ticketco.events | Bergen-based startup, used by many local/indie venues |
| Eventim – Bergen | https://www.eventim.no/en/city/bergen-1680 | Major European ticketing, strong Bergen coverage |
| Billetto – Bergen | https://billetto.no/c/bergen-l | Smaller platform, good for independent events |
| Eventbrite – Bergen | https://www.eventbrite.com/d/norway--bergen/events | Workshops, courses, standup, networking |

---

## 4. Music & Concert Discovery

| Name | URL | Notes |
|------|-----|-------|
| Bergen Live – Concert Calendar | https://www.bergenlive.no/konsertkalender | Local promoter covering all major Bergen arenas |
| Songkick – Bergen | https://www.songkick.com/metro-areas/31419-norway-bergen | International music tracker |
| Bandsintown – Bergen | https://www.bandsintown.com/c/bergen-norway | International music tracker |
| Bergen Philharmonic Orchestra | https://www.harmonien.no | Weekly concerts Aug–June at Grieghallen |

---

## 5. Cultural Institutions with Own Event Calendars

| Name | URL | Type |
|------|-----|------|
| Grieghallen | https://www.grieghallen.no/arrangementer | Concert hall – classical, pop, rock, conferences |
| USF Verftet | https://www.usf.no | Music, theatre, film (Cinemateket), art, dance |
| Den Nationale Scene (DNS) | https://www.dns.no | Norway's oldest theatre (est. 1850) |
| Forum Scene | https://www.forumscene.no | Concerts, musicals, theatre, opera |
| KODE Art Museums | https://www.kodebergen.no/en/calendar | Exhibitions, concerts, tours, family programs |
| Bergen Public Library | https://www.bergenbibliotek.no/arrangement | Author talks, reading groups, concerts, quiz, children's programs |
| Bergen National Opera | https://www.bno.no/eng | Opera performances, OperaPub |
| Det Vestnorske Teateret | https://www.detvestnorsketeateret.no | Theatre in Nynorsk, musicals, family shows |
| Kulturhuset i Bergen | https://www.kulturhusetibergen.no | Concerts, exhibitions, quiz, yoga, workshops |
| Bergen Kunsthall | https://www.bergenkunsthall.no | One of Norway's leading contemporary art venues |
| Akvariet (Aquarium) | https://www.akvariet.no | Family attraction – also runs public events |
| VilVite Science Centre | https://www.vilvite.no | Science activities, family events |

---

## 6. Festivals (Own Websites)

| Festival | URL | When | Type |
|----------|-----|------|------|
| Festspillene i Bergen | https://www.fib.no/en | Late May – Early June | North Europe's largest arts & music festival |
| Bergenfest | https://www.bergenfest.no/en | June (Bergenhus Fortress) | Largest outdoor music festival in Western Norway |
| Nattjazz | https://www.nattjazz.no | May–June (USF Verftet) | North Europe's longest-running jazz festival |
| Borealis Festival | https://www.borealisfestival.no/en | March | Experimental/contemporary music |
| Bergen City Marathon | https://www.bergencitymarathon.no | April | Running event |
| Høydenfestivalen | – | August/September | Student festival at semester start |

---

## 7. Outdoor & Nature Activities

| Name | URL | What it covers |
|------|-----|----------------|
| Bergen og Hordaland Turlag (DNT) | https://www.dnt.no/dnt-der-du-er/BergenogHordalandTurlag | 2,600+ hikes/courses/year, 25+ mountain cabins, 31,000 members |
| UT.no – Bergen | https://ut.no/gruppe/1527/bergen-og-hordaland-turlag | Norway's leading hiking platform, Bergen routes curated by DNT |
| Fløyen | https://www.floyen.no/en | Funicular, trails, troll forest, events |
| Ulriken643 | https://www.ulriken643.no/en | Cable car, hiking, winter activities |
| Stolpejakten | https://www.stolpejakten.no | GPS outdoor activity – find physical posts around Bergen |
| AllTrails – Bergen | https://www.alltrails.com (search Bergen) | English-language hiking suggestions with user reviews |

---

## 8. Indoor Entertainment & Activity Venues

| Name | URL | Type |
|------|-----|------|
| Bergen Kino | https://www.bergenkino.no | 18 cinema screens, including Europe's largest D-BOX screen |
| Bergen Klatresenter | https://www.bergenklatresenter.no/en | Norway's largest climbing club, 2 bouldering halls |
| Høyt & Lavt Bergen | https://www.hoytlavt.no/bergen | Western Norway's largest outdoor climbing park |
| Rush Trampolinepark Bergen | https://www.rushtrampolinepark.no/bergen | Trampolines, foam pits |
| FlipZone | https://www.flipzone.no | Trampolines |
| Skyland Bergen | https://ny.skyland.no/bergen | Trampolines |
| Escape Bryggen | https://www.escapebryggen.no/en/home | Escape rooms, located in UNESCO-listed Bryggen |
| ParkN Play | https://www.parkn.no | Minigolf, bowling, darts, shuffleboard, karaoke (3 floors) |
| Bergen Gokartsenter | https://www.bergengokart.no | Electric go-kart track |
| Lucky Bowl | https://luckybowl.no | Bowling, laser tag, arcade, karaoke |

---

## 9. Swimming Pools & Water Parks

| Name | URL | Notes |
|------|-----|-------|
| AdO Arena | https://www.adoarena.no | Norway's national swimming/diving facility |
| Vannkanten Badeland | – (Vestkanten Storsenter) | Norway's longest water slide (120m) |
| Municipal pools overview | https://www.bergen.kommune.no/innbyggerhjelpen/kultur-idrett-og-fritid/idrett/idrettsanlegg/apningstider-svommehaller | All public pool opening hours |

---

## 10. Sports

| Name | URL | Notes |
|------|-----|-------|
| SK Brann | https://www.brann.no | Bergen's football club, Eliteserien, 17,840 capacity |
| Idrettsrådet i Bergen | https://www.idrettenibergen.no | Umbrella org for all sports clubs in Bergen |
| Bergen City Marathon | https://www.bergencitymarathon.no | April 25, 2026 |
| 7-Fjellsturen | https://www.dnt.no (Bergen Turlag) | Annual hike over Bergen's seven mountains |

---

## 11. Student / Youth Platforms

| Name | URL | Notes |
|------|-----|-------|
| Det Akademiske Kvarter | https://kvarteret.no/en | Student cultural centre – ~2,200 events/year (concerts, theatre, film, debates) |
| Student Bergen (Norwegian) | https://www.studentbergen.no/studentkalender | Student calendar for UiB, HVL, NHH students |
| Study Bergen (English) | https://www.studybergen.com/guide-to-bergen/arts-and-culture | English guide to student life incl. culture & leisure |

---

## 12. Family / Children Platforms

| Name | URL | Notes |
|------|-----|-------|
| BarnasNorge – Bergen | https://www.barnasnorge.no/kommuner/bergen | Best aggregator for family activities, updated daily |
| Visit Bergen – Family | https://en.visitbergen.com/things-to-do/attractions/family-friendly | Editorially curated family attractions |
| Enjoy.ly – Bergen | https://www.enjoy.ly (search Bergen) | Booking platform for activity parks, pools, trampoline parks |

---

## 13. Local News & Media (event listings + cultural coverage)

| Name | URL | Notes |
|------|-----|-------|
| Bergens Tidende – Culture | https://www.bt.no/kultur | Western Norway's largest newspaper – reviews, listings, cultural journalism |
| BT Kulturguiden | https://www.bt.no/kulturguiden | Curated "what's on" guide (subscription required) |
| Bergensavisen (BA) – Culture | https://www.ba.no/kultur | Bergen's second newspaper (subscription) |
| NRK Vestland | https://www.nrk.no/vestland | Free public broadcaster – daily news + cultural coverage |
| Utetrend | https://www.utetrend.no | Regular "this week in Bergen" roundups – concerts, standup, theatre |

---

## 14. International / Expat Resources

| Name | URL | Notes |
|------|-----|-------|
| Life in Norway – Bergen Events | https://www.lifeinnorway.net/major-events-in-bergen/ | Annual guide to major Bergen events 2026, English |
| InterNations Bergen | https://www.internations.org/bergen-expats | Regular networking events for internationals |
| Relocation.no – Bergen | https://relocation.no/expat-communities/local-information/bergen/networking-and-social-groups/ | Lists expat social groups |

---

## 15. Apps

| App | Platform | Focus |
|-----|----------|-------|
| Aktivitetskortet | iOS / Android | Free activities for children from low-income families in Bergen |
| UT.no | iOS / Android / Web | Hiking routes and cabins |
| Stolpejakten | iOS / Android | GPS outdoor activity (find physical posts) |
| Friskus | iOS / Android / Web | Community activity calendar |
| Meetup | iOS / Android / Web | Interest groups and events (tech, design, hobbies) |
| Facebook Events | iOS / Android / Web | Still essential for local/informal events in Bergen |
| Geocaching | iOS / Android | Outdoor GPS treasure hunt – many caches around Bergen |

---

## 16. Social Media Groups (Facebook)

- "Hva skjer i Bergen" – general What's On groups
- Bergen Expats
- English Speaking Parents in Bergen
- International Women's Group Bergen
- Americans in Bergen

**Subreddits:** r/norway (555K+ members), r/norge, r/Bergen

---

## Summary: Recommended Data Sources by Category

| Goal | Best source(s) |
|------|----------------|
| Broadest event overview | visitbergen.com/hva-skjer |
| Auto-aggregated from ticket sites | bergensentrum.no calendar |
| Concerts & music | bergenlive.no + songkick.com + bandsintown.com |
| Family activities | barnasnorge.no/kommuner/bergen |
| Hiking & outdoor | ut.no + dnt.no Bergen |
| Students | kvarteret.no + studentbergen.no |
| Festivals | fib.no, bergenfest.no, nattjazz.no |
| Tickets | ticketmaster.no, ticketco.events, eventim.no |
| English-language | en.visitbergen.com + lifeinnorway.net |
| Children free activities | Aktivitetskortet app + bergen.kommune.no |

---

*Research conducted February 2026. All URLs verified as active.*
