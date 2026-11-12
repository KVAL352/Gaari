import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INQUIRY_KILDER, byggNettsideMelding, erNettsideInnsending, varselEmne, varselIngress } from '../innsending';

describe('kilde avgjør om en henvendelse er nettside-innsending', () => {
	it('bare «nettside» er nettside-innsending', () => {
		expect(erNettsideInnsending('nettside')).toBe(true);
		for (const k of ['b2b', '', 'Nettside', 'nettside ', null, undefined]) {
			expect(erNettsideInnsending(k)).toBe(false);
		}
	});

	it('fritekst kan aldri gjøre en B2B-henvendelse til nettside-innsending', () => {
		// Typen leses fra kilde, ikke fra meldingen. Meldingen er ikke et parameter.
		expect(varselEmne('Org', 'Ola', 'b2b')).toBe('[Inquiry] Org — Ola');
		expect(varselIngress('b2b')).toContain('B2B contact form');
	});

	it('nettside-innsending får eget emne og egen ingress', () => {
		expect(varselEmne('https://x.no', 'Ola', 'nettside')).toBe('[Nettside-innsending] https://x.no — Ola');
		expect(varselIngress('nettside')).toContain('website submission');
	});

	it('hver lovlig kilde gir ett av de to svarene', () => {
		expect(INQUIRY_KILDER).toEqual(['b2b', 'nettside']);
		for (const k of INQUIRY_KILDER) {
			expect(varselEmne('O', 'N', k)).toMatch(/^\[(Inquiry|Nettside-innsending)\] /);
		}
	});
});

describe('byggNettsideMelding', () => {
	it('legger notatet først, så bildevalget, uten ledende eller avsluttende tomrom', () => {
		expect(byggNettsideMelding('Se programmet', '\n\nBilderettigheter bekreftet.')).toBe('Se programmet\n\nBilderettigheter bekreftet.');
		expect(byggNettsideMelding('', '\n\nBilderettigheter bekreftet.')).toBe('Bilderettigheter bekreftet.');
		expect(byggNettsideMelding('  ', '')).toBe('');
	});
});

describe('prefikset «Nettside-innsendelse» er borte fra koden', () => {
	// To sannheter om samme ting var feilen. Migreringen er det eneste stedet
	// prefikset skal nevnes, fordi den rydder opp i gamle rader.
	function filer(katalog: string): string[] {
		return readdirSync(katalog).flatMap((n) => {
			const sti = join(katalog, n);
			if (n === 'node_modules' || n === '.svelte-kit') return [];
			return statSync(sti).isDirectory() ? filer(sti) : [sti];
		});
	}
	it('ingen kodefil under src/ bruker det', () => {
		const rot = fileURLToPath(new URL('../../', import.meta.url));
		const treff = filer(rot)
			.filter((f) => /\.(ts|svelte)$/.test(f) && !f.endsWith('innsending.test.ts'))
			.filter((f) => readFileSync(f, 'utf-8').includes('Nettside-innsendelse'));
		expect(treff).toEqual([]);
	});
});
