import { antallArrangementer } from './antall';

/**
 * Meta-beskrivelsen for en samlingsside.
 *
 * Sesongsider uten arrangementer lovet «Komplett program … Oppdatert daglig»
 * i søkeresultatet, mens siden selv sa at programmet ikke var ute. Da bruker
 * vi en tekst som sier det som det er, med tittelen (og året) først.
 */
export function samlingBeskrivelse(opts: {
	base: string;
	title: string;
	seasonal?: boolean;
	year: number;
	count: number;
	lang: 'no' | 'en';
}): string {
	const { base, title, seasonal, year, count, lang } = opts;
	if (seasonal && count === 0) {
		return lang === 'no'
			? `${title}: programmet er ikke ute ennå. Arrangementene legges ut her når de blir publisert.`
			: `${title}: the programme is not out yet. Events will appear here once they are published.`;
	}
	const tekst = seasonal ? `${base.replace(/\.$/, '')} ${year}.` : base;
	if (count > 0) {
		const antall = lang === 'no' ? `${antallArrangementer(count, 'no')} akkurat nå.` : `${antallArrangementer(count, 'en')} right now.`;
		// Tallet kommer med bare hvis det får plass.
		return (tekst + ' ' + antall).length <= 165 ? tekst + ' ' + antall : tekst;
	}
	return tekst;
}
