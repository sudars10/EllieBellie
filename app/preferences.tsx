import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { trackEventAsync } from '../lib/analytics';
import {
  COUNTRY_OPTIONS,
  INTEREST_OPTIONS,
  InterestCategory,
  SupportedCountry,
  normalizeUserPreferencesInput,
  readUserPreferences,
  writeUserPreferences,
} from '../lib/userPreferences';

export default function PreferencesScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState<SupportedCountry>('us');
  const [interests, setInterests] = useState<InterestCategory[]>(['general']);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const stored = await readUserPreferences();
        if (cancelled) return;
        setCountry(stored.country);
        setInterests(stored.interests);
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to load saved preferences.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleInterest = (nextInterest: InterestCategory) => {
    setInterests((previous) => {
      if (previous.includes(nextInterest)) {
        return previous.filter((interest) => interest !== nextInterest);
      }
      return [...previous, nextInterest];
    });
  };

  const savePreferences = async () => {
    if (!interests.length || saving) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const nextPreferences = normalizeUserPreferencesInput({
        country,
        interests,
        onboardingCompleted: true,
      });

      await writeUserPreferences(nextPreferences);
      trackEventAsync('preferences_updated', {
        country: nextPreferences.country,
        interestCount: nextPreferences.interests.length,
      });
      router.back();
    } catch {
      setErrorMessage('Unable to save preferences right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D1495B" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
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
          <Text style={styles.headerTitle}>Preferences</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionSubtitle}>Used for region-specific top headlines.</Text>
          <View style={styles.pillWrap}>
            {COUNTRY_OPTIONS.map((option) => {
              const selected = option.value === country;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setCountry(option.value)}
                  style={[styles.optionPill, selected && styles.optionPillActive]}
                  activeOpacity={0.86}
                >
                  <Text style={[styles.optionPillText, selected && styles.optionPillTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <Text style={styles.sectionSubtitle}>Used to build the For You section.</Text>
          <View style={styles.pillWrap}>
            {INTEREST_OPTIONS.map((option) => {
              const selected = interests.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => toggleInterest(option.value)}
                  style={[styles.optionPill, selected && styles.optionPillActive]}
                  activeOpacity={0.86}
                >
                  <Text style={[styles.optionPillText, selected && styles.optionPillTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helperText}>
            {interests.length ? `${interests.length} selected` : 'Select at least one interest.'}
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, !interests.length && styles.saveButtonDisabled]}
          onPress={savePreferences}
          activeOpacity={0.86}
          disabled={saving || !interests.length}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save preferences'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF6EE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCF6EE' },
  loadingText: { marginTop: 12, color: '#5B5560', fontFamily: 'SpaceMono', fontSize: 12 },
  scrollContent: { padding: 16, paddingBottom: 26 },
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
  sectionCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    padding: 14,
  },
  sectionTitle: { fontSize: 18, color: '#20222D', fontWeight: '700' },
  sectionSubtitle: { marginTop: 6, fontSize: 12, color: '#5B5560', fontFamily: 'SpaceMono' },
  pillWrap: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  optionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4C5AE',
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  optionPillActive: {
    backgroundColor: '#D1495B',
    borderColor: '#D1495B',
  },
  optionPillText: { color: '#5B5560', fontSize: 12, fontFamily: 'SpaceMono' },
  optionPillTextActive: { color: '#FFFFFF' },
  helperText: { marginTop: 6, fontSize: 11, color: '#5B5560', fontFamily: 'SpaceMono' },
  errorText: { marginTop: 12, color: '#B00020', fontSize: 12, fontFamily: 'SpaceMono' },
  saveButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: '#087E8B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonDisabled: { backgroundColor: '#8CB5BB' },
  saveButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'SpaceMono' },
});
