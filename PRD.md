# Product Requirements Document: trex search

## 1. Product summary

trex search is a mobile-first web app for finding titles in an Xtream-compatible or M3U catalog and opening streams with browser playback, VLC, or a Roku running Media Assistant.

The app is deployed in two ways:

1. **GitHub Pages** provides remote access outside the home Wi-Fi.
2. **ESP32-S3 local hosting** provides an option on the home network for Roku playback.

Both deployments serve a static page. The visitor's browser is the application runtime and performs catalog loading, parsing, search, filtering, local persistence, and UI rendering. The ESP32-S3 is resource-constrained and must not be assigned application processing or other heavy work.

## 2. Problem and goals

Users need one lightweight interface to search their personal media catalog on a phone and hand a selected stream to a suitable player, including a Roku on the local network.

### Goals

- Make catalog search and playback handoff practical on mobile browsers.
- Support both remote static hosting and an ESP32-S3-hosted local copy.
- Keep the ESP32-S3's responsibilities and resource use minimal.
- Avoid requiring a backend, build system, or runtime dependency for core app behavior.
- Preserve catalog and user lists locally in the browser, with user-controlled list export/import.

### Non-goals

- Hosting, proxying, transcoding, or relaying media streams.
- Processing catalogs on the ESP32-S3.
- Server-side accounts, synchronization, or centralized storage.
- Guaranteeing provider availability, metadata quality, or playback compatibility.
- Bundling or implementing Roku firmware, Media Assistant, or iOS Shortcuts.

## 3. Users and primary scenarios

- A phone user searches a provider catalog and plays a result in the browser or VLC.
- A user on the home network sends a stream link to their Roku.
- A user accesses the GitHub Pages deployment away from home, then uses a supported handoff when a local Roku is involved.
- A user saves favorites or a watch-later list and exports/imports it when changing devices or hosting origins.
- A user imports an M3U file when direct browser access to the playlist is blocked.

## 4. Current product behavior

The existing page provides:

- Xtream catalog loading for movies and series, with live channels opt-in.
- M3U URL loading and streamed, line-by-line M3U file parsing.
- Search with All, Movies, TV, Favorites, and Later views.
- A capped result display, title normalization, and lazy-loaded poster images.
- IndexedDB caching for catalog and lists; `localStorage` settings per origin.
- Favorites/watch-later list export and merge import.
- Browser, VLC, and Roku/Media Assistant playback actions.
- Series episode loading and best-effort subtitle discovery.

## 5. Product requirements

### Functional

1. Users can configure either Xtream connection details or an M3U source.
2. Users can search and filter available titles and access their saved lists.
3. Users can invoke supported playback targets and receive clear feedback when an operation cannot be completed.
4. Users can add/remove favorites and watch-later items and export/import those lists.
5. Catalog and list data persist locally in the browser between visits where browser storage is available.
6. Users can optionally include live channels, with the increased catalog and memory cost communicated.
7. The app must remain useful when direct cross-origin playlist loading is unavailable by supporting local M3U file import.

### Mobile-first experience

- Design for narrow phone viewports and touch interaction first; enhance layout for wider screens without making mobile behavior secondary.
- Keep search and primary actions reachable and usable at phone-sized widths.
- Use responsive text, controls, spacing, and safe-area insets.
- Avoid requiring hover, a keyboard, or a large display for any core task.
- Keep result rendering bounded and images lazy-loaded to avoid unnecessary mobile work and data use.

### Hosting and device boundaries

- GitHub Pages and ESP32-S3 deployments must use the same static application behavior.
- The ESP32-S3 serves static application assets only; it must not parse playlists, index/search catalogs, proxy media, or perform other heavy application work.
- Application processing runs in the browser/client. Keep application state local to the browser unless a future requirement explicitly adds a service.
- Roku control is a local-network capability. The remote GitHub Pages deployment must not imply that a Roku is reachable outside the home network.
- Make direct browser requests for catalog and Roku actions without requiring a CORS proxy or iOS Shortcut. Browser mixed-content, cross-origin, and local-network policies can still prevent a request; report failures clearly and retain local M3U file import.

### Performance and reliability guardrails

- Keep the page small, dependency-light, and practical to serve from constrained static hosting.
- Prefer bounded rendering and incremental/streaming processing for large inputs; avoid holding duplicate full catalogs or playlists in memory.
- Keep optional high-cost data (such as live channels) opt-in.
- Do not add a framework, service, or build pipeline unless it provides a clear user benefit that justifies its runtime, transfer, maintenance, and hosting costs.
- Handle storage and network failures visibly; do not present a failed load or Roku handoff as successful.
- Preserve existing catalog and saved-list data when refreshes or imports fail.

### Privacy and data

- Do not send settings, credentials, lists, or catalog data to a new service without an explicit product decision and user-facing disclosure.
- Explain that browser storage is per device and per origin and is not automatically synchronized between deployments.
- Treat provider credentials and playlist/stream URLs as sensitive. Do not expose them in logs, shared URLs, or documentation examples.
- Keep list export/import user initiated.

## 6. Success criteria

- A new user can configure a supported source, load a catalog, search, and select a playback action using a phone.
- Search and result interactions remain responsive for catalogs representative of supported providers without moving processing onto the ESP32-S3.
- The same static page can be served from GitHub Pages and ESP32-S3 without deployment-specific application logic.
- The ESP32-S3 is only responsible for serving static assets; browser developer tools show catalog parsing/search work occurring on the client.
- Users can understand when browser request policies, Roku reachability, storage, or provider limitations prevent an action.
- Favorites and watch-later lists can be transferred using export/import.

These are product acceptance criteria; quantitative latency, catalog-size, and memory thresholds should be established from measurements on representative phones and catalogs before they become release gates.

## 7. Constraints and assumptions

- Modern browsers with JavaScript, Fetch, IndexedDB, and localStorage are the target.
- The app depends on provider or playlist URLs and their availability/metadata.
- A Roku must be configured and reachable on the local network; Media Assistant must be available under the configured channel ID.
- Browser security policy may restrict HTTP local-device calls from an HTTPS origin or cross-origin catalog requests. The app attempts direct requests; those browser restrictions cannot be overridden by page code.
- Data saved under GitHub Pages and the ESP32-S3's address belongs to separate browser origins.

## 8. Risks and open questions

- Browser versions differ in local-network request restrictions and support for external player URL schemes.
- Large or unusually formatted playlists may exceed a mobile browser's available memory even with streaming text parsing.
- The current settings include credentials in browser `localStorage`; users sharing a browser profile or device should understand this exposure.
- Exact ESP32-S3 firmware, static-file update process, and device resource budget are not specified in this repository.
- Quantitative performance budgets and a supported-browser matrix need to be established through testing.

## 9. Future-change checklist

Before accepting a change, verify that it:

- Preserves a mobile-first layout and touch-friendly operation.
- Keeps parsing, searching, and rendering on the browser/client rather than the ESP32-S3.
- Avoids unbounded catalog/result rendering and unnecessary memory copies.
- Works from both static hosting origins and accounts for per-origin browser storage.
- Attempts direct requests and handles browser HTTP/HTTPS and Roku local-network limitations transparently without requiring a proxy or Shortcut.
- Does not add undisclosed transmission of credentials, lists, or stream URLs.
