import { GoogleGenAI } from '@google/genai';
import { makeDescription, CATEGORY_LABELS_NO } from './utils.js';

interface EventMeta {
	title: string;
	venue: string;
	category: string;
	date?: string;
	price?: string;
}

interface BilingualDescription {
	no: string;
	en: string;
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const MIN_DELAY_MS = 200;

let ai: GoogleGenAI | null = null;
let dailyQuotaExhausted = false;

function getClient(): GoogleGenAI | null {
	if (ai) return ai;
	const key = process.env.GEMINI_API_KEY;
	if (!key) {
		console.warn('[ai-descriptions] GEMINI_API_KEY not set — using template fallback');
		return null;
	}
	ai = new GoogleGenAI({ apiKey: key });
	return ai;
}

function buildPrompt(event: EventMeta): string {
	const lines = [
		'You write short event descriptions for a Bergen, Norway event website.',
		'Given the event metadata below, write an original 1-2 sentence description in both Norwegian (bokmål) and English.',
		'Be factual — only use the information provided. Do not invent details.',
		'Keep each description under 160 characters (for SEO meta descriptions).',
		'',
		`Title: ${event.title}`,
		`Venue: ${event.venue}`,
		`Category: ${CATEGORY_LABELS_NO[event.category] || event.category}`,
	];
	if (event.date) lines.push(`Date: ${event.date}`);
	if (event.price) lines.push(`Price: ${event.price}`);
	lines.push('', 'Respond in JSON only: {"no": "...", "en": "..."}');
	return lines.join('\n');
}

function fallback(event: EventMeta): BilingualDescription {
	return {
		no: makeDescription(event.title, event.venue, event.category),
		en: '',
	};
}

function parseRetryDelay(err: any): number | null {
	const msg = typeof err?.message === 'string' ? err.message : '';
	// Look for "retryDelay":"XXs" in the error JSON
	const match = msg.match(/retryDelay.*?(\d+(?:\.\d+)?)s/);
	if (match) return Math.ceil(parseFloat(match[1]) * 1000);
	return null;
}

function isDailyQuotaError(err: any): boolean {
	const msg = typeof err?.message === 'string' ? err.message : '';
	return msg.includes('PerDay') || msg.includes('per_day');
}

export async function generateDescription(event: EventMeta): Promise<BilingualDescription> {
	const client = getClient();
	if (!client || dailyQuotaExhausted) return fallback(event);

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await client.models.generateContent({
				model: GEMINI_MODEL,
				contents: buildPrompt(event),
			});

			const text = response.text?.trim();
			if (!text) {
				console.warn(`[ai-descriptions] Empty response for "${event.title}" — using fallback`);
				return fallback(event);
			}

			// Extract JSON from response (may be wrapped in markdown code fences)
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				console.warn(`[ai-descriptions] No JSON in response for "${event.title}" — using fallback`);
				return fallback(event);
			}

			const parsed = JSON.parse(jsonMatch[0]) as BilingualDescription;
			if (!parsed.no || !parsed.en) {
				console.warn(`[ai-descriptions] Incomplete JSON for "${event.title}" — using fallback`);
				return fallback(event);
			}

			// Enforce 160 char limit
			if (parsed.no.length > 160) parsed.no = parsed.no.slice(0, 157) + '...';
			if (parsed.en.length > 160) parsed.en = parsed.en.slice(0, 157) + '...';

			// Rate limit delay between successful calls
			await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));

			return parsed;
		} catch (err: any) {
			const isRateLimit = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');

			if (isRateLimit && isDailyQuotaError(err)) {
				console.warn(`[ai-descriptions] Daily quota exhausted — all remaining events will use fallback`);
				dailyQuotaExhausted = true;
				return fallback(event);
			}

			if (isRateLimit && attempt < MAX_RETRIES) {
				const retryMs = parseRetryDelay(err) || (15000 * (attempt + 1));
				console.warn(`[ai-descriptions] Rate limited for "${event.title}" — retrying in ${Math.round(retryMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
				await new Promise(resolve => setTimeout(resolve, retryMs));
				continue;
			}

			console.warn(`[ai-descriptions] API error for "${event.title}": ${err.message?.slice(0, 120)} — using fallback`);
			return fallback(event);
		}
	}

	return fallback(event);
}
