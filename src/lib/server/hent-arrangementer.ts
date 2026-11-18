import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Felles henting av kommende arrangementer for forsiden og samlingssidene.
 *
 * Før lå to kopier av to-siders henting i hver sin +page.server.ts. Side 2
 * manglet `is_canary = false`, så lokkeduer som havnet etter rad 1 000 lå i
 * HTML-en. Sorteringen var bare på `date_start`, som ikke er unik, så rader
 * med lik start kunne dukke opp på begge sider eller på ingen. Her gjelder
 * filteret i hver omgang, sorteringen er `date_start` + `id`, og vi henter til
 * en side er kortere enn PAGE (ingen tak på to sider).
 */
export const PAGE = 1000;

export async function hentKommendeArrangementer<T = Record<string, unknown>>(
	client: Pick<SupabaseClient, 'from'>,
	fields: string,
	nowUtc: string,
	startFloor: string
): Promise<T[]> {
	const alle: T[] = [];
	for (let fra = 0; ; fra += PAGE) {
		const { data, error } = await client
			.from('events')
			.select(fields)
			.in('status', ['approved', 'cancelled'])
			.eq('is_canary', false)
			.gte('date_start', startFloor)
			.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
			.order('date_start', { ascending: true })
			.order('id', { ascending: true })
			.range(fra, fra + PAGE - 1);
		if (error) throw error;
		const rader = (data ?? []) as unknown as T[];
		alle.push(...rader);
		if (rader.length < PAGE) return alle;
	}
}
