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
  const data = await p.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? el.textContent : null;
  });
  if (!data) { console.log('NO_NEXT_DATA_FOUND'); await b.close(); return; }
  const json = JSON.parse(data);
  const pp = json.props?.pageProps ?? {};
  console.log('PAGEPROPS_KEYS=' + JSON.stringify(Object.keys(pp)));
  for (const k of Object.keys(pp)) {
    const v = pp[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.includes('title') || keys.includes('description') || keys.includes('productCode')) {
        console.log('PRODUCT_KEY=' + k);
        console.log('SUBKEYS=' + JSON.stringify(keys));
        if (v.title) console.log('title=' + v.title);
        if (v.description) console.log('description_len=' + String(v.description).length + ' preview=' + String(v.description).substring(0,200));
        if (v.highlights) console.log('highlights=' + JSON.stringify(v.highlights).substring(0,400));
        if (v.inclusions) console.log('inclusions=' + JSON.stringify(v.inclusions).substring(0,400));
        if (v.exclusions) console.log('exclusions=' + JSON.stringify(v.exclusions).substring(0,400));
        if (v.images) console.log('images_count=' + (Array.isArray(v.images) ? v.images.length : typeof v.images));
        if (v.reviews) console.log('reviews=' + JSON.stringify(v.reviews).substring(0,200));
        if (v.pricing) console.log('pricing=' + JSON.stringify(v.pricing).substring(0,200));
        if (v.cancellationPolicy) console.log('cancellationPolicy=' + JSON.stringify(v.cancellationPolicy).substring(0,300));
        if (v.duration) console.log('duration=' + JSON.stringify(v.duration).substring(0,200));
        if (v.itinerary) console.log('itinerary=' + JSON.stringify(v.itinerary).substring(0,600));
        if (v.logistics) console.log('logistics=' + JSON.stringify(v.logistics).substring(0,400));
        if (v.languageGuides || v.languages) console.log('languages=' + JSON.stringify(v.languageGuides || v.languages).substring(0,300));
        if (v.supplier) console.log('supplier=' + JSON.stringify(v.supplier).substring(0,200));
        if (v.flags) console.log('flags=' + JSON.stringify(v.flags).substring(0,200));
        if (v.tags) console.log('tags=' + JSON.stringify(v.tags).substring(0,200));
      }
    }
  }
  fs.writeFileSync('/tmp/viator-next-data.json', JSON.stringify(json, null, 2).substring(0, 500000));
  console.log('Saved to /tmp/viator-next-data.json');
  await b.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
