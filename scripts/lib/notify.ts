/**
 * Felles rigg for bekreftelses-e-post til arrangører og innsendere.
 *
 * Ligger her og ikke i hvert skript fordi signaturen, avsenderen og svaradressen
 * skal være de samme uansett hvilken flyt e-posten kommer fra. Da de lå to
 * steder, var det bare et spørsmål om tid før den ene ble endret og den andre
 * ikke. Se pattern_single_source_of_truth.
 *
 * Selve teksten hører hjemme i det enkelte skriptet: en innsender og en arrangør
 * har gjort to forskjellige ting, og skal ikke få samme brev.
 */
export const FROM = 'Gåri <noreply@gaari.no>';
export const REPLY_TO = 'Kjersti.Therkildsen@gaari.no';
export const SITE = 'https://gaari.no';

export const SIGNATUR = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #141414; line-height: 1.5;">
  <tr>
    <td style="vertical-align: top; padding-right: 14px; border-right: 2px solid #C82D2D;">
      <img src="${SITE}/favicon.svg" width="56" height="56" alt="Gåri" style="display: block;" />
    </td>
    <td style="vertical-align: top; padding-left: 14px;">
      <strong>Kjersti Valland Therkildsen</strong><br />
      Grunnlegger, Gåri<br />
      <a href="${SITE}" style="color: #C82D2D; text-decoration: none;">gaari.no</a>
    </td>
  </tr>
</table>`;

/** Rammen rundt brødteksten, slik at begge malene ser like ut i innboksen. */
export function wrap(innhold: string): string {
	return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #141414; line-height: 1.6;">
${innhold}
${SIGNATUR}
</div>`;
}

/**
 * Sender via Resend. Returnerer false i stedet for å kaste, slik at én feilet
 * e-post ikke stopper resten av køen.
 */
export async function sendEmail(
	to: string,
	subject: string,
	html: string
): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.error('  Mangler RESEND_API_KEY');
		return false;
	}
	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html })
	});
	if (!resp.ok) {
		console.error(`  Sending feilet: ${resp.status} ${await resp.text()}`);
		return false;
	}
	return true;
}
