import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Miljøvariablene appen leser.
 *
 * SvelteKit 3 gir bare ut variabler som står her. Mangler en, blir importen
 * `undefined` uten feilmelding, og typesjekken er grønn likevel. Slik var det
 * med alle sammen da vi oppgraderte: Supabase-klienten fikk `undefined` som
 * adresse. Legger du til en import fra `$env/...`, skal navnet inn her.
 *
 * Fordelingen speiler den gamle oppførselen i kit 2:
 * - `static: true` for det vi importerer fra `$env/static/*`. Verdien legges
 *   inn ved bygging, og mangler den, stopper byggingen, som før.
 * - Ikke statisk og valgfri for det vi leser via `env` fra
 *   `$env/dynamic/private`. Der har en manglende verdi alltid vært lov, og
 *   koden sjekker selv.
 */
const valgfri = (value: string | undefined) => value;

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true, static: true },
	PUBLIC_SUPABASE_ANON_KEY: { public: true, static: true },

	ADMIN_SESSION_SECRET: { static: true },
	ADMIN_PASSWORD: { static: true },
	SUPABASE_SERVICE_ROLE_KEY: { static: true },
	SKIP_LOG_IPS: { static: true },

	CALENDAR_FEED_TOKEN: { schema: valgfri },
	MAILERLITE_API_KEY: { schema: valgfri },
	NEWSLETTER_SIGNING_SECRET: { schema: valgfri },
	RESEND_API_KEY: { schema: valgfri },
	STRIPE_SECRET_KEY: { schema: valgfri },
	STRIPE_WEBHOOK_SECRET: { schema: valgfri }
});
