import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Personopplysninger har havnet i det offentlige repoet fire ganger.
 *
 * Hver gang på et sted forrige opprydning ikke lette. 13. august i
 * samtykkefilene, 21. august i `scripts/reminders.json`, i kodekommentarene i
 * `utils.ts`, i `.claude/docs/scrapers.md` — og i testfila som skulle hindre
 * det. Fellesnevneren er at opprydningene lette i én filtype om gangen.
 *
 * Denne testen leter i alt git faktisk sporer. Den er grov med vilje: den
 * kjenner ikke igjen navn, bare e-postadresser og telefonnummer. Det er de to
 * mønstrene som lar seg beskrive uten selv å inneholde personopplysninger, og
 * de er i praksis alltid med når noe har lekket.
 */
const ROT = path.join(import.meta.dirname, '..', '..', '..');

function sporedeFiler(): string[] {
	// -z + split på NUL: filnavn med mellomrom og norske tegn overlever.
	return execFileSync('git', ['ls-files', '-z'], { cwd: ROT, encoding: 'utf-8' })
		.split('\0')
		.filter(Boolean);
}

/** Binærfiler og låsefiler har ingen prosa å lekke, og gjør testen treg. */
const HOPPES_OVER = /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|pdf|mp4|zip)$|package-lock\.json$/i;

/**
 * Regelen er formet etter hva som gjør en adresse til en personopplysning.
 *
 * `info@bergenfest.no` identifiserer ingen. `sofie@studiovertikal.no` gjør det.
 * Forskjellen ligger i lokaldelen, ikke i domenet, så testen spør om lokaldelen
 * er et rollenavn. Det skalerer uten at noen må vedlikeholde en liste over hver
 * enkelt adresse — og det er nettopp lista-vedlikehold som har sviktet før.
 */
const ROLLER = new Set([
	'post', 'noreply', 'no-reply', 'ikkesvar', 'info', 'kontakt', 'support',
	'hei', 'hello', 'privacy', 'personvern', 'billett', 'booking', 'presse',
	'redaksjonen', 'notifications', 'invoice', 'ship', 'bingwb', 'admin',
	'gaari.bergen', 'kjersti.therkildsen'
]);

/** Adresser i dokumentasjon og testdata som aldri har tilhørt noen. */
const PLASSHOLDERDOMENER = /@(example|eksempel)\.(com|no|org)$|@(epost\.no|organisasjon\.no|email\.com)$/i;

/** Google Calendar-IDer har form som e-post, men er ikke det. */
const IKKE_EPOST = /@group\.calendar\.google\.com$/i;

function erPersonadresse(adresse: string): boolean {
	const lav = adresse.toLowerCase();
	if (IKKE_EPOST.test(lav) || PLASSHOLDERDOMENER.test(lav)) return false;
	const lokaldel = lav.split('@')[0].split('+')[0];
	return !ROLLER.has(lokaldel);
}

const EPOST = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Telefonnummer krever kontekst, ikke bare åtte siffer.
 *
 * Første utgave flagget 69 treff, og nesten alle var `86400000` — antall
 * millisekunder i et døgn. En test som roper ulv 69 ganger blir slått av.
 * Et telefonnummer som faktisk lekker, staar som regel merket med «tlf» eller
 * «mobil», saa det er den formen vi leter etter. Et bart, gruppert nummer ble
 * proevd og forkastet: det traff «47 49 46 38», som er GIF-signaturen.
 */
const TELEFON = [/(?:tlf|telefon|mobil|phone|tel:)\D{0,10}(\+?\d[\d\s]{6,13}\d)/gi];

interface Treff {
	fil: string;
	verdi: string;
}

function skann(): { epost: Treff[]; telefon: Treff[] } {
	const epost: Treff[] = [];
	const telefon: Treff[] = [];

	for (const fil of sporedeFiler()) {
		if (HOPPES_OVER.test(fil)) continue;
		const absolutt = path.join(ROT, fil);
		if (!fs.existsSync(absolutt)) continue; // slettet, men ennå ikke committet

		let innhold: string;
		try {
			innhold = fs.readFileSync(absolutt, 'utf-8');
		} catch {
			continue;
		}
		// Denne fila lister selv adresser, og skal ikke flagge seg selv.
		if (fil.endsWith('pii-i-repoet.test.ts')) continue;

		for (const m of innhold.match(EPOST) ?? []) {
			if (erPersonadresse(m)) epost.push({ fil, verdi: m });
		}
		for (const moenster of TELEFON) {
			for (const m of innhold.matchAll(moenster)) {
				telefon.push({ fil, verdi: m[1].trim() });
			}
		}
	}

	return { epost, telefon };
}

const funn = skann();

describe('ingen personopplysninger i sporede filer', () => {
	it('ingen e-postadresser utenfor allowlisten', () => {
		const rapport = funn.epost.map((t) => `${t.fil}: ${t.verdi}`).join('\n');
		expect(
			funn.epost.length,
			`Repoet er offentlig. Ukjente e-postadresser:\n${rapport}\n\n` +
				'Er adressen et rollenavn, legg lokaldelen i ROLLER. ' +
				'Er den en persons, flytt teksten til private/ og skriv upersonlig her.'
		).toBe(0);
	});

	it('ingen norske telefonnummer', () => {
		const rapport = funn.telefon.map((t) => `${t.fil}: ${t.verdi}`).join('\n');
		expect(funn.telefon.length, `Ser ut som telefonnummer:\n${rapport}`).toBe(0);
	});
});
