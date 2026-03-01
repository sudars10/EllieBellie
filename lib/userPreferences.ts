import AsyncStorage from '@react-native-async-storage/async-storage';

export const COUNTRY_OPTIONS = [
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'in', label: 'India' },
] as const;

export const INTEREST_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'health', label: 'Health' },
  { value: 'science', label: 'Science' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
] as const;

export type SupportedCountry = (typeof COUNTRY_OPTIONS)[number]['value'];
export type InterestCategory = (typeof INTEREST_OPTIONS)[number]['value'];

export interface UserPreferences {
  country: SupportedCountry;
  interests: InterestCategory[];
  onboardingCompleted: boolean;
  updatedAt: string;
}

export interface UserPreferencesInput {
  country?: string;
  interests?: string[];
  onboardingCompleted?: boolean;
  updatedAt?: string;
}

export const USER_PREFERENCES_STORAGE_KEY = 'elliebellie.preferences.v1';

const DEFAULT_COUNTRY: SupportedCountry = 'us';
const DEFAULT_INTERESTS: InterestCategory[] = ['general'];

const SUPPORTED_COUNTRY_SET = new Set<string>(COUNTRY_OPTIONS.map((option) => option.value));
const INTEREST_CATEGORY_SET = new Set<string>(INTEREST_OPTIONS.map((option) => option.value));

const coerceCountry = (value: string | undefined): SupportedCountry => {
  if (!value) return DEFAULT_COUNTRY;
  if (SUPPORTED_COUNTRY_SET.has(value)) return value as SupportedCountry;
  return DEFAULT_COUNTRY;
};

const coerceInterests = (values: string[] | undefined): InterestCategory[] => {
  if (!Array.isArray(values)) {
    return [...DEFAULT_INTERESTS];
  }

  const deduped: InterestCategory[] = [];
  values.forEach((value) => {
    if (!INTEREST_CATEGORY_SET.has(value)) return;
    const interest = value as InterestCategory;
    if (!deduped.includes(interest)) {
      deduped.push(interest);
    }
  });

  if (!deduped.length) {
    return [...DEFAULT_INTERESTS];
  }

  return deduped;
};

const coerceTimestamp = (value: string | undefined): string => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

export const normalizeUserPreferencesInput = (input: UserPreferencesInput = {}): UserPreferences => {
  return {
    country: coerceCountry(input.country),
    interests: coerceInterests(input.interests),
    onboardingCompleted: Boolean(input.onboardingCompleted),
    updatedAt: coerceTimestamp(input.updatedAt),
  };
};

export const getDefaultUserPreferences = (): UserPreferences =>
  normalizeUserPreferencesInput({ onboardingCompleted: false });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const readUserPreferences = async (): Promise<UserPreferences> => {
  const raw = await AsyncStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
  if (!raw) return getDefaultUserPreferences();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return getDefaultUserPreferences();
    }

    const country = typeof parsed.country === 'string' ? parsed.country : undefined;
    const interests = Array.isArray(parsed.interests)
      ? parsed.interests.filter((item): item is string => typeof item === 'string')
      : undefined;
    const onboardingCompleted =
      typeof parsed.onboardingCompleted === 'boolean' ? parsed.onboardingCompleted : undefined;
    const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined;

    return normalizeUserPreferencesInput({
      country,
      interests,
      onboardingCompleted,
      updatedAt,
    });
  } catch {
    return getDefaultUserPreferences();
  }
};

export const writeUserPreferences = async (preferences: UserPreferences): Promise<UserPreferences> => {
  const normalized = normalizeUserPreferencesInput({
    country: preferences.country,
    interests: preferences.interests,
    onboardingCompleted: preferences.onboardingCompleted,
    updatedAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};
