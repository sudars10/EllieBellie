import { View, StyleSheet, FlatList, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';

interface NewsSource {
  name: string;
  url: string;
  description: string;
}

// Top 10 most visited news sources (based on traffic data)
const TOP_NEWS_SOURCES: NewsSource[] = [
  { 
    name: 'Yahoo News', 
    url: 'https://www.yahoo.com/news',
    description: '~4.3M daily visits'
  },
  { 
    name: 'The New York Times', 
    url: 'https://www.nytimes.com',
    description: '~4.0M daily visits'
  },
  { 
    name: 'CNN', 
    url: 'https://www.cnn.com',
    description: '~1.1M daily visits'
  },
  { 
    name: 'Fox News', 
    url: 'https://www.foxnews.com',
    description: '~1.1M daily visits'
  },
  { 
    name: 'BBC', 
    url: 'https://www.bbc.com',
    description: '~730K daily visits'
  },
  { 
    name: 'USA Today', 
    url: 'https://www.usatoday.com',
    description: '~700K daily visits'
  },
  { 
    name: 'MSN', 
    url: 'https://www.msn.com',
    description: '~670K daily visits'
  },
  { 
    name: 'U.S. News & World Report', 
    url: 'https://www.usnews.com',
    description: '~530K daily visits'
  },
  { 
    name: 'New York Post', 
    url: 'https://www.nypost.com',
    description: '~400K daily visits'
  },
  { 
    name: 'NBC News', 
    url: 'https://www.nbcnews.com',
    description: '~370K daily visits'
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
