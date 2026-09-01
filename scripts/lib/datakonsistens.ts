/**
 * Datakonsistens — sjekker om radens egen tekst motsier de strukturerte
 * feltene.
 *
 * HVORFOR DENNE FINNES
 *
 * Vi hadde tre lag med kvalitetssjekker, og ingen av dem saa denne
 * feilklassen:
 *
 *   - CI kjoerer tester paa koden, ikke paa dataene.
 *   - `data_quality` i /api/health/deep ser bare paa datoer som er utloept
 *     eller ligger absurd langt fram.
 *   - Den maanedlige quality-audit ser paa llms.txt, FAQ, metabeskrivelser,
 *     kildetall og tilgjengelighet. Alt sammen kode og innhold, ingen rader.
 *
 * 31. august 2026 sto 38 kommende arrangementer fra sju kilder med
 * «aldersgrense 18 aar» i sin egen beskrivelse mens age_group var 'all' eller
 * 'students'. Det er age_group filtrene leser, saa de laa synlige i
 * /for-ungdom og i familiefiltrene. Ingenting var roedt noe sted. Sidene saa
 * helt normale ut, og feilen var bare synlig for den som leste en rad og
 * sammenlignet to felter for haand.
 *
 * TO SLAGS SJEKKER, MED VILJE
 *
 * `sperrende` skal alltid vaere null. Slaar en av dem ut, er det en feil som
 * er innfoert, og jobben skal bli roed.
 *
 * `maalte` har en kjent utgangsverdi som er for hoey til aa rydde med én gang.
 * De laaser dagens nivaa slik dokumentstoerrelse-check.mjs gjoer: tallet faar
 * ikke vokse. Det er ikke det samme som at nivaaet er greit — det staar som
 * egen sak — men en portvakt som er roed hver dag laerer folk aa se bort fra
 * roedt, og da er den verre enn ingen portvakt.
 */

import { hasAdultAgeLimit } from './categories.js';

export interface KonsistensRad {
	id?: string;
	slug?: string;
	title_no?: string | null;
	title_en?: string | null;
	description_no?: string | null;
	description_en?: string | null;
	source_url?: string | null;
	age_group?: string | null;
	category?: string | null;
	date_start?: string | null;
	date_end?: string | null;
	source?: string | null;
}

export interface Funn {
	rad: KonsistensRad;
	forklaring: string;
}

export interface Sjekk {
	navn: string;
	hva: string;
	/** Sperrende sjekker skal alltid gi null funn. Maalte har en kjent grense. */
	sperrende: boolean;
	/**
	 * Kjent nivaa som absolutt antall. Brukes for maalte sjekker der tallet
	 * IKKE vokser med katalogen, typisk et etterslep som skal ned mot null.
	 */
	grense?: number;
	/**
	 * Kjent nivaa som ANDEL av alle rader, mellom 0 og 1.
	 *
	 * Brukes der feilen foelger katalogen: kommer det tusen nye arrangementer,
	 * kommer det ogsaa flere med samme feil, uten at noe er blitt verre.
	 *
	 * Foerste utgave laaste `klokkeslett-spriker` paa 291 stykker. Sju dager
	 * senere var det 304 av 2 048, altsaa 14,8 % mot 14,2 % — nesten uendret
	 * andel, men jobben ble roed. Da maa noen skru grensa opp hver uke, og det
	 * er akkurat den ratsjen som gjoer en portvakt meningsloes. Samme
	 * laerdommen som dokumentstoerrelse-check.mjs fikk samme dag.
	 */
	andelsgrense?: number;
	finn: (rader: KonsistensRad[]) => Funn[];
}

const FRI_ALDERSGRENSE_RE = /fri aldersgrense|ingen aldersgrense|alle aldre|for alle aldre|all ages/i;

/** Klokkeslettet slik beskrivelsen oppgir det, eller null. */
export function klokkeslettITekst(tekst: string | null | undefined): string | null {
	const m = (tekst ?? '').match(/\bkl\.?\s*(\d{1,2})[.:](\d{2})/i);
	if (!m) return null;
	const time = Number(m[1]);
	const minutt = Number(m[2]);
	if (time > 23 || minutt > 59) return null;
	return `${String(time).padStart(2, '0')}:${String(minutt).padStart(2, '0')}`;
}

