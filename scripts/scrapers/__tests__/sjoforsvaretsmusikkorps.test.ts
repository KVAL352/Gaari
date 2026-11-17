import { describe, it, expect } from 'vitest';
import { bergenVenue, isExcluded, pickImage, toIso } from '../sjoforsvaretsmusikkorps.js';

describe('bergenVenue: bare steder i Bergen slipper gjennom', () => {
	it('slipper gjennom kjente steder i Bergen', () => {
		expect(bergenVenue('Håkonshallen, Bergen')).toBe('Håkonshallen');
		expect(bergenVenue('Mariakirken, Bergen')).toBe('Mariakirken');
		expect(bergenVenue('Peer Gynt-salen, Grieghallen')).toBe('Grieghallen');
	});

	it('forkaster Oseana i Os', () => {
		expect(bergenVenue('Oseana, Os')).toBeNull();
	});

	it('forkaster turnéstopp med «Bergen» i feil rolle og ukjente steder', () => {
		expect(bergenVenue('Kulturhuset, Oslo')).toBeNull();
		expect(bergenVenue('Bergen')).toBeNull();
		expect(bergenVenue('')).toBeNull();
		expect(bergenVenue(undefined)).toBeNull();
	});
});

describe('isExcluded', () => {
	it('holder Kirkeparade ute til svar foreligger, men ikke konsertene', () => {
		expect(isExcluded('Kirkeparade i Mariakirken')).toBe(true);
		expect(isExcluded('Adventskonsert')).toBe(false);
	});
});

describe('toIso: starttid fra data.event.start', () => {
	it('tolker som Bergen-tid (vinter, UTC+1)', () => {
		expect(toIso('2026-12-03T19:00')).toBe('2026-12-03T18:00:00.000Z');
	});

	it('tolker som Bergen-tid (sommer, UTC+2)', () => {
		expect(toIso('2027-06-10T19:00')).toBe('2027-06-10T17:00:00.000Z');
	});

	it('gir null for manglende eller ugyldig dato', () => {
		expect(toIso(undefined)).toBeNull();
		expect(toIso('4. des. 2026')).toBeNull();
	});
});

describe('pickImage', () => {
	const srcSet =
		'_/image/a/block-256-175/x.jpg?quality=70 256w, _/image/a/block-1024-700-/x.jpg?quality=70 1024w, _/image/a/block-2048-1401-/x.jpg?quality=70 2048w';

	it('velger største bilde på maks 1024 px, som absolutt adresse', () => {
		expect(pickImage(srcSet)).toBe(
			'https://kultur.forsvaret.no/_/image/a/block-1024-700-/x.jpg?quality=70'
		);
	});

	it('gir undefined uten srcSet', () => {
		expect(pickImage(undefined)).toBeUndefined();
		expect(pickImage('')).toBeUndefined();
	});
});
