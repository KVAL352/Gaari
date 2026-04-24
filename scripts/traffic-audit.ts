/**
 * One-off traffic audit — pulls comprehensive Umami data for all periods.
 */
import 'dotenv/config';

const KEY = process.env.UMAMI_API_KEY!;
const WID = process.env.UMAMI_WEBSITE_ID || '5f889214-285b-4412-8066-015a18f8ce65';
const BASE = `https://api.umami.is/v1/websites/${WID}`;

async function get(path: string) {
	const r = await fetch(`${BASE}/${path}`, { headers: { 'x-umami-api-key': KEY } });
	if (!r.ok) return { error: r.status, body: await r.text() };
	return r.json();
}

function pct(a: number | null, b: number | null): string {
	if (a == null || b == null || b === 0) return '—';
	return (((a - b) / b) * 100).toFixed(1) + '%';
}

function fmt(n: number | null | undefined): string {
	if (n == null) return '—';
	return new Intl.NumberFormat('no-NO').format(n);
}

const now = Date.now();
const D = 86400000;
const periods = {
	'Aktive nå': null,
	'Siste 24t': [now - D, now],
	'Siste 7 dager': [now - 7 * D, now],
	'Forrige 7 dager': [now - 14 * D, now - 7 * D],
	'Siste 30 dager': [now - 30 * D, now],
	'Forrige 30 dager': [now - 60 * D, now - 30 * D],
	'Siste 90 dager': [now - 90 * D, now],
} as const;

async function main() {
	const active = await get('active');
	console.log('# Trafikkaudit — gaari.no\n');
	console.log(`## Aktive akkurat nå: **${active.visitors ?? 0}** besøkende\n`);

	// Summary table
	const results: Record<string, any> = {};
	for (const [label, range] of Object.entries(periods)) {
		if (!range) continue;
		const [start, end] = range;
		results[label] = await get(`stats?startAt=${start}&endAt=${end}`);
	}

	console.log('## Hovedtall\n');
	console.log('| Periode | Besøkende | Visninger | Besøk | Avvisningsrate | Gj.snitt tid |');
	console.log('|---|---:|---:|---:|---:|---:|');
	for (const label of ['Siste 24t', 'Siste 7 dager', 'Forrige 7 dager', 'Siste 30 dager', 'Forrige 30 dager', 'Siste 90 dager']) {
		const s = results[label];
		const vis = s?.visitors?.value ?? s?.visitors;
		const pv = s?.pageviews?.value ?? s?.pageviews;
		const vi = s?.visits?.value ?? s?.visits;
		const bounce = s?.bounces?.value ?? s?.bounces;
		const total = s?.totaltime?.value ?? s?.totaltime;
		const bounceRate = vi && bounce != null ? ((bounce / vi) * 100).toFixed(1) + '%' : '—';
		const avgTime = vi && total != null ? Math.round(total / vi) + 's' : '—';
		console.log(`| ${label} | ${fmt(vis)} | ${fmt(pv)} | ${fmt(vi)} | ${bounceRate} | ${avgTime} |`);
	}

	console.log('\n### Endring uke-over-uke');
	const tw = results['Siste 7 dager'];
	const pw = results['Forrige 7 dager'];
	console.log(`- Besøkende: ${pct(tw?.visitors?.value ?? tw?.visitors, pw?.visitors?.value ?? pw?.visitors)}`);
	console.log(`- Visninger: ${pct(tw?.pageviews?.value ?? tw?.pageviews, pw?.pageviews?.value ?? pw?.pageviews)}`);

	console.log('\n### Endring måned-over-måned');
	const tm = results['Siste 30 dager'];
	const pm = results['Forrige 30 dager'];
	console.log(`- Besøkende: ${pct(tm?.visitors?.value ?? tm?.visitors, pm?.visitors?.value ?? pm?.visitors)}`);
	console.log(`- Visninger: ${pct(tm?.pageviews?.value ?? tm?.pageviews, pm?.pageviews?.value ?? pm?.pageviews)}`);

	// Breakdowns — use 30 day window for stability
	const [s30, e30] = periods['Siste 30 dager']!;
	const qs = `startAt=${s30}&endAt=${e30}`;

	const [urls, referrers, countries, devices, browsers, oses, events, langs] = await Promise.all([
		get(`metrics?${qs}&type=url&limit=20`),
		get(`metrics?${qs}&type=referrer&limit=20`),
		get(`metrics?${qs}&type=country&limit=15`),
		get(`metrics?${qs}&type=device&limit=10`),
		get(`metrics?${qs}&type=browser&limit=10`),
		get(`metrics?${qs}&type=os&limit=10`),
		get(`metrics?${qs}&type=event&limit=20`),
		get(`metrics?${qs}&type=language&limit=10`),
	]);

	const totalPv = tm?.pageviews?.value ?? tm?.pageviews ?? 0;

	const section = (title: string, data: any, keyLabel = 'Sti', limit = 15) => {
		console.log(`\n## ${title}\n`);
		if (!Array.isArray(data) || data.length === 0) {
			console.log('_ingen data_');
			return;
		}
		console.log(`| ${keyLabel} | Antall | Andel |`);
		console.log('|---|---:|---:|');
		data.slice(0, limit).forEach((row: any) => {
			const share = totalPv ? ((row.y / totalPv) * 100).toFixed(1) + '%' : '—';
			console.log(`| ${row.x || '(direkte/ukjent)'} | ${fmt(row.y)} | ${share} |`);
		});
	};

	console.log('\n---\n# Detaljer — siste 30 dager');
	section('Topp sider', urls, 'URL', 20);
	section('Topp referrers', referrers, 'Kilde', 20);
	section('Land', countries, 'Land');
	section('Enheter', devices, 'Enhet');
	section('Nettlesere', browsers, 'Nettleser');
	section('OS', oses, 'OS');
	section('Språk', langs, 'Språk');
	section('Custom events', events, 'Event', 20);
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
