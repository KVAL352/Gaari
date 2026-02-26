import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendRejectionEmail(
	to: string,
	eventTitle: string,
	feedback: string
): Promise<void> {
	await resend.emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to,
		subject: `Arrangementet ditt «${eventTitle}» ble ikke publisert`,
		text: [
			`Hei,`,
			``,
			`Takk for at du sendte inn arrangementet «${eventTitle}» til Gåri.`,
			``,
			`Dessverre kan vi ikke publisere det denne gangen. Her er tilbakemeldingen fra redaksjonen:`,
			``,
			feedback,
			``,
			`Du er velkommen til å sende inn på nytt dersom du retter opp i tilbakemeldingen.`,
			``,
			`Vennlig hilsen`,
			`Gåri — gaari.no`
		].join('\n')
	});
}

export async function sendInquiryDeclineEmail(
	to: string,
	name: string,
	feedback: string
): Promise<void> {
	await resend.emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to,
		subject: `Angående din henvendelse til Gåri`,
		text: [
			`Hei ${name},`,
			``,
			`Takk for at du tok kontakt med Gåri.`,
			``,
			feedback,
			``,
			`Ta gjerne kontakt igjen dersom du har spørsmål.`,
			``,
			`Vennlig hilsen`,
			`Gåri — gaari.no`
		].join('\n')
	});
}
