const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
  });
  const p = await ctx.newPage();
  console.log('Navigating...');
  await p.goto('https://www.viator.com/tours/Zakynthos/Zakynthos-eastcoast-early-morning-traditional-fishing-experience/d23524-116901P15', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page loaded:', p.url());

  // Check all script tags
  const scriptInfo = await p.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.map(s => ({
      id: s.id,
      type: s.type,
      src: s.src ? s.src.substring(0, 80) : null,
      contentLen: s.textContent ? s.textContent.length : 0,
      contentPreview: s.textContent ? s.textContent.substring(0, 100) : null
    }));
  });

  console.log('All script tags:');
  for (const s of scriptInfo) {
    if (s.id || (s.contentLen > 100 && !s.src)) {
      console.log(JSON.stringify(s));
    }
  }

  // Check for any large inline scripts that might have product data
  const largeScripts = await p.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    return scripts
      .filter(s => s.textContent && s.textContent.length > 500)
      .map(s => ({
        id: s.id,
        type: s.type,
        len: s.textContent.length,
        preview: s.textContent.substring(0, 300)
      }));
  });

  console.log('\nLarge inline scripts:');
  for (const s of largeScripts) {
    console.log(JSON.stringify({id: s.id, type: s.type, len: s.len, preview: s.preview.substring(0,200)}));
  }

  // Check page title and h1
  const h1 = await p.evaluate(() => {
    const el = document.querySelector('h1');
    return el ? el.textContent : 'NO H1';
  });
  console.log('\nh1:', h1);

  // Check if product data is in window object
  const windowKeys = await p.evaluate(() => {
    return Object.keys(window).filter(k =>
      k.includes('product') || k.includes('Product') || k.includes('__') ||
      k.includes('next') || k.includes('Next') || k.includes('data') || k.includes('Data')
    ).slice(0, 30);
  });
  console.log('\nWindow keys of interest:', windowKeys);

  // Save full HTML for inspection
  const html = await p.content();
  fs.writeFileSync('/tmp/viator-page.html', html.substring(0, 200000));
  console.log('\nSaved HTML to /tmp/viator-page.html (first 200k chars)');

  await b.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
