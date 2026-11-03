/**
 * Felles MailerLite-kall for nyhetsbrevet og oppryddingen av grupper.
 *
 * Ligger her og ikke i send-newsletter.ts fordi to skript skal bruke samme
 * rate limit-vern og samme sperre mot å treffe ekte MailerLite fra sandkassa.
 */

export const MAILERLITE_PROD_BASE = 'https://connect.mailerlite.com/api';

/**
 * Hvilken MailerLite skriptet snakker med.
 *
 * Utenfor sandkassemodus er svaret alltid den ekte adressen, uansett hva som
 * står i `MAILERLITE_BASE_URL`. I sandkassemodus (`NEWSLETTER_SANDBOX=1`)
 * nekter vi å starte hvis adressen ikke er lokal eller nøkkelen ikke er
 * `sandbox`: en sandkassekjøring som ved en feil har den ekte nøkkelen og den
 * ekte adressen, ville sendt brev til ekte abonnenter.
 */
export function mailerliteBase(env: NodeJS.ProcessEnv = process.env): string {
	if (env.NEWSLETTER_SANDBOX !== '1') return MAILERLITE_PROD_BASE;

	const base = env.MAILERLITE_BASE_URL ?? '';
	let host = '';
	try {
		const url = new URL(base);
		if (url.protocol === 'http:') host = url.hostname;
	} catch {
		// tom eller ugyldig adresse faller gjennom til feilen under
	}
	if (host !== '127.0.0.1' && host !== 'localhost') {
		throw new Error(`Sandkassemodus krever MAILERLITE_BASE_URL på http://127.0.0.1 eller localhost, fikk «${base}»`);
	}
	if (env.MAILERLITE_API_KEY !== 'sandbox') {
		throw new Error('Sandkassemodus krever MAILERLITE_API_KEY=sandbox');
	}
	return base.replace(/\/$/, '');
}

/**
 * Endepunktet uten identifikatorer, til logging.
 *
 * `/subscribers/ola%40eksempel.no/groups/123` inneholder abonnentens
 * e-postadresse, og Actions-loggen er offentlig fordi repoet er det. Loggen
 * trenger å vite hvilket kall som ble rate-limitet, ikke hvem det gjaldt.
 */
export function loggbarSti(path: string): string {
	return path
		.split('?')[0]
		.split('/')
		// Bytt ut det som er en identifikator, ikke det som er et endepunktnavn.
		// `/campaigns/123/schedule` skal fortsatt kunne leses som schedule-kallet.
		.map((del) => (/@|%40|^[0-9a-f]{6,}$|^\d+$/i.test(del) ? ':id' : del))
		.join('/');
}

/**
 * Samme grunn, men for svarkroppene vi logger videre. Vi vet ikke sikkert om
 * MailerLite gjentar adressen i feilmeldingene sine, og det er billigere aa
 * fjerne den enn aa finne det ut.
 */
export function utenEpost(tekst: string): string {
	return tekst.replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, '[e-post fjernet]');
}

// MailerLite allows 120 requests/minute. A personalized send makes roughly
// 3 calls per group plus one per subscriber, which overran the limit on
// 2026-08-20 and silently dropped two groups. Retry on 429 and slow down
// before we hit the wall, so a busy week degrades in speed, not in delivery.
const ML_MAX_RETRIES = 5;
const ML_LOW_REMAINING = 5;

export type MlFetch = (path: string, options?: RequestInit) => Promise<Response>;

export function lagMlFetch(
	base: string,
	apiKey: string | undefined,
	vent: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): MlFetch {
	async function mlFetch(path: string, options: RequestInit = {}, attempt = 0): Promise<Response> {
		const res = await fetch(`${base}${path}`, {
			...options,
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				...options.headers
			}
		});

		if (res.status === 429 && attempt < ML_MAX_RETRIES) {
			const retryAfter = Number(res.headers.get('retry-after'));
			const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
				? retryAfter * 1000
				: Math.min(60_000, 2 ** attempt * 2000);
			console.warn(`  Rate limited on ${loggbarSti(path)} — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${ML_MAX_RETRIES})`);
			await vent(waitMs);
			return mlFetch(path, options, attempt + 1);
		}

		// Back off before the window is exhausted rather than after.
		// Uten overskriften er `Number(null)` 0, og da ville hvert kall ventet 60 s.
		const header = res.headers.get('x-ratelimit-remaining');
		const remaining = header === null ? NaN : Number(header);
		if (Number.isFinite(remaining) && remaining <= ML_LOW_REMAINING) {
			console.warn(`  Rate limit nearly spent (${remaining} left) — pausing 60s`);
			await vent(60_000);
		}

		return res;
	}
	return (path, options) => mlFetch(path, options);
}
