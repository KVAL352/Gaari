import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Regression test: Homepage and collection page Supabase queries must use
 * UTC timestamps (new Date().toISOString()), NOT Oslo local time.
 *
 * Background: A timezone mismatch bug caused events starting within the
 * next 1-2 hours to be invisible on the site. The queries compared a
 * local Oslo time string against UTC-stored date_start, creating a blind
 * spot equal to the UTC offset (1h in CET, 2h in CEST).
 */
describe('Supabase query timezone safety', () => {
	const serverFiles = [
		'src/routes/[lang]/+page.server.ts',
		'src/routes/[lang]/[collection]/+page.server.ts'
	];

	for (const relPath of serverFiles) {
		const fullPath = path.resolve(relPath);

		it(`${relPath} uses UTC for date_start filter`, () => {
			const content = fs.readFileSync(fullPath, 'utf-8');

			// Must use new Date().toISOString() or equivalent UTC comparison
			expect(content).toContain('new Date().toISOString()');

			// Must NOT use Oslo local time for the Supabase query
			expect(content).not.toMatch(/toLocaleString\s*\(\s*['"]sv-SE['"].*Europe\/Oslo.*\.gte\s*\(\s*['"]date_start['"]/s);

			// Must NOT have a variable named nowOslo used in .gte('date_start')
			expect(content).not.toMatch(/nowOslo/);
		});

		it(`${relPath} passes UTC value to .gte('date_start')`, () => {
			const content = fs.readFileSync(fullPath, 'utf-8');

			// The .gte('date_start', ...) call should reference the UTC variable
			const gteMatch = content.match(/\.gte\(\s*['"]date_start['"]\s*,\s*(\w+)\s*\)/);
			expect(gteMatch).toBeTruthy();

			const varName = gteMatch![1];
			// The variable used in .gte should be assigned from toISOString()
			const assignRegex = new RegExp(`const\\s+${varName}\\s*=\\s*new\\s+Date\\(\\)\\.toISOString\\(\\)`);
			expect(content).toMatch(assignRegex);
		});
	}

	it('UTC comparison handles CET offset correctly', () => {
		// Simulate: it's 12:30 UTC (13:30 Oslo CET), event starts at 13:00 UTC
		const now = new Date('2026-01-15T12:30:00Z');
		const eventStart = '2026-01-15T13:00:00Z';
		const nowUtc = now.toISOString();

		// UTC comparison: event is in the future — CORRECT
		expect(eventStart >= nowUtc).toBe(true);

		// What the old bug did: compare Oslo local time (13:30) against UTC (13:00)
		const nowOslo = '2026-01-15T13:30:00'; // CET = UTC+1
		// Oslo comparison: event appears to be in the past — BUG
		expect(eventStart >= nowOslo).toBe(false); // This demonstrates the bug
	});

	it('UTC comparison handles CEST offset correctly', () => {
		// Simulate: it's 11:30 UTC (13:30 Oslo CEST), event starts at 12:00 UTC
		const now = new Date('2026-07-15T11:30:00Z');
		const eventStart = '2026-07-15T12:00:00Z';
		const nowUtc = now.toISOString();

		// UTC comparison: event is in the future — CORRECT
		expect(eventStart >= nowUtc).toBe(true);

		// What the old bug did: compare Oslo local time (13:30) against UTC (12:00)
		const nowOslo = '2026-07-15T13:30:00'; // CEST = UTC+2
		// Oslo comparison: event appears to be in the past — BUG
		expect(eventStart >= nowOslo).toBe(false); // This demonstrates the bug
	});
});
