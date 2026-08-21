import { getAllCollectionSlugs, getCollection } from '$lib/collections';
import type { PageServerLoad } from './$types';

/**
 * Bare slug og tittel for hver samling, til ItemList-en i JSON-LD-en på siden.
 *
 * Oppslaget gjøres her fordi $lib/collections er hele katalogen — importerte
 * komponenten den selv, fulgte 70 kB komprimert JavaScript med til nettleseren
 * for å produsere en liste med navn og lenker. Siden er forhåndsgenerert, så
 * dette kjører ved bygg.
 */
export const load: PageServerLoad = () => ({
	catalogue: getAllCollectionSlugs()
		.map((slug) => {
			const col = getCollection(slug);
			return col ? { slug, title: col.title } : null;
		})
		.filter((c): c is NonNullable<typeof c> => c != null)
});
