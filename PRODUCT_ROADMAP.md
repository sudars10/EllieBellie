# EllieBellie Solo Build Roadmap

## Build Model
Team: you + Codex only.

Working style:
- We ship in small slices.
- Every slice ends with working code and a quick validation run.
- We do retention-first features before growth features.

## What Codex Can and Cannot Do
Codex can do:
- Plan features, write and refactor code, run local builds/tests, and update docs.
- Propose product decisions with tradeoff analysis.
- Create implementation checklists and keep them current.

Codex cannot do directly:
- Own external accounts or secrets (Firebase, Apple/Google, analytics dashboards).
- Perform GUI-only actions in your browser/phone account.
- Make legal/editorial policy decisions for you.
- Replace real user research or App Store operations.

## North Star Metrics (12-week targets)
- `DAU/MAU >= 0.30`
- `D7 retention >= 20%`
- `Headline -> article open rate >= 45%`
- `Push opt-in >= 35%`
- `Crash-free sessions >= 99.5%`
- `Median app open -> first content < 1.8s`

## Today Plan (Execution Order) (02/15/2026)
Goal: finish one complete retention-focused slice today.

- [x] Confirm product defaults: country (`us`), categories, and source behavior.
- [x] Add local `Saved` feature (bookmark/unbookmark article, persisted with AsyncStorage).
- [x] Add a dedicated `Saved` view/screen with empty state.
- [x] Add lightweight in-app reader route (open article in app before external browser fallback).
- [x] Track basic local analytics events (console/file scaffold): `feed_loaded`, `headline_tap`, `bookmark_added`, `bookmark_removed`, `saved_opened`.
- [x] QA on web + one native target (`npm run build:web` and one local run). Web QA complete; iOS run intentionally deferred for now.
- [x] Update `README.md` with new user-facing features.

### Locked Product Defaults (2026-02-15)
- Country: `us`
- Category mode: `all` (no category filter yet; onboarding personalization will set this later)
- Source behavior: use top headlines without source whitelist/ranking bias
- Web fetch behavior: read `/news.json` snapshot first, then fallback to live NewsAPI only when API key exists
- Native fetch behavior: read live NewsAPI directly

Definition of done for today:
- User can save articles, view saved list, open saved article, and keep data after app restart.

### Decision Log (2026-02-15)
- iOS QA intentionally deferred to keep momentum on feature delivery.

## Phase 1: Reliability + Core Retention (Week 1-2)
- [x] Add provider abstraction for news fetch (`NewsProvider` interface).
- [x] Normalize article schema with stable IDs for dedupe/bookmarks.
- [x] Add robust fetch retry + timeout + user-visible fallback states.
- [x] Add event instrumentation interface (can later connect to Firebase/Amplitude/PostHog).
- [x] Add small smoke tests for parsing and mapping logic.
- [x] Set up release checklist for web deploy verification.

Exit criteria:
- Feed is stable and observable. We can detect failures and stale data quickly.

## Phase 2: Personalization MVP (Week 3-4)
- [ ] Build onboarding flow for interests and location.
- [ ] Store user preferences locally and apply them to fetch queries.
- [ ] Add preference editing screen from settings/header.
- [ ] Add “For You” section at top of feed.
- [ ] Add graceful fallback when preferred categories have low content.

Exit criteria:
- Personalized feed is active for returning users with no onboarding regressions.

## Phase 3: Differentiation (Week 5-8)
- [ ] Implement story clustering (same story from multiple sources).
- [ ] Add “coverage count” indicator per clustered story.
- [ ] Add quick compare view with 2-3 source perspectives.
- [ ] Add AI summary blocks (`10-sec`, `1-min`, `deep dive`) behind a feature flag.
- [ ] Add “What changed since last update” timeline row on major stories.

Exit criteria:
- At least one differentiation feature is used weekly by `>=25%` of active users.

## Phase 4: Habit Loop + Scale (Week 9-12)
- [ ] Add notification preferences UI (digest + breaking + quiet hours).
- [ ] Integrate push delivery pipeline.
- [ ] Add daily digest card generated from top stories.
- [ ] Add offline cache for saved articles + summary metadata.
- [ ] Add basic A/B testing toggles (local/remote config style).

Exit criteria:
- Push-enabled cohort shows improved retention and sessions/user.

## Always-On Checklist (Run Every Week)
- [ ] Fix top 3 crashes/errors from logs.
- [ ] Improve one UI friction point based on observed usage.
- [ ] Measure key funnel deltas against previous week.
- [ ] Remove one technical debt item blocking future speed.

## Backlog Parking Lot (Do Not Start Yet)
- [ ] Audio mode (TTS playlist).
- [ ] Referral/share card growth loop.
- [ ] Advanced trust labels and bias indicators.
- [ ] Multi-language content support.