/** date_start som veggklokke i Bergen. */
export function klokkeslettIFelt(dateStart: string | null | undefined): string | null {
	if (!dateStart) return null;
	const d = new Date(dateStart);
	if (isNaN(d.getTime())) return null;
	return d.toLocaleTimeString('nb-NO', {
		timeZone: 'Europe/Oslo',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export const SJEKKER: Sjekk[] = [
	{
		navn: 'aldersgrense-mangler',
		hva: 'Teksten oppgir 18+ eller 20+, men age_group sier noe annet',
		sperrende: true,
		finn: (rader) =>
			rader
				.filter((e) => e.age_group !== '18+' && hasAdultAgeLimit(e.title_no, e.description_no))
				.map((rad) => ({
					rad,
					forklaring: `age_group='${rad.age_group}' mens teksten oppgir aldersgrense`,
				})),
	},
	{
		navn: 'aldersgrense-for-streng',
		hva: 'Teksten sier fri aldersgrense, men age_group er 18+',
		sperrende: true,
		finn: (rader) =>
			rader
				.filter(
					(e) =>
						e.age_group === '18+' &&
						FRI_ALDERSGRENSE_RE.test(`${e.title_no ?? ''} ${e.description_no ?? ''}`)
				)
				.map((rad) => ({ rad, forklaring: 'age_group=18+ mens teksten sier fri aldersgrense' })),
	},
	{
		navn: 'slutt-foer-start',
		hva: 'date_end ligger foer date_start',
		sperrende: true,
		finn: (rader) =>
			rader
				.filter((e) => e.date_end && e.date_start && e.date_end < e.date_start)
				.map((rad) => ({ rad, forklaring: `${rad.date_start} → ${rad.date_end}` })),
	},
	{
		navn: 'engelsk-lik-norsk',
		hva: 'description_en er ordrett identisk med description_no',
		sperrende: true,
		finn: (rader) =>
			rader
				.filter((e) => e.description_en && e.description_no && e.description_en === e.description_no)
				.map((rad) => ({ rad, forklaring: 'engelsk beskrivelse er ikke oversatt' })),
	},
	{
		navn: 'klokkeslett-spriker',
		hva: 'Beskrivelsen oppgir et annet klokkeslett enn date_start',
		sperrende: false,
		// Kjent nivaa: 2,8 % (57 av 2 058) etter opprydningen 1. september 2026.
		// Var 14,4 % samme morgen.
		//
		// TO ULIKE FEIL LAA UNDER, og de peker motsatt vei:
		//
		//   1. Prompten fikk den raa ISO-strengen, saa modellen skrev UTC-tiden i
		//      beskrivelsen mens sida viste Oslo-tid. Her var FELTET riktig.
		//      Rettet i lib/ai-descriptions.ts, og 187 rader er ryddet.
		//   2. Grieghallen oppgir naken lokal tid, og scraperen tolket den som
		//      UTC. Her var BESKRIVELSEN riktig og feltet to timer feil, saa sida
		//      viste konsertene for sent. Rettet i scraperen, og 94 rader er
		//      ryddet mot Grieghallens egen liste.
		//
		// De 55 som staar igjen er ekte uenigheter, og flere av dem er ikke feil
		// i det hele tatt. `usfverftet` ble kontrollert 1. september: kilden
		// sender eksplisitt UTC med Z, feltet er riktig, og sida nevner «Doerer».
		// Avviket der er doerene mot konsertstart, altsaa to riktige tidspunkter.
		//
		// LAERDOMMEN OM bergenOffset: den trengs bare naar kilden IKKE oppgir
		// tidssone. Jeg holdt foerst brettspill utenfor fordi den manglet den,
		// men kilden sender Z, saa feltet var riktig hele tiden. Fravaer av
		// bergenOffset er altsaa ikke i seg selv et faresignal.
		andelsgrense: 0.04,
		finn: (rader) =>
			rader
				.map((rad) => {
					const sagt = klokkeslettITekst(rad.description_no);
					const felt = klokkeslettIFelt(rad.date_start);
					if (!sagt || !felt || sagt === felt) return null;
					return { rad, forklaring: `teksten sier ${sagt}, date_start er ${felt}` };
				})
				.filter((f): f is Funn => f !== null),
	},
	{
		navn: 'henvisningskode-mangler',
		hva: 'bookibud-rad uten henvisningskoden som feeden leverer',
		sperrende: false,
		// Kjent nivaa 1. september 2026: 43 av 82. Bookibud la marketing=gaari paa
		// partnernoekkelen 25. august, men eventExists() slaar opp paa noeyaktig
		// source_url, saa rader som alt laa inne beholdt den gamle lenken. De
		// sender klikk uten at salget krediteres oss.
		//
		// Scraperen oppdaterer naa lenka i stedet for aa hoppe over raden, saa
		// tallet skal falle av seg selv. Naar det er nede i null, gjoer sjekken
		// sperrende — den er maalt bare fordi opprydningen skjer ved neste
		// kjoering, ikke fordi 43 er greit.
		grense: 43,
		finn: (rader) =>
			rader
				.filter(
					(e) =>
						e.source === 'bookibud' &&
						!!e.source_url &&
						!/[?&]marketing=/i.test(e.source_url)
				)
				.map((rad) => ({ rad, forklaring: 'lenka mangler marketing-parameteren' })),
	},
	{
		navn: 'paastaar-gratis',
		hva: 'Beskrivelsen sier «gratis» uten forbeholdet husreglene krever',
		sperrende: false,
		// Kjent nivaa: 1,2 % (24 av 2 048) 1. september 2026. Husregelen er
		// «Trolig gratis», aldri en paastand om at noe er gratis, fordi vi ikke kan
		// vite det sikkert. Maalt som andel, siden tallet foelger katalogen.
		andelsgrense: 0.015,
		finn: (rader) =>
			rader
				.filter(
					(e) =>
						/\bgratis\b/i.test(e.description_no ?? '') &&
						!/trolig gratis/i.test(e.description_no ?? '')
				)
				.map((rad) => ({ rad, forklaring: 'paastaar gratis uten forbehold' })),
	},
];

export interface SjekkResultat {
	sjekk: Sjekk;
	funn: Funn[];
	brudd: boolean;
}

export function kjoerSjekker(rader: KonsistensRad[], sjekker: Sjekk[] = SJEKKER): SjekkResultat[] {
	return sjekker.map((sjekk) => {
		const funn = sjekk.finn(rader);
		let brudd: boolean;
		if (sjekk.sperrende) {
			brudd = funn.length > 0;
		} else if (sjekk.andelsgrense !== undefined) {
			// Tom liste kan ikke brekke en andelsgrense, og skal ikke dele paa null.
			brudd = rader.length > 0 && funn.length / rader.length > sjekk.andelsgrense;
		} else {
			brudd = funn.length > (sjekk.grense ?? 0);
		}
		return { sjekk, funn, brudd };
	});
}
