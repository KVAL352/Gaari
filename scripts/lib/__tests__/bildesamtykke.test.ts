import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { IMAGE_APPROVED_SOURCES, PROMO_APPROVED_SOURCES } from '../utils.js';

/**
 * Bildesamtykke-registeret (docs/bildesamtykke.md) er det vi viser fram hvis
 * noen krever å vite hvorfor et bilde lå på gaari.no. Allowlistene i utils.ts
 * er det som faktisk styrer koden. Driver de to fra hverandre, har vi et
 * dokument som lyver.
 *
 * Disse testene låser dem sammen: en kilde kan ikke legges til i koden uten at
 * noen samtidig skriver ned hvem som ga tillatelse, og en kilde kan ikke stå
 * i registeret uten å finnes i koden.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const register = readFileSync(join(repoRoot, 'docs', 'bildesamtykke.md'), 'utf8');

/** Alle kilde-slugs nevnt i registeret, altså alt som står i `backticks`. */
function sourcesInRegister(): Set<string> {
	const found = new Set<string>();
	for (const match of register.matchAll(/`([a-z0-9-]+)`/g)) {
		found.add(match[1]);
	}
	return found;
}

describe('bildesamtykke-registeret', () => {
	const documented = sourcesInRegister();

	it('dokumenterer hver kilde som har lov til å vise bilder', () => {
		const udokumentert = [...IMAGE_APPROVED_SOURCES].filter((s) => !documented.has(s));
		expect(
			udokumentert,
			`Disse kildene viser bilder på gaari.no uten å stå i docs/bildesamtykke.md. ` +
				`Legg til en rad med hvem som ga tillatelse, når, og hvor e-posten ligger.`
		).toEqual([]);
	});

	it('dokumenterer hver kilde som brukes i aktiv promotering', () => {
		const udokumentert = [...PROMO_APPROVED_SOURCES].filter((s) => !documented.has(s));
		expect(
			udokumentert,
			`Disse kildene sendes ut i SoMe uten å stå i docs/bildesamtykke.md. ` +
				`Aktiv promotering krever eksplisitt skriftlig ja, arkivert i Folders/Gaari/Avtaler.`
		).toEqual([]);
	});

	it('holder promo-listen som en delmengde av visningslisten', () => {
		const kunPromo = [...PROMO_APPROVED_SOURCES].filter((s) => !IMAGE_APPROVED_SOURCES.has(s));
		expect(
			kunPromo,
			`Disse kildene er godkjent for SoMe, men ikke for visning på gaari.no. ` +
				`Det er alltid en feil: vi kan ikke dele et bilde utad som vi ikke engang har lov å vise selv.`
		).toEqual([]);
	});

	it('viser ikke til kilder som ikke lenger finnes i koden', () => {
		// Slugs registeret nevner som godkjente, men som er fjernet fra begge lister.
		// Historiske nei-svar står med navn og ikke slug, så de treffes ikke av denne.
		const kjenteIkkeKilder = new Set([
			'scripts', 'lib', 'utils', 'ts', 'md', 'docs', 'image_url', 'image_credit',
			'IMAGE_APPROVED_SOURCES', 'PROMO_APPROVED_SOURCES', 'IMAGE_BLOCKED_VENUE_PATTERNS',
			'npx', 'vitest', 'run', 'bildesamtykke',
		]);
		const foreldet = [...documented].filter(
			(s) =>
				!kjenteIkkeKilder.has(s) &&
				!IMAGE_APPROVED_SOURCES.has(s) &&
				!PROMO_APPROVED_SOURCES.has(s)
		);
		expect(
			foreldet,
			`Registeret nevner disse kildene, men de finnes ikke i noen allowlist. ` +
				`Enten er de fjernet fra koden uten at registeret ble oppdatert, eller så er slug-en feilstavet.`
		).toEqual([]);
	});
});
