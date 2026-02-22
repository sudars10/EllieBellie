# Release Checklist

## Pre-release
- [ ] Pull latest `main`.
- [ ] Confirm `.env.production` is present for local web build validation.
- [ ] Verify `NEWS_API_KEY` and `FIREBASE_TOKEN` secrets exist in GitHub Actions.

## Validation
- [ ] Run `npm run build:web`.
- [ ] Open the built site and verify feed loads 10 headlines.
- [ ] Verify `Saved` flow: save from feed, open in Saved screen, remove item.
- [ ] Verify reader route opens and external fallback works.
- [ ] Confirm `Last updated` value changes after refresh.

## Deploy
- [ ] Push to `main` (or run manual workflow dispatch).
- [ ] Confirm GitHub Action `Deploy to Firebase Hosting` succeeds.
- [ ] Confirm `dist/news.json` generated with valid filtered articles in logs.

## Post-release smoke check
- [ ] Open production URL and verify no stale headlines.
- [ ] Confirm top 10 cards render (not 9 due to removed entries).
- [ ] Confirm analytics logs are emitted (`feed_loaded`, `headline_tap`, `bookmark_added`).
- [ ] Record release date and notable changes in changelog/notes.
