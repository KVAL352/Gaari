import type { SupabaseClient } from '@supabase/supabase-js';
import { erUtstilling } from '../utstilling';

/**
 * Felles henting av kommende arrangementer for forsiden og samlingssidene.
 *
 * Før lå to kopier av to-siders henting i hver sin +page.server.ts. Side 2
 * manglet `is_canary = false`, så lokkeduer som havnet etter rad 1 000 lå i
 * HTML-en. Sorteringen var bare på `date_start`, som ikke er unik, så rader
 * med lik start kunne dukke opp på begge sider eller på ingen. Her gjelder
 * filteret i hver omgang, sorteringen er `date_start` + `id`, og vi henter til
 * en side er kortere enn PAGE (ingen tak på to sider).
 *
 * 14-dagersgrensen (`startFloor`) holder gamle serier og klubber med utdatert
 * date_start ute. Pågående utstillinger er unntaket: de har gammel start fordi
 * de varer i måneder, og de er nettopp det utstillingssamlingen skal vise.
 * Derfor tas rader som startet før grensen, men varer forbi nå, med dersom
 * `erUtstilling` sier at de er utstillinger (samme regel som samlingen).
 */
export const PAGE = 1000;

type Klient = Pick<SupabaseClient, 'from'>;

async function hentSider<T>(bygg: (fra: number, til: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
	const alle: T[] = [];
	for (let fra = 0; ; fra += PAGE) {
		const { data, error } = await bygg(fra, fra + PAGE - 1);
		if (error) throw error;
		const rader = (data ?? []) as unknown as T[];
		alle.push(...rader);
		if (rader.length < PAGE) return alle;
	}
}

export async function hentKommendeArrangementer<T = Record<string, unknown>>(
	client: Klient,
	fields: string,
	nowUtc: string,
	startFloor: string
): Promise<T[]> {
	const vanlige = await hentSider<T>((fra, til) =>
		client
			.from('events')
			.select(fields)
			.in('status', ['approved', 'cancelled'])
			.eq('is_canary', false)
			.gte('date_start', startFloor)
			.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
			.order('date_start', { ascending: true })
			.order('id', { ascending: true })
			.range(fra, til)
	);

	// Pågående utstillinger som startet før grensen. Smal spørring (culture, har
	// sluttdato forbi nå); `erUtstilling` avgjør resten. `fields` MÅ ha med
	// category, title_no og venue_name, ellers finner regelen aldri noe. Det
	// låses av hent-arrangementer.test.ts mot begge sidenes feltlister.
	const utstillinger = (
		await hentSider<T>((fra, til) =>
			client
				.from('events')
				.select(fields)
				.in('status', ['approved', 'cancelled'])
				.eq('is_canary', false)
				.eq('category', 'culture')
				.lt('date_start', startFloor)
				.gte('date_end', nowUtc)
				.order('date_start', { ascending: true })
				.order('id', { ascending: true })
				.range(fra, til)
		)
	).filter((e) => erUtstilling(e as { category?: string; title_no?: string; venue_name?: string }));

	return [...vanlige, ...utstillinger];
}
