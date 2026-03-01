import { useMemo, useState } from 'react';
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
  writeUserPreferences,
} from '../lib/userPreferences';

export default function OnboardingScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [step, setStep] = useState<0 | 1>(0);
  const [country, setCountry] = useState<SupportedCountry>('us');
  const [interests, setInterests] = useState<InterestCategory[]>(['general']);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const title = useMemo(() => (step === 0 ? 'Pick your location' : 'Choose your interests'), [step]);
  const subtitle = useMemo(
    () =>
      step === 0
        ? 'We use this to fetch the most relevant local headlines.'
        : 'Select one or more categories so we can build your For You section.',
    [step]
  );

  const toggleInterest = (nextInterest: InterestCategory) => {
    setInterests((previous) => {
      if (previous.includes(nextInterest)) {
        return previous.filter((interest) => interest !== nextInterest);
      }
      return [...previous, nextInterest];
    });
  };

  const completeOnboarding = async () => {
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
      trackEventAsync('onboarding_completed', {
        country: nextPreferences.country,
        interestCount: nextPreferences.interests.length,
      });

      router.replace('/');
    } catch {
      setErrorMessage('Unable to save your preferences right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Welcome to EllieBellie</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.stepText}>Step {step + 1} of 2</Text>
        </View>

        {step === 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Location</Text>
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
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Interests</Text>
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
              {interests.length
                ? `${interests.length} selected`
                : 'Select at least one interest to continue.'}
            </Text>
          </View>
        )}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.actionsRow}>
          {step === 1 ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(0)}
              activeOpacity={0.86}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryButton, step === 1 && !interests.length && styles.primaryButtonDisabled]}
            onPress={step === 0 ? () => setStep(1) : completeOnboarding}
            activeOpacity={0.86}
            disabled={saving || (step === 1 && !interests.length)}
          >
            <Text style={styles.primaryButtonText}>{step === 0 ? 'Continue' : saving ? 'Saving...' : 'Finish setup'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF6EE' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCF6EE' },
  scrollContent: { padding: 16, paddingBottom: 28 },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E5D7',
    padding: 18,
  },
  kicker: {
    color: '#D1495B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginBottom: 8,
  },
  title: { fontSize: 30, lineHeight: 34, color: '#1A1B25', fontWeight: '800' },
  subtitle: { marginTop: 10, fontSize: 14, lineHeight: 20, color: '#4C4F5D' },
  stepText: { marginTop: 12, fontSize: 11, color: '#5B5560', fontFamily: 'SpaceMono' },
  sectionCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEDFCB',
    padding: 14,
  },
  sectionTitle: { fontSize: 18, color: '#20222D', fontWeight: '700', marginBottom: 10 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap' },
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
  actionsRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  secondaryButton: {
    marginRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1495B',
    backgroundColor: '#FFF8F8',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonText: { color: '#D1495B', fontSize: 12, fontFamily: 'SpaceMono' },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#087E8B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonDisabled: { backgroundColor: '#8CB5BB' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'SpaceMono' },
});
