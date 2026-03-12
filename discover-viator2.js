const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const p = await ctx.newPage();
  await p.goto('https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1', { waitUntil: 'networkidle', timeout: 60000 });

  // Log the URL we ended up on (detect redirects/captcha)
  console.log('FINAL_URL:' + p.url());

  // Check title
  const title = await p.title();
  console.log('PAGE_TITLE:' + title);

  // Check for __NEXT_DATA__
  const hasNextData = await p.evaluate(() => !!document.getElementById('__NEXT_DATA__'));
  console.log('HAS_NEXT_DATA:' + hasNextData);

  // Get HTML structure
  const bodySnippet = await p.evaluate(() => document.body.innerHTML.substring(0, 2000));
  console.log('BODY_SNIPPET:' + bodySnippet);

  await b.close();
})().catch(e => console.error('ERROR:' + e.message));
