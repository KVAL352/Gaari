/**
 * Bildesamtykke: typer, innlasting og generering av dokumentet.
 *
 * Skilt fra scripts/consent.ts med vilje. CLI-et kjører kode ved oppstart, og
 * testen må kunne kalle render() uten å starte et program. Denne fila har
 * heller ingen avhengigheter utover Node, så den kan importeres i CI der bare
 * rot-pakkene er installert.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');

/** Offentlig fasit. Ligger i repoet og inneholder ingen personopplysninger. */
export const CONSENT_PATH = join(here, 'consent.json');
export const DOC_PATH = join(repo, 'docs', 'bildesamtykke.md');

/**
 * Den personlige halvdelen: hvem som svarte, fra hvilken adresse, og hva de
 * skrev. Ligger i private/, som er gitignorert.
 *
 * Delingen kom 2026-08-13. Registeret var opprinnelig én fil, og den fila lå i
 * et offentlig repo med 18 navngitte kontakter, 8 e-postadresser og 6 ordrette
 * sitater fra privat korrespondanse. Ingen av delene trengs for å svare på
 * spørsmålet registeret finnes for, nemlig hvorfor et bilde lå på gaari.no.
 * Slug, dato, omfang, grunnlag og en peker til hvor beviset ligger holder.
 *
 * Koden må virke uten denne fila. CI har den ikke, og skal ikke ha den.
 */
export const PRIVAT_PATH = join(repo, 'private', 'consent-private.json');
export const PRIVAT_DOC_PATH = join(repo, 'private', 'bildesamtykke-full.md');

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

/**
 * Personopplysningene, oppslagbare på slug og navn. Nøklene er de samme som i
 * den offentlige fila, slik at sammenslåingen er en ren oppslagsoperasjon og
 * ikke en gjetning basert på rekkefølge.
 */
export type PrivatFil = {
	kilder: Record<string, { kontakt?: string | null; epost?: string | null; merknad?: string | null }>;
	avslag: Record<string, { kontakt?: string; sitat?: string }>;
} & Record<string, unknown>;

const TOM_PRIVAT: PrivatFil = { kilder: {}, avslag: {} };

/** Returnerer tomt i stedet for å kaste når fila mangler. CI har den aldri. */
export function loadPrivat(): PrivatFil {
	if (!existsSync(PRIVAT_PATH)) return TOM_PRIVAT;
	const p = JSON.parse(readFileSync(PRIVAT_PATH, 'utf8')) as Partial<PrivatFil>;
	return { ...TOM_PRIVAT, ...p, kilder: p.kilder ?? {}, avslag: p.avslag ?? {} };
}

/** Bare den offentlige halvdelen, slik den ligger på disk. */
export function loadOffentlig(): ConsentFile {
	return JSON.parse(readFileSync(CONSENT_PATH, 'utf8'));
}

/**
 * Begge halvdelene satt sammen. Uten private/ er kontakt, epost og merknad
 * null, og alt annet virker som før. Det er med vilje: en utvikler uten
 * tilgang til korrespondansen skal kunne kjøre testene og legge til en kilde.
 */
export function load(): ConsentFile {
	const off = loadOffentlig();
	const priv = loadPrivat();
	return {
		...off,
		kilder: off.kilder.map((k) => ({
			...k,
			kontakt: priv.kilder[k.slug]?.kontakt ?? null,
			epost: priv.kilder[k.slug]?.epost ?? null,
			merknad: priv.kilder[k.slug]?.merknad ?? null
		})),
		avslag: off.avslag.map((a) => ({
			...a,
			kontakt: priv.avslag[a.navn]?.kontakt ?? '',
			sitat: priv.avslag[a.navn]?.sitat ?? ''
		}))
	};
}

/**
 * Deler en sammenslått fil i de to som skal på disk.
 *
 * Alt som identifiserer en person eller siterer dem, havner i den private.
 * Merknaden er med der, ikke fordi den alltid er personlig, men fordi den ofte
 * er det: rutinen sier uttrykkelig at en delvis tillatelse skal skrives ordrett
 * inn i merknaden. Å skille de personlige merknadene fra de tekniske ville
 * krevd en vurdering per rad, og en slik vurdering blir før eller siden feil.
 */
