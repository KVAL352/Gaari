/** Bucket for arrangementsbilder. Inneholder to slags filer, se under. */
export const EVENT_IMAGE_BUCKET = 'event-images';

const MARKER = `/storage/v1/object/public/${EVENT_IMAGE_BUCKET}/`;

/**
 * Hvilken fil i event-images hoerer til dette arrangementet, og er det trygt
 * aa slette den?
 *
 * Returnerer stien i boetta, eller null naar ingenting skal slettes.
 *
 * To ting maa vaere sanne foer et bilde kan slettes, og begge er lette aa
 * miste:
 *
 * 1. ENDELSEN MAA KOMME FRA URL-EN. Opplastingen i /submit setter jpg, png
 *    eller webp avhengig av hvilken gren som kjoerer. Kallerne hardkodet
 *    tidligere `.jpg`, saa et avvist PNG-bilde ble bare liggende igjen.
 *
 * 2. KUN events/. Boetta inneholder ogsaa fallback/, som er delte
 *    reservebilder per arrangoer (se scripts/lib/venues.ts). Et arrangement
 *    uten eget bilde faar image_url pekt paa et slikt fellesbilde. Slettet
 *    man det fordi EN innsending ble avvist, forsvant bildet for alle andre
 *    som bruker samme fallback. Derfor: alt som ikke ligger under events/
 *    gir null.
 *
 * Eksterne URL-er (hot-linkede bilder fra arrangoerens egen side) gir ogsaa
 * null — der er det ingenting av vaart aa slette.
 */
export function eventImageStoragePath(imageUrl: string | null | undefined): string | null {
	if (!imageUrl) return null;

	const i = imageUrl.indexOf(MARKER);
	if (i === -1) return null;

	// Kutt vekk query og fragment; Supabase legger av og til paa ?t=...
	const path = imageUrl.slice(i + MARKER.length).split(/[?#]/)[0];
	if (!path) return null;

	// Bare arrangementets egen opplasting. Aldri fallback/ eller noe annet.
	if (!path.startsWith('events/')) return null;

	// Ingen sti-traversering, og ingen mappe under events/.
	const name = path.slice('events/'.length);
	if (!name || name.includes('/') || name.includes('..')) return null;

	return path;
}
