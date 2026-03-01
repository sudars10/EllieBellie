jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { getDefaultUserPreferences, normalizeUserPreferencesInput } from '../lib/userPreferences';

describe('user preferences normalization', () => {
  it('returns stable defaults', () => {
    const defaults = getDefaultUserPreferences();

    expect(defaults.country).toBe('us');
    expect(defaults.interests).toEqual(['general']);
    expect(defaults.onboardingCompleted).toBe(false);
    expect(new Date(defaults.updatedAt).toString()).not.toBe('Invalid Date');
  });

  it('coerces invalid values and dedupes interests', () => {
    const normalized = normalizeUserPreferencesInput({
      country: 'zz',
      interests: ['technology', 'technology', 'sports', 'invalid-entry'],
      onboardingCompleted: true,
      updatedAt: '2026-02-20T09:00:00Z',
    });

    expect(normalized.country).toBe('us');
    expect(normalized.interests).toEqual(['technology', 'sports']);
    expect(normalized.onboardingCompleted).toBe(true);
    expect(normalized.updatedAt).toBe('2026-02-20T09:00:00.000Z');
  });

  it('falls back to default interest when the list is empty', () => {
    const normalized = normalizeUserPreferencesInput({
      country: 'ca',
      interests: [],
      onboardingCompleted: true,
    });

    expect(normalized.country).toBe('ca');
    expect(normalized.interests).toEqual(['general']);
  });
});
