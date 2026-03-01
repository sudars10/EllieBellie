import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { trackEventAsync } from '../lib/analytics';
import { buildAiSummaryBlocks } from '../lib/aiSummary';
import { TopHeadlinesNewsProvider } from '../lib/newsProvider';
import { getNewsItemId, readSavedNews, SavedNewsItem, SavedNewsMap, writeSavedNews } from '../lib/savedNews';
import { clusterStories, createStorySnapshot, getStoryChangeLabel, StoryClusterSnapshot } from '../lib/storyClustering';
import { getDefaultUserPreferences, readUserPreferences, UserPreferences } from '../lib/userPreferences';

type NewsItem = SavedNewsItem;

interface StoryRow {
  id: string;
  headline: string;
  primaryArticle: NewsItem;
  articles: NewsItem[];
  coverageCount: number;
  sourceNames: string[];
  latestPublishedAt: string;
  changeLabel: string;
}

const FEED_FETCH_ARTICLE_COUNT = 24;
const TOP_STORY_CLUSTER_COUNT = 10;
const MAJOR_STORY_MIN_COVERAGE = 2;
const FOR_YOU_COUNT = 3;
const FOR_YOU_CATEGORY_LIMIT = 3;
const FOR_YOU_FETCH_PAGE_SIZE = 6;

const newsProvider = new TopHeadlinesNewsProvider();
const AI_SUMMARY_ENABLED = process.env.EXPO_PUBLIC_ENABLE_AI_SUMMARY === 'true';

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNewsApiKey = () => {
  const fromExtra = Constants.expoConfig?.extra?.newsApiKey;
  const fromEnv = process.env.EXPO_PUBLIC_NEWS_API_KEY;
  return fromEnv || fromExtra;
};

interface RefreshOptions {
  silent?: boolean;
}

