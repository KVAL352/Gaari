import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { antallArrangementer } from '../antall';

describe('antallArrangementer', () => {
	it('bruker entall for 1 på norsk og engelsk', () => {
		expect(antallArrangementer(1, 'no')).toBe('1 arrangement');
		expect(antallArrangementer(1, 'en')).toBe('1 event');
	});

	it('bruker flertall for 0 og for 2 eller flere', () => {
		expect(antallArrangementer(0, 'no')).toBe('0 arrangementer');
		expect(antallArrangementer(0, 'en')).toBe('0 events');
		expect(antallArrangementer(2, 'no')).toBe('2 arrangementer');
		expect(antallArrangementer(190, 'en')).toBe('190 events');
	});

	it('tar ikke 11 eller 21 for entall', () => {
		expect(antallArrangementer(11, 'no')).toBe('11 arrangementer');
		expect(antallArrangementer(21, 'en')).toBe('21 events');
	});
});

// Tellerne som ga «1 arrangementer» skal bruke funksjonen, ikke skrive
// `{n} arrangementer` selv. Låser at en ny kopi ikke sniker seg inn der.
describe('tellere bruker antallArrangementer', () => {
	const les = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

	it('dagoverskriftene i EventGrid', () => {
		const kilde = les('../components/EventGrid.svelte');
		expect(kilde).toContain('antallArrangementer(dayEvents.length');
		expect(kilde).not.toMatch(/\{dayEvents\.length\}\s*\{\$t\('events'\)\}/);
	});

	it('samlingssidens tre tellere', () => {
		const kilde = les('../../routes/[lang]/[collection]/+page.svelte');
		expect(kilde).toContain('antallArrangementer(count');
		expect(kilde).toContain('antallArrangementer(data.events.length');
		expect(kilde).toContain('antallArrangementer(filteredEvents.length');
		expect(kilde).not.toMatch(/\$\{count\} arrangementer akkurat/);
		expect(kilde).not.toMatch(/\{filteredEvents\.length\} \{\$t\('events'\)\}/);
	});
});
