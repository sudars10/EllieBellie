# EllieBellie

EllieBellie is an Expo mobile application built with [Expo](https://expo.dev/) and React Native. This app displays today's top news articles with clickable links to their sources.

## Features
- Displays top news articles from NewsAPI
- First-run onboarding for location + interest selection
- Personalized `For You` section based on selected interests
- Editable preferences screen from the feed header
- Story clustering across similar headlines
- Coverage-count indicators and compare view with 2-3 source perspectives
- “What changed since last update” timeline row on major stories
- AI summary preview blocks (`10-sec`, `1-min`, `deep dive`) behind `EXPO_PUBLIC_ENABLE_AI_SUMMARY`
- In-app reader screen for opening articles
- External browser fallback from the reader screen
- Pull-to-refresh functionality
- Save/unsave articles with local persistence
- Dedicated Saved screen with empty state
- Clean, modern UI with animated headline cards
- Secure API key configuration

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   
   The app uses NewsAPI to fetch news. You have two options to configure your API key:
   
   **Option 1: Using Environment Variables (Recommended)**
   
   Create a `.env` file in the root directory:
   ```bash
   EXPO_PUBLIC_NEWS_API_KEY=your_api_key_here
   ```
   
   Get your free API key from: https://newsapi.org/register
   
   **Option 2: Use `NEWS_API_KEY` in local shell/.env for native builds**

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on iOS/Android/Web:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser

## User Flow
- Onboarding: select location and interests on first launch.
- Feed: browse clustered top stories, check coverage count, and tap a story to read.
- For You: open personalized picks surfaced at the top of the feed.
- Preferences: open `Preferences` from the feed header to update location/interests.
- Compare: tap `Compare ... views` on multi-source stories to scan perspectives.
- Save for later: tap `Save for later` on a headline card.
- Saved screen: open `Open Saved` from the feed header to manage saved stories.
- Reader: read inside the app, then use `Open External` if needed.

## Project Structure
- `app/` — Main application code and screens
  - `index.tsx` — Main news feed screen
  - `onboarding.tsx` — First-run personalization setup
  - `preferences.tsx` — Preference editing screen
  - `compare.tsx` — Source perspective comparison screen
  - `saved.tsx` — Saved stories screen
  - `reader.tsx` — In-app reader screen
- `lib/`
  - `savedNews.ts` — Saved story persistence helpers
  - `userPreferences.ts` — Local personalization preferences
  - `storyClustering.ts` — Story clustering + timeline label helpers
  - `aiSummary.ts` — AI summary preview text builder
  - `analytics.ts` — Local analytics scaffold (`console` + AsyncStorage event buffer)
- `app.config.js` — Expo configuration (reads from environment variables)
- `ios/` — Optional native iOS project files generated via Expo prebuild when needed

## API Key Security

The API key is stored in `app.config.js` and can be set via environment variables. The `.env` file is gitignored to keep your API key secure. Never commit your actual API key to version control.

## Firebase Web Deployment

Production web uses a static `dist/news.json` snapshot generated during GitHub Actions deploy using the `NEWS_API_KEY` GitHub secret (no Firebase Functions required).

## License

This project is licensed under the MIT License.
