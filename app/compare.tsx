import { useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { buildAiSummaryBlocks } from '../lib/aiSummary';

interface PerspectiveItem {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
}

const parseParam = (value: string | string[] | undefined) => {
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

const decodePerspectives = (value: string): PerspectiveItem[] => {
  if (!value) return [];

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is PerspectiveItem => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : '',
        title: typeof item.title === 'string' ? item.title : '',
        url: typeof item.url === 'string' ? item.url : '',
        sourceName: typeof item.sourceName === 'string' ? item.sourceName : 'Unknown source',
        publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : '',
      }))
      .filter((item) => item.id && item.title && item.url);
  } catch {
    return [];
  }
};

export default function CompareScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const params = useLocalSearchParams<{
    headline?: string | string[];
    coverageCount?: string | string[];
    changeLabel?: string | string[];
    perspectives?: string | string[];
  }>();

  const headline = parseParam(params.headline) || 'Story compare';
  const coverageCount = Number(parseParam(params.coverageCount) || '0');
  const changeLabel = parseParam(params.changeLabel);
  const perspectives = useMemo(() => decodePerspectives(parseParam(params.perspectives)), [params.perspectives]);
  const aiSummaryEnabled = process.env.EXPO_PUBLIC_ENABLE_AI_SUMMARY === 'true';

  const summaryBlocks = useMemo(
    () =>
      buildAiSummaryBlocks({
        headline,
        coverageCount: coverageCount || perspectives.length || 1,
        sourceNames: perspectives.map((item) => item.sourceName),
        latestPublishedAt: perspectives[0]?.publishedAt,
      }),
    [coverageCount, headline, perspectives]
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D1495B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.86}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compare</Text>
        </View>

        <View style={styles.storyCard}>
          <Text style={styles.storyTitle}>{headline}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.coverageBadge}>
              <Text style={styles.coverageBadgeText}>{coverageCount || perspectives.length} sources</Text>
            </View>
            {changeLabel ? (
              <View style={styles.changeBadge}>
                <Text style={styles.changeBadgeText}>{changeLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {aiSummaryEnabled ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>AI Summary Preview</Text>
            {summaryBlocks.map((block) => (
              <View key={block.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{block.label}</Text>
                <Text style={styles.summaryText}>{block.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Source perspectives</Text>
          {perspectives.length ? (
            perspectives.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.perspectiveCard}>
                <Text style={styles.perspectiveTitle}>{item.title}</Text>
                <Text style={styles.perspectiveMeta}>
                  {item.sourceName}
                  {item.publishedAt ? ` • ${formatDate(item.publishedAt)}` : ''}
                </Text>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() =>
                    router.push({
                      pathname: '/reader',
                      params: {
                        url: item.url,
                        title: item.title,
                        sourceName: item.sourceName,
                        publishedAt: item.publishedAt,
                      },
                    })
                  }
                  activeOpacity={0.86}
                >
                  <Text style={styles.openButtonText}>Open article</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No alternate perspectives are available for this story right now.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF6EE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCF6EE' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    borderWidth: 1,
    borderColor: '#D1495B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFF8F8',
  },
  backButtonText: { color: '#D1495B', fontFamily: 'SpaceMono', fontSize: 11 },
  headerTitle: { marginLeft: 10, fontSize: 28, lineHeight: 34, color: '#1A1B25', fontWeight: '800' },
  storyCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    padding: 14,
  },
  storyTitle: { fontSize: 19, lineHeight: 25, color: '#20222D', fontWeight: '700' },
  badgeRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  coverageBadge: {
    borderRadius: 999,
    backgroundColor: '#EAF6F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverageBadgeText: { color: '#087E8B', fontFamily: 'SpaceMono', fontSize: 11 },
  changeBadge: {
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: '#F8EFE2',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeBadgeText: { color: '#5B5560', fontFamily: 'SpaceMono', fontSize: 11 },
  summaryCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    padding: 14,
  },
  summaryTitle: { fontSize: 17, color: '#20222D', fontWeight: '700' },
  summaryRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    borderRadius: 12,
    backgroundColor: '#FFFBF6',
    padding: 10,
  },
  summaryLabel: { color: '#D1495B', fontFamily: 'SpaceMono', fontSize: 11, textTransform: 'uppercase' },
  summaryText: { marginTop: 6, color: '#4C4F5D', fontSize: 13, lineHeight: 19 },
  sectionCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    padding: 14,
  },
  sectionTitle: { fontSize: 17, color: '#20222D', fontWeight: '700' },
  perspectiveCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  perspectiveTitle: { fontSize: 15, lineHeight: 21, color: '#20222D', fontWeight: '700' },
  perspectiveMeta: { marginTop: 6, color: '#6B6672', fontFamily: 'SpaceMono', fontSize: 11 },
  openButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#087E8B',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  openButtonText: { color: '#FFFFFF', fontFamily: 'SpaceMono', fontSize: 11 },
  emptyText: { marginTop: 10, color: '#5B5560', fontFamily: 'SpaceMono', fontSize: 12 },
});
