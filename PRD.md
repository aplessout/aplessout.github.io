# PRD: Personal IPTV Streaming PWA

**Version:** 2.0  
**Status:** Proposed  
**Product type:** Serverless Progressive Web Application  
**Development approach:** Build from scratch  
**Primary platforms:** iPhone and tablets  
**Hosting:** GitHub Pages  
**Data storage:** Browser-local storage  
**IPTV integration:** Xtream Codes API  
**Roku integration:** Roku Media Assistant, subject to browser compatibility

---

## 1. Product vision

Build a modern, responsive IPTV application that allows a user to connect to an existing Xtream Codes IPTV provider, browse available content, and play streams directly on an iPhone or tablet.

The application must be installable as a PWA and should provide an experience similar to a native streaming application.

The application will be developed independently from scratch. Existing open-source applications, including IPTVnator, may be used for research and functional reference, but their source code, components, and implementation will not be reused.

The most important architectural requirement is that the application must operate without a backend.

It should be hosted as a static website and store user-specific information locally on the device.

## 2. Product priorities

The priorities are ranked as follows:

| Priority | Requirement |
|---|---|
| P0 | Completely serverless architecture |
| P0 | iPhone and tablet PWA support |
| P0 | Xtream Codes integration |
| P0 | Live TV, Movies, and Series |
| P0 | Local favourites, history, and Continue Watching |
| P0 | No EPG |
| P1 | Fast search and catalogue browsing |
| P1 | Roku Media Assistant integration, if achievable without a backend |
| P1 | Desktop-responsive interface |
| P2 | Advanced catalogue filtering and personalization |

### Non-negotiable architectural rules

- No application backend.
- No cloud database.
- No paid hosting requirement.
- No server-side video streaming.
- No server-side IPTV proxy.
- No mandatory third-party service.
- No user-account registration for the application.
- No EPG functionality.
- No reuse of IPTVnator source code.

If a feature requires a backend, it must be excluded or redesigned rather than silently introducing server infrastructure.

## 3. Target platforms

### Primary platforms

**iPhone**
- Safari browser.
- Add to Home Screen installation.
- Standalone application experience.
- Portrait and landscape layouts.
- Native browser video playback.

**Tablet**
- iPad Safari.
- Responsive tablet layout.
- Support for portrait and landscape orientation.
- Larger catalogue browsing experience.
- Touch-friendly controls.

### Secondary platform

**Desktop**
- Chrome, Edge, and Safari where supported.
- Responsive layout.
- Keyboard and mouse navigation.

The application must not be designed as a desktop application that merely shrinks to fit a phone.

Mobile and tablet layouts are first-class product requirements.

## 4. User experience and navigation

The primary application navigation should contain:

1. Home
2. Live TV
3. Movies
4. Series
5. Favourites

Settings should be accessible from the navigation or profile/menu area.

### Home screen

The Home screen should include:

- Continue Watching.
- Recently Played.
- Favourite Channels.
- Favourite Movies.
- Favourite Series.
- Optional recently added content when provider metadata supports it.

Empty sections should be hidden rather than displaying empty placeholders.

## 5. Functional requirements

### FR-01: Xtream Codes configuration

Users must be able to configure their IPTV provider.

Required fields:

- Server URL.
- Username.
- Password.

Requirements:

- Validate input.
- Test provider connectivity.
- Authenticate against the provider.
- Display authentication failures.
- Save configuration locally.
- Allow editing or removing provider settings.
- Support refreshing provider information.

Credentials must never be hardcoded into application source code or committed to GitHub.

The application must connect directly to the provider from the user's browser.

If the provider blocks browser requests through CORS or only exposes incompatible HTTP endpoints, the application must display the limitation. It must not silently introduce a proxy.

### FR-02: Catalogue synchronization

Retrieve the following provider information:

- Live TV categories.
- Live TV channels.
- VOD categories.
- Movies.
- Series categories.
- Series details.
- Seasons and episodes where provided.

Requirements:

- Initial catalogue synchronization.
- Manual refresh.
- Local catalogue persistence.
- Duplicate-free updates.
- Preserve favourites and viewing history across refreshes.
- Show synchronization progress.
- Handle partial failures.
- Avoid unnecessary full catalogue downloads.
- Support large catalogues efficiently.

The application should normalize provider responses into a consistent internal data model.

Use stable provider identifiers as upsert keys:

- Live: `stream_id`
- Movies: `stream_id` or provider VOD identifier
- Series: `series_id`
- Episodes: provider episode identifier where available

Do not create thousands of individual JSON files.

