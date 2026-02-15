import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
const NEWS_PROXY_PATH = '/api/news';
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

const getNewsEndpoint = () => {
  const proxyFromEnv = process.env.EXPO_PUBLIC_NEWS_PROXY_URL;
  if (proxyFromEnv) return proxyFromEnv;
  if (Platform.OS === 'web') return NEWS_PROXY_PATH;
  return NEWS_API_URL;
};

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const lastRefreshDateRef = useRef('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const endpoint = getNewsEndpoint();
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

      const response = await fetch(`${endpoint}?${params.toString()}`);
      const bodyText = await response.text();
      let data: NewsApiResponse;
      try {
        data = JSON.parse(bodyText) as NewsApiResponse;
      } catch {
        const contentType = response.headers.get('content-type') || '';
        const gotHtml = contentType.includes('text/html') || bodyText.trimStart().startsWith('<');
        if (gotHtml) {
          throw new Error('News proxy returned HTML instead of JSON. Deploy Firebase Functions and set NEWS_API_KEY secret.');
        }
        throw new Error('News proxy returned an invalid response.');
      }

      if (!response.ok || data.status !== 'ok') {
        throw new Error(data.message || 'Failed to fetch top headlines.');
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading today&apos;s top headlines...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={news}
        keyExtractor={(item, idx) => `${item.url}-${idx}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Today&apos;s Top 10 News</Text>
            <Text style={styles.headerSubtitle}>Tap any headline to open the source article.</Text>
            <Text style={styles.updateText}>Last updated: {lastUpdated || 'N/A'}</Text>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No headlines available right now.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.newsItem} onPress={() => openUrl(item.url)} activeOpacity={0.8}>
            <View style={styles.newsNumber}>
              <Text style={styles.newsNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.newsSource}>{item.sourceName}</Text>
                <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, color: '#666' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  updateText: { marginTop: 8, fontSize: 12, color: '#999' },
  errorText: { marginTop: 8, color: '#B00020', fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#666' },
  newsItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  newsNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newsNumberText: { color: '#fff', fontWeight: '700' },
  newsContent: { flex: 1 },
  newsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  newsSource: { fontSize: 12, color: '#007AFF', fontWeight: '500', flex: 1, marginRight: 8 },
  newsDate: { fontSize: 12, color: '#999' },
});
