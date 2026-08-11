/**
 * Bildesamtykke: typer, innlasting og generering av dokumentet.
 *
 * Skilt fra scripts/consent.ts med vilje. CLI-et kjører kode ved oppstart, og
 * testen må kunne kalle render() uten å starte et program. Denne fila har
 * heller ingen avhengigheter utover Node, så den kan importeres i CI der bare
 * rot-pakkene er installert.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const CONSENT_PATH = join(here, 'consent.json');
export const DOC_PATH = join(here, '..', '..', 'docs', 'bildesamtykke.md');

export type Kilde = {
	slug: string;
	navn: string;
	kontakt: string | null;
	epost: string | null;
	dato: string;
	datoUsikker?: boolean;
	grunnlag: 'dokumentert' | 'hotlink' | 'plattform';
	omfang: string[];
	bevis: string;
	selvhostet?: boolean;
	viserPersoner?: boolean;
	viserBarn?: boolean;
	merknad: string | null;
	vurderesInnen: string;
};

export type Avslag = {
	navn: string;
	kontakt: string;
	dato: string;
	sitat: string;
	folge: string;
	bevis: string;
};

/** Hele fila, inkludert forklaringsfeltene som starter med understrek. */
export type ConsentFile = { kilder: Kilde[]; avslag: Avslag[] } & Record<string, unknown>;

export function load(): ConsentFile {
	return JSON.parse(readFileSync(CONSENT_PATH, 'utf8'));
}

/** Toårsfrist. Folk bytter jobb, og en markedskoordinators ja følger ikke med. */
export function standardFrist(dato: string): string {
	const [år, md] = [Number(dato.slice(0, 4)), dato.slice(4)];
	return `${år + 2}${md}`;
}

export type NyKildeInput = {
	slug: string;
	navn: string;
	kontakt?: string | null;
	epost?: string | null;
	dato: string;
	grunnlag?: Kilde['grunnlag'];
	omfang: string[];
	bevis: string;
	merknad?: string | null;
	selvhostet?: boolean;
	viserPersoner?: boolean;
	viserBarn?: boolean;
	vurderesInnen?: string;
};

/**
 * Bygger en oppføring og nekter å lage en som ikke holder mål.
 *
 * Validering hører hjemme her og ikke i CLI-et, både fordi den kan testes og
 * fordi feilene den fanger er de dyre: et samtykke uten bevis, eller en
 * SoMe-tillatelse som hviler på et hot-link-varsel i stedet for et ja.
 */
export function nyKilde(input: NyKildeInput): Kilde {
	const grunnlag = input.grunnlag ?? 'dokumentert';
	const feil: string[] = [];

	if (!/^[a-z0-9-]+$/.test(input.slug)) {
		feil.push(`Slug "${input.slug}" må være små bokstaver, tall og bindestrek, og matche source-feltet i scraperen.`);
	}
	if (!input.navn?.trim()) feil.push('Mangler navn på arrangøren.');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dato)) feil.push(`Dato "${input.dato}" må være på formen ÅÅÅÅ-MM-DD.`);
	if (!input.bevis?.trim()) {
		feil.push('Mangler bevis. Uten en henvisning til hvor tillatelsen ligger er oppføringen bare en påstand.');
	}

	const ukjent = input.omfang.filter((o) => o !== 'visning' && o !== 'some');
	if (ukjent.length) feil.push(`Ukjent omfang: ${ukjent.join(', ')}. Gyldige er visning og some.`);
	if (!input.omfang.includes('visning')) {
		feil.push('Omfang må alltid inkludere visning. Vi kan ikke dele et bilde utad som vi ikke har lov å vise selv.');
	}
	if (input.omfang.includes('some') && grunnlag !== 'dokumentert') {
		feil.push(
			`Omfang some krever grunnlag dokumentert, ikke ${grunnlag}. ` +
				'Hot-link-varsel og API-vilkår er ikke samtykke til promotering.'
		);
	}

	if (feil.length) throw new Error(feil.join('\n'));

	return {
		slug: input.slug,
		navn: input.navn.trim(),
		kontakt: input.kontakt?.trim() || null,
		epost: input.epost?.trim() || null,
		dato: input.dato,
		grunnlag,
		omfang: input.omfang,
		bevis: input.bevis.trim(),
		...(input.selvhostet ? { selvhostet: true } : {}),
		...(input.viserPersoner ? { viserPersoner: true } : {}),
		...(input.viserBarn ? { viserBarn: true } : {}),
		merknad: input.merknad?.trim() || null,
		vurderesInnen: input.vurderesInnen ?? standardFrist(input.dato)
	};
}

/** Setter inn eller erstatter. Erstatning krever at man ber om det. */
export function settInn(data: ConsentFile, kilde: Kilde, oppdater = false): ConsentFile {
	const i = data.kilder.findIndex((k) => k.slug === kilde.slug);
	if (i >= 0 && !oppdater) {
		throw new Error(
			`${kilde.slug} finnes allerede, sist bekreftet ${data.kilder[i].dato}. ` +
				'Bruk --oppdater hvis du mener å erstatte den.'
		);
	}
	const kilder = [...data.kilder];
	if (i >= 0) kilder[i] = kilde;
	else kilder.push(kilde);
	return { ...data, kilder };
}

