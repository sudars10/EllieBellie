import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';

interface Source {
  id: string;
  name: string;
  url: string;
  description: string; // short description for the source
  topHeadlines: string[];
}

interface NewsItem {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  sourceDescription?: string;
}

const TOP_SOURCES: Source[] = [
  {
    id: 'nytimes',
    name: 'The New York Times',
    url: 'https://www.nytimes.com',
    description: 'US national paper known for in-depth reporting',
    topHeadlines: [
      'Global markets react to latest economic data',
      'Technology firms report strong quarterly earnings',
      'Investigative report prompts policy debate',
    ],
  },
  {
    id: 'yahoo',
    name: 'Yahoo News',
    url: 'https://www.yahoo.com/news',
    description: 'Aggregates stories across many publishers',
    topHeadlines: [
      'Breaking: major developments in world events',
      'Lifestyle trends gaining popularity this season',
      'Entertainment headlines draw audience attention',
    ],
  },
  {
    id: 'cnn',
    name: 'CNN',
    url: 'https://www.cnn.com',
    description: '24-hour US cable news network',
    topHeadlines: [
      'Top story: major developments in global affairs',
      'Health update: breakthroughs and guidance',
      'Human interest: communities making a difference',
    ],
  },
  {
    id: 'fox',
    name: 'Fox News',
    url: 'https://www.foxnews.com',
    description: 'US cable news channel with broad opinion coverage',
    topHeadlines: [
      'Policy debates dominate headlines today',
      'Business and markets show mixed signals',
      'Local stories highlight community response',
    ],
  },
  {
    id: 'bbc',
    name: 'BBC',
    url: 'https://www.bbc.com/news',
    description: 'UK public broadcaster with global coverage',
    topHeadlines: [
      'International summit focuses on climate action',
      'Local communities respond to infrastructure plans',
      'New scientific study reshapes understanding of health',
    ],
  },
  {
    id: 'usatoday',
    name: 'USA Today',
    url: 'https://www.usatoday.com',
    description: 'National US paper with broad lifestyle coverage',
    topHeadlines: [
      'Feature: cultural trends to watch this year',
      'Travel and leisure picks for the season',
      'Sports roundup: scores and highlights',
    ],
  },
  {
    id: 'msn',
    name: 'MSN',
    url: 'https://www.msn.com',
    description: 'Portal featuring headlines from partner sites',
    topHeadlines: [
      'Curated headlines across the web',
      'Popular topics: tech, health, and finance',
      'Opinion pieces that spark conversation',
    ],
  },
  {
    id: 'usnews',
    name: 'U.S. News & World Report',
    url: 'https://www.usnews.com',
    description: 'Rankings and national news coverage',
    topHeadlines: [
      'Rankings update: institutions in focus',
      'Policy coverage affects education and health',
      'Analysis of recent government announcements',
    ],
  },
  {
    id: 'nypost',
    name: 'New York Post',
    url: 'https://www.nypost.com',
    description: 'Tabloid-style coverage with bold headlines',
    topHeadlines: [
      'Celebrity news and high-profile stories',
      'Local New York headlines of interest',
      'Quick reads for the daily commuter',
    ],
  },
  {
    id: 'nbc',
    name: 'NBC News',
    url: 'https://www.nbcnews.com',
    description: 'Broadcast network with national reporting',
    topHeadlines: [
      'Evening roundup: major stories from the day',
      'Investigations and special reports',
      'Feature: stories from around the country',
    ],
  },
];

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const buildDailyHeadlines = (): NewsItem[] => {
    // Use day index so headlines rotate predictably each day
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return TOP_SOURCES.map((s) => {
      const headline = s.topHeadlines[dayIndex % s.topHeadlines.length];
      return {
        title: headline,
        url: s.url,
        sourceName: s.name,
        publishedAt: new Date().toISOString(),
        sourceDescription: s.description,
      };
    });
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const items = buildDailyHeadlines();
      setNews(items);
      setLastUpdated(new Date().toDateString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    // Optionally schedule a refresh at next local midnight when app stays open
    // const msUntilMidnight = (new Date().setHours(24,0,0,0) - Date.now()) || 24*60*60*1000;
    // const t = setTimeout(() => refresh(), msUntilMidnight);
    // return () => clearTimeout(t);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => refresh(), 250);
  };

  const openUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading today's headlines…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={news}
        keyExtractor={(item, idx) => item.url + idx}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Top Sources — Today's Headlines</Text>
            <Text style={styles.headerSubtitle}>Headlines rotate daily. Pull to refresh.</Text>
            {lastUpdated ? <Text style={styles.updateText}>Last updated: {formatDate(new Date().toISOString())}</Text> : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.newsItem} onPress={() => openUrl(item.url)} activeOpacity={0.8}>
            <View style={styles.newsNumber}><Text style={styles.newsNumberText}>{index + 1}</Text></View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>{item.title}</Text>
                {/* Removed source description rendering */}
              <View style={styles.metaRow}>
                <Text style={styles.newsSource}>{item.sourceName}</Text>
                <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, color: '#666' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  updateText: { marginTop: 6, fontSize: 12, color: '#999' },
  listContent: { padding: 16, paddingBottom: 32 },
  newsItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, elevation: 2 },
  newsNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  newsNumberText: { color: '#fff', fontWeight: '700' },
  newsContent: { flex: 1 },
  newsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  // source description removed from UI
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  newsSource: { fontSize: 12, color: '#007AFF', fontWeight: '500' },
  newsDate: { fontSize: 12, color: '#999' },
});
