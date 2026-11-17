import { describe, it, expect } from 'vitest';
import { TOP_VENUES, venueMatchNames, getVenueBySlug } from '../venues';

describe('venueMatchNames', () => {
	it('tar med offisielt navn og ekstra navn', () => {
		expect(venueMatchNames({ name: 'A' })).toEqual(['A']);
		expect(venueMatchNames({ name: 'A', matchNames: ['B'] })).toEqual(['A', 'B']);
	});

	it('biblioteksiden leter også etter «Hovedbiblioteket» (siden viste 1 av ca. 70)', () => {
		expect(venueMatchNames(getVenueBySlug('bergen-bibliotek')!)).toContain('Hovedbiblioteket');
	});

	it('ingen navn har tegn som brekker PostgREST-filteret i .or()', () => {
		// Stedssiden bygger `venue_name.ilike.%navn%,...`; komma og parentes er skilletegn der.
		for (const v of TOP_VENUES) {
			for (const n of venueMatchNames(v)) {
				expect(n, `${v.slug}: «${n}»`).not.toMatch(/[,()]/);
			}
		}
	});
});
