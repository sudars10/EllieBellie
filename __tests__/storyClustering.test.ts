import { clusterStories, createStorySnapshot, getStoryChangeLabel } from '../lib/storyClustering';
import type { SavedNewsItem } from '../lib/savedNews';

const makeItem = (overrides: Partial<SavedNewsItem>): SavedNewsItem => ({
  id: overrides.id || Math.random().toString(),
  title: overrides.title || 'Untitled',
  url: overrides.url || 'https://example.com/story',
  sourceName: overrides.sourceName || 'Example',
  publishedAt: overrides.publishedAt || '2026-03-01T00:00:00Z',
});

describe('story clustering', () => {
  it('clusters similar headlines and exposes coverage count', () => {
    const clusters = clusterStories(
      [
        makeItem({
          id: '1',
          title: 'Apple unveils new iPhone features at annual event',
          sourceName: 'Reuters',
          url: 'https://reuters.com/apple',
          publishedAt: '2026-03-01T10:00:00Z',
        }),
        makeItem({
          id: '2',
          title: 'Annual event: Apple unveils new iPhone features',
          sourceName: 'AP News',
          url: 'https://apnews.com/apple',
          publishedAt: '2026-03-01T09:00:00Z',
        }),
        makeItem({
          id: '3',
          title: 'World Cup qualifiers produce major upset in Europe',
          sourceName: 'BBC Sport',
          url: 'https://bbc.com/sport',
          publishedAt: '2026-03-01T08:00:00Z',
        }),
      ],
      10
    );

    expect(clusters).toHaveLength(2);
    expect(clusters[0].coverageCount).toBe(2);
    expect(clusters[0].sourceNames).toEqual(expect.arrayContaining(['Reuters', 'AP News']));
  });

  it('returns timeline labels based on prior snapshot', () => {
    const cluster = clusterStories(
      [
        makeItem({
          id: '1',
          title: 'NASA confirms new lunar mission timeline',
          sourceName: 'Reuters',
          url: 'https://reuters.com/nasa',
          publishedAt: '2026-03-01T10:00:00Z',
        }),
        makeItem({
          id: '2',
          title: 'NASA confirms new lunar mission timeline',
          sourceName: 'AP News',
          url: 'https://apnews.com/nasa',
          publishedAt: '2026-03-01T09:00:00Z',
        }),
      ],
      10
    )[0];

    const snapshot = createStorySnapshot({
      ...cluster,
      coverageCount: 1,
      sourceNames: ['Reuters'],
    });

    const label = getStoryChangeLabel(cluster, snapshot);
    expect(label).toBe('Coverage expanded to 2 sources');
  });
});
