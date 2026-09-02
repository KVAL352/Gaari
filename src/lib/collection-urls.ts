import type { Lang } from './types';

/**
 * Adressene samlingene har, uten katalogen.
 *
 * HVORFOR DENNE FILA FINNES
 *
 * `collections.ts` er katalogen: rundt 4 000 linjer med redaksjonell tekst,
 * FAQ-er og filterfunksjoner for hver samling. Footer.svelte har hatt en
 * kommentar siden mai om at den IKKE skal importere derfra, fordi importen
 * dro hele katalogen (70 kB komprimert) inn i klientpakken paa alle sider.
 *
 * 2. september 2026 gjorde jeg presis det likevel: `collectionHref()` laa i
 * collections.ts, og fem komponenter importerte den. Lighthouse-budsjettet
 * ble roedt paa forsiden — 211 KiB script mot en grense paa 200 — mens
 * svelte-check og alle 1 493 testene var groenne. Feilklassen staar i
 * [[pattern_liten_funksjon_stor_tabell]].
 *
 * Alt som handler om ADRESSEN til en samling hoerer derfor her, og
 * ingenting her har lov til aa importere fra collections.ts.
 */

export const HREFLANG_PAIRS: Record<string, Record<'no' | 'en', string>> = {
	'denne-helgen': { no: 'denne-helgen', en: 'this-weekend' },
	'this-weekend': { no: 'denne-helgen', en: 'this-weekend' },
	'i-dag': { no: 'i-dag', en: 'today-in-bergen' },
	'today-in-bergen': { no: 'i-dag', en: 'today-in-bergen' },
	'gratis': { no: 'gratis', en: 'free-things-to-do-bergen' },
	'free-things-to-do-bergen': { no: 'gratis', en: 'free-things-to-do-bergen' },
	'17-mai': { no: '17-mai', en: '17th-of-may-bergen' },
	'17th-of-may-bergen': { no: '17-mai', en: '17th-of-may-bergen' },
	'julemarked': { no: 'julemarked', en: 'christmas-bergen' },
	'christmas-bergen': { no: 'julemarked', en: 'christmas-bergen' },
	'paske': { no: 'paske', en: 'easter-bergen' },
	'easter-bergen': { no: 'paske', en: 'easter-bergen' },
	'sankthans': { no: 'sankthans', en: 'midsummer-bergen' },
	'midsummer-bergen': { no: 'sankthans', en: 'midsummer-bergen' },
	'nyttarsaften': { no: 'nyttarsaften', en: 'new-years-eve-bergen' },
	'new-years-eve-bergen': { no: 'nyttarsaften', en: 'new-years-eve-bergen' },
	'vinterferie': { no: 'vinterferie', en: 'winter-break-bergen' },
	'winter-break-bergen': { no: 'vinterferie', en: 'winter-break-bergen' },
	// Festival collections (Fase 2)
	'festspillene': { no: 'festspillene', en: 'bergen-international-festival' },
	'bergen-international-festival': { no: 'festspillene', en: 'bergen-international-festival' },
	'bergenfest': { no: 'bergenfest', en: 'bergenfest-bergen' },
	'bergenfest-bergen': { no: 'bergenfest', en: 'bergenfest-bergen' },
	'beyond-the-gates': { no: 'beyond-the-gates', en: 'beyond-the-gates-bergen' },
	'beyond-the-gates-bergen': { no: 'beyond-the-gates', en: 'beyond-the-gates-bergen' },
	'nattjazz': { no: 'nattjazz', en: 'nattjazz-bergen' },
	'nattjazz-bergen': { no: 'nattjazz', en: 'nattjazz-bergen' },
	// Fase 2b
	'bergen-pride': { no: 'bergen-pride', en: 'bergen-pride-festival' },
	'bergen-pride-festival': { no: 'bergen-pride', en: 'bergen-pride-festival' },
	'biff': { no: 'biff', en: 'biff-bergen' },
	'biff-bergen': { no: 'biff', en: 'biff-bergen' },
	'borealis': { no: 'borealis', en: 'borealis-bergen' },
	'borealis-bergen': { no: 'borealis', en: 'borealis-bergen' },
	// Phase 2 new collections
	'festivaler': { no: 'festivaler', en: 'festivals-in-bergen' },
	'festivals-in-bergen': { no: 'festivaler', en: 'festivals-in-bergen' },
	'i-morgen': { no: 'i-morgen', en: 'tomorrow-in-bergen' },
	'tomorrow-in-bergen': { no: 'i-morgen', en: 'tomorrow-in-bergen' },
	// Phase 3: EN tourist slugs for existing bilingual collections
	'regndagsguide': { no: 'regndagsguide', en: 'rainy-day-bergen' },
	'rainy-day-bergen': { no: 'regndagsguide', en: 'rainy-day-bergen' },
	'familiehelg': { no: 'familiehelg', en: 'family-bergen' },
	'family-bergen': { no: 'familiehelg', en: 'family-bergen' },
	'uteliv': { no: 'uteliv', en: 'nightlife-bergen' },
	'nightlife-bergen': { no: 'uteliv', en: 'nightlife-bergen' },
	'ting-a-gjore': { no: 'ting-a-gjore', en: 'things-to-do-bergen' },
	'things-to-do-bergen': { no: 'ting-a-gjore', en: 'things-to-do-bergen' },
	// SEO aliases — redirect alternate search terms to canonical collections
	'live-musikk': { no: 'konserter', en: 'konserter' },
};

