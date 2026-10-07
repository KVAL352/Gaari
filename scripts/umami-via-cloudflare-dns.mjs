// Henter Umami-tall med DNS-oppslag mot 1.1.1.1, utenom VPN-ens DNS. Skriver bare tall, aldri nøkkelen.
import https from 'node:https';
import dns from 'node:dns';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const repo = 'C:/Users/kjers/Projects/Gaari';
const envPath = [`${repo}/scripts/.env`, `${repo}/.env`].find((p) => existsSync(p));
const dotenvPath = [`${repo}/scripts/node_modules/dotenv/lib/main.js`, `${repo}/node_modules/dotenv/lib/main.js`].find((p) => existsSync(p));
if (!envPath || !dotenvPath) { console.log(JSON.stringify({ feil: 'fant ikke .env eller dotenv', envPath, dotenvPath })); process.exit(1); }
const dotenv = (await import(pathToFileURL(dotenvPath).href)).default;
dotenv.config({ path: envPath, quiet: true });
const key = process.env.UMAMI_API_KEY;
if (!key) { console.log(JSON.stringify({ feil: 'UMAMI_API_KEY mangler i ' + envPath })); process.exit(1); }

const resolver = new dns.Resolver();
resolver.setServers(['1.1.1.1']);
const lookup = (host, opts, cb) => {
	if (typeof opts === 'function') { cb = opts; opts = {}; }
	resolver.resolve4(host, (err, addrs) => {
		if (err) return cb(err);
		if (opts && opts.all) return cb(null, addrs.map((a) => ({ address: a, family: 4 })));
		cb(null, addrs[0], 4);
	});
};
function get(path) {
	return new Promise((resolve) => {
		const req = https.request('https://api.umami.is' + path, { headers: { 'x-umami-api-key': key }, lookup, timeout: 15000 }, (res) => {
			let b = '';
			res.on('data', (d) => (b += d));
			res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b.slice(0, 200) }); } });
		});
		req.on('timeout', () => { req.destroy(new Error('timeout')); });
		req.on('error', (e) => resolve({ feil: e.code || e.message }));
		req.end();
	});
}
const site = '5f889214-285b-4412-8066-015a18f8ce65';
const now = Date.now(), d = 86400000;
const q = (a, b, extra = '') => `startAt=${a}&endAt=${b}${extra}`;
if (process.argv.includes('--28')) {
	// Trafikkanalyse: 28 dager mot 28 før. Prøver `entry` og `path` ved siden av `url`; ukjente typer vises som feil, ikke gjetting.
	const m = (a, b, type, limit = 25) => get(`/v1/websites/${site}/metrics?${q(a, b, `&type=${type}&limit=${limit}`)}`);
	const [naa, for_, entry, url, land, enhet, kilder28, kilderFor, dager28] = await Promise.all([
		get(`/v1/websites/${site}/stats?${q(now - 28 * d, now)}`),
		get(`/v1/websites/${site}/stats?${q(now - 56 * d, now - 28 * d)}`),
		m(now - 28 * d, now, 'entry', 500),
		m(now - 28 * d, now, 'url', 60),
		m(now - 28 * d, now, 'country', 8),
		m(now - 28 * d, now, 'device', 5),
		m(now - 28 * d, now, 'referrer', 12),
		m(now - 56 * d, now - 28 * d, 'referrer', 12),
		get(`/v1/websites/${site}/pageviews?${q(now - 28 * d, now, '&unit=day&timezone=Europe/Oslo')}`),
	]);
	console.log(JSON.stringify({ naa28: naa, forrige28: for_, entry, url, land, enhet, kilder28, kilderFor, dager28 }));
	process.exit(0);
}
const [dag, uke, forrigeUke, aktiv, sider, kilder, dager] = await Promise.all([
	get(`/v1/websites/${site}/stats?${q(now - d, now)}`),
	get(`/v1/websites/${site}/stats?${q(now - 7 * d, now)}`),
	get(`/v1/websites/${site}/stats?${q(now - 14 * d, now - 7 * d)}`),
	get(`/v1/websites/${site}/active`),
	get(`/v1/websites/${site}/metrics?${q(now - 7 * d, now, '&type=url&limit=12')}`),
	get(`/v1/websites/${site}/metrics?${q(now - 7 * d, now, '&type=referrer&limit=10')}`),
	get(`/v1/websites/${site}/pageviews?${q(now - 14 * d, now, '&unit=day&timezone=Europe/Oslo')}`),
]);
console.log(JSON.stringify({ siste24t: dag, siste7d: uke, forrige7d: forrigeUke, aktivNaa: aktiv, sider7d: sider, kilder7d: kilder, perDag14d: dager }, null, 1));
