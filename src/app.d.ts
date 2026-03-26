// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Umami Analytics global
	const umami: {
		track(event: string, data?: Record<string, string | number>): Promise<void>;
	};

	interface Window {
		umami?: typeof umami;
	}
}

export {};
