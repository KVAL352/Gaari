import { getFooterCollections, getSeasonalFooterCollections } from '$lib/collections';
import type { LayoutServerLoad } from './$types';

/**
 * Lenkene i bunnteksten hentes her og ikke inne i Footer.svelte.
 *
 * $lib/collections.ts er hele samlingskatalogen — 53 samlinger med to-språklige
 * beskrivelser, FAQ-er og SEO-tekst, 338 kB kildekode. Så lenge en komponent
 * som vises på alle sider importerte noe derfra, havnet hele katalogen i
 * klientpakken: 70 kB komprimert JavaScript lastet på hver eneste sidevisning,
 * bare for å tegne rundt tjue lenker nederst på siden. Ytelsesbudsjettet fanget
 * det (skriptgrensen på 200 kB var brutt på forsiden, /submit og /en).
 *
 * Katalogen leses derfor på serveren, og bare slug og etikett sendes videre.
 * Legger du til noe i bunnteksten senere: hent det her, ikke i komponenten.
 */
export const load: LayoutServerLoad = ({ params }) => {
	const lang = params.lang === 'en' ? 'en' : 'no';

	return {
		// Sesonglenkene ligger sist, slik de gjorde da komponenten hentet dem selv.
		footerCollections: [
			...getFooterCollections(lang).map((c) => ({
				slug: c.slug,
				label: c.footerLabel ?? c.title
			})),
			...getSeasonalFooterCollections(lang)
		]
	};
};
