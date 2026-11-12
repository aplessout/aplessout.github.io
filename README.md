# trex search

trex search is a mobile-first, browser-based catalog search and playback helper for Xtream-compatible services and M3U playlists. It can be hosted on GitHub Pages for access away from home, or served locally by an ESP32-S3 for use on the home network with a Roku.

The app is a single static `index.html` file. Catalog loading, playlist parsing, search, list management, and playback-link handling run in the visitor's browser; the hosting device does not process catalog data.

## Features

- Load a catalog from an Xtream-compatible provider or an M3U URL.
- Import an M3U file when browser cross-origin restrictions prevent direct loading.
- Search and filter movies and TV listings; optionally include live channels.
- Save favorites and a watch-later list, and export or merge-import those lists.
- Open stream links, hand them to VLC, or send supported playback requests to a Roku using Media Assistant.
- Load series episodes and try to find subtitle links in provider metadata.
- Cache the catalog and lists in IndexedDB between visits.

## Getting started

1. Open the hosted page in a modern browser.
2. Open **Settings** using the gear button.
3. Configure either:
   - **Xtream:** server URL, username, and password; or
   - **M3U:** playlist URL, or choose an M3U file to import.
4. Configure the Roku IP address and Media Assistant channel ID if you want to use **Play on Roku**.
5. Select **Save & load**, then search for a title.

Use the **Live** setting only when needed: live listings increase catalog size and memory use. Catalog URLs are requested directly by the browser. If a provider does not allow browser access, download the playlist and import the file instead.

## Hosting

### GitHub Pages

Publish `index.html` as a static GitHub Pages site. No server runtime, build step, or package installation is required. The page attempts Roku requests directly over HTTP without requiring an iOS Shortcut. Browser and network policies can still block requests from an HTTPS page to local HTTP devices.

### ESP32-S3

Serve the same static `index.html` from the ESP32-S3's local web server. The browser remains responsible for all application work; keep catalog parsing, searching, and rendering out of ESP32 firmware. Roku playback requires the browser device and Roku to be reachable on the same local network. The ESP32-S3 deployment is a local-network option, not a substitute for the GitHub Pages remote-access deployment.

The repository does not include ESP32 firmware or a deployment/build pipeline. Those are deployment-specific and should be maintained separately unless the project adds them.

## Data and privacy

- Provider credentials and settings are stored in the browser's `localStorage` for the page's origin.
- The catalog and saved lists are stored in that browser's IndexedDB. Data is local to the browser/device and is not synchronized between GitHub Pages and the ESP32-S3 origin.
- Use the list export/import controls to move favorites and watch-later entries between origins or devices.
- Clearing cached data removes the cached catalog; it does not clear settings or saved lists.

## Project structure

```text
index.html   Application markup, styles, and browser-side JavaScript
README.md    Setup, operation, and deployment notes
PRD.md       Product requirements and constraints for future changes
```

There are no third-party runtime libraries or build dependencies in the current project.

## Known limitations

- Direct provider and M3U URL loading depends on the provider allowing browser requests; local M3U file import does not require a cross-origin request.
- Roku control depends on the configured Roku, Media Assistant channel, local network access, and browser security rules. The page cannot confirm success when the Roku response is opaque.
- Catalog availability and metadata quality depend on the provider or playlist. Subtitle discovery is best-effort.
- Browser storage is device- and origin-specific. Clearing browser data removes locally saved app data.

See [PRD.md](./PRD.md) for product goals, requirements, and guardrails for future development.
