/**
 * Falsk MailerLite til sandkassa. Ingenting herfra forlater maskinen.
 *
 * Svarer på de kallene send-newsletter.ts og newsletter-cleanup-groups.ts
 * bruker, med svarformene fra MailerLites API: `{ data, meta }`, sider for
 * grupper og cursor for abonnenter. Kan etterligne det vi er redde for:
 * gruppetak, rate limit, treghet, feil på ett endepunkt, og at sletting av en
 * gruppe tar abonnentene med seg.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { AddressInfo } from 'net';

export interface FakeSubscriber {
	id: string;
	email: string;
	status: string;
	fields: Record<string, string | null>;
}

export interface FakeGroup {
	id: string;
	name: string;
	members: Set<string>;
}

export interface FakeCall {
	method: string;
	/** Endepunktet med identifikatorer byttet ut, f.eks. `DELETE /groups/:id`. */
	endpoint: string;
	status: number;
	ms: number;
}

export interface FakeOptions {
	/** Venting per kall i ms. */
	delayMs?: number;
	/** Kall per minutt før 429. 0 slår av grensen. */
	ratePerMinute?: number;
	/** Lengden på rate limit-vinduet. Kortes ned i tester. */
	rateWindowMs?: number;
	/** Send `x-ratelimit-remaining`. Slås av for å prøve 429-veien alene. */
	rateHeader?: boolean;
	/** Største antall grupper. POST /groups svarer 422 over dette. */
	groupCap?: number;
	/** Tving fram en feilstatus på et endepunkt, f.eks. `{ 'POST /groups': 500 }`. */
	failOn?: Record<string, number>;
	/** Etterlign det verste: abonnentene i en slettet gruppe forsvinner også. */
	deleteRemovesSubscribers?: boolean;
	subscribers?: FakeSubscriber[];
	groups?: { name: string; members?: string[] }[];
}

export interface FakeMailerLite {
	url: string;
	groups: Map<string, FakeGroup>;
	subscribers: FakeSubscriber[];
	campaigns: Map<string, { name: string; groups: string[]; scheduled: boolean }>;
	calls: FakeCall[];
	close(): Promise<void>;
}

function endpointOf(method: string, path: string): string {
	const deler = path.split('/').map((d) => (/@|%40|^\d+$/.test(d) ? ':id' : d));
	return `${method} ${deler.join('/')}`;
}

async function lesKropp(req: IncomingMessage): Promise<any> {
	let tekst = '';
	for await (const bit of req) tekst += bit;
	if (!tekst) return {};
	try {
		return JSON.parse(tekst);
	} catch {
		return {};
	}
}

