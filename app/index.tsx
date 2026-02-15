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
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';

interface NewsItem {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
}

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

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';
const NEWS_SNAPSHOT_PATH = '/news.json';
const DEFAULT_COUNTRY = 'us';
const TOP_NEWS_COUNT = 10;

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

const getNewsEndpoints = () => {
  if (Platform.OS === 'web') {
    const endpoints = [NEWS_SNAPSHOT_PATH];
    if (getNewsApiKey()) endpoints.push(NEWS_API_URL);
    return endpoints;
  }
  return [NEWS_API_URL];
};

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

export default function NewsScreen() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const lastRefreshDateRef = useRef('');
  const revealValuesRef = useRef<Animated.Value[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const endpoints = getNewsEndpoints();
      let data: NewsApiResponse | null = null;
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          const params = new URLSearchParams({
            country: DEFAULT_COUNTRY,
            pageSize: String(TOP_NEWS_COUNT),
          });
          if (endpoint === NEWS_API_URL) {
            const apiKey = getNewsApiKey();
            if (!apiKey) {
              throw new Error('Missing NewsAPI key. Set EXPO_PUBLIC_NEWS_API_KEY or app.config.js extra.newsApiKey.');
            }
            params.append('apiKey', apiKey);
          }
          if (endpoint === NEWS_SNAPSHOT_PATH) {
            // Bust browser/CDN caches so production web always fetches the latest snapshot.
            params.append('_ts', Date.now().toString());
          }

          const response = await fetch(`${endpoint}?${params.toString()}`);
          const bodyText = await response.text();
          const parsed = parseNewsResponse(response, bodyText);
          if (!response.ok || parsed.status !== 'ok') {
            throw new Error(parsed.message || 'Failed to fetch top headlines.');
          }
          data = parsed;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unable to load news right now.');
        }
      }

      if (!data) {
        if (Platform.OS === 'web') {
          throw new Error(
            `${lastError?.message || 'Unable to load news right now.'} Ensure /news.json is generated during deploy.`
          );
        }
        throw lastError || new Error('Unable to load news right now.');
      }

      const articles = data.articles || [];
      const items: NewsItem[] = articles
        .filter((article) => !!article.title && !!article.url && article.title !== '[Removed]')
        .slice(0, TOP_NEWS_COUNT)
        .map((article) => ({
          title: article.title || 'Untitled',
          url: article.url || '',
          sourceName: article.source?.name || 'Unknown source',
          publishedAt: article.publishedAt || new Date().toISOString(),
        }));

      setNews(items);
      setLastUpdated(new Date().toLocaleString());
      lastRefreshDateRef.current = getLocalDateKey();
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

  const openUrl = async (url: string) => {
    if (!url) return;
    await WebBrowser.openBrowserAsync(url);
  };

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
            <View style={styles.metaPill}>
              <Text style={styles.updateText}>Updated: {lastUpdated || 'N/A'}</Text>
            </View>
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
              <TouchableOpacity style={styles.newsItem} onPress={() => openUrl(item.url)} activeOpacity={0.86}>
                <View style={styles.newsNumber}>
                  <Text style={styles.newsNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.newsSource}>{item.sourceName}</Text>
                    <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
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
  metaPill: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#F8EFE2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
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
  newsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, color: '#20222D', lineHeight: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsSource: { fontSize: 12, color: '#087E8B', fontFamily: 'SpaceMono', flex: 1, marginRight: 8 },
  newsDate: { fontSize: 11, color: '#6B6672', fontFamily: 'SpaceMono' },
});
