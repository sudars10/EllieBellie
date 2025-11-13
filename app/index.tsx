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
            <Text style={styles.headerTitle}>Top 10 news sources of today</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.newsItem}
            onPress={() => openNewsSource(item.url)}
            activeOpacity={0.6}
          >
            <Text style={styles.newsNumber}>{index + 1}.</Text>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>{item.name}</Text>
              <Text style={styles.newsDescription}>{item.description}</Text>
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
    backgroundColor: '#f6f6ef', // Hacker News beige background
  },
  header: {
    backgroundColor: '#ff6600', // Hacker News orange
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    // Hacker News uses Verdana, but we'll use system default which is similar
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
    flexGrow: 1,
  },
  newsItem: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    borderBottomWidth: 0,
  },
  newsNumber: {
    fontSize: 13,
    color: '#828282', // Hacker News gray for numbers
    marginRight: 4,
    minWidth: 20,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 13,
    fontWeight: 'normal',
    color: '#000000',
    marginBottom: 4,
    lineHeight: 18,
  },
  newsDescription: {
    fontSize: 11,
    color: '#828282', // Hacker News gray for secondary text
    lineHeight: 16,
    marginTop: 2,
  },
});
