export interface RawNewsArticle {
  title?: string;
  url?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
}

const TRACKING_QUERY_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']);

const simpleHash = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

export const normalizeArticleUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    const filteredParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      if (!TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        filteredParams.append(key, value);
      }
    });
    parsed.search = filteredParams.toString() ? `?${filteredParams.toString()}` : '';
    parsed.pathname = parsed.pathname.endsWith('/') && parsed.pathname !== '/' ? parsed.pathname.slice(0, -1) : parsed.pathname;

    return parsed.toString();
  } catch {
    return trimmed.toLowerCase();
  }
};

export const createStableNewsId = (article: Pick<RawNewsArticle, 'url' | 'publishedAt' | 'title'>) => {
  const normalizedUrl = normalizeArticleUrl(article.url || '');
  if (normalizedUrl) return normalizedUrl;

  const fallback = `${article.title || 'untitled'}|${article.publishedAt || 'no-date'}`;
  return `generated:${simpleHash(fallback)}`;
};

export const toNewsItem = (article: RawNewsArticle): NewsItem | null => {
  if (!article || !article.title || !article.url || article.title === '[Removed]') return null;

  const normalizedUrl = normalizeArticleUrl(article.url);
  if (!normalizedUrl) return null;

  return {
    id: createStableNewsId(article),
    title: article.title,
    url: normalizedUrl,
    sourceName: article.source?.name || 'Unknown source',
    publishedAt: article.publishedAt || new Date().toISOString(),
  };
};

export const mapArticlesToNewsItems = (articles: RawNewsArticle[], pageSize: number): NewsItem[] => {
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const article of articles) {
    const item = toNewsItem(article);
    if (!item) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
    if (items.length >= pageSize) break;
  }

  return items;
};
