import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedNewsItem {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
}

export type SavedNewsMap = Record<string, SavedNewsItem>;

export const SAVED_NEWS_STORAGE_KEY = 'elliebellie.savedNews.v1';

export const getNewsItemId = (item: Pick<SavedNewsItem, 'url'>) => item.url.trim().toLowerCase();

export const readSavedNews = async (): Promise<SavedNewsMap> => {
  const raw = await AsyncStorage.getItem(SAVED_NEWS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as SavedNewsMap;
    }
  } catch {
    return {};
  }

  return {};
};

export const writeSavedNews = async (savedNewsById: SavedNewsMap) => {
  await AsyncStorage.setItem(SAVED_NEWS_STORAGE_KEY, JSON.stringify(savedNewsById));
};
