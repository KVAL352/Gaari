import { describe, it, expect } from 'vitest';
import { eventImageStoragePath, EVENT_IMAGE_BUCKET } from '$lib/storage-path';

const BASE = `https://rilwtpluofguyjpzdezi.supabase.co/storage/v1/object/public/${EVENT_IMAGE_BUCKET}/`;

describe('eventImageStoragePath', () => {
	describe('endelsen kommer fra URL-en', () => {
		// Regresjonen: begge kallerne bygde stien som `events/<slug>.jpg`.
		// Opplastingen i /submit kan gi png eller webp, saa de filene ble
		// liggende igjen i boetta naar innsendingen ble avvist.
		it.each([
			['jpg', 'events/konsert-2026-09-01.jpg'],
			['png', 'events/konsert-2026-09-01.png'],
			['webp', 'events/konsert-2026-09-01.webp']
		])('%s', (_ext, path) => {
			expect(eventImageStoragePath(BASE + path)).toBe(path);
		});
	});

	describe('fallback-bilder skal aldri slettes', () => {
		// Den farlige: fallback/ er DELTE reservebilder per arrangoer. Et
		// arrangement uten eget bilde peker paa et slikt fellesbilde. Slettes
		// det fordi én innsending avvises, forsvinner bildet for alle andre
		// som bruker samme fallback.
		it.each([
			'fallback/brann.jpg',
			'fallback/dns.png',
			'fallback/bergenlive.png'
		])('%s gir null', (path) => {
			expect(eventImageStoragePath(BASE + path)).toBeNull();
		});
	});

	describe('ingenting av vaart aa slette', () => {
		it('hot-linket bilde fra arrangoerens egen side', () => {
			expect(eventImageStoragePath('https://dns.no/bilder/forestilling.jpg')).toBeNull();
		});

		it('en annen boette i samme prosjekt', () => {
			const other = BASE.replace(EVENT_IMAGE_BUCKET, 'social-media');
			expect(eventImageStoragePath(other + 'events/noe.jpg')).toBeNull();
		});

		it('tomt, null og undefined', () => {
			expect(eventImageStoragePath('')).toBeNull();
			expect(eventImageStoragePath(null)).toBeNull();
			expect(eventImageStoragePath(undefined)).toBeNull();
		});

		it('URL som slutter paa boettenavnet uten fil', () => {
			expect(eventImageStoragePath(BASE)).toBeNull();
		});
	});

	describe('avviser rare stier', () => {
		it('sti-traversering', () => {
			expect(eventImageStoragePath(BASE + 'events/../fallback/brann.jpg')).toBeNull();
		});

		it('undermappe under events/', () => {
			expect(eventImageStoragePath(BASE + 'events/2026/noe.jpg')).toBeNull();
		});
	});

	describe('praktiske detaljer', () => {
		it('kutter query-parametre', () => {
			expect(eventImageStoragePath(BASE + 'events/noe.png?t=12345')).toBe('events/noe.png');
		});

		it('taaler norske tegn i slug', () => {
			expect(eventImageStoragePath(BASE + 'events/gaa-paa-tur-2026-09-01.webp')).toBe(
				'events/gaa-paa-tur-2026-09-01.webp'
			);
		});
	});
});
