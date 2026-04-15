const urls = [
  'https://gaari.no/no/',
  'https://gaari.no/en/',
  'https://gaari.no/no/denne-helgen/',
  'https://gaari.no/no/konserter/',
  'https://gaari.no/sitemap.xml',
  'https://gaari.no/robots.txt'
];
Promise.all(urls.map(async u => {
  try {
    const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return `${r.status} ${u}`;
  } catch { return `ERR ${u}`; }
})).then(r => console.log(r.join('\n')));
