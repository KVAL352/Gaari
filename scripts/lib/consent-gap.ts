/**
 * Hva samtykke-hullet koster oss i SoMe.
 *
 * Et arrangement kan bare bli innhold i Gåris egne kanaler hvis det har et
 * bilde OG kilden står med dokumentert ja til promotering. Begge deler må være
 * på plass. Det gjør at et hull ett sted ikke synes noe sted: generatoren
 * hopper bare over dagen, og loggen sier «for få bilder».
 *
 * Denne fila regner ut hvem det er verdt å spørre først, målt i arrangementer
 * vi faktisk har et bilde til men ikke lov til å bruke. Poenget er at
 * prioriteringen skal kunne kjøres på nytt, ikke skrives ned én gang og så
 * råtne. Tallene i en oppgavebeskrivelse er ferskvare.
 *
 * Rein funksjon uten Supabase, slik at den kan testes.
 */
import type { ConsentFile, Kilde } from './consent-doc.js';

/** Det minste vi trenger å vite om et arrangement for å regne på det. */
export type GapEvent = {
	source: string | null;
	image_url: string | null;
};

/**
 * Aggregatorer kan ikke gi samtykke på vegne av arrangørene sine, så de hører
 * ikke hjemme i en utsendingsliste uansett hvor mange bilder de står for.
 * Bookibud er unntaket som bekrefter regelen: de sa ja fordi vilkårene deres
 * mot arrangøren gir dem retten til å gjøre det.
 */
const AGGREGATORER = new Set(['ticketco', 'billetto', 'tikkio']);

export type KildeRad = {
	slug: string;
	navn: string;
	kontakt: string | null;
	epost: string | null;
	antall: number;
	medBilde: number;
	/** Hva vi har lov til i dag. */
	status: 'promotering' | 'kun-visning' | 'aggregator' | 'utenfor-registeret';
};

export type GapRapport = {
	totalt: number;
	medBilde: number;
	/** Bilder vi har lov til å promotere. Dette er hele råstoffet til SoMe. */
	promoterbare: number;
	/** Bilder vi har, men ikke lov til å bruke utenfor gaari.no. */
	laste: number;
	/** Sorterte lister. Ingen av dem er kuttet; kaller du vil ha topp N, kutt selv. */
	spør: KildeRad[];
	utenforRegisteret: KildeRad[];
	aggregatorer: KildeRad[];
	harAlleredeJa: KildeRad[];
};

function tomRad(slug: string, kilde: Kilde | undefined, status: KildeRad['status']): KildeRad {
	return {
		slug,
		navn: kilde?.navn ?? '',
		kontakt: kilde?.kontakt ?? null,
		epost: kilde?.epost ?? null,
		antall: 0,
		medBilde: 0,
		status
	};
}

function status(slug: string, kilde: Kilde | undefined): KildeRad['status'] {
	if (AGGREGATORER.has(slug)) return 'aggregator';
	if (!kilde) return 'utenfor-registeret';
	// Samme regel som PROMO_APPROVED_SOURCES i utils.ts. Duplisert med vilje:
	// hadde denne importert utils.ts, ville rapporten arvet Supabase-oppstarten
	// og sluttet å være testbar.
	if (kilde.omfang.includes('some') && kilde.grunnlag === 'dokumentert') return 'promotering';
	return 'kun-visning';
}

export function byggRapport(events: GapEvent[], data: ConsentFile): GapRapport {
	const kilder = new Map(data.kilder.map((k) => [k.slug, k]));
	const rader = new Map<string, KildeRad>();

	for (const e of events) {
		const slug = e.source || '(ukjent)';
		if (!rader.has(slug)) rader.set(slug, tomRad(slug, kilder.get(slug), status(slug, kilder.get(slug))));
		const rad = rader.get(slug)!;
		rad.antall++;
		if (e.image_url) rad.medBilde++;
	}

	// Kilder uten kommende arrangementer skal fortsatt telles med i «har ja».
	// De er ikke et hull, men listen lyver hvis de mangler.
	for (const k of data.kilder) {
		if (!rader.has(k.slug)) rader.set(k.slug, tomRad(k.slug, k, status(k.slug, k)));
	}

	const alle = [...rader.values()].sort((a, b) => b.medBilde - a.medBilde || a.slug.localeCompare(b.slug));
	const av = (s: KildeRad['status']) => alle.filter((r) => r.status === s);
	const sum = (r: KildeRad[]) => r.reduce((n, x) => n + x.medBilde, 0);

	const spør = av('kun-visning').filter((r) => r.medBilde > 0);
	const utenforRegisteret = av('utenfor-registeret').filter((r) => r.medBilde > 0);
	const aggregatorer = av('aggregator').filter((r) => r.medBilde > 0);
	const harAlleredeJa = av('promotering');

	return {
		totalt: events.length,
		medBilde: events.filter((e) => e.image_url).length,
		promoterbare: sum(harAlleredeJa),
		laste: sum(spør) + sum(utenforRegisteret) + sum(aggregatorer),
		spør,
		utenforRegisteret,
		aggregatorer,
		harAlleredeJa
	};
}

function tabell(rader: KildeRad[]): string[] {
	if (!rader.length) return ['  (ingen)'];
	const bredde = Math.max(...rader.map((r) => r.slug.length), 6);
	return rader.map((r) => {
		const hvem = r.kontakt ?? r.epost ?? r.navn;
		return `  ${r.slug.padEnd(bredde)}  ${String(r.medBilde).padStart(4)} bilder av ${String(r.antall).padStart(4)}` +
			(hvem ? `   ${hvem}` : '');
	});
}

export function formater(r: GapRapport, minstForPost: number): string {
	const l: string[] = [];
	const pst = (n: number) => (r.medBilde ? Math.round((n / r.medBilde) * 100) : 0);

	l.push(`Kommende arrangementer: ${r.totalt}, hvorav ${r.medBilde} har bilde.`);
	l.push(`Av bildene kan ${r.promoterbare} brukes i SoMe (${pst(r.promoterbare)} %). ${r.laste} kan ikke.`);
	l.push('');
	l.push(`En karusell krever ${minstForPost} arrangementer med bilde samme dag. Det er`);
	l.push('den terskelen hullet slår ut på, ikke totalen.');
	l.push('');
	l.push('SPØR DISSE — har sagt ja til visning, ikke til sosiale medier:');
	l.push(...tabell(r.spør));
	l.push('');
	l.push('IKKE I REGISTERET — bilder vises via egne regler i utils.ts, uten samtykkerad:');
	l.push(...tabell(r.utenforRegisteret));
	l.push('');
	l.push('AGGREGATORER — kan ikke samtykke for arrangørene sine, hopp over:');
	l.push(...tabell(r.aggregatorer));
	l.push('');
	l.push('HAR ALLEREDE JA:');
	l.push(...tabell(r.harAlleredeJa));
	return l.join('\n');
}
