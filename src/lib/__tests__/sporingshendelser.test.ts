import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Hver sporingshendelse skal ha ett sted den utløses fra.
 *
 * 26. august 2026 la jeg inn `filter-brukt` for å måle hvor mange som bruker
 * filtrene på forsiden — uten å oppdage at `filter-used` hadde spurt om
 * nøyaktig det samme siden før, fra `EventDiscovery.svelte`. To hendelser for
 * ett klikk, og en måling som hadde blitt dobbelt.
 *
 * Verre enn dobbelttellingen: jeg holdt på å anbefale en arkitekturendring
 * fordi jeg trodde ingen filtrerte. Svaret — 2 465 filterbruk på 90 dager —
 * lå i vår egen database hele tiden.
 *
 * MEN — og dette er verdt å være ærlig om — denne testen ville ikke fanget
 * nettopp den feilen. `filter-brukt` og `filter-used` er ulike navn i ulike
 * filer. Testen fanger bare når to steder fyrer SAMME navn, altså
 * dobbelttelling, som er en annen og enklere feil.
 *
 * Den semantiske halvdelen — «måler vi dette fra før?» — kan ikke en test
 * svare på. Der er verktøyet `scripts/finnes-det-alt.mjs`, som søker gjennom
 * kode, dokumentasjon, påminnelser og minnenotater på én gang.
 */

const ROT = join(import.meta.dirname, '..', '..');

function alleFiler(katalog: string, ut: string[] = []): string[] {
	for (const navn of readdirSync(katalog)) {
		const sti = join(katalog, navn);
		if (statSync(sti).isDirectory()) {
			if (navn === 'node_modules' || navn.startsWith('.')) continue;
			alleFiler(sti, ut);
		} else if (/\.(svelte|ts|html)$/.test(navn) && !navn.endsWith('.test.ts')) {
			ut.push(sti);
		}
	}
	return ut;
}

/** Hendelsesnavn -> filene som utløser det. */
function hendelser(): Map<string, string[]> {
	const kart = new Map<string, string[]>();
	for (const sti of alleFiler(ROT)) {
		const innhold = readFileSync(sti, 'utf-8');
		const kort = sti.slice(ROT.length + 1).replace(/\\/g, '/');
		// umami.track('navn', ...) og data-umami-event="navn"
		for (const m of innhold.matchAll(/umami\??\.track\(\s*['"`]([a-zA-Z0-9_-]+)['"`]/g)) {
			kart.set(m[1], [...(kart.get(m[1]) ?? []), kort]);
		}
		for (const m of innhold.matchAll(/data-umami-event=["']([a-zA-Z0-9_-]+)["']/g)) {
			kart.set(m[1], [...(kart.get(m[1]) ?? []), kort]);
		}
	}
	return kart;
}

describe('sporingshendelser', () => {
	it('finner faktisk hendelsene i kildekoden', () => {
		// Uten denne ville testen under vaert tom og alltid groenn — samme
		// fella som en vitest-kjoering fra feil katalog.
		const k = hendelser();
		expect(k.size, 'fant ingen umami-hendelser i src/ — leser testen riktig sted?').toBeGreaterThan(5);
		expect([...k.keys()]).toContain('filter-used');
	});

	/**
	 * Noen hendelser SKAL fyres fra flere steder, og det er et bevisst valg:
	 * man vil ha ett tall for «meldte seg på nyhetsbrevet», uansett hvilken av
	 * de tre komponentene brukeren stod i.
	 *
	 * Lista er derfor en tillatelse, ikke en beskrivelse. Dukker et nytt navn
	 * opp flere steder uten å stå her, er det som regel en glipp — to
	 * komponenter som teller det samme klikket dobbelt.
	 */
	const FLERE_STEDER_MED_VILJE = new Set(['newsletter-signup', 'social-click']);

	it('utloeser ingen utilsiktet hendelse fra to steder', () => {
		const duplikater = [...hendelser().entries()]
			.filter(([navn, filer]) => new Set(filer).size > 1 && !FLERE_STEDER_MED_VILJE.has(navn))
			.map(([navn, filer]) => `${navn}: ${[...new Set(filer)].join(', ')}`);

		expect(duplikater, `Samme hendelsesnavn utloeses flere steder:\n  ${duplikater.join('\n  ')}`)
			.toEqual([]);
	});

	it('bruker kebab-case, saa navnene er til aa kjenne igjen i Umami', () => {
		const rare = [...hendelser().keys()].filter(n => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n));
		expect(rare, `Hendelsesnavn utenfor kebab-case: ${rare.join(', ')}`).toEqual([]);
	});
});
