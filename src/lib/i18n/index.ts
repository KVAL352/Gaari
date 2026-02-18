import { writable, derived, get } from 'svelte/store';
import { translations, type TranslationKey } from './translations';
import type { Lang } from '$lib/types';

export const lang = writable<Lang>('no');

export const t = derived(lang, ($lang) => {
	return (key: TranslationKey): string => {
		const value = translations[$lang]?.[key];
		if (value === undefined) {
			console.warn(`Missing translation: ${key} for lang: ${$lang}`);
			return key;
		}
		return value as string;
	};
});

export function setLang(newLang: Lang) {
	lang.set(newLang);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('gaari-lang', newLang);
	}
}

export function detectLanguage(): Lang {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem('gaari-lang');
		if (stored === 'en' || stored === 'no') return stored;
	}
	if (typeof navigator !== 'undefined') {
		const browserLang = navigator.language.toLowerCase();
		if (browserLang.startsWith('en')) return 'en';
	}
	return 'no';
}

export function getLang(): Lang {
	return get(lang);
}