interface ForYouResult {
  items: NewsItem[];
  fallbackUsed: boolean;
}

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function NewsScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [storyRows, setStoryRows] = useState<StoryRow[]>([]);
  const [forYouItems, setForYouItems] = useState<NewsItem[]>([]);
  const [forYouFallbackMessage, setForYouFallbackMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedNewsById, setSavedNewsById] = useState<SavedNewsMap>({});

  const lastRefreshDateRef = useRef('');
  const hasLoadedSavedNewsRef = useRef(false);
  const revealValuesRef = useRef<Animated.Value[]>([]);
  const preferencesRef = useRef<UserPreferences | null>(null);
  const storySnapshotsRef = useRef<Record<string, StoryClusterSnapshot>>({});

  const buildForYouItems = useCallback(async (topHeadlines: NewsItem[], activePreferences: UserPreferences): Promise<ForYouResult> => {
    const preferredCategories = activePreferences.interests.slice(0, FOR_YOU_CATEGORY_LIMIT);
    if (!preferredCategories.length) {
      return {
        items: topHeadlines.slice(0, FOR_YOU_COUNT),
        fallbackUsed: false,
      };
    }

    const settledResults = await Promise.allSettled(
      preferredCategories.map((category) =>
        newsProvider.fetchTopHeadlines({
          country: activePreferences.country,
          category,
          pageSize: FOR_YOU_FETCH_PAGE_SIZE,
          isWeb: Platform.OS === 'web',
          newsApiKey: getNewsApiKey(),
        })
      )
    );

    const personalizedItems: NewsItem[] = [];
    const seen = new Set<string>();

    settledResults.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      result.value.forEach((item) => {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        personalizedItems.push(item);
      });
    });

    const selected = personalizedItems.slice(0, FOR_YOU_COUNT);
    let fallbackUsed = selected.length < FOR_YOU_COUNT;

    if (selected.length < FOR_YOU_COUNT) {
      topHeadlines.forEach((item) => {
        if (selected.length >= FOR_YOU_COUNT) return;
        if (seen.has(item.id)) return;
        seen.add(item.id);
        selected.push(item);
      });
    }

    if (!selected.length) {
      fallbackUsed = true;
      return {
        items: topHeadlines.slice(0, FOR_YOU_COUNT),
        fallbackUsed,
      };
    }

    return {
      items: selected,
      fallbackUsed,
    };
  }, []);

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      const activePreferences = preferencesRef.current;
      if (!activePreferences || !activePreferences.onboardingCompleted) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (!options.silent) {
          setLoading(true);
        }
        setErrorMessage('');

        const articles = await newsProvider.fetchTopHeadlines({
          country: activePreferences.country,
          category: 'all',
          pageSize: FEED_FETCH_ARTICLE_COUNT,
          isWeb: Platform.OS === 'web',
          newsApiKey: getNewsApiKey(),
        });

        const clustered = clusterStories(articles, TOP_STORY_CLUSTER_COUNT);
        const previousSnapshots = storySnapshotsRef.current;

        const storyRowsWithTimeline: StoryRow[] = clustered.map((cluster) => ({
          id: cluster.id,
          headline: cluster.headline,
          primaryArticle: cluster.primaryArticle,
          articles: cluster.articles,
          coverageCount: cluster.coverageCount,
          sourceNames: cluster.sourceNames,
          latestPublishedAt: cluster.latestPublishedAt,
          changeLabel: getStoryChangeLabel(cluster, previousSnapshots[cluster.id]),
        }));

        const nextSnapshotMap: Record<string, StoryClusterSnapshot> = {};
        storyRowsWithTimeline.forEach((row) => {
          nextSnapshotMap[row.id] = createStorySnapshot(row);
        });
        storySnapshotsRef.current = nextSnapshotMap;

        const forYou = await buildForYouItems(articles, activePreferences);

        if (forYou.fallbackUsed) {
          setForYouFallbackMessage('Personalized picks are limited right now, so we blended in top headlines.');
          trackEventAsync('for_you_fallback', {
            country: activePreferences.country,
            interestCount: activePreferences.interests.length,
          });
        } else {
          setForYouFallbackMessage('');
        }

        setStoryRows(storyRowsWithTimeline);
        setForYouItems(forYou.items);
        setLastUpdated(new Date().toLocaleString());
        lastRefreshDateRef.current = getLocalDateKey();

        trackEventAsync('feed_loaded', {
          storyCount: storyRowsWithTimeline.length,
          articleCount: articles.length,
          forYouCount: forYou.items.length,
          platform: Platform.OS,
          country: activePreferences.country,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load news right now.';
        trackEventAsync('feed_load_failed', {
          platform: Platform.OS,
          message,
        });
        setErrorMessage(message);
        setStoryRows([]);
        setForYouItems([]);
        setForYouFallbackMessage('');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildForYouItems]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadPreferences = async () => {
        try {
          const stored = await readUserPreferences();
          if (cancelled) return;
          setPreferences(stored);
          preferencesRef.current = stored;
        } catch {
          if (cancelled) return;
          const fallback = getDefaultUserPreferences();
          setPreferences(fallback);
          preferencesRef.current = fallback;
        } finally {
          if (!cancelled) {
            setPreferencesLoaded(true);
          }
        }
      };

      loadPreferences();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const preferenceSignature = preferences
    ? `${preferences.country}|${preferences.interests.slice().sort().join(',')}`
    : '';

  useEffect(() => {
    if (!preferencesLoaded) return;

    if (!preferences?.onboardingCompleted) {
      setLoading(false);
      setRefreshing(false);
      router.replace('/onboarding');
      return;
    }

    refresh();

    let midnightTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now.getTime() + 1000;

      midnightTimer = setTimeout(async () => {
        await refresh({ silent: true });
        scheduleNextMidnightRefresh();
      }, msUntilMidnight);
    };

    scheduleNextMidnightRefresh();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      const todayKey = getLocalDateKey();
      if (todayKey !== lastRefreshDateRef.current) {
        refresh({ silent: true });
      }
    });

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      subscription.remove();
    };
  }, [preferencesLoaded, preferences?.onboardingCompleted, preferenceSignature, refresh, router]);

  const onRefresh = () => {
    setRefreshing(true);
    refresh({ silent: true });
  };

  const openReader = useCallback(
    (item: NewsItem, entryPoint: 'feed' | 'for_you' | 'compare' = 'feed') => {
      if (!item.url) return;
      trackEventAsync('headline_tap', {
        articleId: item.id,
        sourceName: item.sourceName,
        entryPoint,
      });
      router.push({
        pathname: '/reader',
        params: {
          url: item.url,
          title: item.title,
          sourceName: item.sourceName,
          publishedAt: item.publishedAt,
        },
      });
    },
    [router]
  );

  const openCompare = useCallback(
    (row: StoryRow) => {
      const perspectives = row.articles.slice(0, 3).map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        sourceName: article.sourceName,
        publishedAt: article.publishedAt,
      }));

      trackEventAsync('compare_opened', {
        storyId: row.id,
        coverageCount: row.coverageCount,
      });

      router.push({
        pathname: '/compare',
        params: {
          headline: row.headline,
          coverageCount: String(row.coverageCount),
          changeLabel: row.changeLabel,
          perspectives: encodeURIComponent(JSON.stringify(perspectives)),
        },
      });
    },
    [router]
  );

  const toggleSaved = useCallback((item: NewsItem) => {
    const id = item.id || getNewsItemId(item);
    setSavedNewsById((previous) => {
      if (previous[id]) {
        const next = { ...previous };
        delete next[id];
        trackEventAsync('bookmark_removed', {
          articleId: id,
        });
        return next;
      }
      trackEventAsync('bookmark_added', {
        articleId: id,
      });
      return { ...previous, [id]: item };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSavedNews = async () => {
      try {
        const stored = await readSavedNews();
        if (cancelled) return;
        setSavedNewsById(stored);
      } catch {
        // Ignore malformed saved data and proceed with empty saved list.
      } finally {
        if (!cancelled) hasLoadedSavedNewsRef.current = true;
      }
    };

    loadSavedNews();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedNewsRef.current) return;
    writeSavedNews(savedNewsById).catch(() => {
      // Keep UI responsive even if local persistence fails.
    });
  }, [savedNewsById]);

  useEffect(() => {
    if (!storyRows.length) return;

    revealValuesRef.current = storyRows.map(() => new Animated.Value(0));
    const animations = revealValuesRef.current.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 450,
        delay: index * 70,
        useNativeDriver: true,
      })
    );
    Animated.stagger(70, animations).start();
  }, [storyRows]);

  const savedCount = useMemo(() => Object.keys(savedNewsById).length, [savedNewsById]);

  if (loading || !fontsLoaded || !preferencesLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D1495B" />
        <Text style={styles.loadingText}>Loading your briefing...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbSecondary} />
      <View style={styles.bgOrbTertiary} />
      <FlatList
        data={storyRows}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>EllieBellie Bulletin</Text>
            <Text style={styles.headerTitle}>Top Stories</Text>
            <Text style={styles.headerSubtitle}>Clustered coverage with source compare and timeline updates.</Text>
            <View style={styles.metaPillRow}>
              <View style={styles.metaPill}>
                <Text style={styles.updateText}>Updated: {lastUpdated || 'N/A'}</Text>
              </View>
              <View style={styles.savedPill}>
                <Text style={styles.savedPillText}>Saved: {savedCount}</Text>
              </View>
            </View>
            <View style={styles.headerActionRow}>
              <TouchableOpacity style={styles.savedScreenButton} onPress={() => router.push('/saved')} activeOpacity={0.85}>
                <Text style={styles.savedScreenButtonText}>Open Saved</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.preferencesButton}
                onPress={() => router.push('/preferences')}
                activeOpacity={0.85}
              >
                <Text style={styles.preferencesButtonText}>Preferences</Text>
              </TouchableOpacity>
            </View>
            {forYouItems.length ? (
              <View style={styles.forYouSection}>
                <Text style={styles.forYouTitle}>For You</Text>
                {forYouFallbackMessage ? <Text style={styles.forYouFallbackText}>{forYouFallbackMessage}</Text> : null}
                {forYouItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.forYouCard}
                    onPress={() => openReader(item, 'for_you')}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.forYouCardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.forYouCardMeta}>
                      {item.sourceName} • {formatDate(item.publishedAt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No stories available right now.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const reveal = revealValuesRef.current[index] || new Animated.Value(1);
          const itemSaved = Boolean(savedNewsById[item.primaryArticle.id]);
          const majorStory = item.coverageCount >= MAJOR_STORY_MIN_COVERAGE;
          const summaryBlocks = AI_SUMMARY_ENABLED
            ? buildAiSummaryBlocks({
                headline: item.headline,
                coverageCount: item.coverageCount,
                sourceNames: item.sourceNames,
                latestPublishedAt: item.latestPublishedAt,
              })
            : [];

          return (
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  opacity: reveal,
                  transform: [
                    {
                      translateY: reveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: reveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.newsItem}>
                <View style={styles.newsNumber}>
                  <Text style={styles.newsNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={styles.newsContent}>
                  <TouchableOpacity
                    style={styles.newsOpenArea}
                    onPress={() => openReader(item.primaryArticle)}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.newsTitle}>{item.headline}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.newsSource}>{item.primaryArticle.sourceName}</Text>
                      <Text style={styles.newsDate}>{formatDate(item.primaryArticle.publishedAt)}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.coverageRow}>
                    <View style={styles.coverageBadge}>
                      <Text style={styles.coverageBadgeText}>{item.coverageCount} sources</Text>
                    </View>
                    {item.coverageCount > 1 ? (
                      <TouchableOpacity
                        style={styles.compareButton}
                        onPress={() => openCompare(item)}
                        activeOpacity={0.86}
                      >
                        <Text style={styles.compareButtonText}>Compare {Math.min(item.coverageCount, 3)} views</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {majorStory ? (
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineLabel}>What changed</Text>
                      <Text style={styles.timelineValue}>{item.changeLabel}</Text>
                    </View>
                  ) : null}

                  {AI_SUMMARY_ENABLED && majorStory ? (
                    <View style={styles.aiSummarySection}>
                      <Text style={styles.aiSummaryTitle}>AI summary preview</Text>
                      {summaryBlocks.map((block) => (
                        <View key={`${item.id}-${block.id}`} style={styles.aiSummaryRow}>
                          <Text style={styles.aiSummaryTag}>{block.label}</Text>
                          <Text style={styles.aiSummaryText} numberOfLines={3}>
                            {block.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.saveButton, itemSaved && styles.saveButtonActive]}
                    onPress={() => toggleSaved(item.primaryArticle)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.saveButtonText, itemSaved && styles.saveButtonTextActive]}>
                      {itemSaved ? 'Saved' : 'Save for later'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF6EE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCF6EE' },
  loadingText: { marginTop: 14, color: '#5B5560', fontFamily: 'SpaceMono', fontSize: 12 },
  bgOrbPrimary: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#F7D08A',
    top: -40,
    left: -80,
    opacity: 0.4,
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#7EC4CF',
    top: 110,
    right: -120,
    opacity: 0.25,
  },
  bgOrbTertiary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#D1495B',
    bottom: -70,
    left: -30,
    opacity: 0.15,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    margin: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E5D7',
  },
  kicker: {
    color: '#D1495B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 34, lineHeight: 38, color: '#1A1B25', fontWeight: '800' },
  headerSubtitle: { fontSize: 14, color: '#4C4F5D', marginTop: 10, lineHeight: 20 },
  metaPillRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  metaPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8EFE2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  savedPill: {
    marginLeft: 8,
    backgroundColor: '#EAF6F8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedScreenButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1495B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF8F8',
  },
  savedScreenButtonText: { fontSize: 11, color: '#D1495B', fontFamily: 'SpaceMono' },
  preferencesButton: {
    marginLeft: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#087E8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EAF6F8',
  },
  preferencesButtonText: { fontSize: 11, color: '#087E8B', fontFamily: 'SpaceMono' },
  forYouSection: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E6DAC8',
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 251, 245, 0.95)',
  },
  forYouTitle: { fontSize: 18, color: '#1A1B25', fontWeight: '700' },
  forYouFallbackText: { marginTop: 6, color: '#5B5560', fontSize: 11, fontFamily: 'SpaceMono' },
  forYouCard: {
    marginTop: 10,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECD8BF',
    backgroundColor: '#FFFFFF',
  },
  forYouCardTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#20222D' },
  forYouCardMeta: { marginTop: 6, fontSize: 11, color: '#6B6672', fontFamily: 'SpaceMono' },
  savedPillText: { fontSize: 11, color: '#087E8B', fontFamily: 'SpaceMono' },
  updateText: { fontSize: 11, color: '#5B5560', fontFamily: 'SpaceMono' },
  errorText: { marginTop: 10, color: '#B00020', fontSize: 12, fontFamily: 'SpaceMono' },
  listContent: { paddingHorizontal: 16, paddingBottom: 36 },
  emptyContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#4C4F5D', fontFamily: 'SpaceMono' },
  cardWrapper: { marginBottom: 12 },
  newsItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    shadowColor: '#3B2F2F',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  newsNumber: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#D1495B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newsNumberText: { color: '#fff', fontSize: 14, fontFamily: 'SpaceMono' },
  newsContent: { flex: 1 },
  newsOpenArea: { flex: 1 },
  newsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, color: '#20222D', lineHeight: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsSource: { fontSize: 12, color: '#087E8B', fontFamily: 'SpaceMono', flex: 1, marginRight: 8 },
  newsDate: { fontSize: 11, color: '#6B6672', fontFamily: 'SpaceMono' },
  coverageRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  coverageBadge: {
    borderRadius: 999,
    backgroundColor: '#EAF6F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverageBadgeText: { color: '#087E8B', fontFamily: 'SpaceMono', fontSize: 11 },
  compareButton: {
    marginLeft: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#087E8B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F4FBFC',
  },
  compareButtonText: { color: '#087E8B', fontFamily: 'SpaceMono', fontSize: 11 },
  timelineRow: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECD8BF',
    backgroundColor: '#FFFBF5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timelineLabel: { color: '#D1495B', fontSize: 10, fontFamily: 'SpaceMono', textTransform: 'uppercase' },
  timelineValue: { marginTop: 4, color: '#4C4F5D', fontSize: 12, fontFamily: 'SpaceMono' },
  aiSummarySection: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECD8BF',
    backgroundColor: '#FFFBF6',
    padding: 10,
  },
  aiSummaryTitle: { color: '#20222D', fontSize: 14, fontWeight: '700' },
  aiSummaryRow: { marginTop: 8 },
  aiSummaryTag: {
    color: '#D1495B',
    fontFamily: 'SpaceMono',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  aiSummaryText: { marginTop: 4, color: '#4C4F5D', fontSize: 12, lineHeight: 17 },
  saveButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1495B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFF8F8',
  },
  saveButtonActive: {
    backgroundColor: '#D1495B',
  },
  saveButtonText: {
    fontSize: 11,
    color: '#D1495B',
    fontFamily: 'SpaceMono',
  },
  saveButtonTextActive: {
    color: '#FFFFFF',
  },
});
