import { View, StyleSheet, FlatList, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';

interface NewsSource {
  name: string;
  url: string;
  description: string;
}

// Top 10 news sources with direct links
const TOP_NEWS_SOURCES: NewsSource[] = [
  { 
    name: 'BBC News', 
    url: 'https://www.bbc.com/news',
    description: 'Breaking news and top stories from BBC'
  },
  { 
    name: 'CNN', 
    url: 'https://www.cnn.com',
    description: 'Latest news and breaking stories from CNN'
  },
  { 
    name: 'Reuters', 
    url: 'https://www.reuters.com',
    description: 'Global news and business updates'
  },
  { 
    name: 'The Guardian', 
    url: 'https://www.theguardian.com',
    description: 'Independent journalism and news'
  },
  { 
    name: 'The New York Times', 
    url: 'https://www.nytimes.com',
    description: 'Breaking news and in-depth reporting'
  },
  { 
    name: 'NPR', 
    url: 'https://www.npr.org',
    description: 'National Public Radio news and stories'
  },
  { 
    name: 'Associated Press', 
    url: 'https://apnews.com',
    description: 'AP News - Trusted journalism'
  },
  { 
    name: 'The Washington Post', 
    url: 'https://www.washingtonpost.com',
    description: 'Democracy dies in darkness'
  },
  { 
    name: 'Al Jazeera', 
    url: 'https://www.aljazeera.com',
    description: 'News from a global perspective'
  },
  { 
    name: 'Financial Times', 
    url: 'https://www.ft.com',
    description: 'Global business and financial news'
  },
];

export default function NewsScreen() {
  const openNewsSource = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={TOP_NEWS_SOURCES}
        keyExtractor={(item, index) => item.name || index.toString()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Top News Sources</Text>
            <Text style={styles.headerSubtitle}>Tap any source to visit their website</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.newsItem}
            onPress={() => openNewsSource(item.url)}
            activeOpacity={0.7}
          >
            <View style={styles.newsNumber}>
              <Text style={styles.newsNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>{item.name}</Text>
              <Text style={styles.newsDescription}>{item.description}</Text>
              <View style={styles.newsMeta}>
                <Text style={styles.newsSource}>Tap to visit →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
    lineHeight: 24,
  },
  newsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
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
});
