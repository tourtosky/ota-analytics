// Viator API Client

interface ViatorRequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

export async function viatorRequest<T>(
  endpoint: string,
  options: ViatorRequestOptions = {}
): Promise<T> {
  const { method = "GET", body } = options;

  const VIATOR_API_KEY = process.env.VIATOR_API_KEY;
  const VIATOR_BASE_URL = process.env.VIATOR_BASE_URL || "https://api.viator.com/partner";

  if (!VIATOR_API_KEY) {
    throw new Error("VIATOR_API_KEY environment variable is not set");
  }

  const headers: HeadersInit = {
    "exp-api-key": VIATOR_API_KEY,
    "Accept": "application/json;version=2.0",
    "Accept-Language": "en-US",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${VIATOR_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Viator API error: ${response.status} ${response.statusText}. ${
          JSON.stringify(errorData)
        }`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred while fetching from Viator API");
  }
}
