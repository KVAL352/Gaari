/**
 * Hvilket skjema en henvendelse i `organizer_inquiries` kom fra.
 *
 * Begge havner i samme tabell, men betyr ulike ting: `nettside` er en
 * innsending fra /submit, altså en bestilling av automatisk henting (scraper)
 * med løftet «vi tar kontakt». `b2b` kommer fra /for-arrangorer.
 *
 * Skillet var tidligere meldingens første ord, hentet fra fritekst. En
 * B2B-melding som begynte likt ble feilklassifisert. Nå settes typen av
 * skjemaet selv, i kolonnen `kilde` (migrering 20261112160000).
 */

export type InquiryKilde = 'b2b' | 'nettside';

export const INQUIRY_KILDER: readonly InquiryKilde[] = ['b2b', 'nettside'];

/** Alt som ikke er `nettside` regnes som B2B, også ukjente og manglende verdier. */
export function erNettsideInnsending(kilde: string | null | undefined): boolean {
	return kilde === 'nettside';
}

/** Meldingen som lagres for en nettside-innsending: notat først, så bildevalg. */
export function byggNettsideMelding(notat: string, tillegg = ''): string {
	return `${notat.trim() ? `${notat.trim()}\n\n` : ''}${tillegg.trim()}`.trim();
}

/** Emnelinjen i varselet til post@gaari.no. */
export function varselEmne(organization: string, name: string, kilde: string | null | undefined): string {
	return `[${erNettsideInnsending(kilde) ? 'Nettside-innsending' : 'Inquiry'}] ${organization} — ${name}`;
}

/** Første linje i varselteksten: sier hvilken av de to innsendingstypene det er. */
export function varselIngress(kilde: string | null | undefined): string {
	return erNettsideInnsending(kilde)
		? 'New website submission from /submit: a request to have this source fetched automatically (scraper). The submitter was promised that we get in touch.'
		: 'New inquiry from the B2B contact form (for-arrangorer).';
}
