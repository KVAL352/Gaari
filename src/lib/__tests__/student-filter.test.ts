import { describe, it, expect } from 'vitest';
import { isStudentRelevant, studentRelevanceScore, parseLowestPrice } from '../utils';

// Helper to build a minimal event object
function evt(overrides: Partial<{
	title_no: string;
	description_no: string;
	price: string | number;
	age_group: string;
	category: string;
	venue_name: string;
	bydel: string;
}> = {}) {
	return {
		title_no: overrides.title_no ?? 'Test Event',
		description_no: overrides.description_no ?? '',
		price: overrides.price ?? '',
		age_group: overrides.age_group ?? '',
		category: overrides.category ?? 'culture',
		bydel: overrides.bydel ?? 'Sentrum',
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

		it('excludes "juniorklubb"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Juniorklubb', category: 'workshop' }))).toBe(false);
		});

		it('excludes "Rolland juniorklubb"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Rolland juniorklubb' }))).toBe(false);
		});

		it('excludes "Laksevåg JUNIOR"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Laksevåg JUNIOR' }))).toBe(false);
		});

		it('excludes "Språkleik for dei minste"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Språkleik for dei minste' }))).toBe(false);
		});

		it('excludes "Hjelp til skolearbeidet"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Hjelp til skolearbeidet - med Røde Kors' }))).toBe(false);
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

		it('excludes "Bærekraftstrappen" business events', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Bærekraftstrappen: Fra strategi til konkurransekraft'
			}))).toBe(false);
		});

		it('excludes "Årskonferansen"', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Stedet å være i 2026: Årskonferansen og Årsmiddagen'
			}))).toBe(false);
		});

		it('excludes "Sjømaktseminaret"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Sjømaktseminaret 2026' }))).toBe(false);
		});

		it('excludes "Servicebyen Bergen"', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Servicebyen Bergen: Fra god til enestående'
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

		it('excludes "Nabolagskafé Olsvik"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Nabolagskafé Olsvik' }))).toBe(false);
		});

		it('excludes "Strikkekafé"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Strikkekafé i Olsvik Grendahus' }))).toBe(false);
		});

		it('excludes "Datahjelp"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Gratis datahjelp!' }))).toBe(false);
		});

		it('excludes "Lesesirkel"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Lesesirkel på Åsane Bibliotek' }))).toBe(false);
		});

		it('excludes "Høytlesning og håndarbeid"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Høytlesning og håndarbeid' }))).toBe(false);
		});

		it('excludes "Håndarbeid for alle"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Håndarbeid for alle' }))).toBe(false);
		});

		it('excludes "Litterær lunsj"', () => {
			expect(isStudentRelevant(evt({ title_no: 'Litterær lunsj: bokprat' }))).toBe(false);
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

	describe('scoring system — includes based on combined signals', () => {
		it('includes free concerts (music+free = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Gratiskonsert',
				category: 'music',
				price: '0'
			}))).toBe(true);
		});

		it('includes cheap nightlife (nightlife+cheap = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Klubbkveld',
				category: 'nightlife',
				price: '100 kr'
			}))).toBe(true);
		});

		it('includes free workshops (free = 3)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Kodeklubb for voksne',
				category: 'workshop',
				price: '0'
			}))).toBe(true);
		});

		it('includes events at student venues (venue = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Pub Quiz',
				category: 'culture',
				venue_name: 'Kvarteret',
				price: '100 kr'
			}))).toBe(true);
		});

		it('includes events at Hulen (venue = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Doom metal kveld',
				category: 'culture',
				venue_name: 'Hulen',
				price: '200 kr'
			}))).toBe(true);
		});

		it('includes Brann matches (sports+moderate = 3)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Brann – Lillestrøm',
				category: 'sports',
				price: '200 kr'
			}))).toBe(true);
		});

		it('includes free festivals (festival+free = 5)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Kjøtt Festival',
				category: 'festival',
				price: '0'
			}))).toBe(true);
		});

		it('includes cheap music (music+cheap = 3)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Indiekonsert',
				category: 'music',
				price: '100 kr'
			}))).toBe(true);
		});

		it('includes free culture events (free = 3)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Gratis utstilling',
				category: 'culture',
				price: '0'
			}))).toBe(true);
		});

		it('includes "Gratis" culture events (free = 3)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Fredagsfølelsen',
				category: 'culture',
				price: 'Gratis'
			}))).toBe(true);
		});
	});

	describe('scoring system — excludes low-scoring events', () => {
		it('excludes paid culture events (cheap = 2)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Hansabyer – handel og makt',
				category: 'culture',
				price: '100 kr'
			}))).toBe(false);
		});

		it('excludes expensive music (music+no price bonus = 1)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Sigvart Dagsland i Johanneskirken',
				category: 'music',
				price: '300 kr'
			}))).toBe(false);
		});

		it('excludes expensive theatre (theatre+no price bonus = 1)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Hamlet',
				category: 'theatre',
				price: '300 kr'
			}))).toBe(false);
		});

		it('excludes paid tours (no signals)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Bryggen Guiding',
				category: 'tours',
				price: '150 kr'
			}))).toBe(false);
		});

		it('excludes paid food events (no signals)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Åpen Smaking 7 Fjell',
				category: 'food',
				price: '200 kr'
			}))).toBe(false);
		});

		it('excludes moderately priced workshops (cheap = 2)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Malekurs',
				category: 'workshop',
				price: '100 kr'
			}))).toBe(false);
		});
	});

	describe('scoring function returns expected values', () => {
		it('student venue + free = high score', () => {
			expect(studentRelevanceScore(evt({
				venue_name: 'Kvarteret',
				price: '0',
				category: 'culture'
			}))).toBe(7); // venue(4) + free(3)
		});

		it('music + 300kr = low score', () => {
			expect(studentRelevanceScore(evt({
				category: 'music',
				price: '300 kr'
			}))).toBe(1); // music(1) only, 300kr > 250 so no price bonus
		});

		it('nightlife + 18+ + cheap = good score', () => {
			expect(studentRelevanceScore(evt({
				category: 'nightlife',
				age_group: '18+',
				price: '100 kr'
			}))).toBe(5); // nightlife(2) + 18+(1) + cheap(2)
		});

		it('paid culture = zero score', () => {
			expect(studentRelevanceScore(evt({
				category: 'culture',
				price: '200 kr'
			}))).toBe(1); // moderate price(1) only
		});
	});

	describe('location penalty — outside student areas', () => {
		it('free music in Laksevåg gets penalty (music+free−bydel = 2)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Gratiskonsert',
				category: 'music',
				price: '0',
				bydel: 'Laksevåg'
			}))).toBe(false); // 1+3−2 = 2, below threshold
		});

		it('free music in Sentrum passes (music+free = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Gratiskonsert',
				category: 'music',
				price: '0',
				bydel: 'Sentrum'
			}))).toBe(true);
		});

		it('free music in Bergenhus passes (music+free = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Gratiskonsert',
				category: 'music',
				price: '0',
				bydel: 'Bergenhus'
			}))).toBe(true);
		});

		it('student venue in Fana still passes (venue outweighs penalty)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Konsert',
				category: 'music',
				venue_name: 'Garage',
				price: '100 kr',
				bydel: 'Fana'
			}))).toBe(true); // 4+1+2−2 = 5
		});

		it('cheap nightlife in Åsane excluded (nightlife+cheap−bydel = 2)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Afterwork',
				category: 'nightlife',
				price: '100 kr',
				bydel: 'Åsane'
			}))).toBe(false); // 2+2−2 = 2
		});

		it('nightlife in Sentrum passes (nightlife+cheap = 4)', () => {
			expect(isStudentRelevant(evt({
				title_no: 'Klubbkveld',
				category: 'nightlife',
				price: '100 kr',
				bydel: 'Sentrum'
			}))).toBe(true);
		});

		it('explicit student event in Fana still passes (strong signal)', () => {
			expect(isStudentRelevant(evt({
				age_group: 'students',
				bydel: 'Fana'
			}))).toBe(true); // bypasses scoring entirely
		});

		it('no bydel = no penalty', () => {
			expect(studentRelevanceScore(evt({
				category: 'music',
				price: '0'
			}))).toBe(4); // music(1)+free(3), no penalty
		});

		it('Arna gets penalty', () => {
			expect(studentRelevanceScore(evt({
				category: 'music',
				price: '0',
				bydel: 'Arna'
			}))).toBe(2); // music(1)+free(3)−bydel(2)
		});
	});
});
