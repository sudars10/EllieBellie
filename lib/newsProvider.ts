import { SavedNewsItem } from './savedNews';

interface NewsApiArticle {
  title?: string;
  url?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
}

interface NewsApiResponse {
  status: 'ok' | 'error';
  articles?: NewsApiArticle[];
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

const mapArticles = (articles: NewsApiArticle[], pageSize: number): SavedNewsItem[] =>
  articles
    .filter((article) => !!article.title && !!article.url && article.title !== '[Removed]')
    .slice(0, pageSize)
    .map((article) => ({
      title: article.title || 'Untitled',
      url: article.url || '',
      sourceName: article.source?.name || 'Unknown source',
      publishedAt: article.publishedAt || new Date().toISOString(),
    }));

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

        const response = await fetch(`${endpoint}?${query.toString()}`);
        const bodyText = await response.text();
        const parsed = parseNewsResponse(response, bodyText);
        if (!response.ok || parsed.status !== 'ok') {
          throw new Error(parsed.message || 'Failed to fetch top headlines.');
        }
        const mapped = mapArticles(parsed.articles || [], pageSize);
        const hasNextEndpoint = i < endpoints.length - 1;
        if (mapped.length < pageSize && hasNextEndpoint) {
          // If snapshot/live returns fewer than requested valid items, try the next endpoint.
          continue;
        }
        mappedItems = mapped;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unable to load news right now.');
      }
    }

    if (!mappedItems.length) {
      if (isWeb) {
        throw new Error(`${lastError?.message || 'Unable to load news right now.'} Ensure /news.json is generated during deploy.`);
      }
      throw lastError || new Error('Unable to load news right now.');
    }

    return mappedItems;
  }
}