export function splitt(data: ConsentFile): { offentlig: ConsentFile; privat: PrivatFil } {
	const privat: PrivatFil = {
		_om: 'Personopplysningene fra bildesamtykke-registeret. Hører aldri hjemme i det offentlige repoet. Den offentlige halvdelen ligger i scripts/lib/consent.json.',
		kilder: {},
		avslag: {}
	};

	const kilder = data.kilder.map((k) => {
		if (k.kontakt || k.epost || k.merknad) {
			privat.kilder[k.slug] = {
				...(k.kontakt ? { kontakt: k.kontakt } : {}),
				...(k.epost ? { epost: k.epost } : {}),
				...(k.merknad ? { merknad: k.merknad } : {})
			};
		}
		const { kontakt: _k, epost: _e, merknad: _m, ...offentlig } = k;
		return offentlig as Kilde;
	});

	const avslag = data.avslag.map((a) => {
		if (a.kontakt || a.sitat) {
			privat.avslag[a.navn] = {
				...(a.kontakt ? { kontakt: a.kontakt } : {}),
				...(a.sitat ? { sitat: a.sitat } : {})
			};
		}
		const { kontakt: _k, sitat: _s, ...offentlig } = a;
		return offentlig as Avslag;
	});

	return { offentlig: { ...data, kilder, avslag }, privat };
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
	l.push('| `scripts/lib/consent.json` | Offentlig fasit. Slug, arrangør, dato, omfang, grunnlag, bevis-peker. |');
	l.push('| `private/consent-private.json` | Hvem som svarte, fra hvilken adresse, og hva de skrev. Gitignorert. |');
	l.push('| `scripts/lib/utils.ts` | Bygger de to allowlistene fra den offentlige fasiten ved oppstart. |');
	l.push('| Denne fila | Generert lesbar utgave. Rediger aldri direkte. |');
	l.push('| `private/bildesamtykke-full.md` | Samme dokument med personopplysningene i. |');
	l.push('| Protonmail `Folders/Gaari/Avtaler` | Selve ja-e-postene. Permanent arkiv, slettes aldri. |');
	l.push('| Protonmail `Folders/Gaari/Juridisk` | Nei-svar og juridisk korrespondanse. Slettes aldri. |');
	l.push('');
	l.push('## Hvorfor registeret er delt i to');
	l.push('');
	l.push('Dette repoet er offentlig. Fram til 2026-08-13 lå navn, e-postadresser og');
	l.push('ordrette sitater fra privat korrespondanse i fasiten, og dermed på nett. Ingen');
	l.push('av delene trengs for å svare på spørsmålet registeret finnes for. Slug, dato,');
	l.push('omfang, grunnlag og en peker til hvor beviset ligger gjør den jobben.');
	l.push('');
	l.push('Koden virker uten den private fila. CI har den ikke, og skal ikke ha den.');
	l.push('Mangler den, står kontakt, e-post og merknad som tomme, og alt annet er likt.');
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
	l.push('| Kilde | Arrangør | Dato | Omfang | Bevis |');
	l.push('|---|---|---|---|---|');
	for (const k of [...dokumentert].sort((a, b) => b.dato.localeCompare(a.dato))) {
		const dato = k.datoUsikker ? `${k.dato} (usikker)` : k.dato;
		l.push(`| \`${k.slug}\` | ${cell(k.navn)} | ${dato} | ${omfangTekst(k)} | ${cell(k.bevis)} |`);
	}
	l.push('');
	l.push(`## Hot-link med varsel og opt-out (${hotlink.length})`);
	l.push('');
	l.push('Disse har ikke svart ja. De er varslet om at bildene vises, med mulighet til å');
	l.push('reservere seg. Grunnlaget er bildepolicyen, ikke samtykke.');
	l.push('**Ingen av disse skal brukes i sosiale medier.**');
	l.push('');
	l.push('| Kilde | Arrangør | Aktivert | Grunnlag |');
	l.push('|---|---|---|---|');
	for (const k of [...hotlink].sort((a, b) => a.slug.localeCompare(b.slug))) {
		l.push(`| \`${k.slug}\` | ${cell(k.navn)} | ${k.dato} | ${k.grunnlag} |`);
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
		l.push('| Kilde | Arrangør | Viser barn |');
		l.push('|---|---|---|');
		for (const k of personbilder) {
			l.push(`| \`${k.slug}\` | ${cell(k.navn)} | ${k.viserBarn ? 'Ja' : 'Nei'} |`);
		}
		l.push('');
	}

	l.push(`## Nei og begrensninger (${data.avslag.length})`);
	l.push('');
	l.push('Disse skal aldri inn i noen liste. E-postene ligger i `Juridisk`, og hvem som');
	l.push('svarte og hva de skrev står i den private halvdelen av registeret.');
	l.push('');
	l.push('| Hvem | Dato | Følge |');
	l.push('|---|---|---|');
	for (const a of data.avslag) {
		l.push(`| ${cell(a.navn)} | ${a.dato} | ${cell(a.folge)} |`);
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

/**
 * Den fullstendige utgaven, med navn, e-post, merknader og sitater.
 *
 * Skrives til private/ og skal aldri committes. Den finnes fordi det er denne
 * du faktisk trenger hvis noen krever å vite hvem som ga tillatelsen: den
 * offentlige utgaven peker til e-postmappen, denne sier hvem du leter etter.
 */
export function renderPrivat(data: { kilder: Kilde[]; avslag: Avslag[] }): string {
	const dokumentert = data.kilder.filter((k) => k.grunnlag === 'dokumentert');
	const hotlink = data.kilder.filter((k) => k.grunnlag !== 'dokumentert');

	const l: string[] = [];
	l.push('<!-- GENERERT FIL. Ikke rediger her.');
	l.push('     Kilden er scripts/lib/consent.json + private/consent-private.json.');
	l.push('     Regenerer med: npx tsx scripts/consent.ts sync -->');
	l.push('');
	l.push('# Bildesamtykke-register, fullstendig');
	l.push('');
	l.push('**Denne fila skal aldri committes.** Den ligger i `private/`, som er gitignorert.');
	l.push('Den offentlige utgaven er `docs/bildesamtykke.md`, og den inneholder alt dette');
	l.push('bortsett fra hvem som svarte, fra hvilken adresse, og hva de skrev.');
	l.push('');
	l.push(`## Dokumentert samtykke (${dokumentert.length})`);
	l.push('');
	l.push('| Kilde | Arrangør | Kontakt | E-post | Dato | Omfang | Merknad |');
	l.push('|---|---|---|---|---|---|---|');
	for (const k of [...dokumentert].sort((a, b) => b.dato.localeCompare(a.dato))) {
		const dato = k.datoUsikker ? `${k.dato} (usikker)` : k.dato;
		l.push(
			`| \`${k.slug}\` | ${cell(k.navn)} | ${cell(k.kontakt)} | ${cell(k.epost)} | ${dato} | ${omfangTekst(k)} | ${cell(k.merknad)} |`
		);
	}
	l.push('');
	l.push(`## Hot-link med varsel og opt-out (${hotlink.length})`);
	l.push('');
	l.push('| Kilde | Arrangør | Kontakt | Aktivert | Grunnlag | Merknad |');
	l.push('|---|---|---|---|---|---|');
	for (const k of [...hotlink].sort((a, b) => a.slug.localeCompare(b.slug))) {
		l.push(
			`| \`${k.slug}\` | ${cell(k.navn)} | ${cell(k.kontakt)} | ${k.dato} | ${k.grunnlag} | ${cell(k.merknad)} |`
		);
	}
	l.push('');
	l.push(`## Nei og begrensninger (${data.avslag.length})`);
	l.push('');
	l.push('| Hvem | Kontakt | Dato | Hva de sa | Følge | Bevis |');
	l.push('|---|---|---|---|---|---|');
	for (const a of data.avslag) {
		l.push(
			`| ${cell(a.navn)} | ${cell(a.kontakt)} | ${a.dato} | ${cell(a.sitat)} | ${cell(a.folge)} | ${cell(a.bevis)} |`
		);
	}
	l.push('');
	return l.join('\n');
}
