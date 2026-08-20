import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Kontrastvern for fargetokenene i app.css.
 *
 * Finnes fordi den publiserte tilgjengelighetserklæringen tallfester kontrast,
 * og fordi feilen som utløste denne testen bare fantes i mørk modus: `free`-
 * merket hadde hvit tekst på en grønnfarge som var lysnet for mørk bakgrunn, og
 * havnet på 2,90:1. Ingen ser det uten å bytte modus, og ingen test stoppet det.
 *
 * Testen leser app.css i stedet for å gjenta verdiene her. Gjentatte verdier
 * ville drevet fra hverandre, og da ville testen bekreftet sin egen kopi.
 */

const css = readFileSync(resolve(__dirname, '../../app.css'), 'utf8');

/** Henter tokenverdier. Mørk modus overstyrer inne i @media-blokken. */
function tokens(morkModus: boolean): Record<string, string> {
	const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
	const lys = css.slice(0, darkStart);
	const mork = css.slice(darkStart);
	const ut: Record<string, string> = {};
	const les = (tekst: string) => {
		// Både direkte heksverdier og var()-henvisninger. Flere semantiske tokener
		// peker på en funkis-primitiv (--color-today: var(--funkis-red)), og uten
		// dette leddet ville de manglet i tabellen.
		for (const m of tekst.matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6}|var\(--[a-z0-9-]+\))\s*;/g))
			ut[m[1]] = m[2];
	};
	les(lys);
	if (morkModus) les(mork);

	// Løs opp var()-kjeder til heksverdier. Grensen på ti ledd er en sperre mot
	// en sirkulær definisjon, ikke et uttrykk for hvor dype kjedene er.
	for (const nokkel of Object.keys(ut)) {
		let verdi = ut[nokkel];
		for (let i = 0; i < 10 && verdi.startsWith('var('); i++) {
			verdi = ut[verdi.slice(4, -1)] ?? verdi;
		}
		ut[nokkel] = verdi;
	}
	return ut;
}

function luminans(hex: string): number {
	const n = hex.replace('#', '');
	const [r, g, b] = [0, 2, 4]
		.map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
		.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function kontrast(a: string, b: string): number {
	const [hoy, lav] = [luminans(a), luminans(b)].sort((x, y) => y - x);
	return (hoy + 0.05) / (lav + 0.05);
}

// AA for vanlig tekst. Merkene er 12px/500–600, altså ikke «large text»
// (som krever 18pt, eller 14pt ved fet skrift), så 3:1 gjelder ikke her.
const AA_TEKST = 4.5;

/** Merkene i StatusBadge.svelte, som par av bakgrunns- og tekst-token. */
const MERKER: Array<[string, string, string]> = [
	['today', '--color-today', 'hvit'],
	['free', '--color-free', '--color-free-text'],
	['soldout', '--color-soldout', 'hvit'],
	['lasttickets', '--color-lasttickets-bg', '--color-lasttickets-text'],
	['cancelled', '--color-cancelled', 'hvit'],
	['studentprice', '--color-studentprice-bg', '--color-studentprice-text']
];

for (const morkModus of [false, true]) {
	const modus = morkModus ? 'mørk modus' : 'lys modus';
	const t = tokens(morkModus);

	describe(`kontrast — ${modus}`, () => {
		it('alle tokenene testen trenger finnes i app.css', () => {
			const kreves = [
				'--color-bg',
				'--color-bg-surface',
				'--color-text-primary',
				'--color-text-secondary',
				'--color-text-muted',
				...MERKER.flatMap(([, bg, fg]) => (fg === 'hvit' ? [bg] : [bg, fg]))
			];
			for (const k of kreves) expect(t[k], `${k} mangler`).toBeTruthy();
		});

		// Tekst måles mot begge flatene den faktisk ligger på: sidebakgrunnen og
		// kortflaten. Å bare måle mot den lyseste ville gitt et penere tall enn
		// det brukeren ser.
		for (const rolle of ['primary', 'secondary', 'muted']) {
			for (const flate of ['--color-bg', '--color-bg-surface']) {
				it(`${rolle}-tekst mot ${flate} er minst ${AA_TEKST}:1`, () => {
					const r = kontrast(t[`--color-text-${rolle}`], t[flate]);
					expect(r, `${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEKST);
				});
			}
		}

		for (const [navn, bgToken, fgToken] of MERKER) {
			it(`merket «${navn}» er minst ${AA_TEKST}:1`, () => {
				const fg = fgToken === 'hvit' ? '#FFFFFF' : t[fgToken];
				const r = kontrast(t[bgToken], fg);
				expect(r, `${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEKST);
			});
		}

		it('aksentfargen er lesbar som tekst på kortflaten', () => {
			// «Gåri-uka»-merket er rød tekst på hvit flate. Flaten er ugjennomsiktig
			// med vilje — med gjennomsiktighet bestemte bildet bak kontrasten.
			const r = kontrast(t['--funkis-red'], '#FFFFFF');
			expect(r, `${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEKST);
		});
	});
}

describe('tallene i tilgjengelighetserklæringen', () => {
	// Erklæringen er publisert med tilsynsorgan oppgitt og skal bare si det som
	// er sant. Sier den et tall, må tallet kunne regnes ut fra tokenene.
	const erklaering = readFileSync(
		resolve(__dirname, '../../routes/[lang]/tilgjengelighet/+page.svelte'),
		'utf8'
	);

	it('oppgir laveste målte kontrast per tekstrolle, ikke et tall uten dekning', () => {
		const lys = tokens(false);
		const mork = tokens(true);
		const laveste = (rolle: string) =>
			Math.min(
				...[lys, mork].flatMap((t) =>
					['--color-bg', '--color-bg-surface'].map((flate) =>
						kontrast(t[`--color-text-${rolle}`], t[flate])
					)
				)
			);

		for (const [rolle, ordNo] of [
			['primary', 'primærtekst'],
			['secondary', 'sekundærtekst'],
			['muted', 'dempet tekst']
		]) {
			// Begge språkversjonene står i samme fil, med komma i den norske og
			// punktum i den engelske. Begge må stemme, ellers kan den ene drive.
			const komma = laveste(rolle).toFixed(1).replace('.', ',');
			const punktum = laveste(rolle).toFixed(1);
			expect(
				erklaering.includes(komma),
				`erklæringen mangler ${komma}:1 for ${ordNo} (norsk) — målt laveste er ${komma}:1`
			).toBe(true);
			expect(
				erklaering.includes(punktum),
				`erklæringen mangler ${punktum}:1 for ${ordNo} (engelsk) — målt laveste er ${komma}:1`
			).toBe(true);
		}
	});
});
