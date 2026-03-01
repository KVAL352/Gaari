import type { GaariEvent, Lang } from './types';
import { isFreeEvent } from './utils';
import { isSameDay, getWeekendDates, matchesTimeOfDay, toOsloDateStr, getEndOfWeekDateStr, addDays, getEasterDate, getISOWeekDates } from './event-filters';

// Shared filter functions for seasonal collections (NO + EN pairs share the same logic)
const filter17Mai = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const startStr = `${year}-05-14`;
	const endStr = `${year}-05-18`;
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= startStr && d <= endStr;
	});
};

const filterJulemarked = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const startStr = `${year}-11-15`;
	const endStr = `${year}-12-23`;
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= startStr && d <= endStr;
	});
};

const filterPaske = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const easter = getEasterDate(year);
	const palmSunday = addDays(easter, -7);
	const easterMonday = addDays(easter, 1);
	const startStr = toOsloDateStr(palmSunday);
	const endStr = toOsloDateStr(easterMonday);
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= startStr && d <= endStr;
	});
};

const filterSankthans = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const startStr = `${year}-06-21`;
	const endStr = `${year}-06-24`;
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= startStr && d <= endStr;
	});
};

const filterNyttarsaften = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const month = now.getMonth();
	const baseYear = month === 0 ? year - 1 : year;
	const startStr = `${baseYear}-12-29`;
	const endStr = `${baseYear + 1}-01-01`;
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= startStr && d <= endStr;
	});
};

const filterVinterferie = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const { start, end } = getISOWeekDates(year, 9);
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= start && d <= end;
	});
};

const filterHostferie = (events: GaariEvent[], now: Date) => {
	const year = now.getFullYear();
	const { start, end } = getISOWeekDates(year, 41);
	return events.filter(e => {
		const d = e.date_start.slice(0, 10);
		return d >= start && d <= end;
	});
};

// Shared filter for festival collections (filter by source_url domain)
const filterBySourceDomain = (events: GaariEvent[], domain: string) =>
	events.filter(e => e.source_url?.includes(domain));

const filterFestspillene = (events: GaariEvent[]) => filterBySourceDomain(events, 'fib.no');
const filterBergenfest = (events: GaariEvent[]) => filterBySourceDomain(events, 'bergenfest.no');
const filterBeyondTheGates = (events: GaariEvent[]) => filterBySourceDomain(events, 'beyondthegates.no');
const filterNattjazz = (events: GaariEvent[]) => filterBySourceDomain(events, 'nattjazz.ticketco.no');
const filterBergenPride = (events: GaariEvent[]) =>
	events.filter(e => e.source_url?.includes('bergenpride.no') || e.source_url?.includes('bergenpride.ticketco.events'));
const filterBIFF = (events: GaariEvent[]) => filterBySourceDomain(events, 'biff.no');

const FAMILY_TITLE_RE = /familie|barnelørdag|barnas\s|for\s+barn|barneforestilling/i;
const YOUTH_TEXT_RE = /\bungdom|\btenåring|\bfor\s+unge?\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;
const YOUTH_CATEGORIES = new Set(['music', 'culture', 'sports', 'workshop', 'festival', 'student']);
const INDOOR_CATEGORIES = new Set(['music', 'culture', 'theatre', 'family', 'food', 'workshop', 'nightlife', 'student']);

export interface Collection {
	id: string;
	slug: string;
	title: Record<Lang, string>;
	description: Record<Lang, string>;
	ogSubtitle: Record<Lang, string>;
	editorial?: Record<Lang, string[]>;
	faq?: Record<Lang, Array<{ q: string; a: string }>>;
	relatedSlugs?: string[];
	quickAnswer?: Record<Lang, string>;
	footerLabel?: Record<Lang, string>;
	footer?: { langs: Lang[]; order: number };
	newsletterHeading?: Record<Lang, string>;
	seasonal?: boolean;
	maxPerVenue?: number;
	filterEvents: (events: GaariEvent[], now: Date) => GaariEvent[];
}

