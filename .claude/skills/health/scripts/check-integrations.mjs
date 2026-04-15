import { readFileSync } from 'fs';

async function checkUmami() {
  try {
    const r = await fetch('https://gaari.no/u/script.js', { signal: AbortSignal.timeout(5000) });
    return `Umami: ${r.status}`;
  } catch { return 'Umami: ERR'; }
}

async function checkStripe() {
  try {
    const r = await fetch('https://gaari.no/api/stripe-webhook', {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    });
    // 400 = missing signature (expected), 500 = env not configured but endpoint exists
    const reachable = r.status === 400 || r.status === 500;
    return `Stripe: ${reachable ? 'reachable' : r.status} (${r.status})`;
  } catch { return 'Stripe: ERR'; }
}

async function checkMailerLite() {
  try {
    const env = readFileSync('.env', 'utf8');
    const match = env.match(/MAILERLITE_API_KEY=(.+)/);
    if (!match) return 'MailerLite: no key in .env';
    const r = await fetch('https://connect.mailerlite.com/api/subscribers?limit=1', {
      headers: { Authorization: `Bearer ${match[1].trim()}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    return `MailerLite: ${r.status}`;
  } catch (e) { return `MailerLite: ERR (${e.message})`; }
}

async function checkSitemap() {
  try {
    const r = await fetch('https://gaari.no/sitemap.xml', { signal: AbortSignal.timeout(5000) });
    const text = await r.text();
    const hasUrlset = text.includes('<urlset');
    const urlCount = (text.match(/<url>/g) || []).length;
    return `Sitemap: ${hasUrlset ? 'valid' : 'INVALID'} (${urlCount} URLs)`;
  } catch { return 'Sitemap: ERR'; }
}

Promise.all([checkUmami(), checkStripe(), checkMailerLite(), checkSitemap()])
  .then(r => console.log(r.join('\n')));
