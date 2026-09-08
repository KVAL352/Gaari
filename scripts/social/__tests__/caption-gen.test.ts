import { describe, it, expect } from 'vitest';
import { generateCaption, type CaptionEvent } from '../caption-gen.js';

/**
 * Captionen er det eneste i SoMe-pakken som er ren tekst, og den går ut
 * offentlig i Gåris navn. Den hadde ingen tester før 8. september 2026.
 *
 * FEILEN SOM UTLØSTE DEM: fredagsposten 7. september inneholdt linjen
 *
 *   Korøvelse — mandag 14. september @ , kl. 19:00
 *
 * Et arrangement uten stedsnavn ga en naken «@» midt i setningen. Ingenting
 * feilet, ingenting ble rødt, og teksten ville blitt publisert som den var
 * hvis den ikke tilfeldigvis ble lest av et menneske først.
 */

const hendelse = (over: Partial<CaptionEvent> = {}): CaptionEvent => ({
	title: 'Testkonsert',
	venue: 'Et Sted',
	date_start: '2026-09-11T19:00:00+02:00',
	category: 'music',
	...over
});

const lag = (events: CaptionEvent[]) =>
	generateCaption('Konserter i Bergen', events, 'https://gaari.no/no/konserter', ['#bergen']);

describe('stedsnavn i captionen', () => {
	it('skriver ikke en naken @ når stedet mangler', () => {
		for (const tomt of ['', '   ', undefined as unknown as string]) {
			const tekst = lag([hendelse({ title: 'Korøvelse', venue: tomt })]);
			expect(tekst, `tomt sted «${String(tomt)}» ga en naken @`).not.toMatch(/@\s*,/);
			expect(tekst).not.toMatch(/@\s*$/m);
			expect(tekst).toContain('Korøvelse');
		}
	});

	it('tar fortsatt med stedet når det finnes', () => {
		const tekst = lag([hendelse({ title: 'Konsert', venue: 'Et Sted' })]);
		expect(tekst).toContain('Konsert @ Et Sted');
	});

	it('beholder klokkeslettet også uten sted', () => {
		const tekst = lag([hendelse({ title: 'Korøvelse', venue: '' })]);
		expect(tekst).toContain('kl. 19:00');
	});
});

describe('captionens faste deler', () => {
	it('setter lenken på linje to, ikke lenger ned', () => {
		// Rekkefølgen er bevisst: lenken skal stå over «les mer»-kuttet på
		// Instagram. Se feedback_social_content.md.
		const linjer = lag([hendelse()]).split('\n');
		expect(linjer[1]).toContain('https://gaari.no/no/konserter');
	});

	it('bruker ingen emojier', () => {
		// Gjelder all utgående tekst i Kjerstis navn.
		expect(lag([hendelse()])).not.toMatch(/\p{Extended_Pictographic}/u);
	});

	it('legger hashtaggene sist', () => {
		const linjer = lag([hendelse()]).trimEnd().split('\n');
		expect(linjer[linjer.length - 1]).toBe('#bergen');
	});
});
