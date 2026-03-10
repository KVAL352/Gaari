import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const oslo = new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' });
	const osloDate = new Date(oslo);
	const day = osloDate.getDay(); // 0=Sun, 5=Fri, 6=Sat
	const hour = osloDate.getHours();

	let collection: string;
	if (day === 0 || day === 5 || day === 6) {
		collection = 'denne-helgen';
	} else if (hour >= 16) {
		collection = 'i-kveld';
	} else {
		collection = 'i-dag';
	}

	redirect(302, `/no/${collection}?utm_source=sticker&utm_medium=qr`);
};
