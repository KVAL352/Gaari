export const CATEGORIES = [
	'music', 'culture', 'theatre', 'family', 'food',
	'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours'
] as const;

export type Category = (typeof CATEGORIES)[number];

export const BYDELER = [
	'Sentrum', 'Bergenhus', 'Fana', 'Ytrebygda',
	'Laksevåg', 'Fyllingsdalen', 'Åsane', 'Arna'
] as const;

export type Bydel = (typeof BYDELER)[number];

export type AgeGroup = 'all' | 'family' | '18+' | 'students';
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
	age_group: AgeGroup;
	language: EventLanguage;
	status: EventStatus;
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

export type BadgeType = 'today' | 'free' | 'soldout' | 'lasttickets' | 'cancelled';

export interface Badge {
	type: BadgeType;
	text: string;
	ariaLabel: string;
	icon: string;
}
