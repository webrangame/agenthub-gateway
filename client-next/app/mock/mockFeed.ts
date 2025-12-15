export type MockFeedItem =
  | {
      id: string;
      card_type: 'weather';
      priority: string;
      data: {
        location: string;
        temp: string;
        condition: string;
        description?: string;
      };
    }
  | {
      id: string;
      card_type: 'safe_alert';
      priority: string;
      data: {
        message: string;
        level: 'warning' | 'danger' | 'info';
      };
    }
  | {
      id: string;
      card_type: 'cultural_tip';
      priority: string;
      data: {
        title: string;
        video_url: string;
      };
    }
  | {
      id: string;
      card_type: 'article';
      priority: string;
      data: {
        title: string;
        summary: string;
        source: string;
        imageUrl?: string;
        videoUrl?: string;
        url?: string;
        category?: 'Safety' | 'Weather' | 'Culture' | 'Tips' | 'Report';
        colorTheme?: 'blue' | 'red' | 'green' | 'purple' | 'default';
        timestamp?: string;
      };
    }
  | {
      id: string;
      card_type: 'log';
      priority: string;
      data: { summary: string };
    }
  | {
      id: string;
      // Keep open-ended to test fallback UI paths.
      card_type: string;
      priority: string;
      data: Record<string, unknown>;
    };

const nowIso = () => new Date().toISOString();

export const MOCK_FEED_BASE: MockFeedItem[] = [
  {
    id: 'mock-weather-1',
    card_type: 'weather',
    priority: 'high',
    data: {
      location: 'Tokyo',
      temp: '18°C',
      condition: 'Clear',
      description: 'Dry evening. Light jacket recommended after sunset.',
    },
  },
  {
    id: 'mock-alert-danger-1',
    card_type: 'safe_alert',
    priority: 'high',
    data: {
      level: 'danger',
      message:
        'Avoid the nightlife district after midnight due to recent pickpocketing reports.\nStay in well-lit streets and keep valuables secured.',
    },
  },
  {
    id: 'mock-alert-warning-1',
    card_type: 'safe_alert',
    priority: 'medium',
    data: {
      level: 'warning',
      message: 'Transit disruption expected tomorrow morning (08:00–10:00). Allow extra time.',
    },
  },
  {
    id: 'mock-alert-info-1',
    card_type: 'safe_alert',
    priority: 'low',
    data: {
      level: 'info',
      message: 'Tap-to-pay supported widely. Keep a backup card/cash for small shops.',
    },
  },
  {
    id: 'mock-video-1',
    card_type: 'cultural_tip',
    priority: 'medium',
    data: {
      title: 'Cultural Tip: How to use public transport politely',
      video_url: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
    },
  },
  {
    id: 'mock-article-1',
    card_type: 'article',
    priority: 'medium',
    data: {
      title: 'Local Weather Outlook: Weekend Warm-Up',
      summary:
        'Temperatures trend warmer over the weekend with low precipitation risk.\nConsider planning outdoor activities for late morning.',
      source: 'FastGraph Digest',
      imageUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=60',
      url: 'https://example.com/article/weather-outlook',
      category: 'Weather',
      colorTheme: 'blue',
      timestamp: nowIso(),
    },
  },
  {
    id: 'mock-article-2',
    card_type: 'article',
    priority: 'low',
    data: {
      title: 'Street Food Safety: Quick Checklist',
      summary:
        'Choose stalls with high turnover and visible food handling hygiene.\nAvoid raw items if you have a sensitive stomach.',
      source: 'Trip Guardian',
      url: 'https://example.com/article/street-food-safety',
      category: 'Safety',
      colorTheme: 'red',
      timestamp: nowIso(),
    },
  },
  {
    id: 'mock-log-1',
    card_type: 'log',
    priority: 'debug',
    data: { summary: 'mock: initial feed loaded (toggle Debug to see logs)' },
  },
  {
    id: 'mock-unknown-1',
    card_type: 'map_coord',
    priority: 'medium',
    data: { lat: 35.6762, lng: 139.6503, label: 'Tokyo (example)' },
  },
];

export function buildMockFeed(tick: number): MockFeedItem[] {
  const base = [...MOCK_FEED_BASE];

  // Change weather each tick to show dynamic updates.
  const weatherIdx = base.findIndex((x) => x.card_type === 'weather');
  if (weatherIdx >= 0) {
    const isEven = tick % 2 === 0;
    const weather = base[weatherIdx] as Extract<MockFeedItem, { card_type: 'weather' }>;
    base[weatherIdx] = {
      ...weather,
      data: {
        ...weather.data,
        condition: isEven ? 'Clear' : 'Light rain',
        temp: isEven ? '18°C' : '16°C',
        description: isEven
          ? 'Dry evening. Light jacket recommended after sunset.'
          : 'Intermittent showers. Carry a compact umbrella.',
      },
    };
  }

  // Append a log entry to demonstrate list growth + motion (visible when Debug is on).
  base.push({
    id: `mock-log-${tick + 2}`,
    card_type: 'log',
    priority: 'debug',
    data: { summary: `mock tick=${tick} @ ${new Date().toLocaleTimeString()}` },
  });

  return base;
}




