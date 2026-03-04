import type { RequestHandler } from './$types';

/**
 * Receives Content-Security-Policy violation reports from browsers.
 * Logs them as structured JSON — picked up by Vercel's log system.
 * Browsers send reports as JSON with Content-Type: application/csp-report.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// report-uri format has body wrapped in "csp-report"
		const report = body['csp-report'] || body;

		console.warn(
			JSON.stringify({
				type: 'csp_violation',
				timestamp: new Date().toISOString(),
				blockedUri: report['blocked-uri'] || report.blockedURL,
				violatedDirective: report['violated-directive'] || report.effectiveDirective,
				documentUri: report['document-uri'] || report.documentURL,
				sourceFile: report['source-file'] || report.sourceFile,
				lineNumber: report['line-number'] || report.lineNumber
			})
		);
	} catch {
		// Malformed report — ignore
	}

	return new Response(null, { status: 204 });
};
