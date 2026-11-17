import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { matchesAudience, type AudienceEvent } from '../audience';

const ev = (o: Partial<AudienceEvent>): AudienceEvent => ({
	title_no: 'Konsert',
	category: 'music',
	age_group: 'all',
	venue_name: 'Grieghallen',
	price: '300',
	description_no: '',
	...o
} as AudienceEvent);

describe('matchesAudience', () => {
	it('familie: age_group, kategori og tittel teller alle (knappen talte før bare age_group)', () => {
		expect(matchesAudience(ev({ age_group: 'family' }), 'family')).toBe(true);
		expect(matchesAudience(ev({ category: 'family' }), 'family')).toBe(true);
		expect(matchesAudience(ev({ title_no: 'Barnelørdag: BanjoLilly' }), 'family')).toBe(true);
		expect(matchesAudience(ev({}), 'family')).toBe(false);
	});

	it('18+: familiearrangement på en voksenscene er ikke 18+', () => {
		expect(matchesAudience(ev({ venue_name: 'Hulen' }), 'adult')).toBe(true);
		expect(matchesAudience(ev({ venue_name: 'Hulen', category: 'family' }), 'adult')).toBe(false);
		expect(matchesAudience(ev({ venue_name: 'Hulen', title_no: 'Barnas Hulen' }), 'adult')).toBe(false);
	});

	it('ungdom: «ung» som eget ord teller, 18+ og uteliv gjør det ikke', () => {
		expect(matchesAudience(ev({ title_no: 'Tirsdagsklatring med DNT Ung' }), 'ungdom')).toBe(true);
		expect(matchesAudience(ev({ title_no: 'Ungdomskveld', age_group: '18+' }), 'ungdom')).toBe(false);
		expect(matchesAudience(ev({ title_no: 'Ungdomskveld', category: 'nightlife' }), 'ungdom')).toBe(false);
	});

	it('tom målgruppe slipper alt gjennom', () => {
		expect(matchesAudience(ev({}), '')).toBe(true);
	});
});

describe('én regel for tall og filter', () => {
	// Kopiene gled fra hverandre: «Familie 88» ga 122 treff. Begge skal kalle matchesAudience.
	const root = resolve(__dirname, '../../..');
	it.each([
		'src/lib/components/EventDiscovery.svelte',
		'src/routes/[lang]/+page.svelte'
	])('%s bruker matchesAudience og har ingen egen kopi av regelen', (file) => {
		const src = readFileSync(resolve(root, file), 'utf-8');
		expect(src).toContain('matchesAudience(');
		expect(src).not.toMatch(/age_group === 'family'/);
	});
});