### FR-03: Live TV

Users must be able to:

- Browse channels.
- Browse by category.
- Search by channel name.
- View channel logos when available.
- Add or remove favourites.
- Select a channel to play.
- Select a playback destination.

The application must not include EPG, programme schedules, or now/next information.

### FR-04: Movies (VOD)

Users must be able to:

- Browse available movies.
- Browse by category.
- Search movie titles.
- View posters and available metadata.
- Open movie details.
- Add or remove favourites.
- Play movies.

Available metadata may include:

- Movie title.
- Poster.
- Description.
- Release year.
- Genre.
- Rating.
- Duration.

The application must gracefully handle missing provider metadata.

### FR-05: Series

Users must be able to:

- Browse series.
- Search by title.
- Browse categories.
- View series details.
- Browse seasons.
- Browse episodes.
- View available episode information.
- Add or remove series favourites.
- Play selected episodes.

The data model must maintain the relationship between series, seasons, and episodes.

### FR-06: Global search

Provide a unified search interface across:

- Live TV.
- Movies.
- Series.

Requirements:

- Search locally stored catalogue data.
- Case-insensitive matching.
- Partial title matching.
- Results grouped by content type.
- Search results should open the appropriate content detail page.
- Search must not require a new provider API request for every keystroke.

### FR-07: Favourites

Users must be able to favourite:

- Live TV channels.
- Movies.
- Series.

Requirements:

- Persist favourites locally.
- Preserve favourites during catalogue refresh.
- Allow removal from the favourites section.
- Support filtering favourites by content type.

### FR-08: Recently Played and viewing history

The application must locally track:

- Content identifier.
- Content type.
- Content title.
- Thumbnail or poster where available.
- Last played timestamp.
- Last selected playback destination.
- Playback progress when available.

Users must be able to:

- View recently played content.
- Clear individual history entries.
- Clear all history.

The saved playback destination must not bypass the destination selector. It may only be used as informational context.

### FR-09: Continue Watching

Continue Watching must be implemented for compatible iPhone/tablet playback.

Requirements:

- Track playback position.
- Save progress periodically.
- Restore the previous position when playback resumes.
- Track completion.
- Remove completed content from Continue Watching.
- Handle interruptions and application restarts.

Suggested completion rule:

- Mark content completed when at least 95% has been watched or fewer than 30 seconds remain.

For live TV, resume position is not required.

For Roku playback, only recently played information and timestamps are guaranteed. Exact Roku resume position is excluded because the PWA cannot reliably inspect the Roku player's playback state through a cross-origin HTTP interface.

### FR-10: Playback destination selector

Whenever the user selects playable content, show a destination selector.

Options:

1. Play on this device.
2. Play on Roku.

The selector must appear every time. The application must not automatically select the previous destination.

If Roku integration is unavailable, the application should clearly explain that Roku playback is not supported in the current browser environment.

### FR-11: Native device playback

When the user selects Play on this device:

- Open the built-in HTML5 video player.
- Support play and pause.
- Support seeking where applicable.
- Support volume controls where available.
- Support full-screen playback.
- Support portrait browsing and landscape viewing.
- Save playback progress for compatible VOD content.
- Display meaningful playback errors.

Playback should prioritize native Safari support for HLS and compatible MP4 streams.

HLS.js may be evaluated on platforms that support the necessary media APIs, but native Safari playback must remain the primary iPhone strategy.

Unsupported formats or codecs must fail gracefully.

### FR-12: Roku Media Assistant

Roku integration is desirable but subordinate to the serverless requirement.

The intended workflow is:

1. User selects content.
2. User selects Play on Roku.
3. Application obtains the stream URL.
4. Application sends the URL to the configured Roku Media Assistant endpoint.
5. Roku retrieves the stream directly.

The iPhone must never relay the video stream to Roku.

Requirements:

- Allow manual Roku IP configuration.
- Store Roku IP locally.
- Provide a Roku playback test where technically possible.
- Support dispatch of compatible stream URLs.
- Encode stream URLs correctly.
- Display whether a dispatch was attempted or confirmed.

Important browser restrictions:

- HTTPS pages cannot freely issue ordinary fetch requests to HTTP Roku endpoints.
- `no-cors` does not bypass mixed-content restrictions.
- Opaque responses cannot confirm successful playback.
- Browser local-network permissions may restrict device access.

Therefore, Roku integration must first pass a technical proof of concept.

If direct dispatch is not possible from the installed PWA, Roku integration must remain an optional unsupported feature. No backend, relay, native wrapper, or local server may be introduced without a separate architectural decision.

