import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Service role client — server-only, never expose to client
export const supabaseAdmin = createClient(
	PUBLIC_SUPABASE_URL.trim(),
	SUPABASE_SERVICE_ROLE_KEY.trim()
);