/**
 * Samlinger som ikke er landingsside paa alle spraak. Utelatt betyr begge.
 *
 * Besluttet 2. september 2026: paa norsk skal tidssoekene samles paa
 * forsiden. `/no/i-kveld` laa paa snittposisjon 32,2 og `/no/i-dag` paa 22,8,
 * mens `/no` tok de samme soekene paa plass 5-6 — Google valgte forsiden
 * uansett, og de to sidene delte signalet uten aa vinne noe.
 *
 * Paa engelsk er bildet motsatt. `/en/i-kveld` er vaar beste samleside med
 * 268 klikk paa 90 dager paa plass 6,2, og 151 av dem kom de siste 28 dagene
 * mot 58 i perioden foer. Der rangerer ikke forsiden paa de soekene, saa aa
 * fjerne sida ville gitt bort trafikken, ikke flyttet den.
 *
 * `i-dag` staar med tom liste: den norske sida 301-er til forsiden, og den
 * engelske utgaven er den egne samlingen `today-in-bergen`.
 *
 * `sitemap-samlinger.test.ts` haandhever at hver noekkel her viser til en
 * samling som faktisk finnes.
 */
export const COLLECTION_LANGS: Record<string, Lang[]> = {
	'i-kveld': ['en'],
	'i-dag': [],
};

/** Returns hreflang slugs for a collection. Unpaired collections use the same slug for both. */
export function getHreflangSlugs(slug: string): Record<'no' | 'en', string> {
	return HREFLANG_PAIRS[slug] ?? { no: slug, en: slug };
}

/**
 * Er samlingen en landingsside paa dette spraaket?
 *
 * Slaar opp paa sluggen slik den staar i adressen, ikke paa samlingen vi
 * itererer over. `/en/today-in-bergen` og `/no/i-dag` er to ulike samlinger
 * som deler hreflang-par, og bare den ene lever.
 */
export function isCollectionLang(slug: string, lang: Lang): boolean {
	return (COLLECTION_LANGS[slug] ?? ['no', 'en']).includes(lang);
}

/**
 * Adressen en samling har paa et gitt spraak.
 *
 * Interne lenker ble bygget som `/${lang}/${col.slug}` med den kanoniske
 * sluggen. Paa norsk stemmer det. Paa engelsk gjoer det ikke: ruta
 * 301-redirecter /en/regndagsguide til /en/rainy-day-bergen, /en/uteliv til
 * /en/nightlife-bergen og fire til. De seks engelske aliassidene hadde derfor
 * ikke én intern lenke som pekte rett paa dem.
 *
 * Bruk denne i stedet for aa sette sammen stien for haand.
 */
export function collectionHref(slug: string, lang: Lang): string {
	const maal = getHreflangSlugs(slug)[lang];
	// Lever ikke sida paa dette spraaket, er forsiden riktig sted aa peke.
	// Ellers ville lenka gaatt til en 301.
	if (!isCollectionLang(maal, lang)) return `/${lang}`;
	return `/${lang}/${maal}`;
}
