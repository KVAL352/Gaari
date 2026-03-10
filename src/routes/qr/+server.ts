import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	redirect(302, '/no/denne-helgen?utm_source=sticker&utm_medium=qr');
};