Roku resume tracking is out of scope.

## 6. PWA requirements

The application must be installable on iPhone and tablets.

Requirements:

- Web app manifest.
- Application icons.
- Standalone display mode.
- Theme colors.
- Service worker.
- Offline application shell.
- Cached static assets.
- Installation guidance for iOS Safari.
- Appropriate iPhone safe-area handling.

The application shell should remain accessible offline.

IPTV catalogues and streams will require an active internet connection unless already cached locally.

The PWA must not claim that IPTV streaming is available offline.

## 7. Local storage architecture

All user-specific information must remain on the user's device.

### Recommended technology

- IndexedDB for structured catalogue and history data.
- Dexie.js for IndexedDB access.
- LocalStorage only for small, non-critical settings if needed.

### Proposed entities

| Entity | Purpose |
|---|---|
| ProviderConfig | Xtream connection settings |
| LiveCategory | Live categories |
| LiveChannel | Live channel metadata |
| VodCategory | Movie categories |
| Movie | Movie metadata |
| SeriesCategory | Series categories |
| Series | Series metadata |
| Season | Season metadata |
| Episode | Episode metadata |
| Favourite | Favourites |
| WatchHistory | Recently played records |
| PlaybackProgress | Resume position |
| AppSettings | User preferences |
| RokuConfig | Roku IP and preferences |

### Storage requirements

- Store catalogue records locally.
- Preserve user data across refreshes.
- Avoid unnecessary duplication.
- Handle browser storage quota errors.
- Show catalogue storage usage where possible.
- Allow the user to clear catalogue data separately from favourites and history.
- Handle storage eviction gracefully.
- Offer a catalogue re-synchronization path when local data is unavailable.

Local data is device- and browser-specific. It will not automatically synchronize between iPhone and tablet.

The user must understand that clearing Safari website data may remove stored application information.

## 8. Technical architecture

### Frontend

- React.
- TypeScript.
- Vite.
- Tailwind CSS.

The application must be developed independently from scratch.

### Data integration

- Browser Fetch API.
- Direct Xtream Codes API integration.
- Provider response normalization.
- Client-side catalogue synchronization.

### Local persistence

- IndexedDB.
- Dexie.js.

### Performance

- Web Workers where useful.
- Lazy-loaded images.
- Virtualized catalogue lists.
- Pagination.
- Efficient local search.
- Incremental catalogue updates where provider support permits.

### Video playback

- HTML5 video.
- Native Safari HLS.
- Compatible MP4 playback.
- HLS.js only on supported platforms where required.

### PWA

- Vite PWA plugin.
- Web app manifest.
- Service worker.
- Offline static application assets.

### Hosting

- GitHub Pages.
- Static production build.
- HTTPS deployment.

No application server or backend is part of the approved architecture.

## 9. Security and privacy

- Never commit provider credentials.
- Do not include credentials in application URLs unnecessarily.
- Do not log usernames, passwords, or complete stream URLs.
- Avoid third-party analytics and tracking.
- Use HTTPS for the deployed application.
- Minimize third-party dependencies.
- Use a restrictive Content Security Policy where compatible.
- Clearly explain that locally stored credentials are not protected by iOS Keychain.
- Consider optional local encryption for sensitive configuration.
- Do not send viewing history to external services.

A browser-only application cannot guarantee complete protection against malicious scripts or a compromised device.

## 10. Performance targets

Initial targets for the MVP:

| Operation | Target |
|---|---|
| Application shell load | Under 2 seconds on a reasonable connection |
| Local search | Under 100 ms for 20,000 indexed items |
| Navigation | Responsive without full-page reloads |
| Catalogue browsing | Lazy-loaded or virtualized |
| Playback initiation | Depends on provider and stream availability |
| Catalogue refresh | Progress feedback and recoverable failures |

Performance targets must be tested on an actual iPhone and tablet.

## 11. Error handling

The application must handle:

- Invalid credentials.
- Expired subscriptions.
- Provider unavailable.
- Provider CORS restrictions.
- Stream already in use or connection-limit errors.
- Missing content.
- Unsupported video formats.
- Playback failures.
- Storage quota exceeded.
- Incomplete catalogue refresh.
- Network interruption.
- PWA cache problems.
- Unsupported Roku communication.

Existing valid catalogue data must not be deleted just because a refresh fails.

The application must distinguish between a request being sent and playback being confirmed.

## 12. Content filtering

The application should support hiding unwanted categories and content.

Requirements:

