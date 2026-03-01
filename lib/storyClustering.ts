import type { SavedNewsItem } from './savedNews';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'with',
  'will',
  'after',
  'over',
  'about',
]);

const MIN_TOKEN_LENGTH = 3;
const MATCH_THRESHOLD = 0.55;
const MIN_SHARED_TOKENS = 3;

const normalizeHeadline = (headline: string) => {
  return headline
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s[-|\u2013\u2014]\s[^-|\u2013\u2014]+$/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenizeHeadline = (headline: string) => {
  const normalized = normalizeHeadline(headline);
  if (!normalized) return [];

  return normalized
    .split(' ')
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token))
    .slice(0, 14);
};

const sharedTokenCount = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const bSet = new Set(b);
  let shared = 0;
  a.forEach((token) => {
    if (bSet.has(token)) shared += 1;
  });
  return shared;
};

const jaccardSimilarity = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);

  let intersection = 0;
  aSet.forEach((token) => {
    if (bSet.has(token)) intersection += 1;
  });

  const union = new Set([...aSet, ...bSet]).size;
  if (!union) return 0;
  return intersection / union;
};

const getMatchScore = (a: string[], b: string[]) => {
  const shared = sharedTokenCount(a, b);
  if (shared < MIN_SHARED_TOKENS) return 0;
  return jaccardSimilarity(a, b);
};

const getTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
};

const simpleHash = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const toSlug = (input: string[]) => {
  const joined = input.join('-').replace(/[^a-z0-9-]/g, '');
  if (!joined) return '';
  return joined.slice(0, 42);
};

interface WorkingCluster {
  tokens: string[];
  topicKey: string;
  primaryArticle: SavedNewsItem;
  articles: SavedNewsItem[];
}

export interface StoryCluster {
  id: string;
  topicKey: string;
  headline: string;
  primaryArticle: SavedNewsItem;
  articles: SavedNewsItem[];
  coverageCount: number;
  sourceNames: string[];
  latestPublishedAt: string;
}

export interface StoryClusterSnapshot {
  headline: string;
  coverageCount: number;
  sourceNames: string[];
}

type SnapshotSource = Pick<StoryCluster, 'headline' | 'coverageCount' | 'sourceNames'>;

export const createStorySnapshot = (cluster: SnapshotSource): StoryClusterSnapshot => ({
  headline: cluster.headline,
  coverageCount: cluster.coverageCount,
  sourceNames: cluster.sourceNames,
});

export const getStoryChangeLabel = (cluster: StoryCluster, previous?: StoryClusterSnapshot) => {
  if (!previous) {
    return 'New in your feed';
  }

  if (cluster.headline !== previous.headline) {
    return 'Headline updated since last refresh';
  }

  if (cluster.coverageCount > previous.coverageCount) {
    return `Coverage expanded to ${cluster.coverageCount} sources`;
  }

  if (cluster.coverageCount < previous.coverageCount) {
    return `Coverage narrowed to ${cluster.coverageCount} sources`;
  }

  const previousSet = new Set(previous.sourceNames.map((source) => source.toLowerCase()));
  const newSources = cluster.sourceNames.filter((source) => !previousSet.has(source.toLowerCase()));
  if (newSources.length) {
    return `Now covered by ${newSources.slice(0, 2).join(', ')}`;
  }

  return 'No major change since last update';
};

export const clusterStories = (articles: SavedNewsItem[], maxClusters: number): StoryCluster[] => {
  if (!articles.length) return [];

  const sortedArticles = [...articles].sort((a, b) => getTimestamp(b.publishedAt) - getTimestamp(a.publishedAt));
  const workingClusters: WorkingCluster[] = [];

  sortedArticles.forEach((article) => {
    const tokens = tokenizeHeadline(article.title);
    const topicKey = tokens.slice(0, 4).join('|');

    let bestMatchIndex = -1;
    let bestScore = 0;

    workingClusters.forEach((cluster, index) => {
      const score = getMatchScore(tokens, cluster.tokens);
      if (score > bestScore && score >= MATCH_THRESHOLD) {
        bestScore = score;
        bestMatchIndex = index;
      }
    });

    if (bestMatchIndex === -1) {
      workingClusters.push({
        tokens,
        topicKey,
        primaryArticle: article,
        articles: [article],
      });
      return;
    }

    const matchedCluster = workingClusters[bestMatchIndex];
    matchedCluster.articles.push(article);

    const currentPrimaryTime = getTimestamp(matchedCluster.primaryArticle.publishedAt);
    const nextPrimaryTime = getTimestamp(article.publishedAt);
    if (nextPrimaryTime > currentPrimaryTime) {
      matchedCluster.primaryArticle = article;
      matchedCluster.tokens = tokens.length ? tokens : matchedCluster.tokens;
      matchedCluster.topicKey = topicKey || matchedCluster.topicKey;
    }
  });

  const finalized = workingClusters
    .map<StoryCluster>((cluster) => {
      const dedupedById: SavedNewsItem[] = [];
      const seenIds = new Set<string>();

      cluster.articles.forEach((article) => {
        if (seenIds.has(article.id)) return;
        seenIds.add(article.id);
        dedupedById.push(article);
      });

      const sortedClusterArticles = dedupedById.sort((a, b) => getTimestamp(b.publishedAt) - getTimestamp(a.publishedAt));
      const sourceNames = Array.from(new Set(sortedClusterArticles.map((article) => article.sourceName)));
      const latestPublishedAt = sortedClusterArticles[0]?.publishedAt || cluster.primaryArticle.publishedAt;

      const slug = toSlug(cluster.tokens.slice(0, 4));
      const clusterId = slug
        ? `story:${slug}`
        : `story:${simpleHash(`${cluster.primaryArticle.title}|${cluster.primaryArticle.id}`)}`;

      return {
        id: clusterId,
        topicKey: cluster.topicKey,
        headline: cluster.primaryArticle.title,
        primaryArticle: cluster.primaryArticle,
        articles: sortedClusterArticles,
        coverageCount: sourceNames.length,
        sourceNames,
        latestPublishedAt,
      };
    })
    .sort((a, b) => {
      if (b.coverageCount !== a.coverageCount) {
        return b.coverageCount - a.coverageCount;
      }
      return getTimestamp(b.latestPublishedAt) - getTimestamp(a.latestPublishedAt);
    });

  return finalized.slice(0, maxClusters);
};
