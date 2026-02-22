import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStableNewsId, normalizeArticleUrl } from './newsSchema';
import type { NewsItem } from './newsSchema';

export type SavedNewsItem = NewsItem;

export type SavedNewsMap = Record<string, SavedNewsItem>;

export const SAVED_NEWS_STORAGE_KEY = 'elliebellie.savedNews.v1';

const isSavedNewsCandidate = (value: unknown): value is Partial<SavedNewsItem> => {
  return Boolean(value && typeof value === 'object');
};

const coerceSavedNewsItem = (value: Partial<SavedNewsItem>): SavedNewsItem | null => {
  const title = typeof value.title === 'string' ? value.title : '';
  const url = typeof value.url === 'string' ? normalizeArticleUrl(value.url) : '';
  if (!title || !url) return null;

  const publishedAt = typeof value.publishedAt === 'string' ? value.publishedAt : new Date().toISOString();
  const sourceName = typeof value.sourceName === 'string' ? value.sourceName : 'Unknown source';
  const id =
    typeof value.id === 'string' && value.id.trim()
      ? value.id
      : createStableNewsId({ url, publishedAt, title });

  return {
    id,
    title,
    url,
    sourceName,
    publishedAt,
  };
};

const coerceSavedNewsMap = (value: unknown): SavedNewsMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const next: SavedNewsMap = {};
  Object.values(value).forEach((item) => {
    if (!isSavedNewsCandidate(item)) return;
    const normalized = coerceSavedNewsItem(item);
    if (!normalized) return;
    next[normalized.id] = normalized;
  });
  return next;
};

export const getNewsItemId = (item: Pick<SavedNewsItem, 'id' | 'url'>) => {
  if (item.id && item.id.trim()) return item.id;
  return createStableNewsId({ url: item.url });
};

export const readSavedNews = async (): Promise<SavedNewsMap> => {
  const raw = await AsyncStorage.getItem(SAVED_NEWS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    return coerceSavedNewsMap(parsed);
  } catch {
    return {};
  }
};

export const writeSavedNews = async (savedNewsById: SavedNewsMap) => {
  await AsyncStorage.setItem(SAVED_NEWS_STORAGE_KEY, JSON.stringify(savedNewsById));
};
