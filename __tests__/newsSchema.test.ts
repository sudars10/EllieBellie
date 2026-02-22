import { createStableNewsId, mapArticlesToNewsItems, normalizeArticleUrl, toNewsItem } from '../lib/newsSchema';

describe('news schema normalization', () => {
  it('normalizes tracking query params for stable ids', () => {
    const urlA = 'https://Example.com/news/story?utm_source=x&id=123';
    const urlB = 'https://example.com/news/story?id=123&utm_campaign=test';

    const idA = createStableNewsId({ title: 'A', url: urlA, publishedAt: '2026-02-22T00:00:00Z' });
    const idB = createStableNewsId({ title: 'A', url: urlB, publishedAt: '2026-02-22T00:00:00Z' });

    expect(idA).toBe(idB);
    expect(normalizeArticleUrl(urlA)).toBe('https://example.com/news/story?id=123');
  });

  it('maps only valid articles and caps by page size', () => {
    const items = mapArticlesToNewsItems(
      [
        { title: '[Removed]', url: 'https://site.com/1' },
        { title: 'Missing url' },
        { title: 'Valid 1', url: 'https://site.com/2', source: { name: 'Site' } },
        { title: 'Valid 2', url: 'https://site.com/3' },
      ],
      1
    );

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Valid 1');
    expect(items[0].id).toBe('https://site.com/2');
  });

  it('drops duplicate articles with same normalized id', () => {
    const items = mapArticlesToNewsItems(
      [
        { title: 'A', url: 'https://site.com/story?utm_source=a' },
        { title: 'A copy', url: 'https://site.com/story' },
      ],
      10
    );

    expect(items).toHaveLength(1);
  });

  it('returns null for invalid news item', () => {
    expect(toNewsItem({ title: '[Removed]', url: 'https://site.com/a' })).toBeNull();
    expect(toNewsItem({ title: 'No URL' })).toBeNull();
  });
});
