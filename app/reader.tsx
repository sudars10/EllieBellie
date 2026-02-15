import { useMemo } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const getParamString = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
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

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    url?: string | string[];
    title?: string | string[];
    sourceName?: string | string[];
    publishedAt?: string | string[];
  }>();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const articleUrl = getParamString(params.url);
  const title = getParamString(params.title);
  const sourceName = getParamString(params.sourceName);
  const publishedAt = getParamString(params.publishedAt);

  const isValidUrl = useMemo(() => /^https?:\/\//i.test(articleUrl), [articleUrl]);

  const openExternal = async () => {
    if (!isValidUrl) return;
    await WebBrowser.openBrowserAsync(articleUrl);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D1495B" />
      </View>
    );
  }

  if (!isValidUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.86}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.invalidContainer}>
          <Text style={styles.invalidTitle}>Unable to open this article</Text>
          <Text style={styles.invalidText}>The article URL is missing or invalid.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.86}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openExternal} style={styles.externalButton} activeOpacity={0.86}>
          <Text style={styles.externalButtonText}>Open External</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {title || 'Article'}
        </Text>
        <Text style={styles.meta}>
          {sourceName || 'Unknown source'}
          {publishedAt ? ` • ${formatDate(publishedAt)}` : ''}
        </Text>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackTitle}>In-app reader preview is available on native devices.</Text>
          <Text style={styles.webFallbackText}>Use the button above to open this article in a browser tab on web.</Text>
        </View>
      ) : (
        <WebView
          style={styles.webView}
          source={{ uri: articleUrl }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#D1495B" />
              <Text style={styles.loadingText}>Loading article...</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF6EE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCF6EE' },
  loadingText: { marginTop: 10, fontSize: 12, color: '#5B5560', fontFamily: 'SpaceMono' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#D1495B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFF8F8',
  },
  backButtonText: { color: '#D1495B', fontFamily: 'SpaceMono', fontSize: 11 },
  externalButton: {
    borderWidth: 1,
    borderColor: '#087E8B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#EAF6F8',
  },
  externalButtonText: { color: '#087E8B', fontFamily: 'SpaceMono', fontSize: 11 },
  infoBlock: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 14,
  },
  title: { fontSize: 18, lineHeight: 24, color: '#1A1B25', fontWeight: '700' },
  meta: { marginTop: 7, fontSize: 11, color: '#6B6672', fontFamily: 'SpaceMono' },
  webView: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  webFallback: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 16,
  },
  webFallbackTitle: { fontSize: 15, color: '#20222D', fontWeight: '700' },
  webFallbackText: { marginTop: 7, fontSize: 12, color: '#5B5560', fontFamily: 'SpaceMono' },
  invalidContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 16,
  },
  invalidTitle: { fontSize: 18, color: '#20222D', fontWeight: '700' },
  invalidText: { marginTop: 8, fontSize: 12, color: '#5B5560', fontFamily: 'SpaceMono' },
});
