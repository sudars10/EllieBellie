import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEventName =
  | 'feed_loaded'
  | 'headline_tap'
  | 'bookmark_added'
  | 'bookmark_removed'
  | 'saved_opened';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  timestamp: string;
  payload: Record<string, string | number | boolean | null>;
}

const ANALYTICS_STORAGE_KEY = 'elliebellie.analytics.v1';
const MAX_EVENTS = 200;

const readEvents = async (): Promise<AnalyticsEvent[]> => {
  const raw = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((event) => event && typeof event === 'object') as AnalyticsEvent[];
    }
  } catch {
    return [];
  }

  return [];
};

export const trackEvent = async (
  name: AnalyticsEventName,
  payload: Record<string, string | number | boolean | null> = {}
) => {
  const event: AnalyticsEvent = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  console.log(`[analytics] ${name}`, payload);

  try {
    const events = await readEvents();
    events.push(event);
    const trimmed = events.slice(-MAX_EVENTS);
    await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Avoid impacting UX when local analytics storage fails.
  }
};

export const trackEventAsync = (
  name: AnalyticsEventName,
  payload: Record<string, string | number | boolean | null> = {}
) => {
  void trackEvent(name, payload);
};
