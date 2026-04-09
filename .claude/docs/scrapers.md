# Scraper Sources (59 total, 55 active, 4 disabled)

## General aggregators
| Source | File | Method |
|--------|------|--------|
| Bergen Kommune | `bergenkommune.ts` | AJAX `GetFilteredEventList` + detail pages. Uses billett detail URLs directly as ticket_url (not resolveTicketUrl). |
| StudentBergen | `studentbergen.ts` | JSON API `/api/calendar.json` |
| Bergen Live | `bergenlive.ts` | HTML scrape |

**Disabled scrapers:**
- ~~BarnasNorge~~ (`barnasnorge.ts`) — disabled Feb 25, 2026. All venues covered by dedicated scrapers. Issues: AI-generated stock images from Webflow CDN, address-based venue names, complex URL resolution.
- ~~Kulturikveld~~ — removed (unreliable, file deleted).
- ~~Eventbrite~~ (`eventbrite.ts`) — disabled Apr 6, 2026. Cloudflare blocks GHA datacenter IPs. Search API deprecated (Dec 2019). Low value (~2 events/day, most covered by other scrapers).

## Ticket platforms
| Source | File | Method |
|--------|------|--------|
| TicketCo | `ticketco.ts` | Multi-venue subdomains (Hulen, Kvarteret, Madam Felle, Landmark, Statsraad Lehmkuhl, Swing 'n Sweet, Mandelhuset, Bergen Pride, etc.) |
| Billetto | `billetto.ts` | Algolia API geo-search (25km Bergen radius) |
| Hoopla | `hoopla.ts` | Hoopla events platform |

## Performance venues
| Source | File | Method |
|--------|------|--------|
| Den Nationale Scene | `dns.ts` | HTML |
| Grieghallen | `grieghallen.ts` | HTML/JSON |
| Ole Bull Huset | `olebull.ts` | HTML |
| USF Verftet | `usfverftet.ts` | HTML |
| Forum Scene | `forumscene.ts` | HTML |
| Cornerteateret | `cornerteateret.ts` | HTML |
| Det Vestnorske Teateret | `dvrtvest.ts` | HTML |
| Bergen Internasjonale Teater (BIT) | `bitteater.ts` | HTML |
| Carte Blanche | `carteblanche.ts` | HTML |
| Bergen Filharmoniske | `harmonien.ts` | HTML |
| Fyllingsdalen Teater | `fyllingsdalenteater.ts` | HTML (EasyTicket select dropdown) |
| Ostre | `ostre.ts` | HTML calendar page (ekko.no/ostre) |

## Arts, culture & literature
| Source | File | Method |
|--------|------|--------|
| Bergen Kunsthall | `kunsthall.ts` | HTML |
| KODE | `kode.ts` | HTML |
| Litteraturhuset | `litthusbergen.ts` | HTML |
| Media City Bergen | `mediacity.ts` | HTML |
| BEK | `bek.ts` | WordPress REST API (`/wp-json/`) |
| Bergen Filmklubb | `bergenfilmklubb.ts` | HTML |

## Libraries, museums & landmarks
| Source | File | Method |
|--------|------|--------|
| Akvariet i Bergen | `akvariet.ts` | Daily activity calendar (14-day lookahead) + dedicated overnatting article page |
| Bergen Bibliotek | `bergenbibliotek.ts` | HTML |
| Bymuseet i Bergen | `bymuseet.ts` | WordPress HTML, event sitemap |
| Museum Vest | `museumvest.ts` | Sitemap discovery + detail page scraping (3 Bergen museums) |
| Floyen | `floyen.ts` | HTML |

## Food, nightlife & recreation
| Source | File | Method |
|--------|------|--------|
| Bergen Kjott | `bergenkjott.ts` | HTML |
| Colonialen | `colonialen.ts` | HTML |
| Rabrent | `raabrent.ts` | HTML |
| Paint'n Sip | `paintnsip.ts` | HTML |
| Brettspill-cafe | `brettspill.ts` | HTML |
| Bjorgvin Blues Club | `bjorgvinblues.ts` | HTML |
| Nordnes Sjobad | `nordnessjobad.ts` | HTML |
| O'Connor's Irish Pub | `oconnors.ts` | HTML (event cards with `<time datetime>`) |
| GG Bergen | `ggbergen.ts` | Google Calendar iCal feeds (3 public calendars, 30-day lookahead) |
| Stene Matglede | `stenematglede.ts` | Squarespace eventlist (cooking courses, food events) |
| Swing 'n Sweet Jazzclub | `swingnsweetjazzclub.ts` | HTML (jazz events) |
| Bodega | `bodega.ts` | Google Calendar JSON API (public calendar, filters non-public events) |

## Sports & outdoor
| Source | File | Method |
|--------|------|--------|
| SK Brann | `brann.ts` | HTML table (match schedule) |
| DNT Bergen | `dnt.ts` | HTML (guided tours) |

## Festivals
| Source | File | Method |
|--------|------|--------|
| Borealis | `borealis.ts` | WordPress schedule tables, program listing page |
| Festspillene | `festspillene.ts` | HTML |
| Bergenfest | `bergenfest.ts` | HTML |
| Beyond the Gates | `beyondthegates.ts` | Squarespace menu blocks |
| VVV (climate festival) | `vvv.ts` | Squarespace carousel |
| Bergen Pride | `bergenpride.ts` | Vev SPA HTML (daily program pages) + TicketCo subdomain |
| BIFF | `biff.ts` | Filmgrail embedded JSON (Mars platform) |
| Jungelfest | `jungelfest.ts` | TicketCo umbrella event description |

## Other
| Source | File | Method |
|--------|------|--------|
| Det Akademiske Kvarter | `kvarteret.ts` | JSON API (`/api/events`), also covered by TicketCo |
| Kulturhuset i Bergen | `kulturhusetibergen.ts` | Squarespace eventlist, room extraction |
| Bergen Chamber | `bergenchamber.ts` | HTML |
| Oseana | `oseana.ts` | HTML |