const collections: Collection[] = [
	{
		id: 'weekend',
		slug: 'denne-helgen',
		title: {
			no: 'Denne helgen i Bergen',
			en: 'This Weekend in Bergen'
		},
		description: {
			no: 'Hva skjer i Bergen denne helgen? Finn konserter, utstillinger, mat og ting å gjøre — alt på ett sted.',
			en: 'What to do in Bergen this weekend? Find concerts, exhibitions, food and more — all in one place.'
		},
		ogSubtitle: {
			no: 'Helgens beste arrangementer',
			en: "This weekend's best events"
		},
		relatedSlugs: ['gratis', 'familiehelg', 'konserter', 'i-kveld'],
		footerLabel: { no: 'Denne helgen', en: 'This weekend' },
		footer: { langs: ['no'], order: 1 },
		newsletterHeading: { no: 'Få helgens beste tips hver torsdag', en: 'Get weekend picks every Thursday' },
		quickAnswer: {
			no: 'Gåri samler helgens arrangementer i Bergen fra 52 lokale kilder — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra steder som Grieghallen, KODE, USF Verftet og Akvariet.',
			en: 'Gåri collects this weekend\'s events in Bergen from 52 local sources — concerts, exhibitions, family activities and more. Updated daily from venues like Grieghallen, KODE, USF Verftet and Akvariet.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges mest aktive kulturhuvudsteder, og helgen er høysesong for opplevelser. Grieghallen og Bergen Filharmoniske holder konserter, Forum Scene og Ole Bull huser artister fra hele verden, og Kunsthallen, KODE og Bymuseet tilbyr utstillinger og aktiviteter gjennom hele helgen.',
				'Gåri samler helgeprogrammet fra over 52 lokale arrangørkilder — teatre, museer, spillesteder, festivalarrangører og billettplattformer — og oppdaterer listen daglig. Enten du planlegger lørdag kveld eller søker en rolig søndagsopplevelse, er alt samlet her.',
				'Bergen er en generøs by med et bredt gratis kulturtilbud i helgene: åpne utstillinger, bibliotekaktiviteter og parkkonserter. Sjekk familiehelg-siden for arrangementer tilrettelagt for barn, og gratis-siden for kostnadsfrie aktiviteter. Gåri er uavhengig og fjerner automatisk utsolgte arrangementer, slik at det du ser faktisk er tilgjengelig.'
			],
			en: [
				'Bergen is one of Norway\'s most culturally active cities, and the weekend is peak season for events. Grieghallen and the Bergen Philharmonic host concerts, Forum Scene and Ole Bull stage artists from across the world, while Kunsthallen, KODE and Bymuseet offer exhibitions and activities throughout the weekend.',
				'Gåri collects the weekend programme from over 52 local event sources — theatres, museums, venues, festival organisers and ticketing platforms — and updates the listing daily. Whether you are planning Saturday evening or looking for a relaxed Sunday experience, everything is here in one place.',
				'Bergen is a generous city with a wide range of free cultural events at weekends: open exhibitions, library activities and park concerts. Check the family weekend page for events suited to children, and the free events page for no-cost activities. Gåri is independent and removes sold-out events automatically so what you see is genuinely available.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen denne helgen?', a: 'Gåri viser alle helgens arrangementer i Bergen — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra 52 lokale kilder.' },
				{ q: 'Er det gratis arrangementer i Bergen denne helgen?', a: 'Bergen har mange gratis helgeaktiviteter. Se Gåris gratis-side for arrangementer uten billettpris denne uken.' },
				{ q: 'Hva kan familier gjøre i Bergen i helgen?', a: 'Gåri har en egen familiehelg-side med barneforestillinger, museumsaktiviteter og familievennlige arrangementer i Bergen.' }
			],
			en: [
				{ q: "What's on in Bergen this weekend?", a: 'Gåri shows all weekend events in Bergen — concerts, exhibitions, family activities and more. Updated daily from 52 local sources.' },
				{ q: 'Are there free things to do in Bergen this weekend?', a: "Bergen regularly has free weekend events. Check Gåri's free events page for no-cost activities this weekend." },
				{ q: 'What can families do in Bergen this weekend?', a: "Gåri has a dedicated family weekend page with children's shows, museum activities and family-friendly events in Bergen." }
			]
		},
		filterEvents: (events, now) => {
			const { start, end } = getWeekendDates(now);
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= start && d <= end;
			});
		}
	},
	{
		id: 'tonight',
		slug: 'i-kveld',
		title: {
			no: 'I kveld i Bergen',
			en: 'Tonight in Bergen'
		},
		description: {
			no: 'Hva skjer i Bergen i kveld? Finn kveldens konserter, forestillinger og arrangementer.',
			en: "What's on in Bergen tonight? Find tonight's concerts, shows and events."
		},
		ogSubtitle: {
			no: 'Kveldens arrangementer',
			en: "Tonight's events"
		},
		relatedSlugs: ['denne-helgen', 'konserter', 'studentkveld'],
		footerLabel: { no: 'I kveld', en: 'Tonight' },
		footer: { langs: ['no'], order: 2 },
		newsletterHeading: { no: 'Gå aldri tom for kveldsplaner', en: 'Never run out of evening plans' },
		quickAnswer: {
			no: 'Se alle arrangementer i Bergen i kveld — konserter, teater, uteliv og mer. Gåri henter data fra 52 lokale kilder og oppdateres to ganger daglig.',
			en: 'See all events in Bergen tonight — concerts, theatre, nightlife and more. Gåri pulls data from 52 local sources and updates twice daily.'
		},
		editorial: {
			no: [
				'Bergen har kulturliv på hverdagskvelder, ikke bare i helgene. Musikk­scener som Ole Bull, Forum Scene, USF Verftet og Kulturhuset setter opp show og konserter gjennom hele uken. Teatrene DNS, BIT Teatergarasjen, Det Vestnorske Teatret og Cornerteateret spiller forestillinger mandag til fredag. Kvarteret og studentmiljøet er aktive fra torsdag og utover.',
				'Gåri oppdateres to ganger daglig — morgen og kveld — slik at kveldsbildet alltid er ferskt. Listen henter data direkte fra 44 bergenske arrangørers nettsider, fra Grieghallen til Brettspillkafeen, og inkluderer tidspunkt for alle arrangementer.',
				'Konserter og forestillinger starter typisk mellom 19 og 21. Planlegger du spontant i kveld? Bruk tidspunkt-filteret for nattarrangementer fra klokken 22, eller gratis-filteret for kostnadsfrie kveldsopplevelser. Gåri fjerner utsolgte arrangementer fortløpende — det du ser er tilgjengelig.'
			],
			en: [
				'Bergen has cultural events on weekday evenings, not just at weekends. Music venues such as Ole Bull, Forum Scene, USF Verftet and Kulturhuset put on shows and concerts throughout the week. The theatres DNS, BIT Teatergarasjen, Det Vestnorske Teatret and Cornerteateret run performances Monday to Friday. Kvarteret and the student scene are active from Thursday onwards.',
				'Gåri updates twice daily — morning and evening — so the evening picture is always fresh. Listings are pulled directly from 52 Bergen event sources, from Grieghallen to Brettspillkafeen, and include start times for all events.',
				'Concerts and performances typically start between 19:00 and 21:00. Planning a spontaneous evening? Use the time filter for late-night events from 22:00, or the free filter for no-cost evening options. Gåri removes sold-out events continuously — what you see here is available.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen i kveld?', a: 'Gåri viser alle kveldsarrangementer i Bergen i dag — konserter, teater, uteliv og mer. Oppdateres to ganger daglig.' },
				{ q: 'Er det konserter i Bergen i kveld?', a: 'Sjekk Gåri for alle livekonserter og musikkshow i Bergen i kveld, med lenker direkte til billettsider.' },
				{ q: 'Hva kan man gjøre i Bergen på kvelden?', a: 'Bergen har jevnlig konserter, teaterforestillinger, quiz-kvelder og kulturarrangementer på kveldstid — også på hverdager.' }
			],
			en: [
				{ q: "What's on in Bergen tonight?", a: 'Gåri shows all evening events in Bergen tonight — concerts, theatre, nightlife and more. Updated twice daily.' },
				{ q: 'Are there concerts in Bergen tonight?', a: 'Check Gåri for all live concerts and music shows in Bergen tonight, with direct links to ticket pages.' },
				{ q: 'What can I do in Bergen in the evening?', a: 'Bergen has regular concerts, theatre, quiz nights and cultural events in the evenings — including weekdays.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			return events.filter(e =>
				isSameDay(e.date_start, todayStr) &&
				matchesTimeOfDay(e.date_start, ['evening', 'night'])
			);
		}
	},
	{
		id: 'free',
		slug: 'gratis',
		title: {
			no: 'Gratis i Bergen denne uken',
			en: 'Free Events in Bergen This Week'
		},
		description: {
			no: 'Gratis ting å gjøre i Bergen denne uken — utstillinger, konserter, turer og mer. Ingen billett nødvendig.',
			en: 'Free things to do in Bergen this week — exhibitions, concerts, tours and more. No ticket needed.'
		},
		ogSubtitle: {
			no: 'Gratis arrangementer denne uken',
			en: 'Free events this week'
		},
		relatedSlugs: ['denne-helgen', 'familiehelg', 'regndagsguide'],
		footerLabel: { no: 'Gratis', en: 'Free events' },
		footer: { langs: ['no'], order: 4 },
		newsletterHeading: { no: 'Finn gratisopplevelser hver uke', en: 'Find free events every week' },
		quickAnswer: {
			no: 'Gratis ting å gjøre i Bergen denne uken — utstillinger, bibliotekaktiviteter, turer og mer. Gåri samler kostnadsfrie arrangementer fra 52 lokale kilder.',
			en: 'Free things to do in Bergen this week — exhibitions, library events, hikes and more. Gåri collects free events from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen har et rikt kulturtilbud som ikke koster noe. Bibliotekene i Bergen arrangerer foredrag, utstillinger og konserter gratis gjennom hele uken. KODE og Bergen Kunsthall tilbyr åpne utstillingsdager og vernissager. Fløyen og DNT arrangerer gratis fjellturer og naturopplevelser. Universitetet og studentmiljøet bidrar med åpne forelesninger, debatter og sosiale kvelder.',
				'Gåri samler alle gratis arrangementer i Bergen fra 52 lokale kilder og oppdaterer listen daglig. Her ser du gratis konserter, utstillinger, turer og aktiviteter — alt denne uken, uten billettpris.',
				'«Trolig gratis» betyr at arrangøren ikke har oppgitt pris i sin kilde, og vi kan ikke garantere at det er kostnadsfritt. Sjekk alltid pris hos arrangøren før oppmøte. Bergen er likevel kjent som en by med lavterskeltilbud — mange av de beste kulturopplevelsene, fra åpningsutstillinger til parkkonserter, er helt gratis.'
			],
			en: [
				'Bergen has a rich cultural offering that costs nothing. The city\'s libraries run free talks, exhibitions and concerts throughout the week. KODE and Bergen Kunsthall offer open exhibition days and vernissages. Fløyen and DNT organise free mountain hikes and outdoor experiences. The university and student community contribute open lectures, debates and social evenings.',
				'Gåri collects all free events in Bergen from 52 local sources and updates the listing daily. Here you find free concerts, exhibitions, hikes and activities — all this week, no ticket required.',
				'"Likely free" means the organiser has not listed a price in their source, and we cannot guarantee the event is cost-free. Always verify the price with the organiser before attending. That said, Bergen is known for generous free cultural provision — many of the best experiences, from opening exhibitions to park concerts, are completely free.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva er gratis å gjøre i Bergen denne uken?', a: 'Gåri viser alle gratis arrangementer i Bergen denne uken — utstillinger, konserter, turer og aktiviteter uten billettpris.' },
				{ q: 'Er alle arrangementer på denne siden gratis?', a: 'Ja, alle arrangementer er registrert som gratis eller med fri inngang. Sjekk alltid pris hos arrangøren.' },
				{ q: 'Finnes det gratis museer i Bergen?', a: 'Flere museer i Bergen har gratis åpningsdager. Gåri viser gratis museumsdager og kulturtilbud fortløpende.' }
			],
			en: [
				{ q: 'What free things are there to do in Bergen this week?', a: 'Gåri shows all free events in Bergen this week — exhibitions, concerts, tours and activities with no ticket price.' },
				{ q: 'Are all events on this page really free?', a: 'Yes, all listed events are registered as free admission. Always verify the price with the organiser before attending.' },
				{ q: 'Are there free museums in Bergen?', a: 'Several Bergen museums have free entry days. Gåri lists free museum days and cultural events as they are announced.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = getEndOfWeekDateStr(now);
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= todayStr && d <= endStr && isFreeEvent(e.price);
			});
		}
	},
	{
		id: 'today',
		slug: 'today-in-bergen',
		title: {
			no: 'I dag i Bergen',
			en: 'Today in Bergen'
		},
		description: {
			no: 'Hva skjer i Bergen i dag? Finn alle arrangementer — konserter, utstillinger, mat og mer.',
			en: "What's on in Bergen today? Find concerts, exhibitions, food and things to do — all in one place."
		},
		ogSubtitle: {
			no: 'Dagens arrangementer',
			en: "Today's events"
		},
		relatedSlugs: ['this-weekend', 'free-things-to-do-bergen'],
		footerLabel: { no: 'I dag', en: 'Today' },
		footer: { langs: ['en'], order: 2 },
		newsletterHeading: { no: 'Få daglige tips rett i innboksen', en: 'Get daily picks in your inbox' },
		quickAnswer: {
			no: 'Hva skjer i Bergen i dag? Gåri viser alle dagens arrangementer — konserter, utstillinger, mat og mer — samlet fra 52 lokale kilder.',
			en: 'What\'s on in Bergen today? Gåri shows all of today\'s events — concerts, exhibitions, food and more — collected from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en kompakt by med noe å tilby hver eneste dag. Du finner livemusikk, kunstutstillinger, guidede turer, matarrangementer, barneaktiviteter og kulturforestillinger — fra Grieghallen og USF Verftet til byens mindre gallerier og nabolagskafeer.',
				'Gåri samler arrangementer fra 52 lokale Bergen-kilder — spillesteder, festivalarrangører og billettplattformer — og oppdaterer listen to ganger daglig. Alt fra Grieghallen og Bergen Bibliotek til Fløyen og Akvariet er dekket.',
				'Bergen har sterkt tilbud av gratis arrangementer. Bibliotekfilialer holder gratis foredrag og konserter. KODE har gratis inngangsdager. Fløyen har gratis uteaktiviteter. For betalte arrangementer lenker Gåri direkte til arrangørens eget billettsystem. Gåri er uavhengig og bergen-basert — ingen betalte plasseringer, alle arrangører behandles likt.'
			],
			en: [
				'Bergen is a compact, walkable city that has something on every single day. You will find live music, art openings, guided hikes, food events, children\'s activities and cultural performances — from Grieghallen and USF Verftet to the city\'s smaller galleries and neighbourhood venues.',
				'Gåri aggregates events from 52 local Bergen sources — venues, festival organisers and ticketing platforms — and updates listings twice daily so what you see is always current.',
				'Bergen has strong free event coverage. The public library branches run regular free talks and concerts. KODE museums have free entry days. Fløyen has free outdoor activities. For paid events, Gåri links directly to the venue\'s own ticket page. Gåri is Bergen-based and independent — no paid prioritisation, all venues listed on equal terms. Sold-out events are removed automatically.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen i dag?', a: 'Gåri viser alle arrangementer i Bergen i dag — konserter, utstillinger, mat og mer. Oppdatert to ganger daglig.' },
				{ q: 'Er det gratis arrangementer i Bergen i dag?', a: 'Bergen har jevnlig gratis arrangementer hver dag. Bruk gratis-filteret for å finne kostnadsfrie aktiviteter i dag.' },
				{ q: 'Hva kan turister gjøre i Bergen i dag?', a: 'Bergen tilbyr Bryggen, Fløibanen, museer, fjordturer, konserter og matmarkeder. Sjekk Gåri for dagens program.' }
			],
			en: [
				{ q: "What's on in Bergen today?", a: 'Gåri shows all events happening in Bergen today — concerts, exhibitions, food events and more. Updated twice daily.' },
				{ q: 'Are there free events in Bergen today?', a: "Yes, Bergen regularly has free events every day. Use the free filter to find today's no-cost activities." },
				{ q: 'What can tourists do in Bergen today?', a: 'Bergen offers Bryggen, Fløyen funicular, museums, fjord tours, concerts and food markets. Check Gåri for today\'s events.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			return events.filter(e => isSameDay(e.date_start, todayStr));
		}
	},
	{
		id: 'family-weekend',
		slug: 'familiehelg',
		title: {
			no: 'Familiehelg i Bergen',
			en: 'Family Weekend in Bergen'
		},
		description: {
			no: 'Helgens beste arrangementer for barn og familier i Bergen.',
			en: "This weekend's best events for kids and families in Bergen."
		},
		ogSubtitle: {
			no: 'For hele familien',
			en: 'For the whole family'
		},
		relatedSlugs: ['denne-helgen', 'gratis', 'regndagsguide'],
		footerLabel: { no: 'Familiehelg', en: 'Family weekend' },
		footer: { langs: ['no', 'en'], order: 6 },
		newsletterHeading: { no: 'Aldri gå tom for familieaktiviteter', en: 'Never run out of family activities' },
		quickAnswer: {
			no: 'Familievennlige arrangementer i Bergen denne helgen — barneforestillinger, museumsaktiviteter, dyrepark og utendørsopplevelser. Samlet fra 52 lokale kilder.',
			en: 'Family-friendly events in Bergen this weekend — children\'s shows, museum activities, aquarium visits and outdoor experiences. Collected from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en ypperlig by for familier i helgene. Akvariet i Bergen er landets mest besøkte attraksjon og holder åpent hele helgen. KODE og Bymuseet tilbyr barnevennlige utstillinger og aktiviteter. Fløyen er et eventyrland for barn hele året. Bergen Bibliotek arrangerer barneteater og lesestunder. DNS, Kulturhuset i Bergen og Cornerteateret har regelmessige barneforestillinger og familieshow.',
				'Gåri-siden for familiehelg viser helgens barneforestillinger, museumsaktiviteter og familievennlige arrangementer i Bergen fra 52 lokale kilder. Listen oppdateres daglig og viser hva som faktisk skjer denne helgen.',
				'Familieaktiviteter i Bergen spenner fra gratis søndagskonserter på biblioteket til billetterier forestillinger på DNS og Kulturhuset. Mange arrangementer har barnerabatt eller familierabatt — sjekk alltid pris hos arrangøren. Gåri fjerner utsolgte forestillinger automatisk, slik at det du ser faktisk er tilgjengelig for kjøp.'
			],
			en: [
				'Bergen is an excellent city for families at the weekend. Bergen Aquarium is Norway\'s most visited attraction and is open all weekend. KODE and Bymuseet offer family-friendly exhibitions and activities. Fløyen is a year-round adventure for children. Bergen Library runs children\'s theatre and reading sessions. DNS, Kulturhuset i Bergen and Cornerteateret have regular children\'s shows and family performances.',
				'Gåri\'s family weekend page shows this weekend\'s children\'s shows, museum activities and family-friendly events in Bergen from 52 local sources. The listing is updated daily to show what is actually happening this weekend.',
				'Family activities in Bergen range from free Sunday library concerts to ticketed performances at DNS and Kulturhuset. Many events offer child or family discounts — always check the price with the organiser. Gåri removes sold-out events automatically so what you see is genuinely available to book.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva kan familier gjøre i Bergen denne helgen?', a: 'Gåri viser alle familiearrangementer i Bergen denne helgen — barneforestillinger, museumsaktiviteter, uteaktiviteter og mer.' },
				{ q: 'Er det barneforestillinger i Bergen denne helgen?', a: 'Sjekk Gåris familiehelg-side for alle barneforestillinger, aktiviteter og familievennlige arrangementer i Bergen.' },
				{ q: 'Hva koster familieaktiviteter i Bergen?', a: 'Bergen har mange gratis familiearrangementer. Gåri viser pris for alle arrangementer — sjekk alltid hos arrangøren.' }
			],
			en: [
				{ q: 'What can families do in Bergen this weekend?', a: 'Gåri shows all family events in Bergen this weekend — children\'s shows, museum activities, outdoor activities and more.' },
				{ q: "Are there children's shows in Bergen this weekend?", a: "Check Gåri's family weekend page for all children's performances, activities and family-friendly events in Bergen." },
				{ q: 'How much do family activities in Bergen cost?', a: 'Bergen has many free family events. Gåri shows the price for all events — always verify with the organiser.' }
			]
		},
		filterEvents: (events, now) => {
			const { start, end } = getWeekendDates(now);
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				if (d < start || d > end) return false;
				return e.age_group === 'family' || e.category === 'family' || FAMILY_TITLE_RE.test(e.title_no);
			});
		}
	},
	{
		id: 'concerts',
		slug: 'konserter',
		title: {
			no: 'Konserter i Bergen denne uken',
			en: 'Concerts in Bergen This Week'
		},
		description: {
			no: 'Alle konserter og livemusikk i Bergen denne uken — finn billetter og oppmøtesteder.',
			en: 'All concerts and live music in Bergen this week — find tickets and venues.'
		},
		ogSubtitle: {
			no: 'Livemusikk denne uken',
			en: 'Live music this week'
		},
		relatedSlugs: ['denne-helgen', 'i-kveld', 'festspillene', 'bergenfest'],
		footerLabel: { no: 'Konserter', en: 'Concerts' },
		footer: { langs: ['no', 'en'], order: 5 },
		newsletterHeading: { no: 'Få ukas konserttips hver torsdag', en: 'Get concert picks every Thursday' },
		quickAnswer: {
			no: 'Alle konserter og livemusikk i Bergen denne uken — fra Grieghallen og Ole Bull til Hulen og Kvarteret. Gåri samler konsertprogrammet fra 52 lokale kilder.',
			en: 'All concerts and live music in Bergen this week — from Grieghallen and Ole Bull to Hulen and Kvarteret. Gåri collects the concert schedule from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges rikeste musikkbyer. Grieghallen er hjemstedet til Bergen Filharmoniske Orkester — et av landets eldste — og huser internasjonale artister gjennom hele sesongen. Ole Bull Scene og Forum Scene er de ledende popklubbene. USF Verftet og Kulturhuset i Bergen tilbyr et bredere og mer alternativt program. Kvarteret, Hulen og en rekke puber og barer holder jevnlige konserter for studenter og unge.',
				'Gåri samler alle konserter og livemusikk-arrangementer i Bergen denne uken fra 52 lokale kilder — billettsider, festivalsider og direkte fra spillestedene. Listen oppdateres daglig, og Gåri fjerner automatisk konserter som er utsolgt.',
				'Bergen har musikktilbud i alle prissjikt. Gratiskonserter finner du på Bergen Bibliotek, i parker og på kulturhus. Betalte konserter har direkte billettlenke til arrangørens eget billettsystem. Sommer er høysesong: Festspillene, Bergenfest og en rekke mindre festivaler fyller konsertkalenderen, men Bergen har livemusikk å tilby gjennom hele året.'
			],
			en: [
				'Bergen is one of Norway\'s richest music cities. Grieghallen is home to the Bergen Philharmonic Orchestra — one of the country\'s oldest — and hosts international artists throughout the season. Ole Bull Scene and Forum Scene are the leading pop venues. USF Verftet and Kulturhuset i Bergen offer a broader and more alternative programme. Kvarteret, Hulen and numerous pubs and bars hold regular concerts for students and young audiences.',
				'Gåri collects all concerts and live music events in Bergen this week from 52 local sources — ticketing sites, festival pages and directly from the venues. The listing is updated daily and Gåri automatically removes sold-out concerts.',
				'Bergen has music at every price point. Free concerts can be found at Bergen Library, in parks and at cultural venues. Paid concerts have a direct ticket link to the venue\'s own ticketing system. Summer is peak season — Festspillene, Bergenfest and numerous smaller festivals fill the concert calendar — but Bergen offers live music year-round.'
			]
		},
		faq: {
			no: [
				{ q: 'Hvilke konserter er det i Bergen denne uken?', a: 'Gåri samler alle konserter og livemusikk-arrangementer i Bergen denne uken fra 52 lokale kilder. Oppdatert daglig.' },
				{ q: 'Hvor kjøper jeg konsertbilletter i Bergen?', a: 'Gåri lenker direkte til billettsidene for alle konserter i Bergen. Klikk på arrangementet for kjøpslenke.' },
				{ q: 'Er det gratis konserter i Bergen denne uken?', a: 'Bergen har jevnlig gratis konserter på bibliotek, i parker og på kulturhus. Sjekk Gåris gratis-side for oversikt.' }
			],
			en: [
				{ q: 'What concerts are on in Bergen this week?', a: 'Gåri collects all concerts and live music events in Bergen this week from 52 local sources. Updated daily.' },
				{ q: 'Where can I buy concert tickets in Bergen?', a: 'Gåri links directly to the ticket pages for all concerts in Bergen. Click any event to find the purchase link.' },
				{ q: 'Are there free concerts in Bergen this week?', a: 'Bergen regularly has free concerts in libraries, parks and cultural venues. Check Gåri\'s free events page for listings.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = getEndOfWeekDateStr(now);
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= todayStr && d <= endStr && e.category === 'music';
			});
		}
	},
	{
		id: 'student',
		slug: 'studentkveld',
		title: {
			no: 'Studentkveld i Bergen',
			en: 'Student Night in Bergen'
		},
		description: {
			no: 'Kveldens arrangementer for studenter i Bergen — fester, quiz, konserter og mer.',
			en: "Tonight's events for students in Bergen — parties, quizzes, concerts and more."
		},
		ogSubtitle: {
			no: 'For studenter i kveld',
			en: "Tonight's student events"
		},
		relatedSlugs: ['konserter', 'i-kveld', 'gratis'],
		footerLabel: { no: 'Studentkveld', en: 'Student nights' },
		footer: { langs: ['no', 'en'], order: 9 },
		newsletterHeading: { no: 'Studenttips rett i innboksen', en: 'Student picks in your inbox' },
		quickAnswer: {
			no: 'Kveldens studentarrangementer i Bergen — fester, quiz, konserter og kulturkvelder på Kvarteret, Hulen og andre studentsteder. Oppdatert daglig.',
			en: 'Tonight\'s student events in Bergen — parties, quizzes, concerts and cultural evenings at Kvarteret, Hulen and other student venues. Updated daily.'
		},
		editorial: {
			no: [
				'Bergen er en universitetsby med over 30 000 studenter, og kveldstilbudet gjenspeiler det. Kvarteret er Norges største studentklubb og huser konserter, quiz-kvelder, fester og kulturarrangementer gjennom hele uken. Hulen, Madam Felle og Café Opera er populære studenttreffpunkter. Universitetet og Høgskulen på Vestlandet arrangerer åpne forelesninger, debatter og sosiale kvelder.',
				'Gåri-siden for studentkveld viser kveldsarrangementer for studenter og unge voksne i Bergen — kveldssjikt fra 17, målgruppe studenter, uteliv og kulturinteresserte. Siden oppdateres daglig og henter data fra Kvarteret, studentarrangørene og generelle kveldsarrangementer.',
				'Mange studentarrangementer i Bergen er gratis eller til sterkt redusert pris. Ta alltid med studentbevis — mange steder gir studentrabatt uoppfordret. Gåri fjerner utsolgte arrangementer fortløpende. Planlegger du kvelden spontant? Sjekk gratis-filteret for kostnadsfrie alternativ i kveld.'
			],
			en: [
				'Bergen is a university city with over 30,000 students, and the evening offering reflects that. Kvarteret is Norway\'s largest student club and hosts concerts, quiz nights, parties and cultural events throughout the week. Hulen, Madam Felle and Café Opera are popular student meeting points. The university and Høgskulen på Vestlandet organise open lectures, debates and social evenings.',
				'Gåri\'s student night page shows evening events for students and young adults in Bergen — evening time slot from 17:00, audience focused on students, nightlife and culture. The page updates daily and pulls data from Kvarteret, student organisers and general evening events.',
				'Many student events in Bergen are free or heavily discounted. Always bring your student card — many venues offer student discounts without being asked. Gåri removes sold-out events continuously. Planning the evening spontaneously? Use the free filter to find no-cost options tonight.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer for studenter i Bergen i kveld?', a: 'Gåri viser kveldens studentarrangementer i Bergen — fester, quiz, konserter, uteliv og mer. Oppdatert daglig.' },
				{ q: 'Hvor er det studentfester i Bergen i kveld?', a: 'Kvarteret er Norges største studentklubb i Bergen. Sjekk Gåri for alle studentarrangementer i kveld.' },
				{ q: 'Hva koster studentarrangementer i Bergen?', a: 'Mange studentarrangementer i Bergen er gratis eller til redusert pris. Gåri viser pris for alle arrangementer.' }
			],
			en: [
				{ q: "What's on for students in Bergen tonight?", a: "Gåri shows tonight's student events in Bergen — parties, quizzes, concerts, nightlife and more. Updated daily." },
				{ q: 'Where are student parties in Bergen tonight?', a: "Kvarteret is Norway's largest student venue in Bergen. Check Gåri for all student events tonight." },
				{ q: 'How much do student events in Bergen cost?', a: 'Many student events in Bergen are free or discounted. Gåri shows the price for all listed events.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const tomorrowStr = toOsloDateStr(addDays(now, 1));
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return (d === todayStr || d === tomorrowStr) &&
					matchesTimeOfDay(e.date_start, ['evening', 'night']) &&
					(e.age_group === 'students' || e.category === 'student' || e.category === 'nightlife');
			});
		}
	},
	{
		id: 'this-weekend',
		slug: 'this-weekend',
		title: {
			no: 'Denne helgen i Bergen',
			en: 'This Weekend in Bergen'
		},
		description: {
			no: 'Hva skjer i Bergen denne helgen? Finn konserter, utstillinger, mat og ting å gjøre — alt på ett sted.',
			en: 'Things to do in Bergen this weekend — concerts, exhibitions, food and more. Updated daily.'
		},
		ogSubtitle: {
			no: 'Helgens arrangementer',
			en: "This weekend's events"
		},
		relatedSlugs: ['free-things-to-do-bergen', 'today-in-bergen'],
		footerLabel: { no: 'Denne helgen', en: 'This weekend' },
		footer: { langs: ['en'], order: 1 },
		newsletterHeading: { no: 'Få helgens beste tips hver torsdag', en: 'Get weekend picks every Thursday' },
		quickAnswer: {
			no: 'Alle arrangementer i Bergen denne helgen — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra 52 lokale kilder.',
			en: 'All events in Bergen this weekend — concerts, exhibitions, family activities and more. Updated daily from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en by som virkelig lever opp i helgene. Kulturkalenderen spenner fra livemusikk og billedkunst til teater, friluftsliv og mat — med noe å tilby i alle prisklasser, fra gratis åpne utstillinger til storkonsertene på Grieghallen.',
				'Gåri samler Bergens helgearrangementer fra 52 lokale kilder — spillesteder, festivalarrangører og billettplattformer — og oppdaterer listen daglig. Grieghallen, USF Verftet, Ole Bull, DNS, Forum Scene, KODE, Bergen Kunsthall og byens mange mindre scener og gallerier er alle dekket.',
				'Bergen er en kompakt by. Bryggen, Nordnes, sentrum og universitetsområdet er alle tilgjengelig til fots. Gåri er uavhengig og Bergen-basert — utsolgte arrangementer fjernes automatisk, og ingen arrangører betaler for å bli vist frem. Alle kilder behandles likt.'
			],
			en: [
				'Bergen comes alive at the weekend. The city\'s cultural calendar spans live music, visual art, theatre, outdoor activities and food — with something at every price point, from free open exhibitions to headline concerts at Grieghallen.',
				'Gåri collects Bergen weekend events from 52 local sources — venues, festival organisers and ticketing platforms — and updates listings daily. Grieghallen, USF Verftet, Ole Bull, DNS, Forum Scene, KODE, Bergen Kunsthall and the city\'s many smaller stages and galleries are all covered.',
				'Bergen is a compact city. Bryggen, Nordnes, the city centre and the university area are all walkable, and most venues are within a short bus or tram ride. Gåri is independent and Bergen-based — sold-out events are removed automatically and no venue pays for placement. All sources are listed on equal terms.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen denne helgen?', a: 'Gåri viser alle helgens arrangementer i Bergen — konserter, utstillinger, mat og mer. Oppdatert daglig fra 52 lokale kilder.' },
				{ q: 'Er det gratis ting å gjøre i Bergen denne helgen?', a: 'Bergen har mange gratis helgeaktiviteter. Bruk gratis-filteret for å finne kostnadsfrie arrangementer i helgen.' },
				{ q: 'Hva er det beste å gjøre i Bergen i helgen?', a: 'Bergen har konserter, utstillinger, matmarkeder, fjordturer og kulturarrangementer hver helg. Sjekk Gåri for ukens program.' }
			],
			en: [
				{ q: "What's on in Bergen this weekend?", a: 'Gåri shows all weekend events in Bergen — concerts, exhibitions, food and outdoor activities. Updated daily from 52 local sources.' },
				{ q: 'Are there free things to do in Bergen this weekend?', a: 'Bergen regularly has free weekend events. Use the free events filter to find no-cost activities this weekend.' },
				{ q: 'What is the best thing to do in Bergen this weekend?', a: 'Bergen has concerts, exhibitions, food markets, fjord walks and cultural events every weekend. Check Gåri for this week\'s programme.' }
			]
		},
		filterEvents: (events, now) => {
			const { start, end } = getWeekendDates(now);
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= start && d <= end;
			});
		}
	},
	{
		id: 'today-no',
		slug: 'i-dag',
		title: {
			no: 'I dag i Bergen',
			en: 'Today in Bergen'
		},
		description: {
			no: 'Hva skjer i Bergen i dag? Konserter, utstillinger, teater og aktiviteter — oppdatert morgen og kveld.',
			en: "What's on in Bergen today? Concerts, exhibitions, theatre and activities — updated morning and evening."
		},
		ogSubtitle: {
			no: 'Dagens arrangementer',
			en: "Today's events"
		},
		relatedSlugs: ['i-kveld', 'denne-helgen', 'gratis'],
		footerLabel: { no: 'I dag', en: 'Today' },
		footer: { langs: ['no'], order: 3 },
		newsletterHeading: { no: 'Få daglige tips rett i innboksen', en: 'Get daily picks in your inbox' },
		quickAnswer: {
			no: 'Alle arrangementer i Bergen i dag — konserter, utstillinger, turer og mer. Gåri samler dagens program fra 52 lokale kilder, oppdatert to ganger daglig.',
			en: 'All events in Bergen today — concerts, exhibitions, tours and more. Gåri collects today\'s schedule from 52 local sources, updated twice daily.'
		},
		editorial: {
			no: [
				'Bergen har noe å tilby hver dag hele uken. Fra livekonserter på Ole Bull og Grieghallen til utstillinger på KODE, Bergen Kunsthall og Bymuseet — og guidede turer på Fløyen og i fjordlandskapet. Kulturkalenderen er aktiv alle dager, ikke bare i helgene. DNS, BIT Teatergarasjen og de mindre teatrene spiller forestillinger mandag til lørdag.',
				'Gåri henter alle arrangementer som skjer i Bergen i dag fra 52 lokale kilder og oppdaterer to ganger daglig — morgen og kveld. Du ser alltid et ferskt bilde av dagsprogrammet, med tidspunkt for alle arrangementer inkludert.',
				'Leter du etter noe spesifikt? Bruk tidspunkt-filteret for morgen, dagtid, kveld eller natt. Gratis-filteret viser kostnadsfrie aktiviteter i dag. Utsolgte arrangementer fjernes automatisk fra Gåri — det du ser er tilgjengelig for besøk.'
			],
			en: [
				'Bergen offers something every day of the week. From live concerts at Ole Bull and Grieghallen to exhibitions at KODE, Bergen Kunsthall and Bymuseet — and guided walks on Fløyen and in the fjord landscape. The cultural calendar is active throughout the week, not just at weekends. DNS, BIT Teatergarasjen and the smaller theatres run performances Monday through Saturday.',
				'Gåri pulls all events happening in Bergen today from 52 local sources and updates twice daily — morning and evening. You always see a fresh picture of the day\'s programme, with start times included for all events.',
				'Looking for something specific? Use the time filter for morning, daytime, evening or night events. The free filter shows no-cost activities today. Sold-out events are removed automatically from Gåri — everything you see is available to attend.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen i dag?', a: 'Gåri viser alle arrangementer i Bergen i dag — konserter, utstillinger, teater, familieaktiviteter og mer. Oppdatert morgen og kveld fra 52 lokale kilder.' },
				{ q: 'Er det noe gratis å gjøre i Bergen i dag?', a: 'Bergen har daglige gratis arrangementer. Bruk gratis-filteret på Gåri for å finne kostnadsfrie aktiviteter i dag.' },
				{ q: 'Hva er åpent i Bergen i dag?', a: 'Museer, gallerier, biblioteker og teatre i Bergen er åpne daglig. Gåri viser alle arrangementer med tidspunkt i dag.' }
			],
			en: [
				{ q: "What's happening in Bergen today?", a: 'Gåri shows all events in Bergen today — concerts, exhibitions, theatre, family activities and more. Updated twice daily from 52 local sources.' },
				{ q: 'Is there anything free to do in Bergen today?', a: "Bergen regularly has free events every day. Use Gåri's free filter to find no-cost activities today." },
				{ q: 'What is open in Bergen today?', a: 'Museums, galleries, libraries and theatres in Bergen are open daily. Gåri shows all events with start times today.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			return events.filter(e => isSameDay(e.date_start, todayStr));
		}
	},
	{
		id: 'free-en',
		slug: 'free-things-to-do-bergen',
		title: {
			no: 'Gratis i Bergen',
			en: 'Free Things to Do in Bergen'
		},
		description: {
			no: 'Gratis arrangementer og aktiviteter i Bergen de neste to ukene — utstillinger, konserter, turer og mer.',
			en: 'Free things to do in Bergen — exhibitions, concerts, hikes and activities. No ticket required.'
		},
		ogSubtitle: {
			no: 'Gratis aktiviteter i Bergen',
			en: 'Free activities in Bergen'
		},
		relatedSlugs: ['this-weekend', 'today-in-bergen', 'regndagsguide'],
		footerLabel: { no: 'Gratis', en: 'Free events' },
		footer: { langs: ['en'], order: 3 },
		newsletterHeading: { no: 'Finn gratisopplevelser hver uke', en: 'Find free events every week' },
		quickAnswer: {
			no: 'Gratis ting å gjøre i Bergen de neste to ukene — utstillinger, konserter, turer og aktiviteter uten billettpris. Samlet fra 52 lokale kilder.',
			en: 'Free things to do in Bergen over the next two weeks — exhibitions, concerts, hikes and activities with no ticket price. Collected from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges mest gavmilde byer for kostnadsfri kulturopplevelse. Biblioteknettverket arrangerer gratis foredrag, konserter og utstillinger hele året. Bergen Kunsthall tilbyr gratis inngangsdager og vernissager. Fløyen og de omkringliggende stiene er gratis å besøke, med organiserte gratisturer gjennom DNT. Universitetet i Bergen holder åpne forelesninger og debatter.',
				'Gåri viser alle gratis arrangementer i Bergen de neste to ukene, fra 52 lokale kilder og oppdatert daglig. Fra sentrum til Nordnes og Fana er gratis aktiviteter spredt over hele byen. To ukers vindu gir deg god tid til å planlegge rundt gratis museumsdager, bibliotekarrangementer og uteaktiviteter.',
				'«Trolig gratis» betyr at arrangøren ikke har oppgitt pris i sin kilde — sjekk alltid pris hos arrangøren. Likevel er Bergens gratis kulturtilbud genuint bredt: åpningskvelder, parkkonserter, bibliotekarrangementer og uteaktiviteter gjør det enkelt å tilbringe en hel dag i Bergen uten å bruke en krone.'
			],
			en: [
				'Bergen is one of Norway\'s most generous cities for free cultural experiences. The public library network runs free talks, concerts and exhibitions year-round. Bergen Kunsthall offers free entry days and vernissages. Fløyen and the surrounding trails are free to walk, with organised no-cost hikes through DNT. The University of Bergen hosts open public lectures and debates.',
				'Gåri lists all free events in Bergen over the next two weeks, drawn from 52 local sources and updated daily. From the city centre to Nordnes and Fana, free activities are spread across the whole city. The two-week window gives visitors time to plan around free museum days, library events and outdoor activities.',
				'"Likely free" means the organiser has not published a price — always verify with the organiser before attending. That said, Bergen\'s free cultural offer is genuinely wide: opening nights, park concerts, library programmes and outdoor events make it easy to spend a full day in Bergen without spending a krone.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva er gratis å gjøre i Bergen?', a: 'Gåri viser alle gratis arrangementer i Bergen de neste to ukene — utstillinger, konserter, turer og aktiviteter. Oppdatert daglig fra 52 lokale kilder.' },
				{ q: 'Er det gratis museer i Bergen?', a: 'Flere museer i Bergen har gratis inngangsdager. Gåri viser gratis museumsdager og kulturtilbud fortløpende.' },
				{ q: 'Hva kan turister gjøre gratis i Bergen?', a: 'Bergen Kunsthall, biblioteknettverk og Fløyen-turer er jevnlig gratis. Gåri samler alle gratis arrangementer fra 52 lokale Bergen-kilder.' }
			],
			en: [
				{ q: 'What free things are there to do in Bergen?', a: 'Gåri lists all free events in Bergen over the next two weeks — exhibitions, concerts, hikes and activities. Updated daily from 52 sources.' },
				{ q: 'Are there free museums in Bergen?', a: 'Several Bergen museums have free entry days or free admission. Gåri lists free museum events and cultural activities as they are announced.' },
				{ q: 'What can I do for free in Bergen as a tourist?', a: 'Bergen Kunsthall, the public library network and Fløyen hikes are regularly free. Gåri collects all free events from 52 local Bergen sources.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = toOsloDateStr(addDays(now, 13));
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= todayStr && d <= endStr && isFreeEvent(e.price);
			});
		}
	},
	{
		id: 'rainy-day',
		slug: 'regndagsguide',
		title: {
			no: 'Regnværsguide Bergen',
			en: 'Bergen Rainy Day Guide'
		},
		description: {
			no: 'Hva gjøre i Bergen når det regner? Innendørs konserter, teater, utstillinger og familieaktiviteter de neste to ukene.',
			en: "What to do in Bergen when it rains? Indoor concerts, theatre, exhibitions and family activities over the next two weeks."
		},
		ogSubtitle: {
			no: 'Innendørsaktiviteter i Bergen',
			en: 'Indoor activities in Bergen'
		},
		relatedSlugs: ['gratis', 'familiehelg', 'voksen'],
		footerLabel: { no: 'Regnværsguide', en: 'Rainy day guide' },
		footer: { langs: ['no', 'en'], order: 11 },
		newsletterHeading: { no: 'Få tips til ting å gjøre i Bergen', en: 'Get Bergen activity tips weekly' },
		quickAnswer: {
			no: 'Regner det i Bergen? Her er innendørsarrangementer de neste to ukene — konserter, teater, utstillinger og familieaktiviteter. Samlet fra 52 lokale kilder.',
			en: 'Raining in Bergen? Here are indoor events over the next two weeks — concerts, theatre, exhibitions and family activities. Collected from 52 local sources.'
		},
		editorial: {
			no: [
				'Regn er Bergens mest omtalte egenskap — og byens innendørskulturliv er i verdensklasse. KODE er landets største kunstmuseum med fire bygg i sentrum. Bergen Kunsthall viser internasjonal samtidskunst. Akvariet er en av landets mest besøkte attraksjoner. Grieghallen, DNS, Forum Scene og USF Verftet er alle innendørs og holder program gjennom hele uken.',
				'Gåri-siden for regnværsdager viser innendørsarrangementer i Bergen de neste to ukene — konserter, teater, utstillinger, verksteder, matopplevelser og familieaktiviteter. Siden oppdateres daglig og henter data fra 52 lokale kilder.',
				'Gratis innendørsalternativer inkluderer Bergen Bibliotek og filialene over hele byen, samt vernissager på gallerier. For familier med barn er Akvariet, VilVite og Bymuseet gode valg. Husk at regnværssesongen er Bergen på sitt mest autentiske — de beste innendørsscenene fyller opp raskt, så sjekk tilgjengelighet hos arrangøren.'
			],
			en: [
				'Rain is Bergen\'s most talked-about characteristic — and the city\'s indoor cultural life is world-class. KODE is Norway\'s largest art museum, with four buildings in the city centre. Bergen Kunsthall shows international contemporary art. The Aquarium is one of Norway\'s most visited attractions. Grieghallen, DNS, Forum Scene and USF Verftet are all indoors and run programmes throughout the week.',
				'Gåri\'s rainy day guide shows indoor events in Bergen over the next two weeks — concerts, theatre, exhibitions, workshops, food experiences and family activities. The listing updates daily from 52 local sources.',
				'Free indoor options include Bergen Library and its branches across the city, plus gallery vernissages. For families with children, the Aquarium, VilVite and Bymuseet are excellent choices. Note that rain season is Bergen at its most authentic — the city\'s best indoor venues fill up quickly, so check availability with the organiser.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva kan man gjøre i Bergen når det regner?', a: 'Gåri viser innendørsarrangementer i Bergen de neste to ukene — konserter, teater, utstillinger, verksteder og familieaktiviteter.' },
				{ q: 'Hva er gode innendørsaktiviteter i Bergen?', a: 'KODE, Bergen Kunsthall, Akvariet, DNS og Grieghallen er blant Bergens beste innendørsarenaer. Gåri viser alle innendørsarrangementer oppdatert daglig.' },
				{ q: 'Er det noe for barn å gjøre innendørs i Bergen?', a: 'Akvariet, VilVite, KODE og Bergen Bibliotek er populære innendørsvalg for familier. Sjekk Gåri for familieforestillinger og barneaktiviteter.' }
			],
			en: [
				{ q: "What can you do in Bergen when it rains?", a: 'Gåri shows indoor events in Bergen over the next two weeks — concerts, theatre, exhibitions, workshops and family activities.' },
				{ q: 'What are good indoor activities in Bergen?', a: "KODE, Bergen Kunsthall, the Aquarium, DNS and Grieghallen are among Bergen's best indoor venues. Gåri lists all indoor events, updated daily." },
				{ q: 'Is there anything for children to do indoors in Bergen?', a: 'The Aquarium, VilVite, KODE and Bergen Library are popular indoor choices for families in Bergen. Check Gåri for children\'s shows and family activities.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = toOsloDateStr(addDays(now, 13));
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= todayStr && d <= endStr && INDOOR_CATEGORIES.has(e.category);
			});
		}
	},
	{
		id: 'sentrum',
		slug: 'sentrum',
		title: {
			no: 'Arrangementer i Bergen sentrum',
			en: 'Events in Bergen City Centre'
		},
		description: {
			no: 'Konserter, utstillinger og arrangementer i Bergen sentrum de neste to ukene — alt i gangavstand.',
			en: 'Concerts, exhibitions and events in Bergen city centre over the next two weeks — all within walking distance.'
		},
		ogSubtitle: {
			no: 'Sentrumsarrangementer',
			en: 'City centre events'
		},
		relatedSlugs: ['denne-helgen', 'konserter', 'voksen'],
		footerLabel: { no: 'Sentrum', en: 'City centre' },
		footer: { langs: ['no', 'en'], order: 10 },
		newsletterHeading: { no: 'Få tips til ting å gjøre i sentrum', en: 'Get city centre event tips' },
		quickAnswer: {
			no: 'Arrangementer i Bergen sentrum de neste to ukene — konserter, teater, utstillinger og mat i gangavstand fra Bryggen. Samlet fra 52 lokale kilder.',
			en: 'Events in Bergen city centre over the next two weeks — concerts, theatre, exhibitions and dining within walking distance of Bryggen. Collected from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen sentrum er hjertet av kulturtilbudet i byen. Grieghallen, Den Nationale Scene, Ole Bull Scene og Bergen Kunsthall ligger alle i sentrum. KODE er spredt over fire bygg i sentrum og på Nordnes. Litteraturhuset og Bergen Kino huser arrangementer daglig. Sentrumsgatene med Bryggen, Torgallmenningen og Strandkaien er rammen for matmarkeder, utendørsfestivaler og byrommets hendelser.',
				'Gåri viser alle arrangementer i Bergen sentrum de neste to ukene — spillesteder, teatre, gallerier, bibliotek, matarrangementer og kulturhus. Listen hentes fra 52 lokale kilder og oppdateres daglig.',
				'Bergen sentrum er kompakt og gangvennlig. Fra Grieghallen til Bryggen er det under ti minutters gange. Bybanen har stopp ved Byparken (for Grieghallen og Bryggen) og Florida (for DNS og Ole Bull). Gåri fjerner utsolgte arrangementer fortløpende — det du ser er tilgjengelig.'
			],
			en: [
				'Bergen city centre is the heart of the city\'s cultural offering. Grieghallen, Den Nationale Scene, Ole Bull Scene and Bergen Kunsthall are all in the centre. KODE spans four buildings in the city centre and on Nordnes. Litteraturhuset and Bergen Kino host events daily. The central streets around Bryggen, Torgallmenningen and Strandkaien are home to food markets, outdoor festivals and urban events.',
				'Gåri shows all events in Bergen city centre over the next two weeks — venues, theatres, galleries, libraries, food events and cultural centres. Listings are drawn from 52 local sources and updated daily.',
				'Bergen\'s city centre is compact and walkable. From Grieghallen to Bryggen is under ten minutes on foot. The Bybanen tram stops at Byparken (for Grieghallen and Bryggen) and Florida (for DNS and Ole Bull). Gåri removes sold-out events continuously — everything you see is available.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen sentrum?', a: 'Gåri viser alle arrangementer i Bergen sentrum de neste to ukene — konserter, utstillinger, teater og mer fra 52 lokale kilder.' },
				{ q: 'Hvilke kulturarenaer er det i Bergen sentrum?', a: 'Grieghallen, Den Nationale Scene, Ole Bull, Bergen Kunsthall, KODE og Litteraturhuset ligger alle i Bergen sentrum.' },
				{ q: 'Hva skjer i Bergen sentrum i helgen?', a: 'Sjekk Gåri for helgens arrangementer i Bergen sentrum — fra Grieghallen og DNS til Kunsthallen og matmarkedet på Torget.' }
			],
			en: [
				{ q: "What's on in Bergen city centre?", a: 'Gåri shows all events in Bergen city centre over the next two weeks — concerts, exhibitions, theatre and more from 52 local sources.' },
				{ q: 'What cultural venues are in Bergen city centre?', a: 'Grieghallen, Den Nationale Scene, Ole Bull, Bergen Kunsthall, KODE and Litteraturhuset are all in Bergen city centre.' },
				{ q: "What's on in Bergen city centre this weekend?", a: 'Check Gåri for weekend events in Bergen city centre — from Grieghallen and DNS to Kunsthallen and the market at Torget.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = toOsloDateStr(addDays(now, 13));
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= todayStr && d <= endStr && e.bydel === 'Sentrum';
			});
		}
	},
	{
		id: 'voksen',
		slug: 'voksen',
		title: {
			no: 'Arrangementer for voksne i Bergen',
			en: 'Events for Adults in Bergen'
		},
		description: {
			no: 'Konserter, teater, omvisninger, utstillinger og kulturopplevelser for voksne i Bergen de neste to ukene.',
			en: 'Concerts, theatre, guided tours, exhibitions and cultural experiences for adults in Bergen over the next two weeks.'
		},
		ogSubtitle: {
			no: 'Kultur og opplevelser for voksne',
			en: 'Culture and experiences for adults'
		},
		relatedSlugs: ['konserter', 'denne-helgen', 'sentrum'],
		footerLabel: { no: 'For voksne', en: 'For adults' },
		footer: { langs: ['no', 'en'], order: 7 },
		newsletterHeading: { no: 'Kulturelle tips for voksne, hver torsdag', en: 'Cultural picks for adults, every Thursday' },
		quickAnswer: {
			no: 'Kulturopplevelser for voksne i Bergen de neste to ukene — konserter, teater, omvisninger, utstillinger og matarrangementer. Samlet fra 52 lokale kilder.',
			en: 'Cultural experiences for adults in Bergen over the next two weeks — concerts, theatre, guided tours, exhibitions and food events. Collected from 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen har et rikt kulturtilbud for voksne — fra klassisk musikk i Grieghallen og jazz på Nattjazz til omvisninger på KODE og foredrag på Litteraturhuset. Bergen Filharmoniske Orkester og Den Nationale Scene legger jevnlig opp til forestillinger og konserter. Bymuseet, Museum Vest og Akvariet tilbyr omvisninger og utstillinger for alle aldre.',
				'Gåri samler arrangementer innen musikk, kultur, teater, omvisninger, mat og verksteder — alt tilpasset voksne. Listen hentes fra over 52 lokale kilder og oppdateres daglig. Utsolgte arrangementer fjernes fortløpende.',
				'Bergen er en kompakt kulturby. Mange av arrangementene finner sted i sentrum, i gangavstand fra hverandre. Sjekk gjerne prisene direkte hos arrangøren — mange steder tilbyr rabatter for honnør og studenter.'
			],
			en: [
				'Bergen offers a rich cultural programme for adults — from classical music at Grieghallen and jazz at Nattjazz to guided tours at KODE and talks at Litteraturhuset. Bergen Philharmonic Orchestra and Den Nationale Scene regularly programme concerts and performances. Bymuseet, Museum Vest and Akvariet offer tours and exhibitions for all ages.',
				'Gåri collects events in music, culture, theatre, guided tours, food and workshops — all suited to adults. Listings are drawn from over 52 local sources and updated daily. Sold-out events are removed as soon as they sell out.',
				'Bergen is a compact cultural city. Many events take place in the city centre, within walking distance of each other. Check prices directly with the organiser — many venues offer discounts for seniors and students.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen for voksne?', a: 'Gåri viser konserter, teater, omvisninger, utstillinger og kulturopplevelser for voksne i Bergen de neste to ukene.' },
				{ q: 'Hvilke kulturarrangementer er det i Bergen?', a: 'Bergen tilbyr klassisk musikk på Grieghallen, jazz, teater på DNS, omvisninger på KODE og Bymuseet, foredrag på Litteraturhuset og mye mer.' },
				{ q: 'Er det gratis arrangementer for voksne i Bergen?', a: 'Ja — Bergen Kunsthall, Bergen Bibliotek og mange gallerier tilbyr gratis inngang. Sjekk Gåri for oversikt over gratis arrangementer.' }
			],
			en: [
				{ q: 'What events are there for adults in Bergen?', a: 'Gåri shows concerts, theatre, guided tours, exhibitions and cultural experiences for adults in Bergen over the next two weeks.' },
				{ q: 'What cultural events are on in Bergen?', a: 'Bergen offers classical music at Grieghallen, jazz, theatre at DNS, tours at KODE and Bymuseet, talks at Litteraturhuset and much more.' },
				{ q: 'Are there free events for adults in Bergen?', a: 'Yes — Bergen Kunsthall, Bergen Bibliotek and many galleries offer free entry. Check Gåri for a full list of free events.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = toOsloDateStr(addDays(now, 13));
			const adultCategories = new Set(['culture', 'music', 'theatre', 'tours', 'food', 'workshop']);
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				return (
					d >= todayStr &&
					d <= endStr &&
					adultCategories.has(e.category) &&
					e.category !== 'student' &&
					e.category !== 'nightlife' &&
					e.category !== 'sports' &&
					e.category !== 'family'
				);
			});
		}
	},
	{
		id: 'ungdom',
		slug: 'for-ungdom',
		title: {
			no: 'Arrangementer for ungdom i Bergen',
			en: 'Events for Teens in Bergen'
		},
		description: {
			no: 'Konserter, kultur, sport, workshops og festivaler for ungdom (13\u201318 år) i Bergen de neste to ukene.',
			en: 'Concerts, culture, sports, workshops and festivals for teens (13\u201318) in Bergen over the next two weeks.'
		},
		ogSubtitle: {
			no: 'For ungdom mellom 13 og 18 år',
			en: 'For teens aged 13 to 18'
		},
		relatedSlugs: ['studentkveld', 'konserter', 'gratis'],
		footerLabel: { no: 'For ungdom', en: 'For youth' },
		footer: { langs: ['no', 'en'], order: 8 },
		newsletterHeading: { no: 'Tips for ungdom i Bergen', en: 'Teen event picks in Bergen' },
		quickAnswer: {
			no: 'Arrangementer for ungdom (13–18 år) i Bergen de neste to ukene — konserter, kultur, sport og workshops. Uten uteliv og 18+-arrangementer. Fra 52 lokale kilder.',
			en: 'Events for teens (13–18) in Bergen over the next two weeks — concerts, culture, sports and workshops. No nightlife or 18+ events. From 52 local sources.'
		},
		editorial: {
			no: [
				'Bergen har et bredt tilbud for ungdom \u2014 fra konserter på Kvarteret og Forum Scene til workshops på Litteraturhuset og utstillinger på KODE. Mange arrangementer er enten gratis eller har reduserte priser for unge under 18.',
				'Gåri samler arrangementer fra over 52 lokale kilder og oppdaterer listen daglig. Vi filtrerer bort arrangementer med aldersgrense (18+/20+) og uteliv, slik at det som vises passer for aldersgruppen 13\u201318 år.',
				'Sjekk gjerne konserter, sportshendelser og workshops \u2014 Bergen har mye å tilby unge kulturinteresserte. Mange museer har gratis inngang for barn og ungdom under 18.'
			],
			en: [
				'Bergen offers a wide range of events for teens \u2014 from concerts at Kvarteret and Forum Scene to workshops at Litteraturhuset and exhibitions at KODE. Many events are either free or offer reduced prices for under-18s.',
				'Gåri collects events from over 52 local sources and updates the listing daily. We filter out events with age restrictions (18+/20+) and nightlife, so everything shown is suitable for the 13\u201318 age group.',
				'Check out concerts, sports events and workshops \u2014 Bergen has plenty to offer young culture enthusiasts. Many museums offer free entry for children and teens under 18.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen for ungdom?', a: 'Gåri viser konserter, kultur, sport, workshops og festivaler som passer for ungdom mellom 13 og 18 år i Bergen de neste to ukene.' },
				{ q: 'Er det gratis arrangementer for ungdom i Bergen?', a: 'Ja \u2014 mange museer, biblioteker og kulturhus har gratis inngang for ungdom under 18. Sjekk Gåris gratis-side for full oversikt.' },
				{ q: 'Hvilke konserter kan ungdom gå på i Bergen?', a: 'Mange konserter i Bergen er åpne for alle aldre. Gåri filtrerer bort arrangementer med 18+ aldersgrense, slik at du ser konserter du faktisk kan gå på.' }
			],
			en: [
				{ q: 'What events are there for teens in Bergen?', a: 'Gåri shows concerts, culture, sports, workshops and festivals suitable for teens aged 13\u201318 in Bergen over the next two weeks.' },
				{ q: 'Are there free events for teens in Bergen?', a: 'Yes \u2014 many museums, libraries and cultural venues offer free entry for teens under 18. Check Gåri\'s free events page for a full list.' },
				{ q: 'What concerts can teens go to in Bergen?', a: 'Many concerts in Bergen are open to all ages. Gåri filters out events with 18+ age restrictions, so you see concerts you can actually attend.' }
			]
		},
		filterEvents: (events, now) => {
			const todayStr = toOsloDateStr(now);
			const endStr = toOsloDateStr(addDays(now, 13));
			return events.filter(e => {
				const d = e.date_start.slice(0, 10);
				if (d < todayStr || d > endStr) return false;
				if (e.age_group === '18+') return false;
				if (e.category === 'nightlife' || e.category === 'food') return false;
				return YOUTH_CATEGORIES.has(e.category) || e.age_group === 'family' || e.category === 'family' || YOUTH_TEXT_RE.test(e.title_no) || YOUTH_TEXT_RE.test(e.description_no);
			});
		}
	},

	// ── Seasonal collections (NO) ──────────────────────────────────────

	{
		id: '17mai',
		slug: '17-mai',
		seasonal: true,
		title: {
			no: '17. mai i Bergen',
			en: '17th of May in Bergen'
		},
		description: {
			no: '17. mai-program for Bergen: barnetog, buekorps, konserter og arrangementer. Komplett oversikt fra 52 lokale kilder.',
			en: "Norway's Constitution Day in Bergen: children's parades, buekorps, concerts and events. Complete guide from 52 local sources."
		},
		ogSubtitle: {
			no: 'Barnetog, buekorps og feiring',
			en: 'Parades, buekorps and celebrations'
		},
		relatedSlugs: ['denne-helgen', 'gratis', 'familiehelg', 'for-ungdom'],
		newsletterHeading: { no: 'Få 17. mai-programmet rett i innboksen', en: 'Get the 17th of May programme in your inbox' },
		quickAnswer: {
			no: 'Bergen feirer 17. mai med barnetog gjennom sentrum, buekorps-marsjer — en tradisjon unik for Bergen — konserter på Torgallmenningen og Festplassen, og familieaktiviteter over hele byen. Gåri samler alle arrangementer fra 52 lokale kilder.',
			en: "Bergen celebrates Norway's Constitution Day (17th of May) with children's parades through the city centre, buekorps marching brigades — a tradition unique to Bergen — concerts at Torgallmenningen and Festplassen, and family activities across the city."
		},
		editorial: {
			no: [
				'17. mai er Norges nasjonaldag og Bergens mest folkerike feiring. Barnetoget starter ved Festplassen og går gjennom sentrum, mens Bergens unike buekorps — barnebrigader med trommer og faner — marsjerer gjennom gatene fra tidlig morgen. Torgallmenningen er samlingspunktet, med taler, is og pølser.',
				'Bergen har en særegen 17. mai-kultur med rundt 30 aktive buekorps, noe ingen annen norsk by har. Feiringen strekker seg fra festgudstjenester om morgenen til konserter og folkefester om kvelden. Mange restauranter og spillesteder arrangerer egne program.',
				'Gåri samler 17. mai-arrangementer fra over 52 lokale kilder — spillesteder, kulturinstitusjoner, festivalarrangører og billettplattformer. Denne siden oppdateres daglig når programmet nærmer seg. Se også familiehelg-siden for barnevennlige aktiviteter.'
			],
			en: [
				"17th of May (syttende mai) is Norway's Constitution Day and Bergen's biggest celebration. The children's parade (barnetog) starts at Festplassen and winds through the city centre, while Bergen's unique buekorps — children's marching brigades with drums and banners — parade from early morning. Torgallmenningen is the main gathering point, with speeches, ice cream and hot dogs.",
				"Bergen has a distinctive 17th of May culture with around 30 active buekorps, something found in no other Norwegian city. Celebrations run from morning church services to evening concerts and public festivities. Norwegians dress in bunads (traditional folk costumes) and the atmosphere is festive from dawn to night.",
				"Gåri collects 17th of May events from over 52 local sources — venues, cultural institutions, festival organisers and ticketing platforms. This page is updated daily as the programme approaches. See the family weekend page for child-friendly activities year-round."
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer 17. mai i Bergen?', a: 'Bergen feirer 17. mai med barnetog, buekorps-marsjer, konserter på Torgallmenningen og Festplassen, og aktiviteter over hele byen. Gåri viser alle arrangementer fra 52 lokale kilder.' },
				{ q: 'Når starter barnetoget i Bergen?', a: 'Barnetoget i Bergen starter vanligvis ved Festplassen rundt kl. 10:00 og går gjennom sentrum. Buekorpsene marsjerer fra tidlig morgen, ofte allerede fra kl. 07:00.' },
				{ q: 'Hva er buekorps?', a: 'Buekorps er barnebrigader med trommer, faner og uniformer — en tradisjon unik for Bergen som går tilbake til 1800-tallet. Rundt 30 aktive buekorps marsjerer gjennom byen på 17. mai.' },
				{ q: 'Er det gratis 17. mai-arrangementer i Bergen?', a: 'Ja, barnetoget, buekorps-marsjene og de fleste offentlige feiringene er gratis. Noen konserter og arrangementer krever billett.' },
				{ q: 'Hva kan man gjøre med barn 17. mai i Bergen?', a: 'Familier kan se barnetoget, buekorps-marsjer, besøke Festplassen med aktiviteter for barn, og spise is og pølser langs ruten. Mange museer har gratis inngang.' }
			],
			en: [
				{ q: "What happens on 17th of May in Bergen?", a: "Bergen celebrates Constitution Day with children's parades, buekorps marching brigades, concerts at Torgallmenningen and Festplassen, and activities across the city. Gåri lists all events from 52 local sources." },
				{ q: "What time does the children's parade start in Bergen?", a: "The children's parade (barnetog) in Bergen typically starts at Festplassen around 10:00 and goes through the city centre. Buekorps marching brigades start from early morning, often from 07:00." },
				{ q: 'What is buekorps?', a: "Buekorps are children's marching brigades with drums, banners and uniforms — a tradition unique to Bergen dating back to the 1800s. Around 30 active buekorps march through the city on 17th of May." },
				{ q: 'Is 17th of May in Bergen free?', a: "Yes, the children's parade, buekorps marches and most public celebrations are free. Some concerts and events require tickets." },
				{ q: 'What can families do on 17th of May in Bergen?', a: "Families can watch the children's parade and buekorps marches, visit Festplassen with activities for kids, and enjoy ice cream and hot dogs along the route. Many museums offer free entry." }
			]
		},
		filterEvents: filter17Mai
	},
	{
		id: 'julemarked',
		slug: 'julemarked',
		seasonal: true,
		title: {
			no: 'Julemarked og jul i Bergen',
			en: 'Christmas Markets and Christmas in Bergen'
		},
		description: {
			no: 'Julemarkeder, konserter, Pepperkakebyen og juleaktiviteter i Bergen. Komplett oversikt over julesesongen fra 52 lokale kilder.',
			en: 'Christmas markets, concerts, the Gingerbread City and holiday events in Bergen. Complete guide to the Christmas season from 52 sources.'
		},
		ogSubtitle: {
			no: 'Julemarkeder, konserter og juleaktiviteter',
			en: 'Markets, concerts and holiday events'
		},
		relatedSlugs: ['nyttarsaften', 'gratis', 'familiehelg', 'denne-helgen'],
		newsletterHeading: { no: 'Få julekalenderen rett i innboksen', en: 'Get the Christmas calendar in your inbox' },
		quickAnswer: {
			no: 'Bergen har over 90 markedsboder på Festplassen fra slutten av november til 22. desember, Pepperkakebyen — verdens største pepperkakeby — på Sentralbadet, Lysfest med fyrverkeri over Lille Lungegårdsvann, og hundrevis av julekonserter og arrangementer. Gratis inngang til julemarkedet.',
			en: 'Bergen hosts 90+ market stalls at Festplassen from late November through December 22, the Gingerbread City (Pepperkakebyen) — the world\'s largest — at Sentralbadet, a Light Festival (Lysfest) with fireworks over Lille Lungegårdsvann, and hundreds of Christmas concerts and events. Free entry to the main market.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges mest stemningsfulle julebyer. Julemarkedet på Festplassen har over 90 boder med håndverk, lokal mat og gløgg, med pariserhjul og gratis inngang. Pepperkakebyen — verdens største pepperkakeby — åpner midt i november på Sentralbadet, der skoler og barnehager fra hele Bergen bidrar med pepperkakehus.',
				'Julesesongen i Bergen sparkes i gang med Lysfesten i november, arrangert av Bergens Tidende i over 30 år: offisiell juletretenning, livemusikk og fyrverkeri over Lille Lungegårdsvann. Grieghallen, Bergen Domkirke og lokale kirker holder julekonserter gjennom hele desember. Adventssøndagene markeres med levende lys på Fløyen.',
				'Gåri samler alle juleaktiviteter fra over 52 lokale kilder — spillesteder, museer, kirker og kulturinstitusjoner. Denne siden oppdateres daglig gjennom hele julesesongen. Se også gratis-siden for juleaktiviteter uten billettpris.'
			],
			en: [
				'Bergen is one of Norway\'s most atmospheric Christmas cities. The main Christmas market at Festplassen features 90+ stalls with handicrafts, local food and gløgg (mulled wine), a Ferris wheel, and free entry. The Gingerbread City (Pepperkakebyen) — the world\'s largest — opens mid-November at Sentralbadet, with schools and kindergartens contributing gingerbread houses.',
				'The Christmas season kicks off with the Light Festival (Lysfest) in November, organised by Bergens Tidende for over 30 years: official Christmas tree lighting, live music and fireworks over Lille Lungegårdsvann. Grieghallen, Bergen Cathedral and local churches hold Christmas concerts throughout December. Advent Sundays are marked with candlelight on Fløyen.',
				'Gåri collects all Christmas events from over 52 local sources — venues, museums, churches and cultural institutions. This page is updated daily throughout the Christmas season. Check the free events page for no-cost Christmas activities.'
			]
		},
		faq: {
			no: [
				{ q: 'Når åpner julemarkedet i Bergen?', a: 'Bergen Julemarked på Festplassen åpner vanligvis rundt 20. november og holder åpent til 22. desember. Åpningstider: hverdager 12–21, helger 10–21. Gratis inngang.' },
				{ q: 'Hvor er Pepperkakebyen i Bergen?', a: 'Pepperkakebyen ligger på Sentralbadet i Bergen sentrum. Den åpner midt i november og er åpen til tidlig januar. Skoler og barnehager bygger hundrevis av pepperkakehus.' },
				{ q: 'Er julemarkedet i Bergen gratis?', a: 'Ja, inngang til Bergen Julemarked på Festplassen er gratis. Mat, drikke og håndverk kjøpes fra bodene. Pepperkakebyen har en liten inngangspris.' },
				{ q: 'Hva er Lysfesten i Bergen?', a: 'Lysfesten er Bergens offisielle markering av julestart, arrangert av Bergens Tidende i over 30 år. Inkluderer juletretenning, livemusikk og fyrverkeri over Lille Lungegårdsvann.' },
				{ q: 'Hvilke julekonserter er det i Bergen?', a: 'Bergen har julekonserter i Grieghallen, Bergen Domkirke, Korskirken og mange lokale kirker. Gåri samler alle fra 52 kilder — fra klassisk til gospel og barnekonserter.' }
			],
			en: [
				{ q: 'When does the Bergen Christmas market open?', a: 'Bergen Christmas Market at Festplassen typically opens around November 20 and runs until December 22. Opening hours: weekdays 12–21, weekends 10–21. Free entry.' },
				{ q: 'Where is the Gingerbread City in Bergen?', a: 'The Gingerbread City (Pepperkakebyen) is at Sentralbadet in Bergen city centre. It opens mid-November and stays open until early January. Schools and kindergartens build hundreds of gingerbread houses.' },
				{ q: 'Is the Bergen Christmas market free?', a: 'Yes, entry to Bergen Christmas Market at Festplassen is free. Food, drinks and crafts are purchased from stalls. The Gingerbread City has a small entry fee.' },
				{ q: 'What is Lysfesten in Bergen?', a: "Lysfesten (the Light Festival) is Bergen's official start of Christmas, organised by Bergens Tidende for over 30 years. Features Christmas tree lighting, live music and fireworks over Lille Lungegårdsvann." },
				{ q: 'What Christmas concerts are in Bergen?', a: 'Bergen hosts Christmas concerts at Grieghallen, Bergen Cathedral, Korskirken and many local churches. Gåri lists them all from 52 sources — from classical to gospel and children\'s concerts.' }
			]
		},
		filterEvents: filterJulemarked
	},
	{
		id: 'paske',
		slug: 'paske',
		seasonal: true,
		title: {
			no: 'Påske i Bergen',
			en: 'Easter in Bergen'
		},
		description: {
			no: 'Påskeaktiviteter i Bergen: konserter, utstillinger, familieaktiviteter og arrangementer i påskeuken. Oppdatert fra 52 kilder.',
			en: 'Easter events in Bergen: concerts, exhibitions, family activities and events during Easter week. Updated from 52 local sources.'
		},
		ogSubtitle: {
			no: 'Konserter, aktiviteter og påskeferie',
			en: 'Concerts, activities and Easter holiday'
		},
		relatedSlugs: ['familiehelg', 'gratis', 'regndagsguide', 'denne-helgen'],
		newsletterHeading: { no: 'Få påskeprogrammet i innboksen', en: 'Get the Easter programme in your inbox' },
		quickAnswer: {
			no: 'Bergen har et aktivt påskeprogram med konserter i Grieghallen og kirker, utstillinger på KODE og Kunsthallen, familieaktiviteter på museene, og påskegudstjenester. Mange velger Bergen fremfor fjellet — byen har i snitt 3 timer mer dagslys enn Oslo i påsken.',
			en: 'Bergen offers an active Easter programme with concerts at Grieghallen and churches, exhibitions at KODE and Kunsthallen, family activities at museums, and Easter services. Many Norwegians choose Bergen over mountain cabins — the city averages 3 more hours of daylight than Oslo at Easter.'
		},
		editorial: {
			no: [
				'Påsken i Bergen er en av byens roligste og vakreste perioder. Mens mange nordmenn drar til fjellet for skiturer og påskekrim, byr Bergen på et rikt kulturprogram. Grieghallen, Den Nationale Scene og Bergens kirker holder konserter og forestillinger gjennom hele påskeuken. KODE og Kunsthallen har spesialutstillinger.',
				'For familier er påsken en fin tid i Bergen. Akvariet, Fløyen og Bymuseet arrangerer påskeaktiviteter, og mange av byens museer har gratis inngang for barn. Bergen har i snitt tørt vær i april — det er faktisk en av byens tørreste måneder, med bare rundt 73 mm nedbør.',
				'Gåri samler alle påskearrangementer fra palmesøndag til andre påskedag — konserter, utstillinger, familieaktiviteter og gudstjenester. Denne siden oppdateres daglig. Se også regndagsguide-siden for innendørs aktiviteter.'
			],
			en: [
				"Easter in Bergen is one of the city's quietest and most beautiful periods. While many Norwegians head to mountain cabins for skiing and påskekrim (crime novels), Bergen offers a rich cultural programme. Grieghallen, Den Nationale Scene and Bergen's churches hold concerts and performances throughout Easter week. KODE and Kunsthallen have special exhibitions.",
				'For families, Easter is a great time to visit Bergen. The Aquarium, Fløyen and Bymuseet organise Easter activities, and many museums offer free entry for children. Bergen averages dry weather in April — it\'s actually one of the city\'s driest months, with only about 73 mm of rainfall.',
				"Gåri collects all Easter events from Palm Sunday to Easter Monday — concerts, exhibitions, family activities and church services. This page is updated daily. Check the rainy day guide for indoor activities."
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen i påsken?', a: 'Bergen har konserter i Grieghallen og kirker, utstillinger på KODE og Kunsthallen, familieaktiviteter og påskegudstjenester. Gåri samler alt fra palmesøndag til andre påskedag.' },
				{ q: 'Er det arrangementer for barn i Bergen i påsken?', a: 'Ja, Akvariet, Fløyen, Bymuseet og bibliotekene arrangerer påskeaktiviteter for barn. Mange museer har gratis inngang for barn under 16.' },
				{ q: 'Når er påsken?', a: 'Påsken varierer hvert år. Skjærtorsdag til andre påskedag er røde dager. Gåri oppdaterer denne siden automatisk med riktige datoer hvert år.' },
				{ q: 'Hva har åpent i Bergen i påsken?', a: 'Langfredag og påskedag er de fleste butikker stengt. Restauranter, museer og kultursteder holder ofte åpent med reduserte timer. Julemarked og kiosker har vanlige åpningstider.' },
				{ q: 'Er det gratis påskeaktiviteter i Bergen?', a: 'Ja, Bergen Bibliotek, flere museer med gratis barnebillett og påskegudstjenester er gratis. Sjekk Gåris gratis-side for en komplett oversikt.' }
			],
			en: [
				{ q: 'What is there to do in Bergen at Easter?', a: 'Bergen has concerts at Grieghallen and churches, exhibitions at KODE and Kunsthallen, family activities and Easter services. Gåri lists everything from Palm Sunday to Easter Monday.' },
				{ q: 'Are there Easter activities for children in Bergen?', a: 'Yes, the Aquarium, Fløyen, Bymuseet and libraries organise Easter activities for children. Many museums offer free entry for under-16s.' },
				{ q: 'When is Easter in Norway?', a: 'Easter dates vary each year. Maundy Thursday to Easter Monday are public holidays (røde dager). Gåri automatically updates this page with the correct dates each year.' },
				{ q: "What's open in Bergen during Easter?", a: 'On Good Friday and Easter Sunday, most shops are closed. Restaurants, museums and cultural venues often remain open with reduced hours.' },
				{ q: 'Are there free Easter events in Bergen?', a: "Yes, Bergen Library, museums with free children's admission, and Easter church services are free. Check Gåri's free events page for a full list." }
			]
		},
		filterEvents: filterPaske
	},
	{
		id: 'sankthans',
		slug: 'sankthans',
		seasonal: true,
		title: {
			no: 'Sankthans i Bergen',
			en: 'Midsummer in Bergen'
		},
		description: {
			no: 'Sankthans i Bergen: bål, fester, konserter og midsommeraktiviteter. Finn alle arrangementer rundt 23. juni.',
			en: 'Midsummer in Bergen: bonfires, parties, concerts and events around June 23. Complete guide from 52 local sources.'
		},
		ogSubtitle: {
			no: 'Bål, fester og lyse netter',
			en: 'Bonfires, parties and bright nights'
		},
		relatedSlugs: ['denne-helgen', 'gratis', 'konserter', 'voksen'],
		newsletterHeading: { no: 'Finn sankthansbålene i Bergen', en: 'Find the midsummer bonfires in Bergen' },
		quickAnswer: {
			no: 'Sankthansaften 23. juni er en av Norges mest elskede tradisjoner. Bergen har store bål langs kysten og på øyene i havnen, grilling og utendørsfester under nesten 19 timer dagslys. Flere spillesteder holder konserter og arrangementer rundt sommersolverv.',
			en: 'Midsummer Eve (sankthansaften) on June 23 is one of Norway\'s most beloved traditions. Bergen lights massive bonfires along the coast and harbour islands, with barbecues and outdoor parties under nearly 19 hours of daylight. Venues host concerts and events around the summer solstice.'
		},
		editorial: {
			no: [
				'Sankthansaften 23. juni er en av Norges eldste og mest elskede tradisjoner — feiret i Bergen siden middelalderen. Bål tennes langs kysten, på øyene i havnen og i parkene. De mest kjente sankthansbålene i Bergen er på Nordnes, Sandviken og øyene Askøy og Holsnøy. Grilling, musikk og sosialt samvær under nesten endeløst dagslys.',
				'Bergen har rundt 19 timer dagslys ved sommersolverv, og himmelen blir aldri helt mørk — en magisk kulisse for bålfeiring. Mange spillesteder og restauranter arrangerer sankthansfester, konserter og utendørsarrangementer. Bergenfest avsluttes vanligvis rett før sankthans, og byen er i feststemning.',
				'Gåri samler alle sankthansarrangementer fra 21. til 24. juni — bål, konserter, fester og aktiviteter. Denne siden oppdateres daglig når programmet nærmer seg. Se også konserter-siden for livemusikk.'
			],
			en: [
				'Midsummer Eve (sankthansaften) on June 23 is one of Norway\'s oldest and most beloved traditions — celebrated in Bergen since the Middle Ages. Bonfires are lit along the coast, on harbour islands and in parks. The most famous Bergen bonfires are at Nordnes, Sandviken and the islands of Askøy and Holsnøy. Barbecues, music and socialising under near-endless daylight.',
				'Bergen has around 19 hours of daylight at the summer solstice, and the sky never fully darkens — a magical backdrop for bonfire celebrations. Many venues and restaurants host midsummer parties, concerts and outdoor events. Bergenfest typically ends just before midsummer, keeping the city in a festive mood.',
				'Gåri collects all midsummer events from June 21–24 — bonfires, concerts, parties and activities. This page is updated daily as the programme approaches. Check the concerts page for live music.'
			]
		},
		faq: {
			no: [
				{ q: 'Hvor er de beste sankthansbålene i Bergen?', a: 'De mest kjente sankthansbålene i Bergen er på Nordnes, Sandviken og øyene rundt Bergen. Kommunen arrangerer bål på flere steder. Gåri samler alle offisielle arrangementer.' },
				{ q: 'Når er sankthans?', a: 'Sankthansaften er 23. juni hvert år. Feiringen starter om ettermiddagen og varer til langt utover kvelden. Bål tennes vanligvis rundt kl. 21–22.' },
				{ q: 'Er det gratis sankthansarrangementer i Bergen?', a: 'Ja, de fleste sankthansbål og offentlige feiringer er gratis. Noen konserter og arrangementer krever billett.' },
				{ q: 'Hva er sankthans?', a: 'Sankthans (jonsok) feirer sommersolverv og har røtter tilbake til norrøn tid. Bål tennes for å feire den lengste dagen og de lyse nettene. I Bergen er det en stor sosial tradisjon.' },
				{ q: 'Hvor lyst er det i Bergen ved sankthans?', a: 'Bergen har rundt 19 timer og 8 minutter dagslys ved sommersolverv. Himmelen blir aldri helt mørk — en magisk atmosfære for utendørsfeiring.' }
			],
			en: [
				{ q: 'Where are the best midsummer bonfires in Bergen?', a: 'The most famous bonfires in Bergen are at Nordnes, Sandviken and the harbour islands. The municipality organises bonfires at several locations. Gåri lists all official events.' },
				{ q: 'When is midsummer in Norway?', a: 'Midsummer Eve (sankthansaften) is June 23 every year. Celebrations start in the afternoon and last well into the evening. Bonfires are typically lit around 21:00–22:00.' },
				{ q: 'Are midsummer events in Bergen free?', a: 'Yes, most midsummer bonfires and public celebrations are free. Some concerts and events require tickets.' },
				{ q: 'What is sankthans?', a: 'Sankthans (also called jonsok) celebrates the summer solstice and has roots in Norse tradition. Bonfires are lit to celebrate the longest day and the bright nights. In Bergen it is a major social tradition.' },
				{ q: 'How light is Bergen at midsummer?', a: 'Bergen has around 19 hours and 8 minutes of daylight at the solstice. The sky never fully darkens — creating a magical atmosphere for outdoor celebrations.' }
			]
		},
		filterEvents: filterSankthans
	},
	{
		id: 'nyttarsaften',
		slug: 'nyttarsaften',
		seasonal: true,
		title: {
			no: 'Nyttårsaften i Bergen',
			en: "New Year's Eve in Bergen"
		},
		description: {
			no: 'Nyttårsaften i Bergen: fyrverkeri, fester, konserter og arrangementer. Finn alt som skjer 31. desember.',
			en: "New Year's Eve in Bergen: fireworks, parties, concerts and events. Find everything happening on December 31."
		},
		ogSubtitle: {
			no: 'Fyrverkeri, fester og nyttårsfeiring',
			en: 'Fireworks, parties and celebrations'
		},
		relatedSlugs: ['julemarked', 'konserter', 'voksen', 'denne-helgen'],
		newsletterHeading: { no: 'Planlegg nyttårsfeiringen i Bergen', en: "Plan your New Year's Eve in Bergen" },
		quickAnswer: {
			no: 'Bergen feirer nyttårsaften med spektakulært fyrverkeri over Vågen og fra Fløyfjellet, fester og konserter på spillesteder i sentrum, og nyttårsshow i Grieghallen. Mange restauranter tilbyr egne nyttårsmenyer. Gåri samler alle arrangementer.',
			en: "Bergen celebrates New Year's Eve with spectacular fireworks over the harbour (Vågen) and from Mount Fløyen, parties and concerts at city centre venues, and a New Year's show at Grieghallen. Many restaurants offer special New Year's menus."
		},
		editorial: {
			no: [
				'Nyttårsaften i Bergen er spektakulær. Fyrverkeriet over Vågen og fra Fløyfjellet er et av Norges mest ikoniske nyttårsshow. Bryggen og Torget er populære samlingspunkter for å se fyrverkeriet. Mange velger også Fløyen for panoramautsikt over hele byen.',
				'Spillesteder og restauranter i Bergen arrangerer fester, konserter og spesielle nyttårsmenyer. Grieghallen holder tradisjonelt nyttårskonsert. Forum Scene, Ole Bull og lokale puber har egne program. Booking av restaurantbord anbefales i god tid.',
				'Gåri samler alle nyttårsarrangementer fra 29. desember til 1. januar — konserter, fester, familieaktiviteter og festlige arrangementer. Denne siden oppdateres daglig i desember.'
			],
			en: [
				"New Year's Eve in Bergen is spectacular. The fireworks display over the harbour (Vågen) and from Mount Fløyen is one of Norway's most iconic New Year's shows. Bryggen and the Fish Market are popular gathering spots for viewing. Many choose Fløyen for a panoramic view over the entire city.",
				"Venues and restaurants in Bergen host parties, concerts and special New Year's menus. Grieghallen traditionally holds a New Year's concert. Forum Scene, Ole Bull and local pubs have their own programmes. Booking restaurant tables well in advance is recommended.",
				"Gåri collects all New Year's events from December 29 to January 1 — concerts, parties, family activities and festive events. This page is updated daily throughout December."
			]
		},
		faq: {
			no: [
				{ q: 'Hvor er fyrverkeriet i Bergen nyttårsaften?', a: 'Bergens offisielle fyrverkeri skytes opp over Vågen og fra Fløyfjellet ved midnatt. Bryggen, Torget, Nordnes og Fløyen er populære utsiktspunkter.' },
				{ q: 'Hva skjer nyttårsaften i Bergen?', a: 'Bergen har fyrverkeri ved midnatt, fester og konserter på spillesteder, nyttårskonsert i Grieghallen, og restauranter med spesielle nyttårsmenyer. Gåri samler alle arrangementer.' },
				{ q: 'Er det familievennlige nyttårsarrangementer i Bergen?', a: 'Ja, noen steder arrangerer tidlig feiring for familier med barn. Fyrverkeriet ved midnatt er gratis og synlig fra mange steder i byen.' },
				{ q: 'Hvilke konserter er det nyttårsaften i Bergen?', a: 'Grieghallen har tradisjonelt nyttårskonsert. Forum Scene, Ole Bull og lokale spillesteder har egne programmer. Sjekk Gåri for oppdatert oversikt.' },
				{ q: 'Når er fyrverkeriet i Bergen?', a: 'Det offisielle fyrverkeriet i Bergen skytes opp ved midnatt, akkurat ved årsskiftet. Det varer typisk 10–15 minutter.' }
			],
			en: [
				{ q: "Where are the Bergen New Year's Eve fireworks?", a: "Bergen's official fireworks are launched over the harbour (Vågen) and from Mount Fløyen at midnight. Bryggen, the Fish Market, Nordnes and Fløyen are popular viewing spots." },
				{ q: "What's on in Bergen on New Year's Eve?", a: "Bergen has fireworks at midnight, parties and concerts at venues, a New Year's concert at Grieghallen, and restaurants with special menus. Gåri lists all events." },
				{ q: "Are there family-friendly New Year's events in Bergen?", a: 'Yes, some venues host early celebrations for families with children. The midnight fireworks are free and visible from many spots around the city.' },
				{ q: "What concerts are on New Year's Eve in Bergen?", a: "Grieghallen traditionally holds a New Year's concert. Forum Scene, Ole Bull and local venues have their own programmes. Check Gåri for updated listings." },
				{ q: "What time are the Bergen fireworks?", a: "The official Bergen fireworks are launched at midnight, right at the turn of the year. They typically last 10–15 minutes." }
			]
		},
		filterEvents: filterNyttarsaften
	},
	{
		id: 'vinterferie',
		slug: 'vinterferie',
		seasonal: true,
		title: {
			no: 'Vinterferie i Bergen',
			en: 'Winter Break in Bergen'
		},
		description: {
			no: 'Vinterferieaktiviteter i Bergen: ting å gjøre med barn i uke 9. Konserter, museer, utstillinger og familieaktiviteter.',
			en: 'Winter break activities in Bergen: things to do with kids in week 9. Concerts, museums, exhibitions and family activities.'
		},
		ogSubtitle: {
			no: 'Aktiviteter for hele familien i uke 9',
			en: 'Activities for the whole family in week 9'
		},
		relatedSlugs: ['familiehelg', 'gratis', 'regndagsguide', 'for-ungdom'],
		newsletterHeading: { no: 'Få vinterferietips i innboksen', en: 'Get winter break tips in your inbox' },
		quickAnswer: {
			no: 'Vestland har vinterferie i uke 9. Bergen byr på familieaktiviteter på Akvariet, VilVite og museene, konserter i Grieghallen, verksteder på bibliotekene, og innendørsaktiviteter for regnværsdager. Ski på Voss og Myrkdalen er 1,5 timer unna.',
			en: 'Vestland county has winter break in week 9. Bergen offers family activities at the Aquarium, VilVite science centre and museums, concerts at Grieghallen, workshops at libraries, and indoor activities for rainy days. Skiing at Voss and Myrkdalen is 1.5 hours away.'
		},
		editorial: {
			no: [
				'Vinterferien i Vestland er uke 9, og Bergen har et rikt program for familier. Akvariet, VilVite vitensenteret og Bymuseet arrangerer spesielle vinterferieaktiviteter. Bibliotekene har gratis verksteder og aktiviteter for barn. KODE og Kunsthallen har familieomvisninger.',
				'For de som vil kombinere by og fjell: Voss og Myrkdalen skisenter er bare 1,5 timer fra Bergen med tog eller bil. Bergen har i snitt rundt 6 timer dagslys i februar, men dagene blir merkbart lengre mot slutten av måneden.',
				'Gåri samler alle vinterferieaktiviteter i Bergen — konserter, utstillinger, familieaktiviteter og verksteder. Denne siden oppdateres daglig. Se også regndagsguide-siden for innendørsaktiviteter.'
			],
			en: [
				'Winter break in Vestland county is week 9, and Bergen has a rich programme for families. The Aquarium, VilVite science centre and Bymuseet organise special winter break activities. Libraries offer free workshops and activities for children. KODE and Kunsthallen have family guided tours.',
				'For those wanting to combine city and mountains: Voss and Myrkdalen ski resorts are just 1.5 hours from Bergen by train or car. Bergen has around 6 hours of daylight in February, but days get noticeably longer towards the end of the month.',
				'Gåri collects all winter break activities in Bergen — concerts, exhibitions, family activities and workshops. This page is updated daily. Check the rainy day guide for indoor activities.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er vinterferien i Bergen?', a: 'Vestland fylke har vinterferie i uke 9 (Oslo har uke 8). Gåri oppdaterer denne siden automatisk med riktige datoer hvert år.' },
				{ q: 'Hva kan man gjøre med barn i Bergen i vinterferien?', a: 'Akvariet, VilVite, Bymuseet og bibliotekene har spesielle aktiviteter. KODE har familieomvisninger. Fløibanen og Fløyen har utsikt over vinterbyen.' },
				{ q: 'Er det gratis aktiviteter i Bergen i vinterferien?', a: 'Ja, Bergen Bibliotek har gratis verksteder, flere museer har gratis barnebillett, og Fløyen har gratis uteområder. Sjekk Gåris gratis-side.' },
				{ q: 'Kan man stå på ski nær Bergen?', a: 'Voss og Myrkdalen skisenter er 1,5 timer fra Bergen med tog eller bil. Begge har variert terreng for familier. Folgefonna har sommerski.' },
				{ q: 'Hva er innendørsaktiviteter for barn i Bergen?', a: 'VilVite vitensenter, Akvariet, KODE kunstmuseer, Bergen Bibliotek og BUA utstyrsbibliotek har innendørsaktiviteter. Sjekk Gåris regndagsguide.' }
			],
			en: [
				{ q: 'When is winter break in Bergen?', a: 'Vestland county has winter break in week 9 (Oslo has week 8). Gåri updates this page with the correct dates each year.' },
				{ q: 'What can families do in Bergen during winter break?', a: 'The Aquarium, VilVite science centre, Bymuseet and libraries have special activities. KODE has family guided tours. Fløibanen funicular and Fløyen have views over the winter city.' },
				{ q: 'Are there free winter break activities in Bergen?', a: 'Yes, Bergen Library offers free workshops, several museums have free children\'s admission, and Fløyen has free outdoor areas. Check Gåri\'s free events page.' },
				{ q: 'Can you ski near Bergen?', a: 'Voss and Myrkdalen ski resorts are 1.5 hours from Bergen by train or car. Both have varied terrain for families. Folgefonna has summer skiing.' },
				{ q: 'What indoor activities are there for kids in Bergen?', a: "VilVite science centre, the Aquarium, KODE art museums, Bergen Library and BUA equipment library have indoor activities. Check Gåri's rainy day guide." }
			]
		},
		filterEvents: filterVinterferie
	},
	{
		id: 'hostferie',
		slug: 'hostferie',
		seasonal: true,
		title: {
			no: 'Høstferie i Bergen',
			en: 'Autumn Break in Bergen'
		},
		description: {
			no: 'Høstferieaktiviteter i Bergen: ting å gjøre med barn i uke 41. Konserter, museer, utstillinger og familieaktiviteter.',
			en: 'Autumn break activities in Bergen: things to do with kids in week 41. Concerts, museums, exhibitions and family activities.'
		},
		ogSubtitle: {
			no: 'Aktiviteter for hele familien i uke 41',
			en: 'Activities for the whole family in week 41'
		},
		relatedSlugs: ['familiehelg', 'gratis', 'regndagsguide', 'for-ungdom'],
		newsletterHeading: { no: 'Få høstferietips i innboksen', en: 'Get autumn break tips in your inbox' },
		quickAnswer: {
			no: 'Vestland har høstferie i uke 41. Bergen byr på familieaktiviteter på Akvariet og VilVite, verksteder på bibliotekene, utstillinger på KODE, og ofte BIFF — Bergen Internasjonale Filmfestival. Oktober er regnrikt, men innendørstilbudet er sterkt.',
			en: 'Vestland county has autumn break in week 41. Bergen offers family activities at the Aquarium and VilVite, workshops at libraries, exhibitions at KODE, and often BIFF — Bergen International Film Festival. October is rainy, but indoor options are strong.'
		},
		editorial: {
			no: [
				'Høstferien i Vestland er uke 41, og Bergen har et godt program for familier tross regnværet — oktober er byens våteste måned med rundt 200 mm nedbør. Akvariet, VilVite og Bymuseet har høstferieaktiviteter. BIFF (Bergen Internasjonale Filmfestival) overlapper ofte med høstferien og viser barnefilmer.',
				'For familier som tåler litt regn: Fløyen har turløyper med høstfarger, og Bergen sentrum er kompakt nok til å utforske til fots mellom regnbygene. Torgallmenningen, Bryggen og Fisketorget er klassiske stopp.',
				'Gåri samler alle høstferieaktiviteter i Bergen — konserter, utstillinger, familieaktiviteter og filmvisninger. Denne siden oppdateres daglig. Se også regndagsguide-siden for innendørsaktiviteter.'
			],
			en: [
				'Autumn break in Vestland is week 41, and Bergen has a solid programme for families despite the rain — October is the city\'s wettest month at around 200 mm of rainfall. The Aquarium, VilVite and Bymuseet have autumn break activities. BIFF (Bergen International Film Festival) often overlaps with autumn break and screens children\'s films.',
				"For families who don't mind some rain: Fløyen has hiking trails with autumn colours, and Bergen's city centre is compact enough to explore on foot between showers. Torgallmenningen, Bryggen and the Fish Market are classic stops.",
				"Gåri collects all autumn break activities in Bergen — concerts, exhibitions, family activities and film screenings. This page is updated daily. Check the rainy day guide for indoor activities."
			]
		},
		faq: {
			no: [
				{ q: 'Når er høstferien i Bergen?', a: 'Vestland fylke har høstferie i uke 41. Gåri oppdaterer denne siden automatisk med riktige datoer hvert år.' },
				{ q: 'Hva kan man gjøre med barn i Bergen i høstferien?', a: 'Akvariet, VilVite, KODE og bibliotekene har spesielle aktiviteter. BIFF viser barnefilmer. Fløyen har turløyper med høstfarger.' },
				{ q: 'Hva kan man gjøre i Bergen når det regner?', a: 'VilVite, Akvariet, KODE, Bergen Bibliotek og kinoer er gode innendørsalternativer. Sjekk Gåris regndagsguide for komplett oversikt.' },
				{ q: 'Er det gratis aktiviteter i Bergen i høstferien?', a: 'Ja, Bergen Bibliotek har gratis verksteder, flere museer har gratis barnebillett, og Fløyen har gratis uteområder. BIFF har noen gratis visninger.' },
				{ q: 'Hva er BIFF?', a: 'BIFF (Bergen Internasjonale Filmfestival) er Norges største filmfestival med 120–150 filmer over 9 dager i oktober. Inkluderer barnefilmer og familievisninger.' }
			],
			en: [
				{ q: 'When is autumn break in Bergen?', a: 'Vestland county has autumn break in week 41. Gåri updates this page with the correct dates each year.' },
				{ q: 'What can families do in Bergen during autumn break?', a: "The Aquarium, VilVite, KODE and libraries have special activities. BIFF screens children's films. Fløyen has hiking trails with autumn colours." },
				{ q: 'What to do in Bergen when it rains?', a: "VilVite, the Aquarium, KODE, Bergen Library and cinemas are good indoor options. Check Gåri's rainy day guide for a full list." },
				{ q: 'Are there free autumn break activities in Bergen?', a: "Yes, Bergen Library has free workshops, several museums have free children's admission, and Fløyen has free outdoor areas. BIFF has some free screenings." },
				{ q: 'What is BIFF?', a: "BIFF (Bergen International Film Festival) is Norway's largest film festival with 120–150 films over 9 days in October. Includes children's films and family screenings." }
			]
		},
		filterEvents: filterHostferie
	},

	// ── Seasonal collections (EN counterparts) ─────────────────────────

	{
		id: '17mai-en',
		slug: '17th-of-may-bergen',
		seasonal: true,
		title: {
			no: '17. mai i Bergen',
			en: '17th of May in Bergen'
		},
		description: {
			no: '17. mai-program for Bergen: barnetog, buekorps, konserter og arrangementer.',
			en: "Norway's Constitution Day in Bergen: parades, buekorps brigades, concerts and celebrations. Complete visitor guide."
		},
		ogSubtitle: {
			no: 'Barnetog, buekorps og feiring',
			en: 'Parades, buekorps and celebrations'
		},
		relatedSlugs: ['this-weekend', 'free-things-to-do-bergen', 'familiehelg'],
		newsletterHeading: { no: 'Få 17. mai-programmet i innboksen', en: 'Get the 17th of May guide in your inbox' },
		quickAnswer: {
			no: 'Bergen feirer 17. mai med barnetog, buekorps-marsjer og konserter over hele byen.',
			en: "Bergen celebrates Norway's Constitution Day (17th of May) with children's parades, buekorps marching brigades unique to Bergen, concerts at Torgallmenningen and Festplassen, and citywide celebrations. Over 30 active buekorps march from early morning. Most events are free."
		},
		editorial: {
			no: [
				'17. mai er Norges nasjonaldag og Bergens mest folkerike feiring, med barnetog, buekorps og konserter.',
				'Bergen har rundt 30 aktive buekorps — en tradisjon som finnes ingen andre steder i Norge.',
				'Gåri samler 17. mai-arrangementer fra over 52 lokale kilder. Oppdatert daglig.'
			],
			en: [
				"The 17th of May (syttende mai) is Norway's Constitution Day — the country's biggest national celebration, equivalent to Independence Day. Bergen's celebration is uniquely spectacular thanks to the buekorps tradition: children's marching brigades with drums and banners that exist only in Bergen, dating back to the 1800s.",
				"The day starts early with buekorps marching from around 07:00, followed by the children's parade (barnetog) from Festplassen at 10:00. Norwegians dress in bunads (traditional folk costumes), eat ice cream and hot dogs, and gather at Torgallmenningen for speeches and music. The atmosphere is joyful and welcoming to visitors.",
				"Gåri collects all 17th of May events from over 52 local sources — concerts, family activities and cultural events. Most celebrations are free and open to everyone. This page is updated daily as the programme approaches."
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer 17. mai i Bergen?', a: 'Barnetog, buekorps, konserter og feiringer over hele byen. Gåri viser alt fra 52 kilder.' },
				{ q: 'Hva er buekorps?', a: 'Barnebrigader med trommer og faner — unikt for Bergen siden 1800-tallet. Rundt 30 aktive korps.' },
				{ q: 'Er 17. mai-arrangementer gratis?', a: 'De fleste feiringer er gratis. Noen konserter krever billett.' },
				{ q: 'Når starter barnetoget i Bergen?', a: 'Barnetoget går fra Festplassen klokken 10:00. Buekorps marsjerer fra ca. 07:00.' },
				{ q: 'Hva er bunad?', a: 'Bunad er den tradisjonelle norske folkedrakten. Hvert distrikt har sitt eget design. De fleste kler seg i bunad eller pent 17. mai.' }
			],
			en: [
				{ q: "What happens on 17th of May in Bergen?", a: "Bergen celebrates with children's parades (barnetog), buekorps marching brigades, concerts at Torgallmenningen and family activities. Most events are free and open to visitors." },
				{ q: 'What is buekorps?', a: "Buekorps are children's marching brigades with drums, banners and uniforms — a tradition unique to Bergen since the 1800s. Around 30 active brigades march through the city from early morning." },
				{ q: "What time does the 17th of May parade start?", a: "The children's parade (barnetog) starts at Festplassen around 10:00. Buekorps brigades march from around 07:00. Celebrations continue until evening with concerts and festivities." },
				{ q: 'What is bunad?', a: 'Bunad is the traditional Norwegian folk costume worn on national holidays. Each region has its own design. On 17th of May, most Norwegians dress in bunad or formal attire.' },
				{ q: 'Is 17th of May worth visiting Bergen for?', a: "Absolutely. Bergen's 17th of May celebration is considered one of Norway's best, with the unique buekorps tradition, harbour setting at Bryggen, and a festive atmosphere throughout the compact city centre." }
			]
		},
		filterEvents: filter17Mai
	},
	{
		id: 'julemarked-en',
		slug: 'christmas-bergen',
		seasonal: true,
		title: {
			no: 'Jul i Bergen',
			en: 'Christmas in Bergen'
		},
		description: {
			no: 'Julemarkeder, konserter og juleaktiviteter i Bergen.',
			en: 'Christmas markets, Gingerbread City, concerts and holiday events in Bergen. Complete visitor guide to the Christmas season.'
		},
		ogSubtitle: {
			no: 'Julemarkeder og juleaktiviteter',
			en: 'Christmas markets and holiday events'
		},
		relatedSlugs: ['new-years-eve-bergen', 'free-things-to-do-bergen', 'familiehelg'],
		newsletterHeading: { no: 'Få juleprogrammet i innboksen', en: 'Get the Christmas guide in your inbox' },
		quickAnswer: {
			no: 'Bergen har julemarked på Festplassen, Pepperkakebyen og hundrevis av julekonserter.',
			en: "Bergen hosts 90+ Christmas market stalls at Festplassen (free entry, late November to December 22), the world's largest Gingerbread City (Pepperkakebyen) at Sentralbadet, the Light Festival (Lysfest) with fireworks, and hundreds of concerts and events throughout the season."
		},
		editorial: {
			no: [
				'Bergen er en av Norges vakreste julebyer med julemarked på Festplassen, Pepperkakebyen og stemningsfulle konserter.',
				'Lysfesten markerer starten på julesesongen med fyrverkeri over Lille Lungegårdsvann.',
				'Gåri samler alle juleaktiviteter fra over 52 lokale kilder. Oppdatert daglig.'
			],
			en: [
				"Bergen is one of Scandinavia's most atmospheric Christmas destinations. The main Christmas market at Festplassen features 90+ stalls with Norwegian handicrafts, local food and gløgg (mulled wine), plus a Ferris wheel — all with free entry. The Gingerbread City (Pepperkakebyen) at Sentralbadet is the world's largest, built by local schools and kindergartens.",
				"The season opens with Lysfesten (Light Festival) in mid-November — Bergen's beloved tradition for over 30 years, featuring the official Christmas tree lighting, live music and fireworks over Lille Lungegårdsvann. Grieghallen, Bergen Cathedral and churches throughout the city host Christmas concerts from late November through December.",
				"Bergen's compact city centre makes it easy to visit the Christmas market, Bryggen's historic wharf, and the Gingerbread City in one day. Gåri collects all Christmas events from over 52 local sources — updated daily throughout the season."
			]
		},
		faq: {
			no: [
				{ q: 'Når åpner julemarkedet i Bergen?', a: 'Julemarkedet på Festplassen åpner vanligvis rundt 20. november og varer til 22. desember.' },
				{ q: 'Er julemarkedet gratis?', a: 'Ja, inngang til julemarkedet er gratis. Pepperkakebyen har en liten inngangspris.' },
				{ q: 'Hva er Pepperkakebyen?', a: 'Verdens største pepperkakeby, bygget av skoler og barnehager i Bergen. Utstilt på Sentralbadet fra november til januar.' },
				{ q: 'Hvilke julekonserter er det i Bergen?', a: 'Grieghallen, Domkirken, Korskirken og kirker i hele byen har konserter fra november. Alt fra klassisk til gospel og barnekonserter.' },
				{ q: 'Hva er Lysfesten i Bergen?', a: 'Lysfesten markerer julestart med tenning av juletreet, musikk og fyrverkeri over Lille Lungegårdsvann. Tradisjon i over 30 år.' }
			],
			en: [
				{ q: 'When does the Bergen Christmas market open?', a: 'Bergen Christmas Market at Festplassen opens around November 20 and runs until December 22. Hours: weekdays 12–21, weekends 10–21. Free entry.' },
				{ q: 'What is the Gingerbread City (Pepperkakebyen)?', a: "The world's largest gingerbread city, at Sentralbadet in Bergen centre. Built annually by local schools and kindergartens with hundreds of gingerbread houses. Open mid-November to early January." },
				{ q: 'Is the Bergen Christmas market worth visiting?', a: "Yes — Bergen's Christmas market at Festplassen has 90+ stalls with Norwegian handicrafts and food, a Ferris wheel, and free entry. Combined with the Gingerbread City and Bryggen's atmosphere, it's one of Scandinavia's best." },
				{ q: 'What Christmas concerts are in Bergen?', a: 'Grieghallen, Bergen Cathedral, Korskirken and churches across the city host concerts from late November. Genres range from classical to gospel, folk and children\'s concerts.' },
				{ q: 'How is the weather in Bergen at Christmas?', a: "Bergen in December averages 3–6°C with frequent rain (about 200 mm). Snow is uncommon in the city centre but possible. Dress in layers with waterproof outerwear. The Christmas market and Gingerbread City are covered." }
			]
		},
		filterEvents: filterJulemarked
	},
	{
		id: 'paske-en',
		slug: 'easter-bergen',
		seasonal: true,
		title: {
			no: 'Påske i Bergen',
			en: 'Easter in Bergen'
		},
		description: {
			no: 'Påskeaktiviteter i Bergen: konserter, utstillinger og familieaktiviteter.',
			en: 'Easter events in Bergen: concerts, exhibitions, family activities and things to do during Holy Week. Visitor guide.'
		},
		ogSubtitle: {
			no: 'Konserter og påskeaktiviteter',
			en: 'Concerts, activities and Easter holiday'
		},
		relatedSlugs: ['familiehelg', 'free-things-to-do-bergen', 'regndagsguide'],
		newsletterHeading: { no: 'Få påskeprogrammet i innboksen', en: 'Get the Easter guide in your inbox' },
		quickAnswer: {
			no: 'Bergen har konserter, utstillinger og familieaktiviteter gjennom hele påskeuka.',
			en: "While many Norwegians head to mountain cabins for skiing, Bergen offers an excellent Easter alternative: concerts at Grieghallen and churches, exhibitions at KODE and Kunsthallen, family activities at museums, and April's dry weather (only 73 mm average rainfall — one of Bergen's driest months)."
		},
		editorial: {
			no: [
				'Påsken i Bergen er en av byens roligste perioder med et rikt kulturprogram.',
				'April er en av Bergens tørreste måneder med bare 73 mm nedbør.',
				'Gåri samler alle påskearrangementer fra palmesøndag til andre påskedag.'
			],
			en: [
				"Easter (påske) in Norway runs from Palm Sunday through Easter Monday, with Maundy Thursday, Good Friday, Easter Sunday and Easter Monday as public holidays. While most Norwegians head to mountain cabins for skiing and påskekrim (crime novels — a unique Norwegian Easter tradition), Bergen offers a rich cultural programme.",
				"Grieghallen, Den Nationale Scene and Bergen's churches hold special Easter concerts and performances. KODE and Kunsthallen have exhibitions, while the Aquarium, Fløyen and Bymuseet organise family activities. April is actually one of Bergen's driest months (73 mm average), making it pleasant for exploring.",
				"Gåri collects all Easter events from Palm Sunday to Easter Monday — concerts, exhibitions, family activities and church services. Easter dates vary each year; this page updates automatically. Note that most shops are closed on Good Friday and Easter Sunday."
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen i påsken?', a: 'Konserter, utstillinger, familieaktiviteter og gudstjenester. Gåri samler alt fra over 52 kilder.' },
				{ q: 'Når er påsken?', a: 'Påsken varierer hvert år. Gåri oppdaterer datoene automatisk basert på påskeberegning.' },
				{ q: 'Hva har åpent i påsken?', a: 'Langfredag og påskedag er de fleste butikker stengt. Museer, restauranter og kultursteder holder ofte åpent.' },
				{ q: 'Hva er påskekrim?', a: 'Påskekrim er en norsk tradisjon der folk leser krimromaner i påsken. Forlag gir ut spesialutgaver, og TV sender krimserier.' },
				{ q: 'Hvordan er været i Bergen i påsken?', a: 'Bergen i april har 5–10°C og bare ca. 73 mm nedbør — en av byens tørreste måneder.' }
			],
			en: [
				{ q: 'Is Bergen good to visit at Easter?', a: "Yes — Bergen offers concerts, exhibitions and family activities. April is one of the driest months (73 mm average), and the city is less crowded than summer. Easter dates change yearly; Gåri updates automatically." },
				{ q: "What's open in Bergen during Easter?", a: 'Most shops are closed on Good Friday and Easter Sunday. Restaurants, museums and cultural venues typically remain open with reduced hours. The Fish Market and tourist attractions stay open.' },
				{ q: 'What is påskekrim?', a: "Påskekrim (Easter crime) is a uniquely Norwegian tradition of reading crime novels during Easter. Publishers release special editions, TV channels air crime series, and even milk cartons feature detective stories." },
				{ q: 'Are there family activities in Bergen at Easter?', a: "Yes — the Aquarium, VilVite science centre, Fløyen and Bymuseet organise Easter activities. Many museums offer free entry for children under 16." },
				{ q: 'What is the weather like in Bergen at Easter?', a: "Bergen in April averages 5–10°C with only about 73 mm rainfall — surprisingly one of the city's driest months. Pack layers and waterproofs, but expect more sunshine than Bergen's reputation suggests." }
			]
		},
		filterEvents: filterPaske
	},
	{
		id: 'sankthans-en',
		slug: 'midsummer-bergen',
		seasonal: true,
		title: {
			no: 'Sankthans i Bergen',
			en: 'Midsummer in Bergen'
		},
		description: {
			no: 'Sankthans i Bergen: bål, fester og midsommeraktiviteter.',
			en: 'Midsummer Eve in Bergen: bonfires, celebrations and nearly 19 hours of daylight. Complete visitor guide to sankthans.'
		},
		ogSubtitle: {
			no: 'Bål og lyse netter',
			en: 'Bonfires and bright nights'
		},
		relatedSlugs: ['this-weekend', 'free-things-to-do-bergen', 'konserter'],
		newsletterHeading: { no: 'Finn sankthansbålene', en: 'Find the midsummer bonfires in Bergen' },
		quickAnswer: {
			no: 'Bergen feirer sankthans med bål langs kysten og konserter under nesten 19 timer dagslys.',
			en: "Midsummer Eve (sankthansaften, June 23) is one of Norway's most beloved traditions. Bergen lights massive bonfires along the coast and harbour islands under nearly 19 hours of daylight. The sky never fully darkens. Free public bonfires, concerts and outdoor celebrations across the city."
		},
		editorial: {
			no: [
				'Sankthansaften 23. juni er en av Bergens mest stemningsfulle feiringer med bål langs kysten.',
				'Bergen har rundt 19 timer dagslys ved sommersolverv.',
				'Gåri samler alle sankthansarrangementer fra 21. til 24. juni.'
			],
			en: [
				"Sankthans (also called jonsok or St. John's Eve) on June 23 is one of Norway's oldest celebrations, with roots in Norse traditions marking the summer solstice. In Bergen, massive bonfires are lit along the coast, on harbour islands and in parks — the most famous at Nordnes, Sandviken and the islands of Askøy and Holsnøy.",
				"At the solstice, Bergen has 19 hours and 8 minutes of daylight, and the sky never fully darkens — creating magical 'white nights'. Locals gather for barbecues, music and socialising under the near-endless light. Venues and restaurants host outdoor parties and concerts. The atmosphere is relaxed and welcoming.",
				"Gåri collects all midsummer events from June 21–24 — bonfires, concerts, parties and outdoor activities. Most celebrations are free and open to everyone. This page updates daily as the programme approaches."
			]
		},
		faq: {
			no: [
				{ q: 'Hvor er sankthansbålene i Bergen?', a: 'Nordnes, Sandviken og øyene rundt Bergen er mest kjent. Gåri samler alle offisielle arrangementer.' },
				{ q: 'Når er sankthans?', a: 'Sankthansaften er 23. juni hvert år. Feiringen starter vanligvis 21. juni ved sommersolverv.' },
				{ q: 'Er sankthansarrangementer gratis?', a: 'De fleste bål og feiringer er gratis og åpne for alle.' },
				{ q: 'Går solen ned i Bergen på sankthans?', a: 'Nesten ikke. Bergen har 19 timer og 8 minutter dagslys ved solverv, og himmelen blir aldri helt mørk.' },
				{ q: 'Når tennes sankthansbålene?', a: 'Bålene tennes vanligvis mellom 21:00 og 22:00. Feiringen starter med grilling og sosialt samvær på ettermiddagen.' }
			],
			en: [
				{ q: 'What is sankthans / midsummer?', a: "Sankthans (St. John's Eve, June 23) celebrates the summer solstice with bonfires along the coast. The tradition dates back to Norse times. In Bergen, it's a major social celebration with free public bonfires." },
				{ q: 'Where are the best midsummer bonfires in Bergen?', a: "The most famous bonfires are at Nordnes, Sandviken and the harbour islands. The municipality organises free public bonfires at several locations. Gåri lists all official events." },
				{ q: 'Does the sun set in Bergen at midsummer?', a: "Technically yes, but barely. Bergen has 19 hours and 8 minutes of daylight at the solstice, and the sky never fully darkens — it remains in civil twilight, creating luminous 'white nights'." },
				{ q: 'Is midsummer in Bergen worth visiting for?', a: "Yes — the combination of coastal bonfires, white nights, and Bergen's harbour setting makes it one of Norway's most atmospheric midsummer celebrations. Most events are free." },
				{ q: 'What time are the midsummer bonfires lit?', a: 'Bonfires are typically lit between 21:00 and 22:00, though celebrations start in the afternoon with barbecues and socialising. The light means celebrations naturally extend late into the evening.' }
			]
		},
		filterEvents: filterSankthans
	},
	{
		id: 'nyttarsaften-en',
		slug: 'new-years-eve-bergen',
		seasonal: true,
		title: {
			no: 'Nyttårsaften i Bergen',
			en: "New Year's Eve in Bergen"
		},
		description: {
			no: 'Nyttårsaften i Bergen: fyrverkeri, fester og arrangementer.',
			en: "New Year's Eve in Bergen: harbour fireworks, concerts, parties and events. Complete guide to celebrating NYE in Bergen."
		},
		ogSubtitle: {
			no: 'Fyrverkeri og nyttårsfeiring',
			en: 'Fireworks, parties and celebrations'
		},
		relatedSlugs: ['christmas-bergen', 'konserter', 'voksen'],
		newsletterHeading: { no: 'Planlegg nyttårsfeiringen', en: "Plan your New Year's Eve in Bergen" },
		quickAnswer: {
			no: 'Bergen feirer nyttår med fyrverkeri over Vågen og konserter på spillesteder i sentrum.',
			en: "Bergen celebrates New Year's Eve with spectacular fireworks over the harbour (Vågen) and from Mount Fløyen at midnight, visible from Bryggen and across the city. Grieghallen hosts a traditional concert, and venues throughout the city centre offer parties and events."
		},
		editorial: {
			no: [
				'Bergen feirer nyttårsaften med fyrverkeri over Vågen og fra Fløyfjellet.',
				'Grieghallen holder tradisjonelt nyttårskonsert, og spillesteder har egne program.',
				'Gåri samler alle nyttårsarrangementer fra 29. desember til 1. januar.'
			],
			en: [
				"Bergen's New Year's Eve centres on the spectacular fireworks over the harbour (Vågen) and from Mount Fløyen at midnight. The historic Bryggen wharf and the Fish Market area are prime viewing spots, with the fireworks reflecting off the water. Fløyen offers panoramic views for those who take the funicular up.",
				"Grieghallen hosts a traditional New Year's concert, while Forum Scene, Ole Bull and venues across the city centre offer parties and live music. Many restaurants create special New Year's menus — booking well in advance is strongly recommended.",
				"Gåri collects all New Year's events from December 29 to January 1. Bergen's compact centre makes it easy to walk between venues. This page updates daily throughout December."
			]
		},
		faq: {
			no: [
				{ q: 'Hvor er fyrverkeriet i Bergen?', a: 'Over Vågen og fra Fløyfjellet ved midnatt. Bryggen og Torget er populære utsiktspunkter.' },
				{ q: 'Hva skjer nyttårsaften i Bergen?', a: 'Fyrverkeri, konserter, fester og restauranter med nyttårsmenyer i hele sentrum.' },
				{ q: 'Når er fyrverkeriet?', a: 'Ved midnatt, akkurat ved årsskiftet. Varer ca. 10–15 minutter.' },
				{ q: 'Trenger jeg billetter til nyttårsarrangementer?', a: 'Fyrverkeriet er gratis. Konserter og fester krever billett — bestill tidlig da populære arrangementer blir utsolgt.' },
				{ q: 'Hvordan er været i Bergen på nyttårsaften?', a: 'Forvent 1–5°C med gode sjanser for regn. Kle deg varmt og vanntett for utendørs fyrverkeri.' }
			],
			en: [
				{ q: "Where are the New Year's Eve fireworks in Bergen?", a: "The main fireworks are launched over the harbour (Vågen) and from Mount Fløyen at midnight. Bryggen, the Fish Market, Nordnes and Fløyen mountain are popular viewing spots." },
				{ q: "What time are the Bergen fireworks?", a: "The official fireworks start at midnight and last 10–15 minutes. The harbour location means reflections on the water double the visual impact." },
				{ q: "Is Bergen good for New Year's Eve?", a: "Yes — Bergen's compact centre, harbour fireworks, and lively venue scene make it an excellent NYE destination. The Bryggen setting is particularly atmospheric." },
				{ q: "What's the weather in Bergen on New Year's Eve?", a: "Expect 1–5°C with a good chance of rain. Dress warmly and waterproof for outdoor viewing. Snow is uncommon but possible." },
				{ q: "Do I need tickets for New Year's events in Bergen?", a: "The fireworks are free and public. Concerts and parties at venues require tickets — book early as popular events sell out. Restaurant New Year's menus should be booked well in advance." }
			]
		},
		filterEvents: filterNyttarsaften
	},
	{
		id: 'vinterferie-en',
		slug: 'winter-break-bergen',
		seasonal: true,
		title: {
			no: 'Vinterferie i Bergen',
			en: 'Winter Break in Bergen'
		},
		description: {
			no: 'Vinterferieaktiviteter i Bergen: ting å gjøre med barn i uke 9.',
			en: 'Winter break activities in Bergen: family events, museums, indoor fun and skiing nearby. Things to do with kids in week 9.'
		},
		ogSubtitle: {
			no: 'Familieaktiviteter i uke 9',
			en: 'Family activities in week 9'
		},
		relatedSlugs: ['familiehelg', 'free-things-to-do-bergen', 'regndagsguide'],
		newsletterHeading: { no: 'Få vinterferietips', en: 'Get winter break tips in your inbox' },
		quickAnswer: {
			no: 'Bergen har familieaktiviteter på Akvariet, VilVite og museene i uke 9.',
			en: "Vestland county's winter break falls in week 9 (late February). Bergen offers family activities at the Aquarium, VilVite science centre and museums, free workshops at libraries, and easy access to skiing at Voss and Myrkdalen (1.5 hours away)."
		},
		editorial: {
			no: [
				'Bergen har et rikt program for familier i vinterferien med aktiviteter på Akvariet, VilVite og museene.',
				'Voss og Myrkdalen skisenter er 1,5 timer fra Bergen.',
				'Gåri samler alle vinterferieaktiviteter i Bergen i uke 9.'
			],
			en: [
				"Norwegian schools have winter break (vinterferie) in late February — Vestland county uses week 9 (Oslo and eastern Norway use week 8). Bergen offers a wide range of family activities during this period, even if the weather is cold and dark.",
				"Top family attractions include the Aquarium (Akvariet), VilVite science centre, KODE art museums with family tours, and Bergen Library's free workshops. For skiing, Voss and Myrkdalen are 1.5 hours from Bergen by train or car, with terrain suited to all levels.",
				"Gåri collects all winter break events and activities in Bergen — updated daily throughout the week. Check the rainy day guide for indoor options, which are particularly useful in February."
			]
		},
		faq: {
			no: [
				{ q: 'Når er vinterferien i Bergen?', a: 'Vestland har vinterferie i uke 9 (slutten av februar). Oslo og Østlandet har uke 8.' },
				{ q: 'Hva kan man gjøre i Bergen i vinterferien?', a: 'Akvariet, VilVite, KODE, Bymuseet og bibliotekene har spesialopplegg for barn.' },
				{ q: 'Kan man stå på ski nær Bergen?', a: 'Voss Resort og Myrkdalen er 1,5 timer unna med tog eller bil. Utstyrsleie på stedet.' },
				{ q: 'Er det gratis aktiviteter for barn i Bergen?', a: 'Bergen bibliotek har gratis verksteder, flere museer har gratis inngang for barn under 16, og Fløyen har gratisområder hele året.' },
				{ q: 'Hvordan er Bergen i februar?', a: 'Ca. 6 timer dagslys og hyppig regn, men museer, konserter og innendørsaktiviteter gjør det givende. Dagene blir merkbart lengre utover måneden.' }
			],
			en: [
				{ q: 'When is winter break in Bergen?', a: "Vestland county's winter break is week 9 (late February). This differs from Oslo (week 8). Gåri updates dates automatically each year." },
				{ q: 'What can families do in Bergen during winter break?', a: 'The Aquarium, VilVite science centre, KODE art museums, Bymuseet and libraries have special activities. Fløibanen funicular runs year-round for mountain views.' },
				{ q: 'Can you ski near Bergen?', a: 'Yes — Voss Resort and Myrkdalen are 1.5 hours from Bergen by train or car. Both have varied terrain for families and beginners. Equipment rental available on site.' },
				{ q: 'Is Bergen worth visiting in February?', a: "Bergen has about 6 hours of daylight in February and frequent rain. However, museums, concerts and indoor attractions make it rewarding. Days get noticeably longer throughout the month." },
				{ q: 'Are there free activities for kids in Bergen?', a: "Bergen Library offers free workshops, several museums have free children's admission (under 16), and Fløyen has free outdoor areas year-round." }
			]
		},
		filterEvents: filterVinterferie
	},
	// ── Festival collections (Fase 2) ──────────────────────────────
	{
		id: 'festspillene',
		slug: 'festspillene',
		seasonal: true,
		title: {
			no: 'Festspillene i Bergen',
			en: 'Bergen International Festival'
		},
		description: {
			no: 'Komplett program for Festspillene i Bergen — konserter, teater, dans og kunst. Oppdatert daglig.',
			en: 'Complete Bergen International Festival programme — concerts, theatre, dance and art. Updated daily.'
		},
		ogSubtitle: {
			no: 'Norges eldste og største kulturfestival',
			en: "Norway's oldest and largest cultural festival"
		},
		relatedSlugs: ['konserter', 'nattjazz', 'bergenfest'],
		footerLabel: { no: 'Festspillene', en: 'Festspillene' },
		footer: { langs: ['no'], order: 12 },
		newsletterHeading: { no: 'Festspillene i Bergen — komplett program', en: 'Bergen International Festival — full programme' },
		quickAnswer: {
			no: 'Festspillene i Bergen (Bergen International Festival) er Norges eldste og største kulturfestival, grunnlagt i 1953. Festivalen varer i to uker fra slutten av mai til begynnelsen av juni, med over 200 arrangementer innen musikk, teater, dans, opera og visuell kunst.',
			en: 'The Bergen International Festival (Festspillene i Bergen) is Norway\'s oldest and largest cultural festival, founded in 1953. It runs for two weeks from late May to early June, with over 200 events spanning music, theatre, dance, opera and visual art across iconic venues like Grieghallen, Håkonshallen and outdoor stages.'
		},
		editorial: {
			no: [
				'Festspillene i Bergen er Nordens største tverrkunstneriske festival, med et program som spenner fra klassisk musikk og opera til samtidskunst og performance.',
				'Festivalen bruker Bergens mest ikoniske arenaer — Grieghallen, Håkonshallen, Lysøen og kirker — og skaper en unik atmosfære der historiske rom møter nyskapende kunst.',
				'Gåri oppdaterer Festspillene-programmet daglig med billettstatus og praktisk informasjon.'
			],
			en: [
				'The Bergen International Festival is the Nordic region\'s largest multi-arts festival, with a programme spanning classical music and opera to contemporary art and performance.',
				'The festival uses Bergen\'s most iconic venues — Grieghallen concert hall, the medieval Håkonshallen, Edvard Grieg\'s Lysøen, and historic churches — creating a unique atmosphere where heritage spaces meet contemporary art.',
				'Gåri updates the festival programme daily with ticket availability and practical information.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Festspillene i Bergen?', a: 'Festspillene arrangeres i to uker fra slutten av mai til begynnelsen av juni hvert år. Nøyaktige datoer varierer — sjekk programmet her for oppdatert informasjon.' },
				{ q: 'Hvor holdes Festspillene?', a: 'Hovedarenaene er Grieghallen, Håkonshallen, Den Nationale Scene og diverse kirker og utendørsscener i Bergen sentrum.' },
				{ q: 'Finnes det gratis arrangementer under Festspillene?', a: 'Ja — utendørskonserter, utstillingsåpninger og enkelte forestillinger er gratis. Griegkonsertene på Troldhaugen krever billett, men Lysøen har fri inngang til turstier.' },
				{ q: 'Hvordan kjøper jeg billetter til Festspillene?', a: 'Billetter selges via festspillene.no og i Grieghallens billettkontor. Populære forestillinger selges raskt ut — bestill tidlig.' },
				{ q: 'Passer Festspillene for barn?', a: 'Festivalen har eget barneprogram med teater, musikk og workshoper tilpasset ulike aldersgrupper.' }
			],
			en: [
				{ q: 'When is the Bergen International Festival?', a: 'The festival runs for two weeks from late May to early June each year. Exact dates vary — check this page for the updated programme.' },
				{ q: 'Where does the Bergen International Festival take place?', a: 'Main venues include Grieghallen concert hall, the medieval Håkonshallen, Den Nationale Scene theatre, and various churches and outdoor stages across Bergen.' },
				{ q: 'Are there free events at the Bergen International Festival?', a: 'Yes — outdoor concerts, exhibition openings and selected performances are free. The Grieg concerts at Troldhaugen require tickets, but Lysøen island has free trail access.' },
				{ q: 'How do I buy tickets for the Bergen International Festival?', a: 'Tickets are sold through festspillene.no and at the Grieghallen box office. Popular performances sell out quickly — book early.' },
				{ q: 'Is the Bergen International Festival suitable for children?', a: 'The festival has a dedicated children\'s programme with theatre, music and workshops for different age groups.' }
			]
		},
		filterEvents: (events) => filterFestspillene(events)
	},
	{
		id: 'festspillene-en',
		slug: 'bergen-international-festival',
		seasonal: true,
		title: {
			no: 'Festspillene i Bergen',
			en: 'Bergen International Festival'
		},
		description: {
			no: 'Komplett program for Festspillene i Bergen — konserter, teater, dans og kunst.',
			en: 'Complete Bergen International Festival programme — concerts, theatre, dance and art. Updated daily.'
		},
		ogSubtitle: {
			no: 'Norges eldste og største kulturfestival',
			en: "Norway's oldest and largest cultural festival"
		},
		relatedSlugs: ['konserter', 'nattjazz-bergen', 'bergenfest-bergen'],
		footerLabel: { no: 'Festspillene', en: 'Bergen Int\'l Festival' },
		footer: { langs: ['en'], order: 12 },
		newsletterHeading: { no: 'Festspillene i Bergen — komplett program', en: 'Bergen International Festival — full programme' },
		quickAnswer: {
			no: 'Festspillene i Bergen er Norges eldste og største kulturfestival, grunnlagt i 1953. Festivalen varer i to uker fra slutten av mai til begynnelsen av juni.',
			en: 'The Bergen International Festival (Festspillene i Bergen) is Norway\'s oldest and largest cultural festival, founded in 1953. It runs for two weeks from late May to early June, with over 200 events spanning music, theatre, dance, opera and visual art across iconic venues like Grieghallen, Håkonshallen and outdoor stages.'
		},
		editorial: {
			no: [
				'Festspillene i Bergen er Nordens største tverrkunstneriske festival, med et program som spenner fra klassisk musikk og opera til samtidskunst og performance.',
				'Festivalen bruker Bergens mest ikoniske arenaer — Grieghallen, Håkonshallen, Lysøen og kirker — og skaper en unik atmosfære der historiske rom møter nyskapende kunst.',
				'Gåri oppdaterer Festspillene-programmet daglig med billettstatus og praktisk informasjon.'
			],
			en: [
				'The Bergen International Festival is the Nordic region\'s largest multi-arts festival, with a programme spanning classical music and opera to contemporary art and performance.',
				'The festival uses Bergen\'s most iconic venues — Grieghallen concert hall, the medieval Håkonshallen, Edvard Grieg\'s Lysøen, and historic churches — creating a unique atmosphere where heritage spaces meet contemporary art.',
				'Gåri updates the festival programme daily with ticket availability and practical information.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Festspillene i Bergen?', a: 'Festspillene arrangeres i to uker fra slutten av mai til begynnelsen av juni hvert år.' },
				{ q: 'Hvor holdes Festspillene?', a: 'Grieghallen, Håkonshallen, Den Nationale Scene og diverse kirker og utendørsscener i Bergen sentrum.' },
				{ q: 'Finnes det gratis arrangementer under Festspillene?', a: 'Ja — utendørskonserter, utstillingsåpninger og enkelte forestillinger er gratis.' },
				{ q: 'Hvordan kjøper jeg billetter til Festspillene?', a: 'Via festspillene.no og Grieghallens billettkontor. Populære forestillinger selges raskt ut.' },
				{ q: 'Passer Festspillene for barn?', a: 'Festivalen har eget barneprogram med teater, musikk og workshoper tilpasset ulike aldersgrupper.' }
			],
			en: [
				{ q: 'When is the Bergen International Festival?', a: 'The festival runs for two weeks from late May to early June each year. Exact dates vary — check this page for the updated programme.' },
				{ q: 'Where does the Bergen International Festival take place?', a: 'Main venues include Grieghallen concert hall, the medieval Håkonshallen, Den Nationale Scene theatre, and various churches and outdoor stages across Bergen.' },
				{ q: 'Are there free events at the Bergen International Festival?', a: 'Yes — outdoor concerts, exhibition openings and selected performances are free.' },
				{ q: 'How do I buy tickets for the Bergen International Festival?', a: 'Tickets are sold through festspillene.no and at the Grieghallen box office. Popular performances sell out quickly — book early.' },
				{ q: 'Is the Bergen International Festival suitable for children?', a: 'The festival has a dedicated children\'s programme with theatre, music and workshops for different age groups.' }
			]
		},
		filterEvents: (events) => filterFestspillene(events)
	},
	{
		id: 'bergenfest',
		slug: 'bergenfest',
		seasonal: true,
		maxPerVenue: 50,
		title: {
			no: 'Bergenfest',
			en: 'Bergenfest'
		},
		description: {
			no: 'Bergenfest-programmet — artister, billetter og praktisk info. Bergenhus Festning, Bergen.',
			en: 'Bergenfest lineup — artists, tickets and practical info. Bergenhus Fortress, Bergen, Norway.'
		},
		ogSubtitle: {
			no: 'Musikk på Bergenhus Festning',
			en: 'Music at Bergenhus Fortress'
		},
		relatedSlugs: ['konserter', 'festspillene', 'beyond-the-gates'],
		footerLabel: { no: 'Bergenfest', en: 'Bergenfest' },
		footer: { langs: ['no'], order: 13 },
		newsletterHeading: { no: 'Bergenfest — årets artister', en: 'Bergenfest — this year\'s lineup' },
		quickAnswer: {
			no: 'Bergenfest er en årlig musikkfestival på Bergenhus Festning i Bergen sentrum, med norske og internasjonale artister i fire dager i juni. Festivalen kombinerer pop, rock, elektronika og hip-hop i historiske omgivelser med utsikt over Vågen.',
			en: 'Bergenfest is an annual music festival at Bergenhus Fortress in central Bergen, featuring Norwegian and international artists over four days in June. The festival combines pop, rock, electronic and hip-hop music in a historic setting overlooking the harbour (Vågen).'
		},
		editorial: {
			no: [
				'Bergenfest arrangeres på Koengen ved Bergenhus Festning — en av Norges mest ikoniske festivallokasjoner med utsikt over Vågen og Bryggen.',
				'Festivalen byr på et bredt musikkprogram over fire dager i juni, med et mix av internasjonale headlinere og norske favoritter.',
				'Gåri viser det komplette Bergenfest-programmet med billettinformasjon, oppdatert daglig.'
			],
			en: [
				'Bergenfest takes place at Koengen, outside the medieval Bergenhus Fortress — one of Norway\'s most iconic festival locations, with views over the harbour (Vågen) and the historic Bryggen wharf.',
				'The festival offers a broad music programme over four days in June, mixing international headliners with Norwegian favourites across pop, rock, electronic and hip-hop.',
				'Gåri shows the complete Bergenfest programme with ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Bergenfest?', a: 'Bergenfest arrangeres over fire dager i midten av juni hvert år. Nøyaktige datoer varierer.' },
				{ q: 'Hvor holdes Bergenfest?', a: 'Koengen ved Bergenhus Festning i Bergen sentrum. Nær Bryggen og lett tilgjengelig med buss og bybane.' },
				{ q: 'Hvordan kjøper jeg billetter til Bergenfest?', a: 'Billetter selges via bergenfest.no. Du kan kjøpe dagspass eller festivalpass for alle fire dager.' },
				{ q: 'Er det aldersgrense på Bergenfest?', a: 'Festivalen er åpen for alle aldre, men det kan være 18-årsgrense på visse soner etter kl. 23.' },
				{ q: 'Hva er været i Bergen i juni?', a: 'Bergen i juni har lange, lyse dager (solnedgang ca. kl. 23) og temperaturer rundt 15-20°C. Ta med regnjakke — Bergen er Bergen.' }
			],
			en: [
				{ q: 'When is Bergenfest?', a: 'Bergenfest takes place over four days in mid-June each year. Exact dates vary — check this page for the updated lineup.' },
				{ q: 'Where is Bergenfest held?', a: 'At Koengen, outside Bergenhus Fortress in central Bergen. Near Bryggen and easily accessible by bus and light rail.' },
				{ q: 'How do I buy Bergenfest tickets?', a: 'Tickets are sold through bergenfest.no. You can buy single-day passes or full festival passes for all four days.' },
				{ q: 'Is there an age limit at Bergenfest?', a: 'The festival is open to all ages, but certain zones may have 18+ restrictions after 23:00.' },
				{ q: 'What is the weather like in Bergen in June?', a: 'Bergen in June has long, bright days (sunset around 23:00) and temperatures around 15-20°C. Bring a rain jacket — Bergen is Bergen.' }
			]
		},
		filterEvents: (events) => filterBergenfest(events)
	},
	{
		id: 'bergenfest-en',
		slug: 'bergenfest-bergen',
		seasonal: true,
		maxPerVenue: 50,
		title: {
			no: 'Bergenfest',
			en: 'Bergenfest Bergen'
		},
		description: {
			no: 'Bergenfest-programmet — artister, billetter og praktisk info.',
			en: 'Bergenfest lineup and schedule — artists, tickets and practical info. Bergenhus Fortress, Bergen.'
		},
		ogSubtitle: {
			no: 'Musikk på Bergenhus Festning',
			en: 'Music at Bergenhus Fortress'
		},
		relatedSlugs: ['konserter', 'bergen-international-festival', 'beyond-the-gates-bergen'],
		footerLabel: { no: 'Bergenfest', en: 'Bergenfest' },
		footer: { langs: ['en'], order: 13 },
		newsletterHeading: { no: 'Bergenfest — årets artister', en: 'Bergenfest — this year\'s lineup' },
		quickAnswer: {
			no: 'Bergenfest er en årlig musikkfestival på Bergenhus Festning i Bergen sentrum.',
			en: 'Bergenfest is an annual music festival at Bergenhus Fortress in central Bergen, featuring Norwegian and international artists over four days in June. The festival combines pop, rock, electronic and hip-hop music in a historic setting overlooking the harbour (Vågen).'
		},
		editorial: {
			no: [
				'Bergenfest arrangeres på Koengen ved Bergenhus Festning — en av Norges mest ikoniske festivallokasjoner.',
				'Festivalen byr på et bredt musikkprogram over fire dager i juni.',
				'Gåri viser det komplette Bergenfest-programmet med billettinformasjon.'
			],
			en: [
				'Bergenfest takes place at Koengen, outside the medieval Bergenhus Fortress — one of Norway\'s most iconic festival locations, with views over the harbour (Vågen) and the historic Bryggen wharf.',
				'The festival offers a broad music programme over four days in June, mixing international headliners with Norwegian favourites across pop, rock, electronic and hip-hop.',
				'Gåri shows the complete Bergenfest programme with ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Bergenfest?', a: 'Bergenfest arrangeres over fire dager i midten av juni hvert år.' },
				{ q: 'Hvor holdes Bergenfest?', a: 'Koengen ved Bergenhus Festning i Bergen sentrum.' },
				{ q: 'Hvordan kjøper jeg billetter til Bergenfest?', a: 'Via bergenfest.no. Dagspass eller festivalpass for alle dager.' },
				{ q: 'Er det aldersgrense på Bergenfest?', a: 'Åpen for alle aldre, men 18-årsgrense på visse soner etter kl. 23.' },
				{ q: 'Hva er været i Bergen i juni?', a: 'Lange dager (solnedgang ca. kl. 23), 15-20°C. Ta med regnjakke.' }
			],
			en: [
				{ q: 'When is Bergenfest?', a: 'Bergenfest takes place over four days in mid-June each year. Exact dates vary — check this page for the updated lineup.' },
				{ q: 'Where is Bergenfest held?', a: 'At Koengen, outside Bergenhus Fortress in central Bergen. Near Bryggen and easily accessible by bus and light rail.' },
				{ q: 'How do I buy Bergenfest tickets?', a: 'Tickets are sold through bergenfest.no. You can buy single-day passes or full festival passes for all four days.' },
				{ q: 'Is there an age limit at Bergenfest?', a: 'The festival is open to all ages, but certain zones may have 18+ restrictions after 23:00.' },
				{ q: 'What is the weather like in Bergen in June?', a: 'Bergen in June has long, bright days (sunset around 23:00) and temperatures around 15-20°C. Bring a rain jacket — Bergen is Bergen.' }
			]
		},
		filterEvents: (events) => filterBergenfest(events)
	},
	{
		id: 'beyond-the-gates',
		slug: 'beyond-the-gates',
		seasonal: true,
		title: {
			no: 'Beyond the Gates',
			en: 'Beyond the Gates Bergen'
		},
		description: {
			no: 'Beyond the Gates-programmet — metal og rock i Bergen. Artister, billetter og praktisk info.',
			en: 'Beyond the Gates festival programme — metal and rock in Bergen. Artists, tickets and practical info.'
		},
		ogSubtitle: {
			no: 'Metal og rock i Bergen',
			en: 'Metal and rock in Bergen'
		},
		relatedSlugs: ['konserter', 'bergenfest', 'nattjazz'],
		footerLabel: { no: 'Beyond the Gates', en: 'Beyond the Gates' },
		footer: { langs: ['no'], order: 14 },
		newsletterHeading: { no: 'Beyond the Gates — årets program', en: 'Beyond the Gates — this year\'s lineup' },
		quickAnswer: {
			no: 'Beyond the Gates er Bergens metal- og rockfestival, arrangert over fire dager i slutten av juli og begynnelsen av august. Festivalen bruker flere scener — blant annet USF Verftet, Kulturhuset i Bergen og Grieghallen — og trekker et internasjonalt publikum med et program som spenner fra black metal til progressiv rock.',
			en: 'Beyond the Gates is Bergen\'s metal and rock festival, held over four days in late July and early August. The festival uses multiple venues — including USF Verftet, Kulturhuset i Bergen and Grieghallen — and draws an international audience with a programme spanning black metal to progressive rock.'
		},
		editorial: {
			no: [
				'Beyond the Gates er en internasjonal metalfestival som bruker Bergens unike arenaer til å skape en atmosfære utenom det vanlige.',
				'Festivalen holder til på flere scener i Bergen sentrum — USF Verftet, Kulturhuset og Grieghallen — og kombinerer store internasjonale navn med undergrunnsband.',
				'Gåri viser det komplette Beyond the Gates-programmet med billettinformasjon, oppdatert daglig.'
			],
			en: [
				'Beyond the Gates is an international metal festival that uses Bergen\'s unique venues to create an extraordinary atmosphere for heavy music.',
				'The festival spans multiple stages across Bergen — USF Verftet, Kulturhuset i Bergen, and Grieghallen — combining major international acts with underground bands.',
				'Gåri shows the complete Beyond the Gates programme with ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Beyond the Gates?', a: 'Beyond the Gates arrangeres over fire dager i slutten av juli og begynnelsen av august hvert år.' },
				{ q: 'Hvor holdes Beyond the Gates?', a: 'Flere scener i Bergen: USF Verftet, Kulturhuset i Bergen og Grieghallen. Alle er i sentrum og gangavstand fra hverandre.' },
				{ q: 'Hvordan kjøper jeg billetter til Beyond the Gates?', a: 'Billetter selges via Ticketmaster og festivalens nettside. Festivalpass og dagsbilletter tilgjengelig.' },
				{ q: 'Er det aldersgrense på Beyond the Gates?', a: 'De fleste konserter er 18+. Sjekk enkeltarrangementer for spesifikk aldersgrense.' },
				{ q: 'Hva slags musikk spilles på Beyond the Gates?', a: 'Primært metal i alle sjangre — black metal, doom, death, progressiv — pluss hardrock og eksperimentell musikk.' }
			],
			en: [
				{ q: 'When is Beyond the Gates?', a: 'Beyond the Gates takes place over four days in late July and early August each year.' },
				{ q: 'Where is Beyond the Gates held?', a: 'Multiple venues in Bergen: USF Verftet, Kulturhuset i Bergen and Grieghallen. All are centrally located and within walking distance of each other.' },
				{ q: 'How do I buy Beyond the Gates tickets?', a: 'Tickets are sold through Ticketmaster and the festival website. Festival passes and single-day tickets are available.' },
				{ q: 'Is there an age limit at Beyond the Gates?', a: 'Most concerts are 18+. Check individual events for specific age restrictions.' },
				{ q: 'What kind of music is played at Beyond the Gates?', a: 'Primarily metal across all subgenres — black metal, doom, death, progressive — plus hard rock and experimental music.' }
			]
		},
		filterEvents: (events) => filterBeyondTheGates(events)
	},
	{
		id: 'beyond-the-gates-en',
		slug: 'beyond-the-gates-bergen',
		seasonal: true,
		title: {
			no: 'Beyond the Gates',
			en: 'Beyond the Gates Bergen'
		},
		description: {
			no: 'Beyond the Gates-programmet — metal og rock i Bergen.',
			en: 'Beyond the Gates festival programme — metal and rock in Bergen, Norway. Artists, tickets and practical info.'
		},
		ogSubtitle: {
			no: 'Metal og rock i Bergen',
			en: 'Metal and rock in Bergen'
		},
		relatedSlugs: ['konserter', 'bergenfest-bergen', 'nattjazz-bergen'],
		footerLabel: { no: 'Beyond the Gates', en: 'Beyond the Gates' },
		footer: { langs: ['en'], order: 14 },
		newsletterHeading: { no: 'Beyond the Gates — årets program', en: 'Beyond the Gates — this year\'s lineup' },
		quickAnswer: {
			no: 'Beyond the Gates er Bergens metal- og rockfestival, arrangert over fire dager i slutten av juli og begynnelsen av august.',
			en: 'Beyond the Gates is Bergen\'s metal and rock festival, held over four days in late July and early August. The festival uses multiple venues — including USF Verftet, Kulturhuset i Bergen and Grieghallen — and draws an international audience with a programme spanning black metal to progressive rock.'
		},
		editorial: {
			no: [
				'Beyond the Gates er en internasjonal metalfestival i Bergen med artister fra hele verden.',
				'Festivalen bruker flere scener i Bergen sentrum — USF Verftet, Kulturhuset og Grieghallen.',
				'Gåri viser det komplette programmet med billettinformasjon.'
			],
			en: [
				'Beyond the Gates is an international metal festival that uses Bergen\'s unique venues to create an extraordinary atmosphere for heavy music.',
				'The festival spans multiple stages across Bergen — USF Verftet, Kulturhuset i Bergen, and Grieghallen — combining major international acts with underground bands.',
				'Gåri shows the complete Beyond the Gates programme with ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Beyond the Gates?', a: 'Slutten av juli og begynnelsen av august hvert år.' },
				{ q: 'Hvor holdes Beyond the Gates?', a: 'USF Verftet, Kulturhuset i Bergen og Grieghallen — alle i Bergen sentrum.' },
				{ q: 'Hvordan kjøper jeg billetter?', a: 'Via Ticketmaster og festivalens nettside. Festivalpass og dagsbilletter tilgjengelig.' },
				{ q: 'Er det aldersgrense?', a: 'De fleste konserter er 18+. Sjekk enkeltarrangementer.' },
				{ q: 'Hva slags musikk spilles?', a: 'Metal i alle sjangre — black metal, doom, death, progressiv — pluss hardrock og eksperimentell musikk.' }
			],
			en: [
				{ q: 'When is Beyond the Gates?', a: 'Beyond the Gates takes place over four days in late July and early August each year.' },
				{ q: 'Where is Beyond the Gates held?', a: 'Multiple venues in Bergen: USF Verftet, Kulturhuset i Bergen and Grieghallen. All centrally located.' },
				{ q: 'How do I buy Beyond the Gates tickets?', a: 'Tickets are sold through Ticketmaster and the festival website. Festival passes and single-day tickets available.' },
				{ q: 'Is there an age limit at Beyond the Gates?', a: 'Most concerts are 18+. Check individual events for specific age restrictions.' },
				{ q: 'What kind of music is played at Beyond the Gates?', a: 'Primarily metal across all subgenres — black, doom, death, progressive — plus hard rock and experimental music.' }
			]
		},
		filterEvents: (events) => filterBeyondTheGates(events)
	},
	{
		id: 'nattjazz',
		slug: 'nattjazz',
		seasonal: true,
		title: {
			no: 'Nattjazz Bergen',
			en: 'Nattjazz Bergen'
		},
		description: {
			no: 'Nattjazz-programmet — jazz, improvisasjon og verdensmusikk i Bergen. Artister, billetter og info.',
			en: 'Nattjazz programme — jazz, improvisation and world music in Bergen. Artists, tickets and info.'
		},
		ogSubtitle: {
			no: 'En av Europas lengste jazzfestivaler',
			en: "One of Europe's longest-running jazz festivals"
		},
		relatedSlugs: ['konserter', 'festspillene', 'i-kveld'],
		footerLabel: { no: 'Nattjazz', en: 'Nattjazz' },
		footer: { langs: ['no'], order: 15 },
		newsletterHeading: { no: 'Nattjazz — årets program', en: 'Nattjazz — this year\'s programme' },
		quickAnswer: {
			no: 'Nattjazz er en av Europas lengste jazzfestivaler, arrangert siden 1972. Festivalen varer i nesten to uker i mai og juni, med konserter hver kveld på USF Verftet — fra jazz og improvisasjon til elektronika og verdensmusikk.',
			en: 'Nattjazz is one of Europe\'s longest-running jazz festivals, held since 1972. The festival spans nearly two weeks in May and June, with nightly concerts at USF Verftet — from jazz and improvisation to electronic and world music.'
		},
		editorial: {
			no: [
				'Nattjazz er en av Europas lengste jazzfestivaler og arrangeres på USF Verftet — et ombygd sardinfabrikk ved havnen i Bergen.',
				'Festivalen kombinerer jazz, improvisasjon, elektronika og verdensmusikk, og trekker artister fra hele verden til Bergens mest atmosfæriske konsertlokale.',
				'Gåri viser det komplette Nattjazz-programmet med billettinformasjon, oppdatert daglig.'
			],
			en: [
				'Nattjazz is one of Europe\'s longest-running jazz festivals, held at USF Verftet — a converted sardine factory on Bergen\'s waterfront.',
				'The festival combines jazz, improvisation, electronic and world music, drawing artists from around the world to Bergen\'s most atmospheric concert venue.',
				'Gåri shows the complete Nattjazz programme with ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Nattjazz?', a: 'Nattjazz arrangeres i nesten to uker i mai og juni hvert år, parallelt med Festspillene.' },
				{ q: 'Hvor holdes Nattjazz?', a: 'USF Verftet på Nordnes i Bergen. Flere scener i samme bygg, inkludert Sardinen og Røkeriet.' },
				{ q: 'Spilles det bare jazz på Nattjazz?', a: 'Nei — programmet spenner fra jazz og improvisasjon til elektronika, verdensmusikk og eksperimentelle sjangre.' },
				{ q: 'Hvordan kjøper jeg billetter til Nattjazz?', a: 'Billetter selges via TicketCo og nattjazz.no. Enkeltbilletter og festivalpass tilgjengelig.' },
				{ q: 'Er det aldersgrense på Nattjazz?', a: 'De fleste konserter er 18+, men utvalgte arrangementer er åpne for alle aldre.' }
			],
			en: [
				{ q: 'When is Nattjazz?', a: 'Nattjazz runs for nearly two weeks in May and June each year, overlapping with the Bergen International Festival.' },
				{ q: 'Where is Nattjazz held?', a: 'USF Verftet on the Nordnes peninsula in Bergen. Multiple stages in the same building, including Sardinen and Røkeriet.' },
				{ q: 'Is Nattjazz only jazz music?', a: 'No — the programme spans jazz and improvisation to electronic, world and experimental music.' },
				{ q: 'How do I buy Nattjazz tickets?', a: 'Tickets are sold through TicketCo and nattjazz.no. Single tickets and festival passes available.' },
				{ q: 'Is there an age limit at Nattjazz?', a: 'Most concerts are 18+, but selected events are open to all ages.' }
			]
		},
		filterEvents: (events) => filterNattjazz(events)
	},
	{
		id: 'nattjazz-en',
		slug: 'nattjazz-bergen',
		seasonal: true,
		title: {
			no: 'Nattjazz Bergen',
			en: 'Nattjazz Bergen'
		},
		description: {
			no: 'Nattjazz-programmet — jazz og improvisasjon i Bergen.',
			en: 'Nattjazz programme — jazz, improvisation and world music in Bergen, Norway. Artists, tickets and info.'
		},
		ogSubtitle: {
			no: 'En av Europas lengste jazzfestivaler',
			en: "One of Europe's longest-running jazz festivals"
		},
		relatedSlugs: ['konserter', 'bergen-international-festival', 'beyond-the-gates-bergen'],
		footerLabel: { no: 'Nattjazz', en: 'Nattjazz' },
		footer: { langs: ['en'], order: 15 },
		newsletterHeading: { no: 'Nattjazz — årets program', en: 'Nattjazz — this year\'s programme' },
		quickAnswer: {
			no: 'Nattjazz er en av Europas lengste jazzfestivaler, arrangert siden 1972 på USF Verftet i Bergen.',
			en: 'Nattjazz is one of Europe\'s longest-running jazz festivals, held since 1972. The festival spans nearly two weeks in May and June, with nightly concerts at USF Verftet — from jazz and improvisation to electronic and world music.'
		},
		editorial: {
			no: [
				'Nattjazz arrangeres på USF Verftet — et ombygd sardinfabrikk ved havnen i Bergen.',
				'Festivalen kombinerer jazz, improvisasjon, elektronika og verdensmusikk.',
				'Gåri viser det komplette Nattjazz-programmet med billettinformasjon.'
			],
			en: [
				'Nattjazz is one of Europe\'s longest-running jazz festivals, held at USF Verftet — a converted sardine factory on Bergen\'s waterfront.',
				'The festival combines jazz, improvisation, electronic and world music, drawing artists from around the world to Bergen\'s most atmospheric concert venue.',
				'Gåri shows the complete Nattjazz programme with ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Nattjazz?', a: 'I mai og juni hvert år, parallelt med Festspillene.' },
				{ q: 'Hvor holdes Nattjazz?', a: 'USF Verftet på Nordnes i Bergen.' },
				{ q: 'Spilles det bare jazz?', a: 'Nei — jazz, improvisasjon, elektronika, verdensmusikk og eksperimentelle sjangre.' },
				{ q: 'Hvordan kjøper jeg billetter?', a: 'Via TicketCo og nattjazz.no. Enkeltbilletter og festivalpass tilgjengelig.' },
				{ q: 'Er det aldersgrense?', a: 'De fleste konserter er 18+, men utvalgte arrangementer er åpne for alle aldre.' }
			],
			en: [
				{ q: 'When is Nattjazz?', a: 'Nattjazz runs for nearly two weeks in May and June each year, overlapping with the Bergen International Festival.' },
				{ q: 'Where is Nattjazz held?', a: 'USF Verftet on the Nordnes peninsula in Bergen. Multiple stages in the same building.' },
				{ q: 'Is Nattjazz only jazz music?', a: 'No — the programme spans jazz, improvisation, electronic, world and experimental music.' },
				{ q: 'How do I buy Nattjazz tickets?', a: 'Tickets are sold through TicketCo and nattjazz.no. Single tickets and festival passes available.' },
				{ q: 'Is there an age limit at Nattjazz?', a: 'Most concerts are 18+, but selected events are open to all ages.' }
			]
		},
		filterEvents: (events) => filterNattjazz(events)
	},
	// --- Bergen Pride (June) ---
	{
		id: 'bergen-pride',
		slug: 'bergen-pride',
		seasonal: true,
		title: {
			no: 'Bergen Pride',
			en: 'Bergen Pride'
		},
		description: {
			no: 'Komplett program for Bergen Pride — parader, konserter, fester og kulturarrangementer under Regnbuedagene.',
			en: 'Complete Bergen Pride programme — parades, concerts, parties and cultural events during Bergen Rainbow Days.'
		},
		ogSubtitle: {
			no: 'Regnbuedagene i Bergen',
			en: 'Bergen Rainbow Days'
		},
		relatedSlugs: ['i-kveld', 'konserter', 'festspillene'],
		footerLabel: { no: 'Bergen Pride', en: 'Bergen Pride' },
		footer: { langs: ['no'], order: 16 },
		newsletterHeading: { no: 'Bergen Pride — årets program', en: 'Bergen Pride — this year\'s programme' },
		quickAnswer: {
			no: 'Bergen Pride (Regnbuedagene) er Vestlandets største pridearrangement, med ni dager i juni fylt med parader, konserter, debatter og fester over hele byen.',
			en: 'Bergen Pride (Regnbuedagene) is western Norway\'s largest pride event, with nine days in June filled with parades, concerts, debates and parties across the city.'
		},
		editorial: {
			no: [
				'Bergen Pride, også kjent som Regnbuedagene i Bergen, feirer mangfold og inkludering med ni dager fylt med arrangementer — fra den fargerike paraden gjennom sentrum til konserter, debatter og klubbkvelder.',
				'Festivalen trekker tusenvis til Bergen hvert år og er en av de viktigste kulturbegivenhetene om sommeren. Programmet spenner fra politiske samtaler til familiedager i parken.',
				'Gåri viser det komplette Bergen Pride-programmet med tidspunkter og steder, oppdatert daglig.'
			],
			en: [
				'Bergen Pride, also known as Regnbuedagene (Rainbow Days), celebrates diversity and inclusion with nine days of events — from the colourful parade through the city centre to concerts, debates and club nights.',
				'The festival draws thousands to Bergen every year and is one of the most important cultural events of the summer. The programme ranges from political conversations to family days in the park.',
				'Gåri shows the complete Bergen Pride programme with times and venues, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Bergen Pride?', a: 'Bergen Pride arrangeres over ni dager i juni hvert år. Paraden er vanligvis den siste lørdagen.' },
				{ q: 'Hvor er Bergen Pride?', a: 'Arrangementene foregår på ulike steder i Bergen sentrum. Paraden går gjennom sentrum med start fra Festplassen.' },
				{ q: 'Er Bergen Pride gratis?', a: 'Mange arrangementer er gratis, inkludert paraden og Pride Park. Enkelte konserter og fester krever billett.' },
				{ q: 'Er Bergen Pride familievennlig?', a: 'Ja — festivalen har egne familiesamlinger og ungdomsarrangementer. Paraden er åpen for alle aldre.' },
				{ q: 'Hvordan kjøper jeg billetter til Bergen Pride?', a: 'Billetter til betalingsarrangementer selges via TicketCo og bergenpride.no.' }
			],
			en: [
				{ q: 'When is Bergen Pride?', a: 'Bergen Pride takes place over nine days in June each year. The parade is usually on the final Saturday.' },
				{ q: 'Where is Bergen Pride held?', a: 'Events take place at various venues across Bergen city centre. The parade routes through the centre starting from Festplassen.' },
				{ q: 'Is Bergen Pride free?', a: 'Many events are free, including the parade and Pride Park. Some concerts and parties require tickets.' },
				{ q: 'Is Bergen Pride family-friendly?', a: 'Yes — the festival has dedicated family gatherings and youth events. The parade is open to all ages.' },
				{ q: 'How do I buy Bergen Pride tickets?', a: 'Tickets for paid events are sold via TicketCo and bergenpride.no.' }
			]
		},
		filterEvents: (events) => filterBergenPride(events)
	},
	{
		id: 'bergen-pride-en',
		slug: 'bergen-pride-festival',
		seasonal: true,
		title: {
			no: 'Bergen Pride Festival',
			en: 'Bergen Pride Festival'
		},
		description: {
			no: 'Bergen Pride-programmet — parader, konserter og kulturarrangementer.',
			en: 'Bergen Pride festival programme — parades, concerts, parties and cultural events in Bergen, Norway. Schedule, tickets and info.'
		},
		ogSubtitle: {
			no: 'Regnbuedagene i Bergen',
			en: 'Bergen Rainbow Days'
		},
		relatedSlugs: ['this-weekend', 'konserter', 'bergen-international-festival'],
		footerLabel: { no: 'Bergen Pride', en: 'Bergen Pride' },
		footer: { langs: ['en'], order: 16 },
		newsletterHeading: { no: 'Bergen Pride — årets program', en: 'Bergen Pride — this year\'s programme' },
		quickAnswer: {
			no: 'Bergen Pride (Regnbuedagene) er Vestlandets største pridearrangement med ni dager i juni.',
			en: 'Bergen Pride (Regnbuedagene) is western Norway\'s largest pride event, with nine days in June filled with parades, concerts, debates and parties across the city.'
		},
		editorial: {
			no: [
				'Bergen Pride feirer mangfold og inkludering med ni dager i juni — fra paraden gjennom sentrum til konserter og debatter.',
				'Festivalen trekker tusenvis til Bergen hvert år med et variert program for alle aldre.',
				'Gåri viser det komplette Bergen Pride-programmet med tidspunkter og steder.'
			],
			en: [
				'Bergen Pride, also known as Regnbuedagene (Rainbow Days), celebrates diversity and inclusion with nine days of events — from the colourful parade through the city centre to concerts, debates and club nights.',
				'The festival draws thousands to Bergen every year and is one of the most important cultural events of the summer. The programme ranges from political conversations to family days in the park.',
				'Gåri shows the complete Bergen Pride programme with times and venues, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er Bergen Pride?', a: 'I juni hvert år, over ni dager. Paraden er den siste lørdagen.' },
				{ q: 'Hvor er Bergen Pride?', a: 'Ulike steder i Bergen sentrum. Paraden starter fra Festplassen.' },
				{ q: 'Er Bergen Pride gratis?', a: 'Paraden og Pride Park er gratis. Enkelte konserter krever billett.' },
				{ q: 'Er Bergen Pride familievennlig?', a: 'Ja — egne familiesamlinger og ungdomsarrangementer. Paraden er for alle.' },
				{ q: 'Hvordan kjøper jeg billetter?', a: 'Via TicketCo og bergenpride.no.' }
			],
			en: [
				{ q: 'When is Bergen Pride?', a: 'Bergen Pride takes place over nine days in June each year. The parade is usually on the final Saturday.' },
				{ q: 'Where is Bergen Pride held?', a: 'Events take place at various venues across Bergen city centre. The parade starts from Festplassen.' },
				{ q: 'Is Bergen Pride free?', a: 'Many events are free, including the parade and Pride Park. Some concerts require tickets.' },
				{ q: 'Is Bergen Pride family-friendly?', a: 'Yes — dedicated family and youth events. The parade is open to all ages.' },
				{ q: 'How do I buy Bergen Pride tickets?', a: 'Tickets for paid events are sold via TicketCo and bergenpride.no.' }
			]
		},
		filterEvents: (events) => filterBergenPride(events)
	},
	// --- BIFF — Bergen International Film Festival (October) ---
	{
		id: 'biff',
		slug: 'biff',
		seasonal: true,
		title: {
			no: 'BIFF — Bergen Internasjonale Filmfestival',
			en: 'BIFF — Bergen International Film Festival'
		},
		description: {
			no: 'Komplett BIFF-program — filmer, visninger, samtaler og festivalfester under Bergen Internasjonale Filmfestival.',
			en: 'Complete BIFF programme — films, screenings, talks and festival events at the Bergen International Film Festival.'
		},
		ogSubtitle: {
			no: 'Nordens ledende filmfestival',
			en: 'The Nordic region\'s leading film festival'
		},
		relatedSlugs: ['konserter', 'festspillene', 'i-kveld'],
		footerLabel: { no: 'BIFF', en: 'BIFF' },
		footer: { langs: ['no'], order: 17 },
		newsletterHeading: { no: 'BIFF — årets filmfestival', en: 'BIFF — this year\'s film festival' },
		quickAnswer: {
			no: 'BIFF (Bergen Internasjonale Filmfestival) er Nordens største filmfestival og arrangeres i oktober hvert år. Over 150 filmer vises på Bergen Kino og Cinemateket — fra internasjonale premierfilmer til norsk dokumentar og barnefilm.',
			en: 'BIFF (Bergen International Film Festival) is the Nordic region\'s largest film festival, held every October. Over 150 films are screened at Bergen Kino and Cinemateket — from international premieres to Norwegian documentaries and children\'s films.'
		},
		editorial: {
			no: [
				'BIFF er Nordens ledende filmfestival og har siden 2000 vist det beste av internasjonal og norsk film. Festivalen trekker over 50 000 besøkende årlig til Bergen Kino og Cinemateket.',
				'Programmet spenner fra Gulluglen-konkurransen og Cinema Extraordinaire til dokumentarfilm, kortfilm og BIFF Ung for yngre publikum. Festivalen arrangerer også samtaler, masterclasses og festarrangementer.',
				'Gåri viser det komplette BIFF-programmet med visninger, tidspunkter og billettinformasjon, oppdatert daglig.'
			],
			en: [
				'BIFF is the Nordic region\'s leading film festival, showcasing the best of international and Norwegian cinema since 2000. The festival draws over 50,000 visitors annually to Bergen Kino and Cinemateket.',
				'The programme spans the Golden Owl competition and Cinema Extraordinaire to documentary, short film, and BIFF Young for younger audiences. The festival also hosts talks, masterclasses and party events.',
				'Gåri shows the complete BIFF programme with screenings, times and ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er BIFF?', a: 'BIFF arrangeres over ni dager i oktober hvert år. Festivalen starter vanligvis midten av oktober.' },
				{ q: 'Hvor holdes BIFF?', a: 'Filmene vises på Bergen Kino (Kinopaleet) og Cinemateket i Bergen (USF Verftet). Enkelte arrangementer holdes på andre steder.' },
				{ q: 'Hvordan kjøper jeg BIFF-billetter?', a: 'Billetter selges via biff.no. Enkeltbilletter og festivalpass tilgjengelig. Populære filmer kan bli utsolgt tidlig.' },
				{ q: 'Hva slags filmer vises på BIFF?', a: 'Alt fra internasjonal fiksjon og dokumentar til norsk film, kortfilm, animasjon og barnefilm. Festivalen har flere konkurranser, inkludert Gulluglen.' },
				{ q: 'Er det aldersgrense på BIFF?', a: 'De fleste filmer følger vanlig aldersgrense. BIFF Ung har egne visninger for unge filmfans. Noen arrangementer er 18+.' }
			],
			en: [
				{ q: 'When is BIFF?', a: 'BIFF runs for nine days in October each year, usually starting mid-October.' },
				{ q: 'Where is BIFF held?', a: 'Films are screened at Bergen Kino (Kinopaleet) and Cinemateket i Bergen (USF Verftet). Some events take place at other venues.' },
				{ q: 'How do I buy BIFF tickets?', a: 'Tickets are sold through biff.no. Single tickets and festival passes available. Popular films may sell out early.' },
				{ q: 'What kind of films are shown at BIFF?', a: 'Everything from international fiction and documentary to Norwegian cinema, short films, animation and children\'s films. The festival features several competitions, including the Golden Owl.' },
				{ q: 'Is there an age limit at BIFF?', a: 'Most films follow standard age ratings. BIFF Young has dedicated screenings for young film fans. Some events are 18+.' }
			]
		},
		filterEvents: (events) => filterBIFF(events)
	},
	{
		id: 'biff-en',
		slug: 'biff-bergen',
		seasonal: true,
		title: {
			no: 'BIFF Bergen',
			en: 'BIFF — Bergen International Film Festival'
		},
		description: {
			no: 'BIFF-programmet — filmer og visninger under Bergen Internasjonale Filmfestival.',
			en: 'BIFF programme — films, screenings, talks and events at the Bergen International Film Festival in Norway. Schedule, tickets and info.'
		},
		ogSubtitle: {
			no: 'Nordens ledende filmfestival',
			en: 'The Nordic region\'s leading film festival'
		},
		relatedSlugs: ['konserter', 'bergen-international-festival', 'this-weekend'],
		footerLabel: { no: 'BIFF', en: 'BIFF' },
		footer: { langs: ['en'], order: 17 },
		newsletterHeading: { no: 'BIFF — årets filmfestival', en: 'BIFF — this year\'s film festival' },
		quickAnswer: {
			no: 'BIFF (Bergen Internasjonale Filmfestival) er Nordens største filmfestival, arrangert i oktober hvert år.',
			en: 'BIFF (Bergen International Film Festival) is the Nordic region\'s largest film festival, held every October. Over 150 films are screened at Bergen Kino and Cinemateket — from international premieres to Norwegian documentaries and children\'s films.'
		},
		editorial: {
			no: [
				'BIFF er Nordens ledende filmfestival som viser det beste av internasjonal og norsk film.',
				'Programmet spenner fra konkurransefilmer til dokumentar, kortfilm og barnefilm.',
				'Gåri viser det komplette BIFF-programmet med visninger og billettinformasjon.'
			],
			en: [
				'BIFF is the Nordic region\'s leading film festival, showcasing the best of international and Norwegian cinema since 2000. The festival draws over 50,000 visitors annually to Bergen Kino and Cinemateket.',
				'The programme spans the Golden Owl competition and Cinema Extraordinaire to documentary, short film, and BIFF Young for younger audiences. The festival also hosts talks, masterclasses and party events.',
				'Gåri shows the complete BIFF programme with screenings, times and ticket information, updated daily.'
			]
		},
		faq: {
			no: [
				{ q: 'Når er BIFF?', a: 'I oktober hvert år, over ni dager fra midten av måneden.' },
				{ q: 'Hvor holdes BIFF?', a: 'Bergen Kino (Kinopaleet) og Cinemateket i Bergen (USF Verftet).' },
				{ q: 'Hvordan kjøper jeg billetter?', a: 'Via biff.no. Enkeltbilletter og festivalpass tilgjengelig.' },
				{ q: 'Hva slags filmer vises?', a: 'Internasjonal fiksjon, dokumentar, norsk film, kortfilm, animasjon og barnefilm.' },
				{ q: 'Er det aldersgrense?', a: 'Vanlig aldersgrense gjelder. BIFF Ung har egne visninger for unge.' }
			],
			en: [
				{ q: 'When is BIFF?', a: 'BIFF runs for nine days in October each year, usually starting mid-October.' },
				{ q: 'Where is BIFF held?', a: 'Films are screened at Bergen Kino (Kinopaleet) and Cinemateket i Bergen (USF Verftet).' },
				{ q: 'How do I buy BIFF tickets?', a: 'Tickets are sold through biff.no. Single tickets and festival passes available.' },
				{ q: 'What kind of films are shown?', a: 'International fiction, documentary, Norwegian cinema, short films, animation and children\'s films.' },
				{ q: 'Is there an age limit?', a: 'Standard age ratings apply. BIFF Young has dedicated screenings for young film fans.' }
			]
		},
		filterEvents: (events) => filterBIFF(events)
	}
];

