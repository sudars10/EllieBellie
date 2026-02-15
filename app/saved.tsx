import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { trackEventAsync } from '../lib/analytics';
import { readSavedNews, SavedNewsItem, SavedNewsMap, writeSavedNews } from '../lib/savedNews';

interface SavedRow extends SavedNewsItem {
  id: string;
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

export default function SavedScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [loading, setLoading] = useState(true);
  const [savedNewsById, setSavedNewsById] = useState<SavedNewsMap>({});

  const loadSavedNews = useCallback(async () => {
    try {
      const saved = await readSavedNews();
      setSavedNewsById(saved);
      trackEventAsync('saved_opened', {
        count: Object.keys(saved).length,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedNews();
    }, [loadSavedNews])
  );

  const removeSaved = useCallback((id: string) => {
    setSavedNewsById((previous) => {
      const next = { ...previous };
      delete next[id];
      writeSavedNews(next).catch(() => {
        // Keep UI responsive even if local persistence fails.
      });
      return next;
    });
  }, []);

  const openReader = useCallback(
    (item: SavedRow) => {
      trackEventAsync('headline_tap', {
        articleId: item.id,
        sourceName: item.sourceName,
        entryPoint: 'saved',
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

  const savedRows = useMemo<SavedRow[]>(
    () =>
      Object.entries(savedNewsById)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    [savedNewsById]
  );

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D1495B" />
        <Text style={styles.loadingText}>Loading saved stories...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Saved Stories</Text>
          <Text style={styles.subtitle}>Your personal reading list</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{savedRows.length}</Text>
        </View>
      </View>

      <FlatList
        data={savedRows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No saved stories yet</Text>
            <Text style={styles.emptySubtitle}>Tap "Save for later" on the feed to build your list.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSource}>{item.sourceName}</Text>
            <Text style={styles.cardDate}>{formatDate(item.publishedAt)}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => openReader(item)}
                activeOpacity={0.86}
              >
                <Text style={styles.openButtonText}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={() => removeSaved(item.id)} activeOpacity={0.86}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF6EE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCF6EE' },
  loadingText: { marginTop: 14, color: '#5B5560', fontFamily: 'SpaceMono', fontSize: 12 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: {
    borderWidth: 1,
    borderColor: '#D1495B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF8F8',
  },
  backButtonText: { color: '#D1495B', fontFamily: 'SpaceMono', fontSize: 11 },
  headerTextContainer: { flex: 1, marginLeft: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1B25' },
  subtitle: { marginTop: 4, fontSize: 12, color: '#5B5560', fontFamily: 'SpaceMono' },
  countBadge: { backgroundColor: '#EAF6F8', borderRadius: 999, minWidth: 34, alignItems: 'center', paddingVertical: 6 },
  countBadgeText: { fontSize: 12, color: '#087E8B', fontFamily: 'SpaceMono' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  emptyContainer: {
    marginTop: 60,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#F0E5D7',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#20222D' },
  emptySubtitle: { marginTop: 8, fontSize: 12, color: '#5B5560', fontFamily: 'SpaceMono', textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: '#20222D' },
  cardSource: { marginTop: 9, fontSize: 12, color: '#087E8B', fontFamily: 'SpaceMono' },
  cardDate: { marginTop: 6, fontSize: 11, color: '#6B6672', fontFamily: 'SpaceMono' },
  actionsRow: { marginTop: 12, flexDirection: 'row' },
  openButton: {
    borderRadius: 999,
    backgroundColor: '#087E8B',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  openButtonText: { color: '#FFFFFF', fontFamily: 'SpaceMono', fontSize: 11 },
  removeButton: {
    marginLeft: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1495B',
    backgroundColor: '#FFF8F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  removeButtonText: { color: '#D1495B', fontFamily: 'SpaceMono', fontSize: 11 },
});
