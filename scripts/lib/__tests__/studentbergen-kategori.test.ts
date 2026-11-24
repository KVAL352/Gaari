import { describe, it, expect } from 'vitest';

import { studentbergenKategori as k } from '../categories.js';

// Fra 18. til 24. nov traff ingen ordtest, fordi '\b' i en vanlig streng er et
// backspace-tegn. Alt unntatt markeder ble 'student', og den gamle testen så
// bare på markedene. Derfor én linje per regel her.
describe('studentbergenKategori', () => {
	it('treffer hele ord', () => {
		expect(k('Konsert med Kor', '')).toBe('music');
		expect(k('Fest i kjelleren', '')).toBe('music');
		expect(k('Revy 2026', '')).toBe('theatre');
		expect(k('Film på Kvarteret', '')).toBe('culture');
		expect(k('Quiz på Kvarteret', '')).toBe('nightlife');
		expect(k('Foredrag om KI', '')).toBe('culture');
		expect(k('Karriere og CV', '')).toBe('workshop');
		expect(k('Fjelltur til Ulriken', '')).toBe('sports');
		expect(k('Løp for livet', '')).toBe('sports');
		expect(k('Klubb i kjelleren', '')).toBe('nightlife');
	});

	it('treffer sammensatte ord der regelen er laget for det', () => {
		expect(k('Julemarkedet 2026', '')).toBe('festival');
		expect(k('Pepperkakebyen 2026', '')).toBe('festival');
		expect(k('Sushimatkurs for nybegynnere', '')).toBe('food');
		expect(k('Vinsmaking', '')).toBe('food');
		expect(k('Pubquiz', '')).toBe('nightlife');
		expect(k('Julekviss', '')).toBe('nightlife');
	});

	it('treffer ikke ord som bare inneholder nøkkelordet', () => {
		expect(k('Festningen åpen dag', '')).toBe('student');
		expect(k('Filmatisk aften', '')).toBe('student');
		expect(k('Fadderuke-åpning', '')).toBe('student');
	});

	it('leser også stedsnavnet', () => {
		expect(k('Åpen kveld', 'Teater Vestland')).toBe('theatre');
	});
});
