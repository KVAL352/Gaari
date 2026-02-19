import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
	console.error('Missing SUPABASE_SERVICE_ROLE_KEY or PUBLIC_SUPABASE_URL in .env');
	process.exit(1);
}

// Service role client bypasses RLS — can insert as 'approved'
export const supabase = createClient(url, serviceKey);
