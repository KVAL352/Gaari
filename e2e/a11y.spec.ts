import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Tilgjengelighetsvern for de fire sidetypene på gaari.no.
 *
 * Bakgrunn: den publiserte erklæringen på /tilgjengelighet sier at nettstedet
 * følger WCAG 2.2 nivå AA, men ingen test stoppet et brudd. Gjennomgangen i
 * august 2026 fant to kontrastbrudd som bare fantes i mørk modus, og to
 * fokusfeil som ingen automatisk regel fanger. Derfor to slags tester her:
 * axe-core for det maskinlesbare, og eksplisitte fokustester for resten.
 *
 * Kjøres i både lys og mørk modus, se prosjektene i playwright.config.ts.
 * Begge kontrastbruddene var usynlige i lys modus.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const SIDER = [
	{ navn: 'forside', sti: '/no' },
	{ navn: 'samleside', sti: '/no/denne-helgen' },
	{ navn: 'arrangementsside', sti: '/no/events/aurora-grieghallen' },
	{ navn: 'innsendingsskjema', sti: '/no/submit' },
	{ navn: 'tilgjengelighetserklæringen', sti: '/no/tilgjengelighet' },
	{ navn: 'engelsk forside', sti: '/en' }
];

async function skann(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
	// Feilmeldingen må si hvilken regel og hvilket element, ellers må den som
	// får rødt i CI kjøre alt på nytt lokalt bare for å se hva det gjaldt.
	const rapport = violations
		.map(
			(v) =>
				`[${v.impact}] ${v.id} — ${v.help}\n` +
				v.nodes
					.slice(0, 5)
					.map((n) => `    ${n.target.join(' ')}\n      ${n.failureSummary?.replace(/\s+/g, ' ')}`)
					.join('\n')
		)
		.join('\n');
	expect(violations.length, `\n${rapport}\n`).toBe(0);
}

for (const { navn, sti } of SIDER) {
	test(`${navn} har ingen WCAG-brudd`, async ({ page }) => {
		await page.goto(sti);
		await page.waitForLoadState('networkidle');
		if (sti === '/no/submit') {
			await page.getByRole('button', { name: /Enkeltarrangement/ }).click();
			await expect(page.locator('#title-no')).toBeVisible();
		}
		await skann(page);
	});
}

// Åpne tilstander testes for seg. Menyer og søkefelt finnes ikke i DOM-en før
// de åpnes, så sidetestene over rører dem aldri.
test('åpent søkefelt har ingen WCAG-brudd', async ({ page }) => {
	await page.goto('/no');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Søk' }).click();
	await expect(page.getByRole('searchbox', { name: /Søk etter/ })).toBeFocused();
	await skann(page);
});

test('åpen kalendermeny har ingen WCAG-brudd', async ({ page }) => {
	await page.goto('/no');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Legg til i kalender' }).first().click();
	await expect(page.getByRole('menuitem').first()).toBeVisible();
	await skann(page);
});

/**
 * Fokustestene under dekker feil axe ikke ser. Begge var ekte feil i august
 * 2026, og begge er den typen som bare merkes av noen som ikke bruker mus.
 */

test('hopp-lenken flytter fokus til innholdet, ikke bare rullingen', async ({ page }) => {
	await page.goto('/no');
	await page.waitForLoadState('networkidle');
	await page.keyboard.press('Tab');
	const lenke = page.getByRole('link', { name: /Hopp til/ });
	await expect(lenke).toBeFocused();

	// Lenken skal komme til syne når den får fokus. .skip-link ligger på
	// top: -40px og animeres til 0 over 0,2 s, så vent på sluttilstanden.
	await expect
		.poll(async () => (await lenke.boundingBox())?.y, { timeout: 2000 })
		.toBeGreaterThanOrEqual(0);

	await page.keyboard.press('Enter');
	// Uten tabindex="-1" på <main> flytter href="#events" bare rullingen, og
	// document.activeElement blir <body>. Chrome lar neste Tab fortsette fra
	// fragmentet, så det ser ut til å virke — men fokus står ingen steder, og
	// en skjermleser annonserer ingen ny posisjon.
	await expect(page.locator('main#events')).toBeFocused();
});

test('Escape i søkefeltet gir fokus tilbake til søkeknappen', async ({ page }) => {
	await page.goto('/no');
	await page.waitForLoadState('networkidle');
	const knapp = page.getByRole('button', { name: 'Søk' });
	await knapp.click();
	await expect(page.getByRole('searchbox', { name: /Søk etter/ })).toBeFocused();

	await page.keyboard.press('Escape');
	// Å lukke søket fjerner <form> med det fokuserte feltet fra DOM. Uten at
	// fokus føres tilbake havner det på <body>, og tastaturbrukeren står øverst
	// i dokumentet igjen.
	await expect(page.getByRole('button', { name: 'Søk' })).toBeFocused();
});

test('kalendermenyen følger tastaturmønsteret erklæringen lover', async ({ page }) => {
	await page.goto('/no');
	await page.waitForLoadState('networkidle');
	const knapp = page.getByRole('button', { name: 'Legg til i kalender' }).first();
	await knapp.click();

	const punkter = page.getByRole('menuitem');
	await expect(punkter.first()).toBeFocused();

	const antall = await punkter.count();
	await page.keyboard.press('End');
	await expect(punkter.nth(antall - 1)).toBeFocused();
	await page.keyboard.press('Home');
	await expect(punkter.first()).toBeFocused();
	await page.keyboard.press('ArrowUp');
	await expect(punkter.nth(antall - 1)).toBeFocused(); // går rundt

	await page.keyboard.press('Escape');
	await expect(knapp).toBeFocused();
});

test('alle påkrevde skjemafelt er merket for hjelpemidler', async ({ page }) => {
	await page.goto('/no/submit');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /Enkeltarrangement/ }).click();
	await expect(page.locator('#title-no')).toBeVisible();

	// Erklæringen sier at alle påkrevde felt har aria-required="true". Fire
	// nyhetsbrevfelt hadde bare required, som er nok for hjelpemidler, men gjorde
	// setningen usann. Testen holder erklæringen og koden i takt.
	const uten = await page.locator('[required]:not([aria-required="true"])').evaluateAll((els) =>
		els.map((e) => `${e.tagName.toLowerCase()}#${e.id || '(uten id)'}[name=${e.getAttribute('name')}]`)
	);
	expect(uten, `påkrevde felt uten aria-required="true": ${uten.join(', ')}`).toEqual([]);
});

test('testene kjører mot localhost, ikke mot produksjon', async ({ page }) => {
	// hooks.server.ts 301-omdirigerer enhver vert som ikke er gaari.no eller
	// localhost. Med baseURL på 127.0.0.1 fulgte Playwright omdirigeringen og
	// testet den utplasserte siden i stedet for arbeidskopien — grønt og rødt
	// betydde da noe helt annet enn man trodde. Denne testen feiler høylytt
	// framfor å la det skje stille.
	await page.goto('/no');
	expect(new URL(page.url()).hostname, 'testene forlot localhost').toBe('localhost');
});
