import { mapArticlesToNewsItems, RawNewsArticle } from './newsSchema';
import type { SavedNewsItem } from './savedNews';

interface NewsApiResponse {
  status: 'ok' | 'error';
  articles?: RawNewsArticle[];
  message?: string;
}

export interface FetchTopHeadlinesParams {
  country: string;
  category: string;
  pageSize: number;
  isWeb: boolean;
  newsApiKey?: string;
}

export interface NewsProvider {
  fetchTopHeadlines(params: FetchTopHeadlinesParams): Promise<SavedNewsItem[]>;
}

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';
const NEWS_SNAPSHOT_PATH = '/news.json';
const MAX_NEWS_API_PAGE_SIZE = 50;
const OVERFETCH_MULTIPLIER = 3;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS_PER_ENDPOINT = 3;
const RETRY_BASE_DELAY_MS = 300;

const parseNewsResponse = (response: Response, bodyText: string) => {
  try {
    return JSON.parse(bodyText) as NewsApiResponse;
  } catch {
    const contentType = response.headers.get('content-type') || '';
    const gotHtml = contentType.includes('text/html') || bodyText.trimStart().startsWith('<');
    if (gotHtml) {
      throw new Error('News endpoint returned HTML instead of JSON.');
    }
    throw new Error('News endpoint returned an invalid response.');
  }
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const getEndpoints = (isWeb: boolean, newsApiKey?: string) => {
  if (isWeb) {
    const endpoints = [NEWS_SNAPSHOT_PATH];
    if (newsApiKey) endpoints.push(NEWS_API_URL);
    return endpoints;
  }
  return [NEWS_API_URL];
};

export class TopHeadlinesNewsProvider implements NewsProvider {
  async fetchTopHeadlines(params: FetchTopHeadlinesParams): Promise<SavedNewsItem[]> {
    const { country, category, pageSize, isWeb, newsApiKey } = params;
    const requestedPageSize = Math.min(pageSize * OVERFETCH_MULTIPLIER, MAX_NEWS_API_PAGE_SIZE);
    const endpoints = getEndpoints(isWeb, newsApiKey);
    let mappedItems: SavedNewsItem[] = [];
    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i += 1) {
      const endpoint = endpoints[i];
      for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_ENDPOINT; attempt += 1) {
        try {
          const query = new URLSearchParams({
            country,
            pageSize: String(requestedPageSize),
          });
          if (category !== 'all') {
            query.append('category', category);
          }
          if (endpoint === NEWS_API_URL) {
            if (!newsApiKey) {
              throw new Error('Missing NewsAPI key. Set EXPO_PUBLIC_NEWS_API_KEY or app.config.js extra.newsApiKey.');
            }
            query.append('apiKey', newsApiKey);
          }
          if (endpoint === NEWS_SNAPSHOT_PATH) {
            query.append('_ts', Date.now().toString());
          }

          const response = await fetchWithTimeout(`${endpoint}?${query.toString()}`, REQUEST_TIMEOUT_MS);
          const bodyText = await response.text();
          const parsed = parseNewsResponse(response, bodyText);
          if (!response.ok || parsed.status !== 'ok') {
            throw new Error(parsed.message || 'Failed to fetch top headlines.');
          }

          const mapped = mapArticlesToNewsItems(parsed.articles || [], pageSize);
          const hasNextEndpoint = i < endpoints.length - 1;
          if (mapped.length < pageSize && hasNextEndpoint) {
            break;
          }
          mappedItems = mapped;
          break;
        } catch (error) {
          const isAbortError = error instanceof Error && error.name === 'AbortError';
          const reason = isAbortError ? 'Request timed out.' : error instanceof Error ? error.message : 'Unknown error';
          lastError = new Error(`Attempt ${attempt}/${MAX_ATTEMPTS_PER_ENDPOINT} failed: ${reason}`);

          const shouldRetry = attempt < MAX_ATTEMPTS_PER_ENDPOINT;
          if (shouldRetry) {
            await delay(RETRY_BASE_DELAY_MS * attempt);
          }
        }
      }

      if (mappedItems.length) break;
    }

    if (!mappedItems.length) {
      if (isWeb) {
        throw new Error(
          `${lastError?.message || 'Unable to load news right now.'} Pull to retry. Ensure /news.json is generated during deploy.`
        );
      }
      throw lastError || new Error('Unable to load news right now. Pull to retry.');
    }

    return mappedItems;
  }
}
