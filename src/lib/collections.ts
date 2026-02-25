import type { GaariEvent, Lang } from './types';
import { isFreeEvent } from './utils';
import { isSameDay, getWeekendDates, matchesTimeOfDay, toOsloDateStr, getEndOfWeekDateStr, addDays } from './event-filters';

const FAMILY_TITLE_RE = /familie|barnelørdag|barnas\s|for\s+barn|barneforestilling/i;

export interface Collection {
	id: string;
	slug: string;
	title: Record<Lang, string>;
	description: Record<Lang, string>;
	ogSubtitle: Record<Lang, string>;
	faq?: Record<Lang, Array<{ q: string; a: string }>>;
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
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen denne helgen?', a: 'Gåri viser alle helgens arrangementer i Bergen — konserter, utstillinger, familieaktiviteter og mer. Oppdatert daglig fra 44 lokale kilder.' },
				{ q: 'Er det gratis arrangementer i Bergen denne helgen?', a: 'Bergen har mange gratis helgeaktiviteter. Se Gåris gratis-side for arrangementer uten billettpris denne uken.' },
				{ q: 'Hva kan familier gjøre i Bergen i helgen?', a: 'Gåri har en egen familiehelg-side med barneforestillinger, museumsaktiviteter og familievennlige arrangementer i Bergen.' }
			],
			en: [
				{ q: "What's on in Bergen this weekend?", a: 'Gåri shows all weekend events in Bergen — concerts, exhibitions, family activities and more. Updated daily from 44 local sources.' },
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
		faq: {
			no: [
				{ q: 'Hvilke konserter er det i Bergen denne uken?', a: 'Gåri samler alle konserter og livemusikk-arrangementer i Bergen denne uken fra 44 lokale kilder. Oppdatert daglig.' },
				{ q: 'Hvor kjøper jeg konsertbilletter i Bergen?', a: 'Gåri lenker direkte til billettsidene for alle konserter i Bergen. Klikk på arrangementet for kjøpslenke.' },
				{ q: 'Er det gratis konserter i Bergen denne uken?', a: 'Bergen har jevnlig gratis konserter på bibliotek, i parker og på kulturhus. Sjekk Gåris gratis-side for oversikt.' }
			],
			en: [
				{ q: 'What concerts are on in Bergen this week?', a: 'Gåri collects all concerts and live music events in Bergen this week from 44 local sources. Updated daily.' },
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
		faq: {
			no: [
				{ q: 'Hva skjer i Bergen denne helgen?', a: 'Gåri viser alle helgens arrangementer i Bergen — konserter, utstillinger, mat og mer. Oppdatert daglig fra 44 lokale kilder.' },
				{ q: 'Er det gratis ting å gjøre i Bergen denne helgen?', a: 'Bergen har mange gratis helgeaktiviteter. Bruk gratis-filteret for å finne kostnadsfrie arrangementer i helgen.' },
				{ q: 'Hva er det beste å gjøre i Bergen i helgen?', a: 'Bergen har konserter, utstillinger, matmarkeder, fjordturer og kulturarrangementer hver helg. Sjekk Gåri for ukens program.' }
			],
			en: [
				{ q: "What's on in Bergen this weekend?", a: 'Gåri shows all weekend events in Bergen — concerts, exhibitions, food and outdoor activities. Updated daily from 44 local sources.' },
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
	}
];

const collectionMap = new Map(collections.map(c => [c.slug, c]));

export function getCollection(slug: string): Collection | undefined {
	return collectionMap.get(slug);
}

export function getAllCollectionSlugs(): string[] {
	return collections.map(c => c.slug);
}
