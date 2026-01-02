# Insight Stream → TemplateTwo + Streaming Updates (2025-12-29)

This note records the changes made in this chat to the **Insight Stream (right panel)** to:

- Render most feed items using `TemplateTwo`
- Keep `safe_alert` rendered via `AlertWidget`
- Keep `log` items behind the **Debug** toggle (not rendered via `TemplateTwo`)
- Populate `TemplateTwo` sidebar widgets (Links / Gallery / Videos / Weather / Map) from feed data
- Add an **SSE stream** so the feed refreshes immediately when new items are saved (streaming feel)

---

## Files changed

### Backend (Go)
- `server/main.go`
  - Added **SSE endpoint** `GET /api/feed/stream` (event: `feed_updated`, heartbeat: `ping`)
  - Added in-process subscriber registry (per `ownerID`) and broadcasts on:
    - Successful DB upsert in `processAndSaveFeed(...)`
    - Successful `DELETE /api/feed` (feed cleared)

### Frontend (Next.js)
- `client-next/app/components/FeedPanel.tsx`
  - **Rendering**
    - `safe_alert` → `AlertWidget`
    - `log` → only when Debug is ON (not `TemplateTwo`)
    - all other card types → `TemplateTwo`
  - **TemplateTwo props mapping**
    - Left side (main): `sections[]` built from `data.title/label/source_node` + `data.description/summary/message`
    - Media: `data.video_url|videoUrl` else `data.imageUrl`
    - Sidebar:
      - Weather: enabled only when `card_type === "weather"`
      - Map: enabled when `data.lat` + `data.lng` exist (adds a second “Coordinates” section)
      - Links: now supports `data.url`, `data.links[]`, and Unsplash fields (`imageUserLink`, `imageUrl`)
      - Gallery/Videos: now maps `images[]` and `videos[]` from both single and array fields
  - **Streaming behavior**
    - Opens `EventSource` to `/api/proxy/feed/stream?userId=...&deviceId=...`
    - On `feed_updated`, triggers an immediate re-fetch (debounced)
    - Keeps polling as fallback (slower interval)

- `client-next/app/api/proxy/feed/stream/route.ts`
  - New Next proxy route that forwards the backend SSE stream:
    - Upstream: `${API_BASE_URL}/api/feed/stream`
    - Forwards identity via headers derived from query params:
      - `X-User-ID` from `?userId=...`
      - `X-Device-ID` from `?deviceId=...`

---

## How the data feeds TemplateTwo (high-level)

TemplateTwo shows for **all non-`safe_alert` and non-`log`** feed items. Its sidebar widgets only render when the mapped props exist:

- **Weather widget**: requires `card_type === "weather"` and fields like `data.location/temp/condition/(description|summary)`
- **Map widget**: requires `data.lat` and `data.lng`
- **Links**: uses `data.url` or `data.links[]` or Unsplash credit fields (`imageUserLink`, `imageUrl`)
- **Gallery/Videos**: uses `data.images|imageUrls|imageUrl` and `data.videos|videoUrls|videoUrl|video_url`

---

## Notes / expectations

- If your DB feed has only `article`, `cultural_tip`, `safe_alert`, then **Weather/Map** widgets will remain empty until the backend emits `weather` and coordinate payloads.
- SSE provides **“refresh-on-update”** behavior (client re-fetches the feed immediately), rather than streaming full card JSON over SSE.


