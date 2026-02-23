import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, status, message }) => {
	const err = error instanceof Error ? error : new Error(String(error));
	const stack = err.stack?.split('\n').slice(0, 5).join('\n');

	console.error(
		JSON.stringify({
			type: 'client_error',
			timestamp: new Date().toISOString(),
			status,
			message: err.message,
			stack,
			url: window.location.pathname
		})
	);

	// Future: send to Sentry via Sentry.captureException(error)

	return { message: 'An unexpected error occurred. Please try again later.' };
};
