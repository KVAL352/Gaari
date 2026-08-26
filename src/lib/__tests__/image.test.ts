import { describe, it, expect } from 'vitest';
import { optimizedSrc, optimizedSrcset } from '../image';

/**
 * Bildeoptimalisering via kildens eget CDN.
 *
 * Ett Sanity-bilde på forsiden var 4 397 KiB — en PNG på 1560×1096 vist i
 * 662×465. Målt: `?w=800&fm=webp&q=75` tok den samme filen fra 1 096 380 B
 * til 27 672 B.
 *
 * Testene her holder på det som gjør endringen trygg: ukjente verter skal
 * slippe gjennom urørt. En gjettet parameter kan gi 404 eller feil utsnitt,
 * og et knust bilde er verre enn et stort et.
 */
describe('optimizedSrc', () => {
	const sanity = 'https://cdn.sanity.io/images/zv9pm4dt/production/abc-1560x1096.png';

	it('ber Sanity om bredde, webp og kvalitet', () => {
		const ut = new URL(optimizedSrc(sanity, 400));
		expect(ut.searchParams.get('w')).toBe('400');
		expect(ut.searchParams.get('fm')).toBe('webp');
		expect(ut.searchParams.get('q')).toBe('75');
	});

	it('beskjærer aldri — vi vet ikke hvor motivet er', () => {
		expect(new URL(optimizedSrc(sanity, 400)).searchParams.get('fit')).toBe('max');
	});

	it('lar ukjente verter staa uroert', () => {
		for (const u of [
			'https://cdn.prod.website-files.com/abc/bilde.jpg',
			'https://st-3e7unmpj5a.nf.cdn.netflexapp.com/media/x.jpg',
			'https://bergenbibliotek.no/arrangement/x/@@download/image/y.jpeg',
			'https://tuploads.s3.amazonaws.com/production/uploads/z.jpeg',
		]) {
			expect(optimizedSrc(u, 400), u).toBe(u);
		}
	});

	it('oppgraderer http til https', () => {
		expect(optimizedSrc('http://example.com/a.jpg')).toBe('https://example.com/a.jpg');
	});

	it('uten bredde endres ingenting utover https', () => {
		expect(optimizedSrc(sanity)).toBe(sanity);
	});

	it('overlever en ugyldig URL i stedet for aa kaste', () => {
		// Et kast her ville tatt ned hele sida for ett daarlig felt i basen.
		expect(optimizedSrc('ikke en url', 400)).toBe('ikke en url');
	});

	it('overskriver parametre som alt ligger der', () => {
		const med = 'https://cdn.sanity.io/images/p/prod/a.png?w=9999&fm=png';
		const ut = new URL(optimizedSrc(med, 400));
		expect(ut.searchParams.get('w')).toBe('400');
		expect(ut.searchParams.get('fm')).toBe('webp');
	});
});

describe('optimizedSrcset', () => {
	it('bygger en ekte srcset for Sanity', () => {
		const s = optimizedSrcset('https://cdn.sanity.io/images/p/prod/a.png', [400, 600]);
		expect(s).toContain('400w');
		expect(s).toContain('600w');
		expect(s.split(', ')).toHaveLength(2);
	});

	it('gir tom streng for ukjente verter', () => {
		// En srcset med samme URL paa alle bredder lyver for nettleseren.
		expect(optimizedSrcset('https://bergenbibliotek.no/a.jpg', [400, 600])).toBe('');
	});

	it('gir tom streng for ugyldig URL', () => {
		expect(optimizedSrcset('tull', [400])).toBe('');
	});
});
