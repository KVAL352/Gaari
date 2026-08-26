/**
 * Bildehjelpere.
 *
 * Vercels bildeoptimalisering er avslått (gratiskvoten er brukt opp), så
 * disse slapp lenge bare URL-en rett gjennom. Følgen var at hvert eneste
 * bilde ble hentet i full originalstørrelse.
 *
 * Målt på forsiden 26. august 2026: 6 464 KiB totalt, hvorav ett enkelt
 * bilde fra cdn.sanity.io var 4 397 KiB — en PNG på 1560×1096 vist i
 * 662×465. To Sanity-bilder utgjorde alene 85 % av sidas vekt.
 *
 * VI TRENGER IKKE VERCEL FOR DETTE
 *
 * Flere av CDN-ene bildene ligger på har sitt eget bilde-API. Ber vi om
 * riktig bredde og format, gjør kilden jobben — gratis for oss, og med
 * mindre båndbredde for dem enn originalen.
 *
 * Målt, ikke antatt:
 *
 *   cdn.sanity.io               1 096 380 B  ->  27 672 B   (−97,5 %)
 *   images.squarespace-cdn.com    558 966 B  -> 524 170 B   (−6 %)
 *   cdn.prod.website-files.com          uendret — ignorerer parametre
 *   netflexapp.com                      uendret — ignorerer parametre
 *   bergenbibliotek.no                  uendret — ignorerer parametre
 *
 * Ukjente verter slipper gjennom urørt. Det er den trygge standarden: en
 * gjettet parameter kan gi 404 eller et bilde i feil utsnitt, og et knust
 * bilde er verre enn et stort et.
 *
 * MERK: dette endrer bare hva vi BER OM ved opptegning. `image_url` i basen
 * er urørt, og det er den samme filen hos den samme eieren — altså ingen
 * endring i bildesamtykke eller hot-link-grunnlag.
 */

/** Kvalitet der CDN-et støtter det. 75 er standardvalget og synes ikke. */
const KVALITET = 75;

interface Omskriver {
	/** Verten, slik den står i URL-en. */
	vert: string;
	bygg: (url: URL, bredde: number) => URL;
}

const OMSKRIVERE: Omskriver[] = [
	{
		// Sanitys bilde-API. Den store gevinsten: 1 MB -> 28 kB.
		vert: 'cdn.sanity.io',
		bygg: (url, bredde) => {
			url.searchParams.set('w', String(bredde));
			url.searchParams.set('fm', 'webp');
			url.searchParams.set('q', String(KVALITET));
			// fit=max: skaler ned, aldri opp, og aldri beskjær. Vi vet ikke hvor
			// motivet er i bildet, så en beskjæring kan kutte hodet av folk.
			url.searchParams.set('fit', 'max');
			return url;
		},
	},
	{
		// Squarespace tar `?format={bredde}w`. Beskjeden gevinst, men gratis.
		vert: 'images.squarespace-cdn.com',
		bygg: (url, bredde) => {
			url.searchParams.set('format', `${bredde}w`);
			return url;
		},
	},
];

function finnOmskriver(url: URL): Omskriver | undefined {
	return OMSKRIVERE.find(o => url.hostname === o.vert || url.hostname.endsWith(`.${o.vert}`));
}

/**
 * URL for én bredde. Ukjent vert gir URL-en tilbake uendret.
 */
export function optimizedSrc(url: string, width?: number, _quality?: number): string {
	const trygg = url.replace(/^http:\/\//, 'https://');
	if (!width) return trygg;
	try {
		const u = new URL(trygg);
		const o = finnOmskriver(u);
		return o ? o.bygg(u, width).toString() : trygg;
	} catch {
		// Ugyldig URL — la den stå. Bildet feiler uansett, men ikke på grunn
		// av oss, og et kast her ville tatt ned hele sida.
		return trygg;
	}
}

/**
 * srcset for flere bredder, så nettleseren kan velge etter skjerm.
 *
 * Tom streng for ukjente verter. En srcset med samme URL på alle bredder
 * lyver for nettleseren og gir ingenting.
 */
export function optimizedSrcset(url: string, widths: number[], _quality?: number): string {
	const trygg = url.replace(/^http:\/\//, 'https://');
	try {
		const u = new URL(trygg);
		if (!finnOmskriver(u)) return '';
		return widths
			.map(b => `${optimizedSrc(trygg, b)} ${b}w`)
			.join(', ');
	} catch {
		return '';
	}
}