const collectionMap = new Map(collections.map(c => [c.slug, c]));

export function getCollection(slug: string): Collection | undefined {
	return collectionMap.get(slug);
}

export function getAllCollectionSlugs(): string[] {
	return collections.map(c => c.slug);
}

export function getFooterCollections(lang: Lang): Collection[] {
	return collections
		.filter(c => c.footer?.langs.includes(lang))
		.sort((a, b) => a.footer!.order - b.footer!.order);
}

/** Paired collection slugs: NO slug ↔ EN slug for hreflang */
const HREFLANG_PAIRS: Record<string, Record<'no' | 'en', string>> = {
	'denne-helgen': { no: 'denne-helgen', en: 'this-weekend' },
	'this-weekend': { no: 'denne-helgen', en: 'this-weekend' },
	'i-dag': { no: 'i-dag', en: 'today-in-bergen' },
	'today-in-bergen': { no: 'i-dag', en: 'today-in-bergen' },
	'gratis': { no: 'gratis', en: 'free-things-to-do-bergen' },
	'free-things-to-do-bergen': { no: 'gratis', en: 'free-things-to-do-bergen' },
	'17-mai': { no: '17-mai', en: '17th-of-may-bergen' },
	'17th-of-may-bergen': { no: '17-mai', en: '17th-of-may-bergen' },
	'julemarked': { no: 'julemarked', en: 'christmas-bergen' },
	'christmas-bergen': { no: 'julemarked', en: 'christmas-bergen' },
	'paske': { no: 'paske', en: 'easter-bergen' },
	'easter-bergen': { no: 'paske', en: 'easter-bergen' },
	'sankthans': { no: 'sankthans', en: 'midsummer-bergen' },
	'midsummer-bergen': { no: 'sankthans', en: 'midsummer-bergen' },
	'nyttarsaften': { no: 'nyttarsaften', en: 'new-years-eve-bergen' },
	'new-years-eve-bergen': { no: 'nyttarsaften', en: 'new-years-eve-bergen' },
	'vinterferie': { no: 'vinterferie', en: 'winter-break-bergen' },
	'winter-break-bergen': { no: 'vinterferie', en: 'winter-break-bergen' },
	// Festival collections (Fase 2)
	'festspillene': { no: 'festspillene', en: 'bergen-international-festival' },
	'bergen-international-festival': { no: 'festspillene', en: 'bergen-international-festival' },
	'bergenfest': { no: 'bergenfest', en: 'bergenfest-bergen' },
	'bergenfest-bergen': { no: 'bergenfest', en: 'bergenfest-bergen' },
	'beyond-the-gates': { no: 'beyond-the-gates', en: 'beyond-the-gates-bergen' },
	'beyond-the-gates-bergen': { no: 'beyond-the-gates', en: 'beyond-the-gates-bergen' },
	'nattjazz': { no: 'nattjazz', en: 'nattjazz-bergen' },
	'nattjazz-bergen': { no: 'nattjazz', en: 'nattjazz-bergen' },
	// Fase 2b
	'bergen-pride': { no: 'bergen-pride', en: 'bergen-pride-festival' },
	'bergen-pride-festival': { no: 'bergen-pride', en: 'bergen-pride-festival' },
	'biff': { no: 'biff', en: 'biff-bergen' },
	'biff-bergen': { no: 'biff', en: 'biff-bergen' },
};

/** Returns hreflang slugs for a collection. Unpaired collections use the same slug for both. */
export function getHreflangSlugs(slug: string): Record<'no' | 'en', string> {
	return HREFLANG_PAIRS[slug] ?? { no: slug, en: slug };
}
