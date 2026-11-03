/**
 * Gikk torsdagens nyhetsbrev ut til alle?
 *
 * Fra 10. september til 15. oktober 2026 ble fem av seks utsendinger drept av
 * tidsgrensen midt i løkka. GitHub merket dem «cancelled», og det kom ingen
 * varsel, så ingen så det på seks uker. Fredagsrapporten i digesten viste bare
 * kampanjetall, og den henter bare 20 kampanjer mens en utsending er over 50,
 * så den kunne ikke se at noen manglet.
 *
 * Kjøringens utfall er det sikre signalet: send-newsletter.ts avslutter med
 * feil når noen ikke ble nådd, og stopper selv før GitHub dreper jobben.
 */

export interface WorkflowRun {
	status: string;
	conclusion: string | null;
	created_at: string;
	html_url: string;
}

export interface NyhetsbrevStatus {
	ok: boolean;
	melding: string;
	url?: string;
}

// Torsdag til torsdag er 7 dager. Cronen starter ofte timer for sent, så litt slakk.
const MAKS_ALDER_DAGER = 8;

export function vurderNyhetsbrevKjoring(run: WorkflowRun | null, naa: Date): NyhetsbrevStatus {
	if (!run) {
		return { ok: false, melding: 'Fant ingen planlagt kjøring av nyhetsbrevet.' };
	}

	const alderDager = (naa.getTime() - new Date(run.created_at).getTime()) / 86_400_000;
	const dato = run.created_at.slice(0, 10);

	if (alderDager > MAKS_ALDER_DAGER) {
		return {
			ok: false,
			melding: `Siste utsending startet ${dato}, over ${MAKS_ALDER_DAGER} dager siden. Cronen har ikke kjørt.`,
			url: run.html_url
		};
	}

	if (run.status !== 'completed') {
		// Fortsatt i gang er ikke en feil ennå.
		return { ok: true, melding: `Utsendingen ${dato} pågår.`, url: run.html_url };
	}

	if (run.conclusion === 'success') {
		return { ok: true, melding: `Utsendingen ${dato} nådde alle.`, url: run.html_url };
	}

	const hva = run.conclusion === 'cancelled'
		? 'ble avbrutt av tidsgrensen, de siste gruppene fikk trolig ingenting'
		: 'feilet, noen abonnenter fikk ikke brevet';
	return {
		ok: false,
		melding: `Utsendingen ${dato} ${hva}. Se loggen for hvilke grupper.`,
		url: run.html_url
	};
}

export async function hentSisteNyhetsbrevKjoring(): Promise<WorkflowRun | null> {
	const repo = process.env.GITHUB_REPOSITORY ?? 'KVAL352/Gaari';
	const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

	const res = await fetch(
		`https://api.github.com/repos/${repo}/actions/workflows/newsletter.yml/runs?event=schedule&per_page=1`,
		{ headers }
	);
	if (!res.ok) throw new Error(`GitHub svarte ${res.status}`);
	const json = await res.json() as { workflow_runs?: WorkflowRun[] };
	return json.workflow_runs?.[0] ?? null;
}
