import { defineConfig, devices } from '@playwright/test';

/**
 * Kjører kun tilgjengelighetstestene i e2e/.
 *
 * Serveren startes med en Supabase-URL som ikke svarer. Det er med vilje:
 * rutene faller da tilbake på `seedEvents`, som gir de samme 18 arrangementene
 * hver gang, med alle seks merketypene representert. Mot ekte data ville testen
 * vært avhengig av hva som tilfeldigvis lå i basen den dagen, og en
 * arrangementsside ville sluttet å svare så snart arrangementet var over.
 *
 * Verten MÅ være localhost. hooks.server.ts 301-omdirigerer alle andre verter
 * til gaari.no, og 127.0.0.1 står ikke på unntakslista. Med den adressen kjørte
 * hele suiten mot produksjonssiden uten å si fra, og målte kode som ikke var
 * utplassert enda. Testen under vokter dette.
 *
 * `vite dev` og ikke `preview`: adapter-vercel skriver byggresultatet til
 * .vercel/output via symlenker, som krever rettigheter Windows ikke gir uten
 * videre. Dev-serveren virker begge steder, og DOM-en er den samme for det
 * disse testene måler.
 */
export default defineConfig({
	testDir: 'e2e',
	// Dev-serveren kompilerer ruter ved første treff. Med full parallellitet
	// traff alle testene en kald server samtidig, og page.goto gikk over 30 s.
	fullyParallel: false,
	workers: 2,
	timeout: 90_000,
	forbidOnly: !!process.env.CI,
	// Ett forsøk til i CI. Et ekte WCAG-brudd feiler likt hver gang, saa dette
	// skjuler ingenting — det absorberer bare at dev-serveren av og til bruker
	// litt lengre tid paa aa kompilere en rute under parallell kjøring.
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'lys', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
		{ name: 'mork', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } }
	],
	webServer: {
		command: 'npx vite dev --port 4173 --strictPort',
		url: 'http://localhost:4173/no',
		reuseExistingServer: false,
		timeout: 180_000,
		env: {
			PUBLIC_SUPABASE_URL: 'https://supabase.invalid',
			PUBLIC_SUPABASE_ANON_KEY: 'dummy-for-a11y-tests',
			SUPABASE_SERVICE_ROLE_KEY: 'dummy-for-a11y-tests'
		}
	}
});
