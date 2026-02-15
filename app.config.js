// Load environment variables from .env file
require('dotenv').config();

export default {
  expo: {
    name: "EllieBellie",
    slug: "EllieBellie",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sudars10.EllieBellie",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "f8b58c44-5ffa-4d8b-bfe9-d0a8db73fb9d"
      },
      // API key is read from environment variable or .env file
      // Set NEWS_API_KEY in your .env file or environment variables
      newsApiKey: process.env.NEWS_API_KEY || process.env.EXPO_PUBLIC_NEWS_API_KEY
    }
  }
};
