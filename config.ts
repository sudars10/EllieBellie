import Constants from 'expo-constants';

// Get API key from environment variables or expo constants
// You can set this in app.json under "extra" or use environment variables
export const getNewsApiKey = (): string | undefined => {
  // Try to get from expo constants extra config
  const apiKey = Constants.expoConfig?.extra?.newsApiKey;
  
  // Fallback to environment variable (for development)
  if (!apiKey && process.env.EXPO_PUBLIC_NEWS_API_KEY) {
    return process.env.EXPO_PUBLIC_NEWS_API_KEY;
  }
  
  return apiKey;
};

// You can also add other config values here
export const config = {
  newsApiKey: getNewsApiKey(),
  newsApiUrl: 'https://newsapi.org/v2/top-headlines',
  defaultCountry: 'us',
};

