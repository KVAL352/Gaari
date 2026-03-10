import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	redirect(302, '/no/i-kveld?utm_source=sticker&utm_medium=qr');
};
