/**
 * Try to bypass DataDome by:
 * 1. Using a real browser profile simulation
 * 2. Adding mouse movements and realistic behavior
 * 3. Waiting longer
 */
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--start-maximized',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
    },
  });

  // Evade automation detection
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });

  const p = await ctx.newPage();

  // First visit homepage to get cookies
  console.log('Visiting homepage first...');
  await p.goto('https://www.viator.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(3000);
  console.log('Homepage URL:' + p.url());

  // Now navigate to the product page
  console.log('Navigating to product page...');
  await p.goto('https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await p.waitForTimeout(5000);

  console.log('FINAL_URL:' + p.url());
  const title = await p.title();
  console.log('PAGE_TITLE:' + title);

  const hasNextData = await p.evaluate(() => !!document.getElementById('__NEXT_DATA__'));
  console.log('HAS_NEXT_DATA:' + hasNextData);

  if (hasNextData) {
    const data = await p.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? JSON.parse(el.textContent) : null;
    });
    const pp = data.props && data.props.pageProps ? data.props.pageProps : {};
    console.log('PAGEPROPS_KEYS:' + JSON.stringify(Object.keys(pp)));
    fs.writeFileSync('/tmp/viator-next-data.json', JSON.stringify(data, null, 2).substring(0, 500000));
    console.log('SAVED_DUMP:/tmp/viator-next-data.json');
  } else {
    const html = await p.content();
    console.log('HTML_LENGTH:' + html.length);
    console.log('HTML_SNIPPET:' + html.substring(0, 500));
    fs.writeFileSync('/tmp/viator-page.html', html.substring(0, 200000));
    console.log('SAVED_HTML:/tmp/viator-page.html');
  }

  await b.close();
})().catch(e => console.error('ERROR:' + e.message));
