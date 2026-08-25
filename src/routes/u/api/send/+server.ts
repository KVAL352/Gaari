import type { RequestHandler } from './$types';

const UMAMI_ENDPOINT = 'https://api-gateway.umami.dev/api/send';

export const POST: RequestHandler = async (event) => {
	let clientIp: string;
	try {
		clientIp = event.getClientAddress();
	} catch {
		clientIp = '127.0.0.1';
	}

	const body = await event.request.text();
	const headers = new Headers({
		'Content-Type': 'application/json',
		'X-Forwarded-For': clientIp,
		'X-Real-IP': clientIp
	});

	// Forward relevant headers from the original request
	const ua = event.request.headers.get('user-agent');
	if (ua) headers.set('User-Agent', ua);
	const origin = event.request.headers.get('origin');
	if (origin) headers.set('Origin', origin);
	const referer = event.request.headers.get('referer');
	if (referer) headers.set('Referer', referer);

	// VIRKER IKKE. Beholdt, men stol ikke paa geografien fra Umami.
	//
	// Etterproevd i drift 25. august, flere timer etter deploy: fortsatt 100 %
	// US i alle tidsvinduer. Umamis kildekode sier at x-umami-client-country
	// ligger foerst i PROVIDER_HEADERS naar CLOUD_MODE er satt, og at loekka
	// returnerer paa foerste treff — headeren burde altsaa slaatt Cloudflare.
	//
	// To forklaringer staar igjen, og vi kan ikke skille dem uten aa maale
	// hvilke headere funksjonen faktisk mottar:
	//   1. Headerne kommer aldri fram. Enten setter ikke Vercel
	//      x-vercel-ip-country paa denne ruta, eller den faller bort
	//      underveis. Koden hopper stille over en header som mangler.
	//   2. Umamis gateway stripper akkurat den headeren som anti-spoofing.
	//      Svekkes av at sporingsskriptet sender x-umami-website-id og
	//      x-umami-hostname som aapenbart kommer fram.
	//
	// Beslutning 25. august: geografi leses fra Search Console, ikke herfra.
	// Koden staar fordi den er gratis og kan begynne aa virke hvis Umami
	// endrer seg — ikke fordi den loeser noe i dag.
	//
	// Under foelger den opprinnelige begrunnelsen.
	//
	// Geografi maa sendes eksplisitt, ellers blir ALT USA.
	//
	// X-Forwarded-For over gir Umami riktig bes0ks-IP, og den brukes til aa
	// skille bes0kende fra hverandre. Men stedsnavnet slaas ikke opp fra den
	// IP-en: Umami leser posisjon fra proxy-headere f0rst, og Umami Cloud
	// ligger bak Cloudflare. Cloudflare setter cf-ipcountry ut fra hvem som
	// faktisk aapnet TCP-forbindelsen — altsaa Vercels edge, som staar i USA.
	// Resultatet var at Umami i 30 dager rapporterte «US 3 781» av 3 781
	// bes0kende, mens Search Console samtidig viste at 90 % av klikkene kom
	// fra Norge.
	//
	// Umami sjekker x-umami-client-* f0r Cloudflare-headerne, saa disse
	// vinner. Verdiene tar vi fra Vercels egne geo-headere, som settes paa
	// edgen ut fra den ekte bes0kendes IP.
	//
	// Bonus for personvernet: naar posisjonen f0lger med som land/region/by,
	// trenger ikke Umami slaa opp IP-en for aa finne den.
	const geo: Array<[string, string]> = [
		['x-umami-client-country', 'x-vercel-ip-country'],
		['x-umami-client-region', 'x-vercel-ip-country-region'],
		['x-umami-client-city', 'x-vercel-ip-city']
	];
	for (const [umamiHeader, vercelHeader] of geo) {
		const verdi = event.request.headers.get(vercelHeader);
		if (!verdi) continue;
		// Vercel prosentkoder ikke-ASCII i bynavn (RFC3986). «Bergen» er trygt,
		// «Tromsø» er det ikke.
		let rent = verdi;
		try {
			rent = decodeURIComponent(verdi);
		} catch {
			// Ugyldig koding — send verdien raa framfor aa droppe posisjonen.
		}
		headers.set(umamiHeader, rent);
	}

	try {
		const response = await fetch(UMAMI_ENDPOINT, {
			method: 'POST',
			headers,
			body
		});

		return new Response(response.body, {
			status: response.status,
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch {
		return new Response('{"ok":true}', {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
