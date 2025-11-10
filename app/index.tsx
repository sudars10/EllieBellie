import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { config } from '../config';

interface NewsItem {
  title: string;
  url: string;
  source: {
    name: string;
  };
  publishedAt: string;
}

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      // Get API key from config file
      const API_KEY = config.newsApiKey;
      const newsApiUrl = `${config.newsApiUrl}?country=${config.defaultCountry}&apiKey=${API_KEY}`;
      
      let response;
      let data;
      
      // Try NewsAPI first if API key is set
      if (API_KEY) {
        try {
          response = await fetch(newsApiUrl);
          if (response.ok) {
            data = await response.json();
            if (data.articles && data.articles.length > 0) {
              setNews(data.articles);
              setLoading(false);
              setRefreshing(false);
              return;
            }
          }
        } catch (e) {
          console.log('NewsAPI failed, trying alternative...');
        }
      }
      
      // Fallback: Use RSS2JSON service to convert RSS feeds to JSON (free, no API key needed)
      // This converts BBC News RSS feed to JSON format
      const rss2JsonUrl = 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/rss.xml&api_key=public';
      
      response = await fetch(rss2JsonUrl);
      
      if (response.ok) {
        data = await response.json();
        if (data.items && data.items.length > 0) {
          const articles: NewsItem[] = data.items.map((item: any) => ({
            title: item.title,
            url: item.link,
            source: { name: item.author || 'BBC News' },
            publishedAt: item.pubDate || new Date().toISOString()
          }));
          setNews(articles);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
      
      // If all APIs fail, throw error to show fallback message
      throw new Error('No articles found');
    } catch (error) {
      console.error('Error fetching news:', error);
      // Final fallback: Show sample news
      setNews([
        {
          title: 'How to Get Your News API Key',
          url: 'https://newsapi.org/register',
          source: { name: 'NewsAPI' },
          publishedAt: new Date().toISOString()
        },
        {
          title: 'Get a free API key from NewsAPI.org to see real news',
          url: 'https://newsapi.org/',
          source: { name: 'Setup Required' },
          publishedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const openNews = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading today's news...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={news}
        keyExtractor={(item, index) => item.url || index.toString()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Today's Top News</Text>
            <Text style={styles.headerSubtitle}>Stay informed with the latest headlines</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.newsItem}
            onPress={() => openNews(item.url)}
            activeOpacity={0.7}
          >
            <View style={styles.newsNumber}>
              <Text style={styles.newsNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>{item.title}</Text>
              <View style={styles.newsMeta}>
                <Text style={styles.newsSource}>{item.source.name}</Text>
                {item.publishedAt && (
                  <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  newsItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  newsNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    lineHeight: 22,
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  newsDate: {
    fontSize: 12,
    color: '#999',
  },
});

