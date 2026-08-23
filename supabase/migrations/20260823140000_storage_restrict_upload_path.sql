-- Confine anonymous uploads to the events/ folder in event-images.
--
-- (Applied manually via the Supabase SQL editor on 2026-08-23. Migrations in
-- this project are not applied automatically — same as
-- 20260228190000_rls_events_edit_suggestions.sql.)
--
-- Background (audit 2026-08-23): the existing policy checks the bucket but not
-- the path.
--
--   Allow public uploads | INSERT | {anon} | bucket_id = 'event-images'
--
-- The /submit form uploads to `events/<slug>.<ext>` and nowhere else, but the
-- anon key ships in the browser bundle, so the policy — not the form — is what
-- actually decides. Anyone could create objects at any path in the bucket,
-- including new files under fallback/.
--
-- Two things already limit the damage and must not be mistaken for this fix:
--
--   * The bucket enforces 5 MB and image/jpeg|png|webp. Verified 2026-08-23.
--     That stops the wrong TYPE of file, not the wrong PLACE.
--   * There is no UPDATE or DELETE policy for anon, so existing objects cannot
--     be overwritten or removed. That is what makes `upsert: true` in
--     src/routes/[lang]/submit/+page.svelte tolerable today. It is a thin
--     guarantee to rely on, and this policy makes it moot.
--
-- Note that these uploads go straight to Supabase and never touch the
-- SvelteKit app, so the rate limiting in hooks.server.ts does not apply to
-- them. The path restriction is the only bound on where they land.
--
-- The fallback/ images were uploaded with the service role, which bypasses
-- RLS, so this does not affect them or the ability to add more that way.

-- Wrapped in a transaction on purpose. Between the DROP and the CREATE there
-- is no upload policy at all, and if the CREATE failed there, image upload on
-- /submit would break silently — the form would report success and the row
-- would be inserted without an image. Either both statements land or neither.

BEGIN;

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'event-images'
    AND name LIKE 'events/%'
  );

COMMIT;

-- Verify after applying — the second column must read events/%:
--
--   select policyname, cmd, roles::text, with_check
--   from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