/** Markdown-tabeller går i stykker av loddrette streker i fritekst. */
function cell(v: string | null | undefined): string {
	return (v ?? '').replace(/\|/g, '\\|');
}

function omfangTekst(k: Kilde): string {
	return k.omfang.includes('some') ? 'Visning + SoMe' : 'Visning';
}

export function render(data: { kilder: Kilde[]; avslag: Avslag[] }): string {
	const dokumentert = data.kilder.filter((k) => k.grunnlag === 'dokumentert');
	const hotlink = data.kilder.filter((k) => k.grunnlag !== 'dokumentert');
	const personbilder = data.kilder.filter((k) => k.viserPersoner || k.viserBarn);
	const selvhostet = data.kilder.filter((k) => k.selvhostet);

	const l: string[] = [];

	l.push('<!-- GENERERT FIL. Ikke rediger her.');
	l.push('     Kilden er scripts/lib/consent.json.');
	l.push('     Regenerer med: npx tsx scripts/consent.ts sync -->');
	l.push('');
	l.push('# Bildesamtykke-register');
	l.push('');
	l.push('Dette er fasiten over hvem som har gitt tillatelse til hva når det gjelder');
	l.push('bilder. Kommer det et krav fra et bildebyrå, en fotograf eller en arrangør, er');
	l.push('det denne oversikten som skal svare på spørsmålet «hvorfor lå det bildet der?».');
	l.push('');
	l.push('Registeret er versjonert i git. Hver rad har en dato og en commit bak seg, og');
	l.push('ingenting kan endres uten at det står i historikken. Det er med vilje: en');
	l.push('påstand om samtykke er lite verdt uten et tidsstempel som ikke kan flyttes i');
	l.push('ettertid.');
	l.push('');
	l.push('## Hvordan delene henger sammen');
	l.push('');
	l.push('| Hvor | Hva som ligger der |');
	l.push('|---|---|');
	l.push('| `scripts/lib/consent.json` | Fasiten. Det eneste stedet du redigerer. |');
	l.push('| `scripts/lib/utils.ts` | Bygger de to allowlistene fra fasiten ved oppstart. |');
	l.push('| Denne fila | Generert lesbar utgave. Rediger aldri direkte. |');
	l.push('| Protonmail `Folders/Gaari/Avtaler` | Selve ja-e-postene. Permanent arkiv, slettes aldri. |');
	l.push('| Protonmail `Folders/Gaari/Juridisk` | Nei-svar og juridisk korrespondanse. Slettes aldri. |');
	l.push('');
	l.push('Tidligere lå kildene i koden og begrunnelsen i dette dokumentet, og de kunne');
	l.push('drive fra hverandre uten at noen merket det. Nå finnes det bare ett sted å');
	l.push('gjøre feil, og `bildesamtykke.test.ts` feiler hvis dokumentet er utdatert.');
	l.push('');
	l.push('## To ulike nivåer');
	l.push('');
	l.push('**Visning på gaari.no** betyr at bildet hot-linkes. Vi lagrer bare adressen, og');
	l.push('den besøkendes nettleser henter bildet fra arrangørens egen server. Bildet');
	l.push('forsvinner fra gaari.no i samme øyeblikk arrangøren fjerner det. Dette kan hvile');
	l.push('på varsel med mulighet til å reservere seg.');
	l.push('');
	l.push('**Aktiv promotering** betyr at bildet sendes ut i Gåris egne kanaler. Da forlater');
	l.push('bildet arrangørens kontroll, og det krever alltid et dokumentert ja. Koden håndhever');
	l.push('dette: en kilde uten grunnlag `dokumentert` kommer ikke inn i promo-listen, uansett');
	l.push('hva som står i omfang-feltet.');
	l.push('');
	l.push(`## Dokumentert samtykke (${dokumentert.length})`);
	l.push('');
	l.push('Beviset er en e-post i `Avtaler` eller et lydopptak med tidspunkt. Formen er');
	l.push('likegyldig; det som teller er at samtykket kan vises fram.');
	l.push('');
	l.push('| Kilde | Hvem | Dato | Omfang | Merknad |');
	l.push('|---|---|---|---|---|');
	for (const k of [...dokumentert].sort((a, b) => b.dato.localeCompare(a.dato))) {
		const dato = k.datoUsikker ? `${k.dato} (usikker)` : k.dato;
		l.push(
			`| \`${k.slug}\` | ${cell(k.kontakt ?? k.epost ?? k.navn)} | ${dato} | ${omfangTekst(k)} | ${cell(k.merknad)} |`
		);
	}
	l.push('');
	l.push(`## Hot-link med varsel og opt-out (${hotlink.length})`);
	l.push('');
	l.push('Disse har ikke svart ja. De er varslet om at bildene vises, med mulighet til å');
	l.push('reservere seg. Grunnlaget er bildepolicyen, ikke samtykke.');
	l.push('**Ingen av disse skal brukes i sosiale medier.**');
	l.push('');
	l.push('| Kilde | Aktivert | Grunnlag | Merknad |');
	l.push('|---|---|---|---|');
	for (const k of [...hotlink].sort((a, b) => a.slug.localeCompare(b.slug))) {
		l.push(`| \`${k.slug}\` | ${k.dato} | ${k.grunnlag} | ${cell(k.merknad)} |`);
	}
	l.push('');

	if (selvhostet.length) {
		l.push('## Bilder vi hoster selv');
		l.push('');
		l.push('Alt annet er hot-link. Disse har sendt bildene direkte til oss, og de ligger');
		l.push('i `static/events/` og serveres fra gaari.no.');
		l.push('');
		l.push('Det er en bevisst forskjell. Hot-link betyr at bildet forsvinner fra gaari.no i');
		l.push('samme øyeblikk arrangøren fjerner det, og nettopp den egenskapen gjør opt-out');
		l.push('reell. Når vi hoster selv, mister arrangøren den bryteren.');
		l.push('');
		l.push('**Regel: hoster vi et bilde selv, skal e-posten med tillatelsen kunne siteres');
		l.push('ordrett.** Er du i tvil om ordlyden dekker det, hot-link i stedet.');
		l.push('');
		for (const k of selvhostet) l.push(`- \`${k.slug}\` (${k.navn})`);
		l.push('');
	}

	if (personbilder.length) {
		l.push('## Bilder av mennesker');
		l.push('');
		l.push('Opphavsretten og retten til eget bilde er to ulike ting. Arrangøren eier det');
		l.push('første. Det andre tilhører personen som er avbildet, og for et barn er det');
		l.push('foresatte som råder over det. En arrangør kan ikke gi bort noe som ikke er');
		l.push('deres å gi.');
		l.push('');
		l.push('Repoet er offentlig. Et bilde som er committet ligger permanent i');
		l.push('git-historikken og kan lastes ned selv om vi fjerner det fra siden. Å ta det');
		l.push('ned er ikke det samme som å gjøre det utilgjengelig.');
		l.push('');
		l.push('Tar noen kontakt: fjern bildet fra `static/events/` og fra `image_url` i basen');
		l.push('umiddelbart. Avklar etterpå, ikke før.');
		l.push('');
		l.push('| Kilde | Viser barn | Merknad |');
		l.push('|---|---|---|');
		for (const k of personbilder) {
			l.push(`| \`${k.slug}\` | ${k.viserBarn ? 'Ja' : 'Nei'} | ${cell(k.merknad)} |`);
		}
		l.push('');
	}

	l.push(`## Nei og begrensninger (${data.avslag.length})`);
	l.push('');
	l.push('Disse skal aldri inn i noen liste. E-postene ligger i `Juridisk`.');
	l.push('');
	l.push('| Hvem | Dato | Hva de sa | Følge |');
	l.push('|---|---|---|---|');
	for (const a of data.avslag) {
		l.push(`| ${cell(a.navn)} (${cell(a.kontakt)}) | ${a.dato} | ${cell(a.sitat)} | ${cell(a.folge)} |`);
	}
	l.push('');
	l.push('## Rutine når noen svarer ja');
	l.push('');
	l.push('1. **Flytt e-posten til `Folders/Gaari/Avtaler`.** Ikke la den ligge i innboksen.');
	l.push('2. **Legg til en oppføring i `scripts/lib/consent.json`** med hvem, når, omfang og hvor beviset ligger.');
	l.push('3. **Kjør `npx tsx scripts/consent.ts sync`.** Dokumentet og allowlistene følger med av seg selv.');
	l.push('4. **Kjør testene.** `npx vitest run bildesamtykke` sier fra hvis noe skurrer.');
	l.push('');
	l.push('Ved delvis ja, for eksempel «bare våre egne arrangementer», gi omfang `visning`');
	l.push('og skriv begrensningen ordrett i merknaden. Et halvt ja som er dokumentert som');
	l.push('helt ja er verre enn ingenting.');
	l.push('');
	l.push('## Skjemaet spør selv');
	l.push('');
	l.push('Fra 2026-08-11 spør innsendingsskjemaet om begge samtykkene, ikke bare det ene.');
	l.push('Først om vi kan vise bildene, deretter, som et eget felt, om de også kan brukes');
	l.push('på Facebook og Instagram. Det andre feltet vises bare når det første er krysset');
	l.push('av, siden spørsmålet er meningsløst uten.');
	l.push('');
	l.push('Varselet skiller mellom ja, uttrykkelig nei og ikke spurt. Den forskjellen er');
	l.push('verdt å bevare: et tomt felt kan bety både nei og ubesvart, og da er samtykket');
	l.push('ubrukelig som dokumentasjon.');
	l.push('');

	return l.join('\n');
}
