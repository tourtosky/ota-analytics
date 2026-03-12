const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const p = await ctx.newPage();
  await p.goto('https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1', { waitUntil: 'networkidle', timeout: 60000 });
  const data = await p.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? JSON.parse(el.textContent) : null;
  });
  if (!data) { console.log('NO_NEXT_DATA'); await b.close(); return; }
  const pp = data.props && data.props.pageProps ? data.props.pageProps : {};
  console.log('PAGEPROPS_KEYS:' + JSON.stringify(Object.keys(pp)));
  for (const k of Object.keys(pp)) {
    const v = pp[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.includes('title') || keys.includes('description') || keys.includes('productCode')) {
        console.log('PRODUCT_KEY:' + k);
        console.log('PRODUCT_SUBKEYS:' + JSON.stringify(keys.slice(0, 40)));
        if (v.title) console.log('TITLE:' + v.title);
        if (v.description) console.log('DESC:' + String(v.description).substring(0, 300));
        if (v.highlights) console.log('HIGHLIGHTS:' + JSON.stringify(v.highlights).substring(0, 300));
        if (v.inclusions) console.log('INCLUSIONS:' + JSON.stringify(v.inclusions).substring(0, 300));
        if (v.images) console.log('IMAGES_COUNT:' + (Array.isArray(v.images) ? v.images.length : 'not array'));
        if (v.reviews) console.log('REVIEWS:' + JSON.stringify(v.reviews).substring(0, 200));
        if (v.pricing) console.log('PRICING:' + JSON.stringify(v.pricing).substring(0, 200));
        if (v.cancellationPolicy) console.log('CANCELLATION:' + JSON.stringify(v.cancellationPolicy).substring(0, 200));
        if (v.duration) console.log('DURATION:' + JSON.stringify(v.duration).substring(0, 200));
        if (v.itinerary) console.log('ITINERARY:' + JSON.stringify(v.itinerary).substring(0, 500));
        if (v.logistics) console.log('LOGISTICS:' + JSON.stringify(v.logistics).substring(0, 400));
        if (v.supplier || v.operator) console.log('SUPPLIER:' + JSON.stringify(v.supplier || v.operator).substring(0, 200));
        if (v.flags) console.log('FLAGS:' + JSON.stringify(v.flags).substring(0, 200));
      }
    }
  }
  fs.writeFileSync('/tmp/viator-next-data.json', JSON.stringify(data, null, 2).substring(0, 500000));
  console.log('SAVED_DUMP:/tmp/viator-next-data.json');
  await b.close();
})().catch(e => console.error('ERROR:' + e.message));
