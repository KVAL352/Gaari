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
			no: 'Gåri samler helgens arrangementer i Bergen fra 50 lokale kilder — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra steder som Grieghallen, KODE, USF Verftet og Akvariet.',
			en: 'Gåri collects this weekend\'s events in Bergen from 50 local sources — concerts, exhibitions, family activities and more. Updated daily from venues like Grieghallen, KODE, USF Verftet and Akvariet.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges mest aktive kulturhuvudsteder, og helgen er høysesong for opplevelser. Grieghallen og Bergen Filharmoniske holder konserter, Forum Scene og Ole Bull huser artister fra hele verden, og Kunsthallen, KODE og Bymuseet tilbyr utstillinger og aktiviteter gjennom hele helgen.',
				'Gåri samler helgeprogrammet fra over 50 lokale arrangørkilder — teatre, museer, spillesteder, festivalarrangører og billettplattformer — og oppdaterer listen daglig. Enten du planlegger lørdag kveld eller søker en rolig søndagsopplevelse, er alt samlet her.',
				'Bergen er en generøs by med et bredt gratis kulturtilbud i helgene: åpne utstillinger, bibliotekaktiviteter og parkkonserter. Sjekk familiehelg-siden for arrangementer tilrettelagt for barn, og gratis-siden for kostnadsfrie aktiviteter. Gåri er uavhengig og fjerner automatisk utsolgte arrangementer, slik at det du ser faktisk er tilgjengelig.'
			],
			en: [
				'Bergen is one of Norway\'s most culturally active cities, and the weekend is peak season for events. Grieghallen and the Bergen Philharmonic host concerts, Forum Scene and Ole Bull stage artists from across the world, while Kunsthallen, KODE and Bymuseet offer exhibitions and activities throughout the weekend.',
				'Gåri collects the weekend programme from over 50 local event sources — theatres, museums, venues, festival organisers and ticketing platforms — and updates the listing daily. Whether you are planning Saturday evening or looking for a relaxed Sunday experience, everything is here in one place.',
				'Bergen is a generous city with a wide range of free cultural events at weekends: open exhibitions, library activities and park concerts. Check the family weekend page for events suited to children, and the free events page for no-cost activities. Gåri is independent and removes sold-out events automatically so what you see is genuinely available.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen denne helgen?', a: 'Gåri viser alle helgens arrangementer i Bergen — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra 50 lokale kilder.' },
				{ q: 'Er det gratis arrangementer i Bergen denne helgen?', a: 'Bergen har mange gratis helgeaktiviteter. Se Gåris gratis-side for arrangementer uten billettpris denne uken.' },
				{ q: 'Hva kan familier gjøre i Bergen i helgen?', a: 'Gåri har en egen familiehelg-side med barneforestillinger, museumsaktiviteter og familievennlige arrangementer i Bergen.' }
			],
			en: [
				{ q: "What's on in Bergen this weekend?", a: 'Gåri shows all weekend events in Bergen — concerts, exhibitions, family activities and more. Updated daily from 50 local sources.' },
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
			no: 'Se alle arrangementer i Bergen i kveld — konserter, teater, uteliv og mer. Gåri henter data fra 50 lokale kilder og oppdateres to ganger daglig.',
			en: 'See all events in Bergen tonight — concerts, theatre, nightlife and more. Gåri pulls data from 50 local sources and updates twice daily.'
		},
		editorial: {
			no: [
				'Bergen har kulturliv på hverdagskvelder, ikke bare i helgene. Musikk­scener som Ole Bull, Forum Scene, USF Verftet og Kulturhuset setter opp show og konserter gjennom hele uken. Teatrene DNS, BIT Teatergarasjen, Det Vestnorske Teatret og Cornerteateret spiller forestillinger mandag til fredag. Kvarteret og studentmiljøet er aktive fra torsdag og utover.',
				'Gåri oppdateres to ganger daglig — morgen og kveld — slik at kveldsbildet alltid er ferskt. Listen henter data direkte fra 44 bergenske arrangørers nettsider, fra Grieghallen til Brettspillkafeen, og inkluderer tidspunkt for alle arrangementer.',
				'Konserter og forestillinger starter typisk mellom 19 og 21. Planlegger du spontant i kveld? Bruk tidspunkt-filteret for nattarrangementer fra klokken 22, eller gratis-filteret for kostnadsfrie kveldsopplevelser. Gåri fjerner utsolgte arrangementer fortløpende — det du ser er tilgjengelig.'
			],
			en: [
				'Bergen has cultural events on weekday evenings, not just at weekends. Music venues such as Ole Bull, Forum Scene, USF Verftet and Kulturhuset put on shows and concerts throughout the week. The theatres DNS, BIT Teatergarasjen, Det Vestnorske Teatret and Cornerteateret run performances Monday to Friday. Kvarteret and the student scene are active from Thursday onwards.',
				'Gåri updates twice daily — morning and evening — so the evening picture is always fresh. Listings are pulled directly from 50 Bergen event sources, from Grieghallen to Brettspillkafeen, and include start times for all events.',
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
			no: 'Gratis ting å gjøre i Bergen denne uken — utstillinger, bibliotekaktiviteter, turer og mer. Gåri samler kostnadsfrie arrangementer fra 50 lokale kilder.',
			en: 'Free things to do in Bergen this week — exhibitions, library events, hikes and more. Gåri collects free events from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen har et rikt kulturtilbud som ikke koster noe. Bibliotekene i Bergen arrangerer foredrag, utstillinger og konserter gratis gjennom hele uken. KODE og Bergen Kunsthall tilbyr åpne utstillingsdager og vernissager. Fløyen og DNT arrangerer gratis fjellturer og naturopplevelser. Universitetet og studentmiljøet bidrar med åpne forelesninger, debatter og sosiale kvelder.',
				'Gåri samler alle gratis arrangementer i Bergen fra 50 lokale kilder og oppdaterer listen daglig. Her ser du gratis konserter, utstillinger, turer og aktiviteter — alt denne uken, uten billettpris.',
				'«Trolig gratis» betyr at arrangøren ikke har oppgitt pris i sin kilde, og vi kan ikke garantere at det er kostnadsfritt. Sjekk alltid pris hos arrangøren før oppmøte. Bergen er likevel kjent som en by med lavterskeltilbud — mange av de beste kulturopplevelsene, fra åpningsutstillinger til parkkonserter, er helt gratis.'
			],
			en: [
				'Bergen has a rich cultural offering that costs nothing. The city\'s libraries run free talks, exhibitions and concerts throughout the week. KODE and Bergen Kunsthall offer open exhibition days and vernissages. Fløyen and DNT organise free mountain hikes and outdoor experiences. The university and student community contribute open lectures, debates and social evenings.',
				'Gåri collects all free events in Bergen from 50 local sources and updates the listing daily. Here you find free concerts, exhibitions, hikes and activities — all this week, no ticket required.',
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
			no: 'Hva skjer i Bergen i dag? Gåri viser alle dagens arrangementer — konserter, utstillinger, mat og mer — samlet fra 50 lokale kilder.',
			en: 'What\'s on in Bergen today? Gåri shows all of today\'s events — concerts, exhibitions, food and more — collected from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en kompakt by med noe å tilby hver eneste dag. Du finner livemusikk, kunstutstillinger, guidede turer, matarrangementer, barneaktiviteter og kulturforestillinger — fra Grieghallen og USF Verftet til byens mindre gallerier og nabolagskafeer.',
				'Gåri samler arrangementer fra 50 lokale Bergen-kilder — spillesteder, festivalarrangører og billettplattformer — og oppdaterer listen to ganger daglig. Alt fra Grieghallen og Bergen Bibliotek til Fløyen og Akvariet er dekket.',
				'Bergen har sterkt tilbud av gratis arrangementer. Bibliotekfilialer holder gratis foredrag og konserter. KODE har gratis inngangsdager. Fløyen har gratis uteaktiviteter. For betalte arrangementer lenker Gåri direkte til arrangørens eget billettsystem. Gåri er uavhengig og bergen-basert — ingen betalte plasseringer, alle arrangører behandles likt.'
			],
			en: [
				'Bergen is a compact, walkable city that has something on every single day. You will find live music, art openings, guided hikes, food events, children\'s activities and cultural performances — from Grieghallen and USF Verftet to the city\'s smaller galleries and neighbourhood venues.',
				'Gåri aggregates events from 50 local Bergen sources — venues, festival organisers and ticketing platforms — and updates listings twice daily so what you see is always current.',
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
			no: 'Familievennlige arrangementer i Bergen denne helgen — barneforestillinger, museumsaktiviteter, dyrepark og utendørsopplevelser. Samlet fra 50 lokale kilder.',
			en: 'Family-friendly events in Bergen this weekend — children\'s shows, museum activities, aquarium visits and outdoor experiences. Collected from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en ypperlig by for familier i helgene. Akvariet i Bergen er landets mest besøkte attraksjon og holder åpent hele helgen. KODE og Bymuseet tilbyr barnevennlige utstillinger og aktiviteter. Fløyen er et eventyrland for barn hele året. Bergen Bibliotek arrangerer barneteater og lesestunder. DNS, Kulturhuset i Bergen og Cornerteateret har regelmessige barneforestillinger og familieshow.',
				'Gåri-siden for familiehelg viser helgens barneforestillinger, museumsaktiviteter og familievennlige arrangementer i Bergen fra 50 lokale kilder. Listen oppdateres daglig og viser hva som faktisk skjer denne helgen.',
				'Familieaktiviteter i Bergen spenner fra gratis søndagskonserter på biblioteket til billetterier forestillinger på DNS og Kulturhuset. Mange arrangementer har barnerabatt eller familierabatt — sjekk alltid pris hos arrangøren. Gåri fjerner utsolgte forestillinger automatisk, slik at det du ser faktisk er tilgjengelig for kjøp.'
			],
			en: [
				'Bergen is an excellent city for families at the weekend. Bergen Aquarium is Norway\'s most visited attraction and is open all weekend. KODE and Bymuseet offer family-friendly exhibitions and activities. Fløyen is a year-round adventure for children. Bergen Library runs children\'s theatre and reading sessions. DNS, Kulturhuset i Bergen and Cornerteateret have regular children\'s shows and family performances.',
				'Gåri\'s family weekend page shows this weekend\'s children\'s shows, museum activities and family-friendly events in Bergen from 50 local sources. The listing is updated daily to show what is actually happening this weekend.',
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
		relatedSlugs: ['denne-helgen', 'i-kveld', 'studentkveld'],
		footerLabel: { no: 'Konserter', en: 'Concerts' },
		footer: { langs: ['no', 'en'], order: 5 },
		newsletterHeading: { no: 'Få ukas konserttips hver torsdag', en: 'Get concert picks every Thursday' },
		quickAnswer: {
			no: 'Alle konserter og livemusikk i Bergen denne uken — fra Grieghallen og Ole Bull til Hulen og Kvarteret. Gåri samler konsertprogrammet fra 50 lokale kilder.',
			en: 'All concerts and live music in Bergen this week — from Grieghallen and Ole Bull to Hulen and Kvarteret. Gåri collects the concert schedule from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges rikeste musikkbyer. Grieghallen er hjemstedet til Bergen Filharmoniske Orkester — et av landets eldste — og huser internasjonale artister gjennom hele sesongen. Ole Bull Scene og Forum Scene er de ledende popklubbene. USF Verftet og Kulturhuset i Bergen tilbyr et bredere og mer alternativt program. Kvarteret, Hulen og en rekke puber og barer holder jevnlige konserter for studenter og unge.',
				'Gåri samler alle konserter og livemusikk-arrangementer i Bergen denne uken fra 50 lokale kilder — billettsider, festivalsider og direkte fra spillestedene. Listen oppdateres daglig, og Gåri fjerner automatisk konserter som er utsolgt.',
				'Bergen har musikktilbud i alle prissjikt. Gratiskonserter finner du på Bergen Bibliotek, i parker og på kulturhus. Betalte konserter har direkte billettlenke til arrangørens eget billettsystem. Sommer er høysesong: Festspillene, Bergenfest og en rekke mindre festivaler fyller konsertkalenderen, men Bergen har livemusikk å tilby gjennom hele året.'
			],
			en: [
				'Bergen is one of Norway\'s richest music cities. Grieghallen is home to the Bergen Philharmonic Orchestra — one of the country\'s oldest — and hosts international artists throughout the season. Ole Bull Scene and Forum Scene are the leading pop venues. USF Verftet and Kulturhuset i Bergen offer a broader and more alternative programme. Kvarteret, Hulen and numerous pubs and bars hold regular concerts for students and young audiences.',
				'Gåri collects all concerts and live music events in Bergen this week from 50 local sources — ticketing sites, festival pages and directly from the venues. The listing is updated daily and Gåri automatically removes sold-out concerts.',
				'Bergen has music at every price point. Free concerts can be found at Bergen Library, in parks and at cultural venues. Paid concerts have a direct ticket link to the venue\'s own ticketing system. Summer is peak season — Festspillene, Bergenfest and numerous smaller festivals fill the concert calendar — but Bergen offers live music year-round.'
			]
		},
		faq: {
			no: [
				{ q: 'Hvilke konserter er det i Bergen denne uken?', a: 'Gåri samler alle konserter og livemusikk-arrangementer i Bergen denne uken fra 50 lokale kilder. Oppdatert daglig.' },
				{ q: 'Hvor kjøper jeg konsertbilletter i Bergen?', a: 'Gåri lenker direkte til billettsidene for alle konserter i Bergen. Klikk på arrangementet for kjøpslenke.' },
				{ q: 'Er det gratis konserter i Bergen denne uken?', a: 'Bergen har jevnlig gratis konserter på bibliotek, i parker og på kulturhus. Sjekk Gåris gratis-side for oversikt.' }
			],
			en: [
				{ q: 'What concerts are on in Bergen this week?', a: 'Gåri collects all concerts and live music events in Bergen this week from 50 local sources. Updated daily.' },
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
			no: 'Alle arrangementer i Bergen denne helgen — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra 50 lokale kilder.',
			en: 'All events in Bergen this weekend — concerts, exhibitions, family activities and more. Updated daily from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en by som virkelig lever opp i helgene. Kulturkalenderen spenner fra livemusikk og billedkunst til teater, friluftsliv og mat — med noe å tilby i alle prisklasser, fra gratis åpne utstillinger til storkonsertene på Grieghallen.',
				'Gåri samler Bergens helgearrangementer fra 50 lokale kilder — spillesteder, festivalarrangører og billettplattformer — og oppdaterer listen daglig. Grieghallen, USF Verftet, Ole Bull, DNS, Forum Scene, KODE, Bergen Kunsthall og byens mange mindre scener og gallerier er alle dekket.',
				'Bergen er en kompakt by. Bryggen, Nordnes, sentrum og universitetsområdet er alle tilgjengelig til fots. Gåri er uavhengig og Bergen-basert — utsolgte arrangementer fjernes automatisk, og ingen arrangører betaler for å bli vist frem. Alle kilder behandles likt.'
			],
			en: [
				'Bergen comes alive at the weekend. The city\'s cultural calendar spans live music, visual art, theatre, outdoor activities and food — with something at every price point, from free open exhibitions to headline concerts at Grieghallen.',
				'Gåri collects Bergen weekend events from 50 local sources — venues, festival organisers and ticketing platforms — and updates listings daily. Grieghallen, USF Verftet, Ole Bull, DNS, Forum Scene, KODE, Bergen Kunsthall and the city\'s many smaller stages and galleries are all covered.',
				'Bergen is a compact city. Bryggen, Nordnes, the city centre and the university area are all walkable, and most venues are within a short bus or tram ride. Gåri is independent and Bergen-based — sold-out events are removed automatically and no venue pays for placement. All sources are listed on equal terms.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen denne helgen?', a: 'Gåri viser alle helgens arrangementer i Bergen — konserter, utstillinger, mat og mer. Oppdatert daglig fra 50 lokale kilder.' },
				{ q: 'Er det gratis ting å gjøre i Bergen denne helgen?', a: 'Bergen har mange gratis helgeaktiviteter. Bruk gratis-filteret for å finne kostnadsfrie arrangementer i helgen.' },
				{ q: 'Hva er det beste å gjøre i Bergen i helgen?', a: 'Bergen har konserter, utstillinger, matmarkeder, fjordturer og kulturarrangementer hver helg. Sjekk Gåri for ukens program.' }
			],
			en: [
				{ q: "What's on in Bergen this weekend?", a: 'Gåri shows all weekend events in Bergen — concerts, exhibitions, food and outdoor activities. Updated daily from 50 local sources.' },
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
			no: 'Alle arrangementer i Bergen i dag — konserter, utstillinger, turer og mer. Gåri samler dagens program fra 50 lokale kilder, oppdatert to ganger daglig.',
			en: 'All events in Bergen today — concerts, exhibitions, tours and more. Gåri collects today\'s schedule from 50 local sources, updated twice daily.'
		},
		editorial: {
			no: [
				'Bergen har noe å tilby hver dag hele uken. Fra livekonserter på Ole Bull og Grieghallen til utstillinger på KODE, Bergen Kunsthall og Bymuseet — og guidede turer på Fløyen og i fjordlandskapet. Kulturkalenderen er aktiv alle dager, ikke bare i helgene. DNS, BIT Teatergarasjen og de mindre teatrene spiller forestillinger mandag til lørdag.',
				'Gåri henter alle arrangementer som skjer i Bergen i dag fra 50 lokale kilder og oppdaterer to ganger daglig — morgen og kveld. Du ser alltid et ferskt bilde av dagsprogrammet, med tidspunkt for alle arrangementer inkludert.',
				'Leter du etter noe spesifikt? Bruk tidspunkt-filteret for morgen, dagtid, kveld eller natt. Gratis-filteret viser kostnadsfrie aktiviteter i dag. Utsolgte arrangementer fjernes automatisk fra Gåri — det du ser er tilgjengelig for besøk.'
			],
			en: [
				'Bergen offers something every day of the week. From live concerts at Ole Bull and Grieghallen to exhibitions at KODE, Bergen Kunsthall and Bymuseet — and guided walks on Fløyen and in the fjord landscape. The cultural calendar is active throughout the week, not just at weekends. DNS, BIT Teatergarasjen and the smaller theatres run performances Monday through Saturday.',
				'Gåri pulls all events happening in Bergen today from 50 local sources and updates twice daily — morning and evening. You always see a fresh picture of the day\'s programme, with start times included for all events.',
				'Looking for something specific? Use the time filter for morning, daytime, evening or night events. The free filter shows no-cost activities today. Sold-out events are removed automatically from Gåri — everything you see is available to attend.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen i dag?', a: 'Gåri viser alle arrangementer i Bergen i dag — konserter, utstillinger, teater, familieaktiviteter og mer. Oppdatert morgen og kveld fra 50 lokale kilder.' },
				{ q: 'Er det noe gratis å gjøre i Bergen i dag?', a: 'Bergen har daglige gratis arrangementer. Bruk gratis-filteret på Gåri for å finne kostnadsfrie aktiviteter i dag.' },
				{ q: 'Hva er åpent i Bergen i dag?', a: 'Museer, gallerier, biblioteker og teatre i Bergen er åpne daglig. Gåri viser alle arrangementer med tidspunkt i dag.' }
			],
			en: [
				{ q: "What's happening in Bergen today?", a: 'Gåri shows all events in Bergen today — concerts, exhibitions, theatre, family activities and more. Updated twice daily from 50 local sources.' },
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
			no: 'Gratis ting å gjøre i Bergen de neste to ukene — utstillinger, konserter, turer og aktiviteter uten billettpris. Samlet fra 50 lokale kilder.',
			en: 'Free things to do in Bergen over the next two weeks — exhibitions, concerts, hikes and activities with no ticket price. Collected from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen er en av Norges mest gavmilde byer for kostnadsfri kulturopplevelse. Biblioteknettverket arrangerer gratis foredrag, konserter og utstillinger hele året. Bergen Kunsthall tilbyr gratis inngangsdager og vernissager. Fløyen og de omkringliggende stiene er gratis å besøke, med organiserte gratisturer gjennom DNT. Universitetet i Bergen holder åpne forelesninger og debatter.',
				'Gåri viser alle gratis arrangementer i Bergen de neste to ukene, fra 50 lokale kilder og oppdatert daglig. Fra sentrum til Nordnes og Fana er gratis aktiviteter spredt over hele byen. To ukers vindu gir deg god tid til å planlegge rundt gratis museumsdager, bibliotekarrangementer og uteaktiviteter.',
				'«Trolig gratis» betyr at arrangøren ikke har oppgitt pris i sin kilde — sjekk alltid pris hos arrangøren. Likevel er Bergens gratis kulturtilbud genuint bredt: åpningskvelder, parkkonserter, bibliotekarrangementer og uteaktiviteter gjør det enkelt å tilbringe en hel dag i Bergen uten å bruke en krone.'
			],
			en: [
				'Bergen is one of Norway\'s most generous cities for free cultural experiences. The public library network runs free talks, concerts and exhibitions year-round. Bergen Kunsthall offers free entry days and vernissages. Fløyen and the surrounding trails are free to walk, with organised no-cost hikes through DNT. The University of Bergen hosts open public lectures and debates.',
				'Gåri lists all free events in Bergen over the next two weeks, drawn from 50 local sources and updated daily. From the city centre to Nordnes and Fana, free activities are spread across the whole city. The two-week window gives visitors time to plan around free museum days, library events and outdoor activities.',
				'"Likely free" means the organiser has not published a price — always verify with the organiser before attending. That said, Bergen\'s free cultural offer is genuinely wide: opening nights, park concerts, library programmes and outdoor events make it easy to spend a full day in Bergen without spending a krone.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva er gratis å gjøre i Bergen?', a: 'Gåri viser alle gratis arrangementer i Bergen de neste to ukene — utstillinger, konserter, turer og aktiviteter. Oppdatert daglig fra 50 lokale kilder.' },
				{ q: 'Er det gratis museer i Bergen?', a: 'Flere museer i Bergen har gratis inngangsdager. Gåri viser gratis museumsdager og kulturtilbud fortløpende.' },
				{ q: 'Hva kan turister gjøre gratis i Bergen?', a: 'Bergen Kunsthall, biblioteknettverk og Fløyen-turer er jevnlig gratis. Gåri samler alle gratis arrangementer fra 50 lokale Bergen-kilder.' }
			],
			en: [
				{ q: 'What free things are there to do in Bergen?', a: 'Gåri lists all free events in Bergen over the next two weeks — exhibitions, concerts, hikes and activities. Updated daily from 50 sources.' },
				{ q: 'Are there free museums in Bergen?', a: 'Several Bergen museums have free entry days or free admission. Gåri lists free museum events and cultural activities as they are announced.' },
				{ q: 'What can I do for free in Bergen as a tourist?', a: 'Bergen Kunsthall, the public library network and Fløyen hikes are regularly free. Gåri collects all free events from 50 local Bergen sources.' }
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
			no: 'Regner det i Bergen? Her er innendørsarrangementer de neste to ukene — konserter, teater, utstillinger og familieaktiviteter. Samlet fra 50 lokale kilder.',
			en: 'Raining in Bergen? Here are indoor events over the next two weeks — concerts, theatre, exhibitions and family activities. Collected from 50 local sources.'
		},
		editorial: {
			no: [
				'Regn er Bergens mest omtalte egenskap — og byens innendørskulturliv er i verdensklasse. KODE er landets største kunstmuseum med fire bygg i sentrum. Bergen Kunsthall viser internasjonal samtidskunst. Akvariet er en av landets mest besøkte attraksjoner. Grieghallen, DNS, Forum Scene og USF Verftet er alle innendørs og holder program gjennom hele uken.',
				'Gåri-siden for regnværsdager viser innendørsarrangementer i Bergen de neste to ukene — konserter, teater, utstillinger, verksteder, matopplevelser og familieaktiviteter. Siden oppdateres daglig og henter data fra 50 lokale kilder.',
				'Gratis innendørsalternativer inkluderer Bergen Bibliotek og filialene over hele byen, samt vernissager på gallerier. For familier med barn er Akvariet, VilVite og Bymuseet gode valg. Husk at regnværssesongen er Bergen på sitt mest autentiske — de beste innendørsscenene fyller opp raskt, så sjekk tilgjengelighet hos arrangøren.'
			],
			en: [
				'Rain is Bergen\'s most talked-about characteristic — and the city\'s indoor cultural life is world-class. KODE is Norway\'s largest art museum, with four buildings in the city centre. Bergen Kunsthall shows international contemporary art. The Aquarium is one of Norway\'s most visited attractions. Grieghallen, DNS, Forum Scene and USF Verftet are all indoors and run programmes throughout the week.',
				'Gåri\'s rainy day guide shows indoor events in Bergen over the next two weeks — concerts, theatre, exhibitions, workshops, food experiences and family activities. The listing updates daily from 50 local sources.',
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
			no: 'Arrangementer i Bergen sentrum de neste to ukene — konserter, teater, utstillinger og mat i gangavstand fra Bryggen. Samlet fra 50 lokale kilder.',
			en: 'Events in Bergen city centre over the next two weeks — concerts, theatre, exhibitions and dining within walking distance of Bryggen. Collected from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen sentrum er hjertet av kulturtilbudet i byen. Grieghallen, Den Nationale Scene, Ole Bull Scene og Bergen Kunsthall ligger alle i sentrum. KODE er spredt over fire bygg i sentrum og på Nordnes. Litteraturhuset og Bergen Kino huser arrangementer daglig. Sentrumsgatene med Bryggen, Torgallmenningen og Strandkaien er rammen for matmarkeder, utendørsfestivaler og byrommets hendelser.',
				'Gåri viser alle arrangementer i Bergen sentrum de neste to ukene — spillesteder, teatre, gallerier, bibliotek, matarrangementer og kulturhus. Listen hentes fra 50 lokale kilder og oppdateres daglig.',
				'Bergen sentrum er kompakt og gangvennlig. Fra Grieghallen til Bryggen er det under ti minutters gange. Bybanen har stopp ved Byparken (for Grieghallen og Bryggen) og Florida (for DNS og Ole Bull). Gåri fjerner utsolgte arrangementer fortløpende — det du ser er tilgjengelig.'
			],
			en: [
				'Bergen city centre is the heart of the city\'s cultural offering. Grieghallen, Den Nationale Scene, Ole Bull Scene and Bergen Kunsthall are all in the centre. KODE spans four buildings in the city centre and on Nordnes. Litteraturhuset and Bergen Kino host events daily. The central streets around Bryggen, Torgallmenningen and Strandkaien are home to food markets, outdoor festivals and urban events.',
				'Gåri shows all events in Bergen city centre over the next two weeks — venues, theatres, galleries, libraries, food events and cultural centres. Listings are drawn from 50 local sources and updated daily.',
				'Bergen\'s city centre is compact and walkable. From Grieghallen to Bryggen is under ten minutes on foot. The Bybanen tram stops at Byparken (for Grieghallen and Bryggen) and Florida (for DNS and Ole Bull). Gåri removes sold-out events continuously — everything you see is available.'
			]
		},
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen sentrum?', a: 'Gåri viser alle arrangementer i Bergen sentrum de neste to ukene — konserter, utstillinger, teater og mer fra 50 lokale kilder.' },
				{ q: 'Hvilke kulturarenaer er det i Bergen sentrum?', a: 'Grieghallen, Den Nationale Scene, Ole Bull, Bergen Kunsthall, KODE og Litteraturhuset ligger alle i Bergen sentrum.' },
				{ q: 'Hva skjer i Bergen sentrum i helgen?', a: 'Sjekk Gåri for helgens arrangementer i Bergen sentrum — fra Grieghallen og DNS til Kunsthallen og matmarkedet på Torget.' }
			],
			en: [
				{ q: "What's on in Bergen city centre?", a: 'Gåri shows all events in Bergen city centre over the next two weeks — concerts, exhibitions, theatre and more from 50 local sources.' },
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
			no: 'Kulturopplevelser for voksne i Bergen de neste to ukene — konserter, teater, omvisninger, utstillinger og matarrangementer. Samlet fra 50 lokale kilder.',
			en: 'Cultural experiences for adults in Bergen over the next two weeks — concerts, theatre, guided tours, exhibitions and food events. Collected from 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen har et rikt kulturtilbud for voksne — fra klassisk musikk i Grieghallen og jazz på Nattjazz til omvisninger på KODE og foredrag på Litteraturhuset. Bergen Filharmoniske Orkester og Den Nationale Scene legger jevnlig opp til forestillinger og konserter. Bymuseet, Museum Vest og Akvariet tilbyr omvisninger og utstillinger for alle aldre.',
				'Gåri samler arrangementer innen musikk, kultur, teater, omvisninger, mat og verksteder — alt tilpasset voksne. Listen hentes fra over 50 lokale kilder og oppdateres daglig. Utsolgte arrangementer fjernes fortløpende.',
				'Bergen er en kompakt kulturby. Mange av arrangementene finner sted i sentrum, i gangavstand fra hverandre. Sjekk gjerne prisene direkte hos arrangøren — mange steder tilbyr rabatter for honnør og studenter.'
			],
			en: [
				'Bergen offers a rich cultural programme for adults — from classical music at Grieghallen and jazz at Nattjazz to guided tours at KODE and talks at Litteraturhuset. Bergen Philharmonic Orchestra and Den Nationale Scene regularly programme concerts and performances. Bymuseet, Museum Vest and Akvariet offer tours and exhibitions for all ages.',
				'Gåri collects events in music, culture, theatre, guided tours, food and workshops — all suited to adults. Listings are drawn from over 50 local sources and updated daily. Sold-out events are removed as soon as they sell out.',
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
			no: 'Arrangementer for ungdom (13–18 år) i Bergen de neste to ukene — konserter, kultur, sport og workshops. Uten uteliv og 18+-arrangementer. Fra 50 lokale kilder.',
			en: 'Events for teens (13–18) in Bergen over the next two weeks — concerts, culture, sports and workshops. No nightlife or 18+ events. From 50 local sources.'
		},
		editorial: {
			no: [
				'Bergen har et bredt tilbud for ungdom \u2014 fra konserter på Kvarteret og Forum Scene til workshops på Litteraturhuset og utstillinger på KODE. Mange arrangementer er enten gratis eller har reduserte priser for unge under 18.',
				'Gåri samler arrangementer fra over 50 lokale kilder og oppdaterer listen daglig. Vi filtrerer bort arrangementer med aldersgrense (18+/20+) og uteliv, slik at det som vises passer for aldersgruppen 13\u201318 år.',
				'Sjekk gjerne konserter, sportshendelser og workshops \u2014 Bergen har mye å tilby unge kulturinteresserte. Mange museer har gratis inngang for barn og ungdom under 18.'
			],
			en: [
				'Bergen offers a wide range of events for teens \u2014 from concerts at Kvarteret and Forum Scene to workshops at Litteraturhuset and exhibitions at KODE. Many events are either free or offer reduced prices for under-18s.',
				'Gåri collects events from over 50 local sources and updates the listing daily. We filter out events with age restrictions (18+/20+) and nightlife, so everything shown is suitable for the 13\u201318 age group.',
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
};

/** Returns hreflang slugs for a collection. Unpaired collections use the same slug for both. */
export function getHreflangSlugs(slug: string): Record<'no' | 'en', string> {
	return HREFLANG_PAIRS[slug] ?? { no: slug, en: slug };
}