export async function startFakeMailerLite(opts: FakeOptions = {}): Promise<FakeMailerLite> {
	const delayMs = opts.delayMs ?? 0;
	const ratePerMinute = opts.ratePerMinute ?? 120;
	const rateWindowMs = opts.rateWindowMs ?? 60_000;
	const groupCap = opts.groupCap ?? 1000;
	let nesteId = 100_000;
	const nyId = () => String(nesteId++);

	const groups = new Map<string, FakeGroup>();
	for (const g of opts.groups ?? []) {
		const id = nyId();
		groups.set(id, { id, name: g.name, members: new Set(g.members ?? []) });
	}
	const subscribers = [...(opts.subscribers ?? [])];
	const campaigns: FakeMailerLite['campaigns'] = new Map();
	const calls: FakeCall[] = [];
	let vindu: number[] = [];

	async function handle(req: IncomingMessage, res: ServerResponse) {
		const start = Date.now();
		const url = new URL(req.url ?? '/', 'http://127.0.0.1');
		const path = url.pathname.replace(/^\/api/, '');
		const method = req.method ?? 'GET';
		const endpoint = endpointOf(method, path);

		const svar = (status: number, body?: unknown) => {
			const brukt = vindu.length;
			if (ratePerMinute > 0 && opts.rateHeader !== false) res.setHeader('x-ratelimit-remaining', String(Math.max(0, ratePerMinute - brukt)));
			res.statusCode = status;
			if (body !== undefined) {
				res.setHeader('content-type', 'application/json');
				res.end(JSON.stringify(body));
			} else {
				res.end();
			}
			calls.push({ method, endpoint, status, ms: Date.now() - start });
		};

		if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

		if (req.headers.authorization !== 'Bearer sandbox') return svar(401, { message: 'Unauthenticated.' });

		if (ratePerMinute > 0) {
			const naa = Date.now();
			vindu = vindu.filter((t) => naa - t < rateWindowMs);
			if (vindu.length >= ratePerMinute) {
				res.setHeader('retry-after', '1');
				return svar(429, { message: 'Too Many Attempts.' });
			}
			vindu.push(naa);
		}

		const tvunget = opts.failOn?.[endpoint];
		if (tvunget) return svar(tvunget, { message: `Sandkasse: tvunget ${tvunget} på ${endpoint}` });

		const body = method === 'GET' || method === 'DELETE' ? {} : await lesKropp(req);
		const deler = path.split('/').filter(Boolean).map(decodeURIComponent);

		// GET /groups?limit&page&filter[name]
		if (method === 'GET' && path === '/groups') {
			const limit = Number(url.searchParams.get('limit') ?? 25);
			const side = Number(url.searchParams.get('page') ?? 1);
			const filter = url.searchParams.get('filter[name]') ?? '';
			const alle = [...groups.values()].filter((g) => g.name.includes(filter));
			const data = alle.slice((side - 1) * limit, side * limit).map((g) => ({
				id: g.id,
				name: g.name,
				active_count: g.members.size
			}));
			return svar(200, {
				data,
				meta: { current_page: side, last_page: Math.max(1, Math.ceil(alle.length / limit)), per_page: limit, total: alle.length }
			});
		}

		if (method === 'POST' && path === '/groups') {
			if (groups.size >= groupCap) return svar(422, { message: `Sandkasse: gruppetaket på ${groupCap} er nådd` });
			const id = nyId();
			groups.set(id, { id, name: String(body.name ?? ''), members: new Set() });
			return svar(201, { data: { id, name: body.name } });
		}

		if (method === 'DELETE' && deler[0] === 'groups' && deler.length === 2) {
			const g = groups.get(deler[1]);
			if (!g) return svar(404, { message: 'Not found' });
			groups.delete(g.id);
			if (opts.deleteRemovesSubscribers) {
				for (let i = subscribers.length - 1; i >= 0; i--) {
					if (g.members.has(subscribers[i].email)) subscribers.splice(i, 1);
				}
			}
			return svar(204);
		}

		// GET /subscribers?filter[status]&limit&cursor
		if (method === 'GET' && path === '/subscribers') {
			const status = url.searchParams.get('filter[status]');
			const limit = Number(url.searchParams.get('limit') ?? 25);
			const fra = Number(url.searchParams.get('cursor') ?? 0);
			const alle = subscribers.filter((s) => !status || s.status === status);
			const data = alle.slice(fra, fra + limit);
			const neste = fra + limit < alle.length ? String(fra + limit) : null;
			return svar(200, { data, meta: { next_cursor: neste } });
		}

		// Upsert, brukt av preference_token-utfyllingen.
		if (method === 'POST' && path === '/subscribers') {
			const s = subscribers.find((x) => x.email === body.email);
			if (s && body.fields) Object.assign(s.fields, body.fields);
			return svar(200, { data: s ?? null });
		}

		if (method === 'POST' && deler[0] === 'subscribers' && deler[2] === 'groups' && deler.length === 4) {
			const g = groups.get(deler[3]);
			if (!g) return svar(404, { message: 'Group not found' });
			if (!subscribers.some((s) => s.email === deler[1])) return svar(404, { message: 'Subscriber not found' });
			g.members.add(deler[1]);
			return svar(200, { data: { email: deler[1] } });
		}

		if (method === 'POST' && path === '/campaigns') {
			const ids: string[] = (body.groups ?? []).map(String);
			if (ids.length === 0 || ids.some((id) => !groups.has(id))) return svar(422, { message: 'Invalid groups' });
			const id = nyId();
			campaigns.set(id, { name: String(body.name ?? ''), groups: ids, scheduled: false });
			return svar(201, { data: { id } });
		}

		if (method === 'POST' && deler[0] === 'campaigns' && deler[2] === 'schedule') {
			const c = campaigns.get(deler[1]);
			if (!c) return svar(404, { message: 'Not found' });
			c.scheduled = true;
			return svar(200, { data: { id: deler[1], status: 'sent' } });
		}

		return svar(404, { message: `Sandkasse kjenner ikke ${endpoint}` });
	}

	const server = createServer((req, res) => {
		handle(req, res).catch((e) => {
			res.statusCode = 500;
			res.end(String(e));
		});
	});
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	const { port } = server.address() as AddressInfo;

	return {
		url: `http://127.0.0.1:${port}/api`,
		groups,
		subscribers,
		campaigns,
		calls,
		close: () => new Promise((r) => server.close(() => r()))
	};
}
