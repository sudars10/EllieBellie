import { useCallback, useEffect, useRef, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { trackEventAsync } from '../lib/analytics';
import { TopHeadlinesNewsProvider } from '../lib/newsProvider';
import { getNewsItemId, readSavedNews, SavedNewsItem, SavedNewsMap, writeSavedNews } from '../lib/savedNews';

type NewsItem = SavedNewsItem;

const DEFAULT_COUNTRY = 'us';
const DEFAULT_CATEGORY = 'all';
const TOP_NEWS_COUNT = 10;
const newsProvider = new TopHeadlinesNewsProvider();

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

export default function NewsScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedNewsById, setSavedNewsById] = useState<SavedNewsMap>({});
  const lastRefreshDateRef = useRef('');
  const hasLoadedSavedNewsRef = useRef(false);
  const revealValuesRef = useRef<Animated.Value[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const items = await newsProvider.fetchTopHeadlines({
        country: DEFAULT_COUNTRY,
        category: DEFAULT_CATEGORY,
        pageSize: TOP_NEWS_COUNT,
        isWeb: Platform.OS === 'web',
        newsApiKey: getNewsApiKey(),
      });

      setNews(items);
      setLastUpdated(new Date().toLocaleString());
      lastRefreshDateRef.current = getLocalDateKey();
      trackEventAsync('feed_loaded', {
        count: items.length,
        platform: Platform.OS,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load news right now.';
      setErrorMessage(message);
      setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    let midnightTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now.getTime() + 1000;

      midnightTimer = setTimeout(async () => {
        await refresh();
        scheduleNextMidnightRefresh();
      }, msUntilMidnight);
    };

    scheduleNextMidnightRefresh();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      const todayKey = getLocalDateKey();
      if (todayKey !== lastRefreshDateRef.current) {
        refresh();
      }
    });

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      subscription.remove();
    };
  }, [refresh]);

  const onRefresh = () => {
    setRefreshing(true);
    refresh();
  };

  const openReader = useCallback(
    (item: NewsItem) => {
      if (!item.url) return;
      trackEventAsync('headline_tap', {
        articleId: getNewsItemId(item),
        sourceName: item.sourceName,
        entryPoint: 'feed',
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

  const toggleSaved = useCallback((item: NewsItem) => {
    const id = getNewsItemId(item);
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
    if (!news.length) return;

    revealValuesRef.current = news.map(() => new Animated.Value(0));
    const animations = revealValuesRef.current.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 450,
        delay: index * 70,
        useNativeDriver: true,
      })
    );
    Animated.stagger(70, animations).start();
  }, [news]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D1495B" />
        <Text style={styles.loadingText}>Loading today&apos;s top headlines...</Text>
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
        data={news}
        keyExtractor={(item, idx) => `${item.url}-${idx}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>EllieBellie Bulletin</Text>
            <Text style={styles.headerTitle}>Top 10 Headlines</Text>
            <Text style={styles.headerSubtitle}>Fresh stories curated for today. Tap any card to open the full report.</Text>
            <View style={styles.metaPillRow}>
              <View style={styles.metaPill}>
                <Text style={styles.updateText}>Updated: {lastUpdated || 'N/A'}</Text>
              </View>
              <View style={styles.savedPill}>
                <Text style={styles.savedPillText}>Saved: {Object.keys(savedNewsById).length}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.savedScreenButton} onPress={() => router.push('/saved')} activeOpacity={0.85}>
              <Text style={styles.savedScreenButtonText}>Open Saved</Text>
            </TouchableOpacity>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No headlines available right now.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const reveal = revealValuesRef.current[index] || new Animated.Value(1);
          const itemSaved = Boolean(savedNewsById[getNewsItemId(item)]);
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
                  <TouchableOpacity style={styles.newsOpenArea} onPress={() => openReader(item)} activeOpacity={0.86}>
                    <Text style={styles.newsTitle}>{item.title}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.newsSource}>{item.sourceName}</Text>
                      <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, itemSaved && styles.saveButtonActive]}
                    onPress={() => toggleSaved(item)}
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
  savedScreenButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1495B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF8F8',
  },
  savedScreenButtonText: { fontSize: 11, color: '#D1495B', fontFamily: 'SpaceMono' },
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
