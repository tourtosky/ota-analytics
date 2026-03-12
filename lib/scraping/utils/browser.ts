/**
 * Fetch a page's HTML via ZenRows API directly (no SDK — avoids hanging issues).
 */
export async function fetchPageHtml(url: string): Promise<string> {
  const apiKey = process.env["ZENROWS_API_KEY"];
  if (!apiKey) {
    throw new Error("ZENROWS_API_KEY environment variable is not set");
  }

  const params = new URLSearchParams({
    url,
    apikey: apiKey,
    js_render: "true",
    premium_proxy: "true",
    proxy_country: "us",
    wait_for: "h1",
  });

  const zenrowsUrl = `https://api.zenrows.com/v1/?${params.toString()}`;
  console.log(`[zenrows] Fetching: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout

  try {
    const response = await fetch(zenrowsUrl, { signal: controller.signal });
    const html = await response.text();
    console.log(`[zenrows] Response: status=${response.status}, length=${html.length}`);

    if (!response.ok) {
      throw new Error(`ZenRows error ${response.status}: ${html.substring(0, 500)}`);
    }

    return html;
  } finally {
    clearTimeout(timeout);
  }
}
