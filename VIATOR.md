```markdown
# Viator Partner API v2.0 Integration Guide

This document provides a comprehensive guide for integrating the Viator Partner API v2.0, based on API documentation and best practices for ingestion, synchronization, and booking workflows.

## 1. Environment & Configuration

### Base URLs
The API version is **not** specified in the URL path; it uses the `partner` path.
*   **Production:** `https://api.viator.com/partner`
*   **Sandbox (Testing):** `https://api.sandbox.viator.com/partner`

### Required Headers
Every API request must include the following headers:
| Header | Value | Description |
| :--- | :--- | :--- |
| `exp-api-key` | Your API key | Authenticates your organization. |
| `Accept` | `application/json;version=2.0` | **Mandatory** version specification. |
| `Accept-Language` | e.g., `en-US`, `es`, `fr` | Determines the localization of natural language fields in the response. |

## 2. Core Endpoints

### Catalog & Products
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/products/modified-since` | GET | Retrieve full details for products modified since a timestamp or cursor. Used for initial bulk ingestion and delta updates. |
| `/products/{product-code}` | GET | Get full details for a single product. Do not use for bulk ingestion. |
| `/products/bulk` | POST | Get full details for up to 500 requested products. |
| `/products/search` | POST | Search and filter products by destination, tags, price, and dates. |
| `/products/recommendations` | POST | Get algorithm-generated similar or recommended products. |
| `/products/tags` | GET | Get all product tags/categories (refresh weekly). |

### Taxonomy & Auxiliary
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/destinations` | GET | Get the destination taxonomy (countries, regions, cities) to resolve references (refresh weekly). |
| `/locations/bulk` | POST | Resolve location references for itineraries and pickups (refresh monthly). |
| `/exchange-rates` | POST | Retrieve exchange rates to manually convert supplier pricing (refresh daily). |
| `/reviews/product` | POST | Retrieve traveler reviews and user-submitted photos. |

### Availability
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/availability/schedules/modified-since` | GET | Bulk ingest future availability schedules. Used to build local calendars. |
| `/availability/check` | POST | **Real-time check** of availability and exact pricing immediately prior to booking. |

### Bookings
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/bookings/hold` | POST | Create an availability and pricing hold before payment. |
| `/bookings/book` | POST | Confirm a booking. |
| `/bookings/status` | POST | Check the status of manual-confirmation or pending bookings. |

## 3. Data Synchronization Strategy

To maintain an accurate local database of tours, follow this dual-layered synchronization strategy.

### A. Initial Bulk Import
1.  **Taxonomy:** Fetch `/destinations` and `/products/tags` to establish your category and location trees.
2.  **Products:** Call `/products/modified-since` using the `count=500` parameter without a cursor to fetch the entire catalog page by page.
3.  **Schedules:** Call `/availability/schedules/modified-since` (count=500, no cursor) to build the baseline calendar for all tours.

### B. Incremental Delta Updates (Background Sync)
*   **Content:** Poll `/products/modified-since` every 15-30 minutes using the `nextCursor` from your previous call to capture any text or image changes.
*   **Availability:** Poll `/availability/schedules/modified-since` every 15-30 minutes using its `nextCursor` to update sold-out dates and seasons.

### C. Real-Time Verification (Pre-Booking)
Never rely solely on cached availability for checkout.
*   When a user selects a date and clicks "Book", immediately call `/availability/check`.
*   This endpoint is the **definitive source of truth** for pricing and guarantees the spot is still open.

## 4. Key Concepts & Implementation Details

### Managing Tour Status (Active vs. Inactive)
To ensure you only display bookable tours:
*   **Product Content:** Check the `status` field in the product response. If `status` is `"ACTIVE"`, the tour is live. If it is `"INACTIVE"`, the supplier has temporarily or permanently disabled it, and you should hide it.
*   **Availability:** If `/availability/schedules/modified-since` returns an empty `bookableItems: []` array for a product, it has no available schedules and cannot be booked.

### Handling Images
The legacy `/v1/product/photos` endpoint is deprecated. Retrieve images using the following methods:
1.  **Supplier Product Images:** Found in the product content response under the `images[]` array. Each image includes `variants[]`. The highest resolution is typically **720x480** or **674x446**.
2.  **Attraction Banners:** For destination or landmark headers, use `/attractions/{attraction-id}`. These return ultra-wide banner variants like **3200x800** or **1600x400**.
3.  **Traveler Photos:** Authentic user photos are found via the `/reviews/product` endpoint inside the `photosInfo[]` array. These offer resolutions up to **1024x1365**.

### Determining "Best Sellers" and Top Tours
The API does not have a single "best seller" field, but you can compute popularity using these indicators:
*   **Flags:** Check the `flags` array in the product search response for `"LIKELY_TO_SELL_OUT"`, indicating high demand.
*   **Review Data:** Analyze `totalReviews` and `combinedAverageRating` in the product response to surface highly rated tours.
*   **Recommendations:** Use `/products/recommendations` to fetch algorithmically generated lists of popular/similar tours based on customer purchase patterns.

### Pricing & Currencies
*   **Bulk Availability Pricing:** Schedules returned from `/availability/schedules/*` are always in the **supplier's local currency**. Use the `/exchange-rates` endpoint to convert these prices into your display currency locally.
*   **Real-time Pricing:** When calling `/availability/check`, supply the `currency` parameter (e.g., `"USD"`, `"EUR"`, `"GBP"`, `"AUD"`, `"CAD"`). The response will return the exact invoice amount (`partnerNetPrice`) and retail price in your requested currency.

### Languages
Pass the `Accept-Language` header to receive localized content (descriptions, titles, cancellation policies). Supported codes include, but are not limited to:
*   `en` (English)
*   `es` (Spanish)
*   `fr` (French)
*   `de` (German)
*   `it` (Italian)
*   `pt` (Portuguese)
*   `ja` (Japanese)
*   `zh` (Chinese - Merchant partners only)
*   `ko` (Korean - Merchant partners only)
```