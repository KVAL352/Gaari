import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from project root. quiet: true suppresses dotenv@17's stdout
// banner, which otherwise pollutes scripts whose stdout is parsed as JSON
// (e.g. check-stale-events.ts --json piped into jq in CI).
dotenv.config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
	console.error('Missing SUPABASE_SERVICE_ROLE_KEY or PUBLIC_SUPABASE_URL in .env');
	process.exit(1);
}

// Service role client bypasses RLS — can insert as 'approved'
export const supabase = createClient(url, serviceKey);
