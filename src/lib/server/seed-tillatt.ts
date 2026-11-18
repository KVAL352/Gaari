import { dev } from '$app/env';
import { GAARI_TESTMODUS } from '$app/env/private';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { erTestmodus } from './ikke-tilgjengelig';

/**
 * Om sidene får falle tilbake på `seedEvents`: lokalt, eller i Lighthouse-
 * målingen (se `erTestmodus`). Aldri i produksjon.
 */
export const seedTillatt: boolean = dev || erTestmodus(GAARI_TESTMODUS, PUBLIC_SUPABASE_URL);
