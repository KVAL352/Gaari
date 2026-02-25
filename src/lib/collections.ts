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
