# EllieBellie

EllieBellie is an Expo mobile application built with [Expo](https://expo.dev/) and React Native. This app displays today's top news articles with clickable links to their sources.

## Features
- Displays top news articles from NewsAPI
- Clickable news items that open in browser
- Pull-to-refresh functionality
- Clean, modern UI with numbered news items
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
   NEWS_API_KEY=your_api_key_here
   ```
   
   Get your free API key from: https://newsapi.org/register
   
   **Option 2: Using app.config.js**
   
   Edit `app.config.js` and update the `newsApiKey` value in the `extra` section.

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on iOS/Android/Web:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser

## Project Structure
- `app/` — Main application code and screens
  - `index.tsx` — Main news feed screen
- `config.ts` — Configuration file for API keys
- `app.config.js` — Expo configuration (reads from environment variables)
- `ios/` — iOS native project files

## API Key Security

The API key is stored in `app.config.js` and can be set via environment variables. The `.env` file is gitignored to keep your API key secure. Never commit your actual API key to version control.

## License

This project is licensed under the MIT License.