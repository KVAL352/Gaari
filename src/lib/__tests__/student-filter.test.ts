import { describe, it, expect } from 'vitest';
import { isStudentRelevant, parseLowestPrice } from '../utils';

// Helper to build a minimal event object
function evt(overrides: Partial<{
	title_no: string;
	description_no: string;
	price: string | number;
	age_group: string;
	category: string;
	venue_name: string;
}> = {}) {
	return {
		title_no: overrides.title_no ?? 'Test Event',
		description_no: overrides.description_no ?? '',
		price: overrides.price ?? '',
		age_group: overrides.age_group ?? '',
		category: overrides.category ?? 'culture',
		venue_name: overrides.venue_name ?? 'Test Venue',
	};
}

describe('parseLowestPrice — Norwegian thousand separators', () => {
	it('parses "2 399 kr" as 2399', () => {
		expect(parseLowestPrice('2 399 kr')).toBe(2399);
	});

	it('parses "1 500,-" as 1500', () => {
		expect(parseLowestPrice('1 500,-')).toBe(1500);
	});

	it('parses "2\u00a0399 kr" (non-breaking space) as 2399', () => {
		expect(parseLowestPrice('2\u00a0399 kr')).toBe(2399);
	});

	it('still parses simple prices correctly', () => {
		expect(parseLowestPrice('350 kr')).toBe(350);
		expect(parseLowestPrice('0')).toBe(0);
		expect(parseLowestPrice(200)).toBe(200);
	});

	it('still handles ranges (picks lowest)', () => {
		expect(parseLowestPrice('200–400 kr')).toBe(200);
	});

	it('returns null for empty/null', () => {
		expect(parseLowestPrice('')).toBeNull();
		expect(parseLowestPrice(null)).toBeNull();
	});
});

describe('isStudentRelevant', () => {
	describe('always includes explicit student events', () => {
		it('includes age_group=students', () => {
			expect(isStudentRelevant(evt({ age_group: 'students' }))).toBe(true);
		});

		it('includes category=student', () => {
			expect(isStudentRelevant(evt({ category: 'student' }))).toBe(true);
		});

		it('includes explicit student even if expensive', () => {
			expect(isStudentRelevant(evt({ age_group: 'students', price: '500 kr' }))).toBe(true);
		});
	});

	describe('excludes family events', () => {
		it('excludes age_group=family', () => {
			expect(isStudentRelevant(evt({ age_group: 'family' }))).toBe(false);
		});

		it('excludes category=family', () => {
			expect(isStudentRelevant(evt({ category: 'family' }))).toBe(false);
		});
	});

	describe('excludes youth events (teens, not college-age)', () => {
		it('excludes age_group=youth', () => {
			expect(isStudentRelevant(evt({ age_group: 'youth' }))).toBe(false);
		});

		it('excludes "ungdom" in title', () => {
			expect(isStudentRelevant(evt({ title_no: 'Ungdomskvelden: Filmklubb for ungdom' }))).toBe(false);
		});

		it('excludes "UNG" branding in title', () => {
			expect(isStudentRelevant(evt({ title_no: 'Maling med Kulturrommet UNG' }))).toBe(false);
		});

		it('excludes "for barn" in title', () => {
			expect(isStudentRelevant(evt({ title_no: 'Teater for barn' }))).toBe(false);
		});
	});

	describe('excludes senior/pensjonist events', () => {
		it('excludes "Seniortur" in title', () => {
			expect(isStudentRelevant(evt({ title_no: 'Seniortur til Spåkefjellet' }))).toBe(false);
		});

		it('excludes "Senior Bergen" in description', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Haugland - Såbotshaugen - Norhytten',
				description_no: 'Fottur med Senior Bergen'
			}))).toBe(false);
		});

		it('excludes "pensjonist" in title/description', () => {
			expect(isStudentRelevant(evt({ title_no: 'Pensjonisttreff på kafé' }))).toBe(false);
		});

		it('excludes "eldretreff"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Eldretreff med musikk' }))).toBe(false);
		});

		it('excludes "senior" in description even if not in title', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Enkel fottur langs Storelva i Arna',
				description_no: 'Enkel fellestur, Dagsaktivitet. Seniorer'
			}))).toBe(false);
		});
	});

	describe('excludes business/professional events', () => {
		it('excludes Bergen Næringsråd events', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Slaget om E39 Vestlandsvegen',
				venue_name: 'Bergen Næringsråd'
			}))).toBe(false);
		});

		it('excludes "næringsliv" in title', () => {
			expect(isStudentRelevant(evt({ title_no: 'Næringslivsfrokost Bergen' }))).toBe(false);
		});

		it('excludes "transportplan" in title', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Nasjonal transportplan 2029-2040'
			}))).toBe(false);
		});
	});

	describe('excludes senior-coded activities', () => {
		it('excludes "enkel fottur"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Enkel fottur i Fana' }))).toBe(false);
		});

		it('excludes "turvenner"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Turvenner' }))).toBe(false);
		});

		it('excludes "nabolagskafé"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Kafe Hjemom - din nabolagskafé' }))).toBe(false);
		});
	});

	describe('excludes literary events (skews older)', () => {
		it('excludes "forfattertreff"', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Forfattertreff: Marit Eikemo om Brødrene Eikemo'
			}))).toBe(false);
		});

		it('excludes "bokbad"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Bokbad med Lars Saabye Christensen' }))).toBe(false);
		});
	});

	describe('excludes expensive events', () => {
		it('excludes events over 350 kr', () => {
			expect(isStudentRelevant(evt({ price: '500 kr' }))).toBe(false);
		});

		it('excludes Norwegian thousand-separated prices', () => {
			expect(isStudentRelevant(evt({ price: '2 399 kr' }))).toBe(false);
		});
	});

	describe('excludes age range targeting older demographics', () => {
		it('excludes (30-60 år)', () => {
			expect(isStudentRelevant(evt({ title_no: 'Yoga (30-60 år)' }))).toBe(false);
		});
	});

	describe('includes legitimate student-relevant events', () => {
		it('includes free concerts', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Gratiskonsert på Kvarteret',
				category: 'music',
				price: '0'
			}))).toBe(true);
		});

		it('includes affordable nightlife', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Klubbkveld på Hulen',
				category: 'nightlife',
				price: '100 kr'
			}))).toBe(true);
		});

		it('includes free workshops', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Kodeklubb for voksne',
				category: 'workshop',
				price: '0'
			}))).toBe(true);
		});

		it('includes affordable theatre', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Hamlet',
				category: 'theatre',
				price: '200 kr'
			}))).toBe(true);
		});
	});
});
