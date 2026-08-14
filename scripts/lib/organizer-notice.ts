/**
 * Malen for bekreftelsen til arrangører som ba om å bli lagt inn via
 * B2B-skjemaet på /for-arrangorer.
 *
 * Ligger her og ikke i notify-organizers.ts av samme grunn som consent-doc.ts:
 * testen skal kunne bygge et brev uten å starte jobben, og uten å røre Supabase.
 *
 * Malen er godkjent av Kjersti 2026-08-13. Endres teksten, skal hun se den først.
 */
import { SITE, wrap } from './notify.js';
import { CONSENT_RECORDS } from './consent-doc.js';

export type Henvendelse = {
	id: string;
	name: string;
	email: string;
	event_source: string;
};

export type Arrangement = {
	slug: string;
	title_no: string;
	date_start: string;
};

/** «Kaj Alver» → «Kaj». Tomt navn gir hilsen uten navn, som slår «Hei ,». */
export function fornavn(navn: string): string {
	const first = (navn ?? '').trim().split(/\s+/)[0];
	return first ?? '';
}

export function datoLabel(iso: string): string {
	return new Date(iso).toLocaleDateString('nb-NO', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Oslo'
	});
}

/**
 * Omfanget leses fra consent.json, ikke fra en egen liste her. Sier registeret
 * at kilden bare er godkjent for visning, er det nettopp det brevet lover, og
 * teksten kan ikke drive fra det SoMe-pipelinen faktisk har lov til.
 */
export function harSomeSamtykke(source: string): boolean {
	const k = CONSENT_RECORDS.find((r) => r.slug === source);
	return !!k && k.omfang.includes('some') && k.grunnlag === 'dokumentert';
}

export function bygg(
	h: Henvendelse,
	arrangementer: Arrangement[]
): { subject: string; html: string } {
	if (!arrangementer.length) {
		throw new Error(`Kan ikke bygge bekreftelse uten arrangementer (${h.email}).`);
	}

	const flere = arrangementer.length > 1;
	const navn = fornavn(h.name);
	const some = harSomeSamtykke(h.event_source);

	const subject = flere
		? 'Arrangementene deres er lagt ut på gaari.no'
		: `${arrangementer[0].title_no} er lagt ut på gaari.no`;

	const liste = flere
		? `<ul style="padding-left:18px;margin:0 0 16px;">\n${arrangementer
				.map(
					(a) =>
						`<li style="margin-bottom:6px;">${datoLabel(a.date_start)} — <a href="${SITE}/no/events/${a.slug}" style="color:#C82D2D;">${SITE}/no/events/${a.slug}</a></li>`
				)
				.join('\n')}\n</ul>`
		: `<p><a href="${SITE}/no/events/${arrangementer[0].slug}" style="color:#C82D2D;">${SITE}/no/events/${arrangementer[0].slug}</a></p>`;

	const bildeAvsnitt = some
		? `<p>Bildet vises på gaari.no, i nyhetsbrevet vårt og på Gåris Facebook og Instagram, slik dere har sagt ja til.</p>`
		: `<p>Bildet vises nå kun på gaari.no og i nyhetsbrevet vårt. Skulle dere ønske å bli med i gruppen av arrangementer som også legges ut på Gåris Facebook og Instagram, er det bare å si fra, så oppdaterer jeg det.</p>`;

	// Det engelske avsnittet står der av samme grunn som i innsender-malen: vi
	// lagrer ikke arrangørens språk, bare e-postadressen, og å gjette språk ut
	// fra navnet bommer.
	const engelsk = some
		? 'The image is shown on gaari.no, in our newsletter, and on our Facebook and Instagram.'
		: 'The image is shown on gaari.no and in our newsletter. Just say the word if you would also like it shared on our Facebook and Instagram.';

	return {
		subject,
		html: wrap(`<p>Hei${navn ? ' ' + navn : ''},</p>

<p>takk for at du tok kontakt. ${flere ? 'Arrangementene ligger' : 'Arrangementet ligger'} nå ute:</p>

${liste}

<p>Se gjerne over at detaljene stemmer, og si fra hvis noe er feil, så retter jeg det. Beskrivelsen har jeg skrevet selv, så den er ikke hentet fra nettsiden deres.</p>

${bildeAvsnitt}

<p>Klikk fra gaari.no går alltid rett til deres egen side.</p>

<p>Med vennlig hilsen,<br />Kjersti</p>

<p style="color:#555;font-style:italic;">Your ${flere ? 'events are' : 'event is'} now live at the ${flere ? 'links' : 'link'} above. Please check that the details are correct and let me know if anything needs fixing. ${engelsk}</p>`)
	};
}
