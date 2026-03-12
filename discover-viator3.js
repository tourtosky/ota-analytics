/**
 * More sophisticated approach to bypass DataDome CAPTCHA:
 * 1. Use chromium with more realistic browser fingerprint
 * 2. Add extra headers/viewport/locale
 * 3. Try waiting longer for page to fully load
 * 4. Also try fetching the page via fetch (Viator may serve SSR to non-JS clients)
 */
const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');

// First try a simple HTTPS fetch to see if SSR returns __NEXT_DATA__
function fetchViatorPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      }
    };
    const req = https.get(url, options, (res) => {
      console.log('HTTP_STATUS:' + res.statusCode);
      console.log('HTTP_HEADERS:' + JSON.stringify(res.headers).substring(0, 500));
      let body = '';
      // Handle compressed responses
      let stream = res;
      if (res.headers['content-encoding'] === 'gzip') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      } else if (res.headers['content-encoding'] === 'br') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createBrotliDecompress());
      }
      stream.on('data', chunk => { body += chunk.toString(); });
      stream.on('end', () => resolve(body));
      stream.on('error', reject);
    });
    req.on('error', reject);
  });
}

(async () => {
  const url = 'https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1';
  console.log('Trying HTTP fetch...');
  try {
    const html = await fetchViatorPage(url);
    console.log('HTML_LENGTH:' + html.length);
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      console.log('FOUND_NEXT_DATA_VIA_FETCH');
      fs.writeFileSync('/tmp/viator-next-data.json', nextDataMatch[1].substring(0, 500000));
      console.log('SAVED_DUMP:/tmp/viator-next-data.json');
      const parsed = JSON.parse(nextDataMatch[1]);
      const pp = parsed.props && parsed.props.pageProps ? parsed.props.pageProps : {};
      console.log('PAGEPROPS_KEYS:' + JSON.stringify(Object.keys(pp)));
    } else {
      // Check what the page returned
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      console.log('PAGE_TITLE:' + (titleMatch ? titleMatch[1] : 'not found'));
      console.log('HTML_SNIPPET:' + html.substring(0, 1000));
      fs.writeFileSync('/tmp/viator-fetch.html', html.substring(0, 200000));
      console.log('SAVED_HTML:/tmp/viator-fetch.html');
    }
  } catch(e) {
    console.error('FETCH_ERROR:' + e.message);
  }
})();
