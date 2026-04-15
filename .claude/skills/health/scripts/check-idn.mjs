fetch('https://xn--gri-ula.no', { redirect: 'manual', signal: AbortSignal.timeout(8000) })
  .then(r => console.log(`${r.status} redirect:${r.headers.get('location') || 'none'}`))
  .catch(() => console.log('IDN check failed'));
