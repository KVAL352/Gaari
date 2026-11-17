import type { HandleClientError } from '@sveltejs/kit/hooks';

// Kit 3 kaller denne også for våre egne `error(...)`; de slippes gjennom
// urørt, som i kit 2. Se kommentaren i hooks.server.ts.
export const handleError: HandleClientError = (caught) => {
	if (caught.kind === 'app') return;
	const status = caught.kind === 'framework' ? caught.error.status : 500;
	const err =
		caught.kind === 'framework'
			? new Error(caught.error.message)
			: caught.error instanceof Error
				? caught.error
				: new Error(String(caught.error));
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
