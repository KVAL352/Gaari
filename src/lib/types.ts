export const CATEGORIES = [
	'music', 'culture', 'theatre', 'family', 'food',
	'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours'
] as const;

export type Category = (typeof CATEGORIES)[number];

// Bergen kommune har åtte offisielle bydeler: Arna, Bergenhus, Fana,
// Fyllingsdalen, Laksevåg, Ytrebygda, Årstad og Åsane. «Sentrum» er ikke en
// av dem — det er en del av Bergenhus — men vi har det med som eget valg
// fordi det er slik folk søker og tenker om byen.
export const BYDELER = [
	'Sentrum', 'Bergenhus', 'Årstad', 'Fana', 'Ytrebygda',
	'Laksevåg', 'Fyllingsdalen', 'Åsane', 'Arna'
] as const;

export type Bydel = (typeof BYDELER)[number];

export type AgeGroup = 'all' | 'family' | '18+' | 'students' | 'youth';
export type TimeOfDay = 'morning' | 'daytime' | 'evening' | 'night' | 'latenight';
export type EventStatus = 'pending' | 'approved' | 'expired' | 'cancelled';
export type EventLanguage = 'no' | 'en' | 'both';
export type Lang = 'no' | 'en';

export interface GaariEvent {
	id: string;
	slug: string;
	title_no: string;
	title_en?: string;
	description_no: string;
	description_en?: string;
	category: Category;
	date_start: string;
	date_end?: string;
	venue_name: string;
	address: string;
	bydel: Bydel;
	latitude?: number;
	longitude?: number;
	price: string | number;
	ticket_url?: string;
	source?: string;
	source_url?: string;
	image_url?: string;
	image_credit?: string;
	age_group: AgeGroup;
	language: EventLanguage;
	status: EventStatus;
	is_sold_out?: boolean;
	is_canary?: boolean;
}

export interface FilterState {
	when?: string;
	category?: Category;
	bydel?: Bydel;
	price?: string;
	audience?: string;
	q?: string;
	view?: 'grid' | 'list';
	page?: number;
}

export type BadgeType = 'today' | 'free' | 'soldout' | 'lasttickets' | 'cancelled' | 'studentprice';

export interface Badge {
	type: BadgeType;
	text: string;
	ariaLabel: string;
	icon: string;
}
