import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEventName =
  | 'feed_loaded'
  | 'headline_tap'
  | 'bookmark_added'
  | 'bookmark_removed'
  | 'saved_opened'
  | 'feed_load_failed';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  timestamp: string;
  payload: Record<string, string | number | boolean | null>;
}

export interface AnalyticsSink {
  track(event: AnalyticsEvent): Promise<void> | void;
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

export class ConsoleAnalyticsSink implements AnalyticsSink {
  track(event: AnalyticsEvent) {
    console.log(`[analytics] ${event.name}`, event.payload);
  }
}

export class AsyncStorageBufferSink implements AnalyticsSink {
  async track(event: AnalyticsEvent) {
    const events = await readEvents();
    events.push(event);
    const trimmed = events.slice(-MAX_EVENTS);
    await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export class AnalyticsClient {
  private sinks: AnalyticsSink[];

  constructor(sinks: AnalyticsSink[]) {
    this.sinks = sinks;
  }

  setSinks(nextSinks: AnalyticsSink[]) {
    this.sinks = nextSinks;
  }

  async track(name: AnalyticsEventName, payload: Record<string, string | number | boolean | null> = {}) {
    const event: AnalyticsEvent = {
      name,
      payload,
      timestamp: new Date().toISOString(),
    };

    await Promise.all(
      this.sinks.map(async (sink) => {
        try {
          await sink.track(event);
        } catch {
          // Analytics must never break product flows.
        }
      })
    );
  }

  trackAsync(name: AnalyticsEventName, payload: Record<string, string | number | boolean | null> = {}) {
    void this.track(name, payload);
  }
}

const analyticsClient = new AnalyticsClient([new ConsoleAnalyticsSink(), new AsyncStorageBufferSink()]);

export const trackEvent = (name: AnalyticsEventName, payload: Record<string, string | number | boolean | null> = {}) =>
  analyticsClient.track(name, payload);

export const trackEventAsync = (
  name: AnalyticsEventName,
  payload: Record<string, string | number | boolean | null> = {}
) => {
  analyticsClient.trackAsync(name, payload);
};

export const setAnalyticsSinks = (sinks: AnalyticsSink[]) => {
  analyticsClient.setSinks(sinks);
};
