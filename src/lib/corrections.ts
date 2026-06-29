// Single source of truth for which event columns a public correction may target.
// Used both when a visitor SUBMITS a correction (validate at the boundary) and
// when an admin APPLIES one (validate before writing to the events table).
// Keeping one list prevents the two sides from drifting apart.
export const EDITABLE_FIELDS = [
	'title_no', 'title_en', 'description_no', 'description_en',
	'venue_name', 'address', 'bydel', 'price', 'ticket_url',
	'category', 'date_start', 'date_end', 'image_url', 'age_group', 'language'
] as const;

export function isEditableField(field: string): boolean {
	return (EDITABLE_FIELDS as readonly string[]).includes(field);
}
