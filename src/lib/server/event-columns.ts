/**
 * The columns anon is allowed to read from `events`.
 *
 * `submitter_email` and `submitter_notified_at` are deliberately absent: they
 * are personal data, and the grant in
 * supabase/migrations/20260821150000_rls_lock_personal_data.sql does not
 * include them. A `select('*')` against `events` therefore fails with 42501
 * rather than returning fewer columns — Postgres refuses the whole query.
 *
 * That is the safe failure mode, but it means every public read has to name
 * its columns. Use this constant instead of '*' so the list stays in one place
 * and matches the grant.
 */
export const PUBLIC_EVENT_COLUMNS = [
	'id',
	'slug',
	'title_no',
	'title_en',
	'description_no',
	'description_en',
	'category',
	'date_start',
	'date_end',
	'venue_name',
	'address',
	'bydel',
	'latitude',
	'longitude',
	'price',
	'ticket_url',
	'source',
	'source_url',
	'image_url',
	'age_group',
	'language',
	'status',
	'created_at',
	'updated_at',
	'link_check_failures',
	'link_checked_at',
	'is_sold_out',
	'image_credit',
	'is_canary'
].join(', ');