- Allow users to hide selected categories.
- Support a configurable mature-content filter.
- Apply filters consistently to search results, Home, and category browsing.
- Store filtering preferences locally.

The application should not assume category names alone reliably identify mature content.

## 13. Explicitly out of scope

- EPG.
- Now/next programme information.
- Backend services.
- Cloud databases.
- Cloud synchronization.
- Server-side proxying.
- Server-side streaming or transcoding.
- User registration.
- Subscription management.
- Public IPTV hosting.
- Video recording.
- Guaranteed Roku playback progress.
- Native iOS application.
- Android native application.
- App Store distribution.

## 14. MVP acceptance criteria

The MVP is complete when:

1. The application is hosted as a static website.
2. It can be installed on iPhone.
3. It works on an iPad/tablet.
4. The user can configure Xtream Codes credentials.
5. The application can retrieve the provider catalogue directly from the browser.
6. Live TV, Movies, and Series are available.
7. Users can search across all three content types.
8. Favourites persist locally.
9. Recently Played persists locally.
10. Compatible iPhone playback works.
11. Continue Watching works for compatible device playback.
12. The playback destination selector appears every time.
13. Roku dispatch works directly from the PWA if browser restrictions permit.
14. If Roku dispatch is blocked, the application remains fully functional without Roku.
15. No backend or proxy is required.
16. No EPG is present.
17. Failed catalogue refreshes do not destroy previously stored catalogue data.

## 15. Development phases

### Phase 0 — Technical feasibility

Before significant implementation, validate:

- Whether the IPTV provider permits browser-origin API requests.
- Whether its API is accessible over HTTPS.
- Whether actual live and VOD streams play on iPhone Safari.
- Whether the catalogue size is manageable in IndexedDB.
- Whether Roku Media Assistant dispatch can work from the deployed HTTPS PWA.
- Whether the PWA can be hosted successfully on GitHub Pages.

**Deliverable:** Feasibility report and go/no-go decision for optional Roku support.

### Phase 1 — Project foundation

- Set up a new independent Git repository.
- Configure React, TypeScript, and Vite.
- Configure Tailwind CSS.
- Configure the PWA plugin.
- Create application navigation.
- Implement responsive layout.
- Establish GitHub Pages deployment.

**Deliverable:** Installable application shell.

### Phase 2 — Provider configuration

- Build Xtream configuration screen.
- Implement direct authentication.
- Test provider connectivity.
- Store configuration locally.
- Implement connection errors.

**Deliverable:** Working provider connection.

### Phase 3 — Catalogue integration

- Retrieve Live TV.
- Retrieve Movies.
- Retrieve Series.
- Normalize provider data.
- Store catalogue in IndexedDB.
- Implement refresh and recovery.

**Deliverable:** Locally stored IPTV catalogue.

### Phase 4 — Browsing and search

- Implement Home.
- Implement Live TV.
- Implement Movies.
- Implement Series.
- Implement category browsing.
- Implement global search.
- Optimize large lists.

**Deliverable:** Complete catalogue browsing experience.

### Phase 5 — Personalization and history

- Implement favourites.
- Implement Recently Played.
- Implement Continue Watching.
- Implement playback progress persistence.
- Implement local filtering preferences.

**Deliverable:** Persistent personalized application.

### Phase 6 — Device playback

- Implement playback destination selector.
- Build native iPhone video player.
- Validate compatible stream formats.
- Implement playback controls.
- Implement resume and completion logic.

**Deliverable:** Functional iPhone/tablet playback.

### Phase 7 — Optional Roku integration

Proceed only if Phase 0 demonstrates feasibility.

- Implement Roku IP configuration.
- Implement Media Assistant dispatch.
- Test supported stream formats.
- Implement honest dispatch status.
- Document browser limitations.

**Deliverable:** Optional serverless Roku playback.

### Phase 8 — Final PWA optimization

- Validate iPhone and iPad layouts.
- Validate portrait and landscape experiences.
- Test installation.
- Test local storage persistence.
- Test large catalogues.
- Test interrupted synchronization.
- Test production GitHub Pages deployment.

**Deliverable:** Stable personal-use PWA.

## 16. Definition of success

The final application should provide a polished iPhone and tablet IPTV experience, connect directly to the user's IPTV provider, browse Live TV, Movies, and Series, and maintain favourites, recently played content, and Continue Watching entirely through local device storage.

It must be deployable without an application backend.

Roku playback is a desirable optional capability, provided it can be achieved without compromising the serverless architecture.

The project must remain independent, maintainable, and free of unnecessary infrastructure.