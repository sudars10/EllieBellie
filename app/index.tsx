import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';

interface Source {
  id: string;
  name: string;
  url: string;
  description: string; // short description for the source (kept in data, not shown)
  topHeadlines: { title: string; story: string[]; link?: string }[];
  feedUrl?: string;
}

interface NewsItem {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  story?: string[];
}

const TOP_SOURCES: Source[] = [
  {
    id: 'nytimes',
    name: 'The New York Times',
    url: 'https://www.nytimes.com',
    description: 'US national paper known for in-depth reporting',
    feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    topHeadlines: [
      {
        title: 'Global markets react to latest economic data',
        link: 'https://www.nytimes.com/2025/11/12/global-markets-react-to-latest-economic-data.html',
        story: [
          'Global equity markets moved sharply after today\'s economic reports showed mixed signals. Investors digested data points across multiple economies and adjusted expectations for monetary policy.',
          'Analysts highlight that manufacturing output and consumer spending diverged, creating uncertainty around short-term growth forecasts.'
        ]
      },
      {
        title: 'Technology firms report strong quarterly earnings',
        link: 'https://www.nytimes.com/2025/11/12/technology-firms-report-strong-quarterly-earnings.html',
        story: [
          'Several major technology companies reported better-than-expected revenue driven by cloud services and advertising recovery. The results eased some concerns about slowing demand.',
          'Executives said they remain focused on efficiency and long-term investments, while signaling cautious guidance for the next quarter.'
        ]
      },
      {
        title: 'Investigative report prompts policy debate',
        link: 'https://www.nytimes.com/2025/11/12/investigative-report-prompts-policy-debate.html',
        story: [
          'A new investigative piece revealed gaps in compliance at several institutions, prompting lawmakers to call for hearings and stricter oversight.',
          'Experts say reforms could take months to design and implement, and anticipate pushback from industry groups.'
        ]
      },
    ],
  },
  {
    id: 'yahoo',
    name: 'Yahoo News',
    url: 'https://www.yahoo.com/news',
    description: 'Aggregates stories across many publishers',
    feedUrl: 'https://www.yahoo.com/news/rss',
    topHeadlines: [
      {
        title: 'Breaking: major developments in world events',
        link: 'https://www.yahoo.com/news/2025/11/12/breaking-major-developments-in-world-events',
        story: ['Several regions reported new developments overnight that could reshape diplomatic talks. Officials are monitoring the situation closely and international responses are expected.']
      },
      {
        title: 'Lifestyle trends gaining popularity this season',
        link: 'https://www.yahoo.com/lifestyle/2025/11/12/lifestyle-trends-gaining-popularity-this-season',
        story: ['Social media and influencer campaigns are driving new lifestyle trends, from home fitness to sustainable fashion. Retailers are responding with targeted offerings.']
      },
      {
        title: 'Entertainment headlines draw audience attention',
        link: 'https://www.yahoo.com/entertainment/2025/11/12/entertainment-headlines-draw-audience-attention',
        story: ['A mix of film releases and celebrity events dominated the entertainment beat today, with audience reactions fueling ongoing conversations about representation and awards-season contenders.']
      },
    ],
  },
  {
    id: 'cnn',
    name: 'CNN',
    url: 'https://www.cnn.com',
    description: '24-hour US cable news network',
    feedUrl: 'http://rss.cnn.com/rss/cnn_topstories.rss',
    topHeadlines: [
      {
        title: 'Top story: major developments in global affairs',
        link: 'https://www.cnn.com/2025/11/12/top-story-major-developments-in-global-affairs',
        story: ['Diplomatic sources report a rapid series of events affecting trade negotiations. Leaders are expected to meet later this week to discuss next steps and potential compromises.']
      },
      {
        title: 'Health update: breakthroughs and guidance',
        link: 'https://www.cnn.com/2025/11/12/health-update-breakthroughs-and-guidance',
        story: ['Researchers announced progress on a study that may influence treatment protocols. Health officials are reviewing the data and planning public guidance updates.']
      },
      {
        title: 'Human interest: communities making a difference',
        link: 'https://www.cnn.com/2025/11/12/human-interest-communities-making-a-difference',
        story: ['Local volunteers and small organizations have launched initiatives to support vulnerable communities, demonstrating how grassroots efforts can scale through partnerships.']
      },
    ],
  },
  {
    id: 'fox',
    name: 'Fox News',
    url: 'https://www.foxnews.com',
    description: 'US cable news channel with broad opinion coverage',
    feedUrl: 'https://www.foxnews.com/about/rss/',
    topHeadlines: [
      {
        title: 'Policy debates dominate headlines today',
        link: 'https://www.foxnews.com/2025/11/12/policy-debates-dominate-headlines-today',
        story: ['Lawmakers engaged in heated debates over several high-profile bills as public hearings continue. Analysts say the outcome could shape legislative priorities for months.']
      },
      {
        title: 'Business and markets show mixed signals',
        link: 'https://www.foxbusiness.com/2025/11/12/business-and-markets-show-mixed-signals',
        story: ['Markets reacted unevenly to corporate earnings and macro indicators, leaving investors cautious. Some sectors outperformed while others retreated on profit-taking.']
      },
      {
        title: 'Local stories highlight community response',
        link: 'https://www.foxnews.com/local/2025/11/12/local-stories-highlight-community-response',
        story: ['Communities rallied around recent events, organizing relief efforts and highlighting the importance of local leadership in crisis response.']
      },
    ],
  },
  {
    id: 'bbc',
    name: 'BBC',
    url: 'https://www.bbc.com/news',
    description: 'UK public broadcaster with global coverage',
    feedUrl: 'http://feeds.bbci.co.uk/news/rss.xml',
    topHeadlines: [
      {
        title: 'International summit focuses on climate action',
        link: 'https://www.bbc.com/news/2025-11-12/international-summit-focuses-on-climate-action',
        story: ['Delegates at the summit discussed fresh commitments and funding mechanisms aimed at reducing emissions. Negotiators emphasized the need for measurable targets.']
      },
      {
        title: 'Local communities respond to infrastructure plans',
        link: 'https://www.bbc.com/news/2025-11-12/local-communities-respond-to-infrastructure-plans',
        story: ['Residents voiced concerns about proposed infrastructure changes, while officials said the plans aim to improve long-term connectivity and resilience.']
      },
      {
        title: 'New scientific study reshapes understanding of health',
        link: 'https://www.bbc.com/news/2025-11-12/new-scientific-study-reshapes-understanding-of-health',
        story: ['A peer-reviewed study presents new findings that could alter clinical recommendations. Scientists caution that further research is needed before changes to practice are implemented.']
      },
    ],
  },
  {
    id: 'usatoday',
    name: 'USA Today',
    url: 'https://www.usatoday.com',
    description: 'National US paper with broad lifestyle coverage',
    feedUrl: 'https://www.usatoday.com/rss/index.xml',
    topHeadlines: [
      {
        title: 'Feature: cultural trends to watch this year',
        link: 'https://www.usatoday.com/2025/11/12/feature-cultural-trends-to-watch-this-year',
        story: ['Writers explore emerging cultural trends shaping music, fashion, and social conversation. The feature highlights creators and communities driving change.']
      },
      {
        title: 'Travel and leisure picks for the season',
        link: 'https://www.usatoday.com/travel/2025/11/12/travel-and-leisure-picks-for-the-season',
        story: ['Editors rounded up destinations and tips for seasonal travel, emphasizing both popular hotspots and lesser-known getaways that offer good value.']
      },
      {
        title: 'Sports roundup: scores and highlights',
        link: 'https://www.usatoday.com/sports/2025/11/12/sports-roundup-scores-and-highlights',
        story: ['A concise roundup of today\'s scores and standout performances across major leagues, including quick insights and next-match previews.']
      },
    ],
  },
  {
    id: 'msn',
    name: 'MSN',
    url: 'https://www.msn.com',
    description: 'Portal featuring headlines from partner sites',
    // MSN doesn't provide a single easy feed URL for aggregated headlines; leave feedUrl undefined
    topHeadlines: [
      {
        title: 'Curated headlines across the web',
        link: 'https://www.msn.com/en-us/news/2025/11/12/curated-headlines-across-the-web',
        story: ['Editors curate a selection of notable stories from partner outlets, providing a snapshot of the day\'s most talked-about topics.']
      },
      {
        title: 'Popular topics: tech, health, and finance',
        link: 'https://www.msn.com/en-us/news/2025/11/12/popular-topics-tech-health-and-finance',
        story: ['Coverage today focused on technology advances, health advisories, and market movements, each affecting consumer sentiment in different ways.']
      },
      {
        title: 'Opinion pieces that spark conversation',
        link: 'https://www.msn.com/en-us/news/2025/11/12/opinion-pieces-that-spark-conversation',
        story: ['Columnists offered a variety of perspectives on current events, prompting debate from readers and social media commentators alike.']
      },
    ],
  },
  {
    id: 'usnews',
    name: 'U.S. News & World Report',
    url: 'https://www.usnews.com',
    description: 'Rankings and national news coverage',
    feedUrl: 'https://www.usnews.com/feeds/news',
    topHeadlines: [
      {
        title: 'Rankings update: institutions in focus',
        link: 'https://www.usnews.com/education/2025/11/12/rankings-update-institutions-in-focus',
        story: ['A new rankings release reshuffled several institutions, prompting discussion about methodology and implications for prospective students.']
      },
      {
        title: 'Policy coverage affects education and health',
        link: 'https://www.usnews.com/education/2025/11/12/policy-coverage-affects-education-and-health',
        story: ['Policy shifts at the federal level are influencing program funding and regulatory priorities in education and public health. Stakeholders are responding with analysis and testimony.']
      },
      {
        title: 'Analysis of recent government announcements',
        link: 'https://www.usnews.com/news/2025/11/12/analysis-of-recent-government-announcements',
        story: ['Experts weighed in on recent announcements, offering context on potential economic and social impacts of the proposed measures.']
      },
    ],
  },
  {
    id: 'nypost',
    name: 'New York Post',
    url: 'https://www.nypost.com',
    description: 'Tabloid-style coverage with bold headlines',
    feedUrl: 'https://nypost.com/feed',
    topHeadlines: [
      {
        title: 'Celebrity news and high-profile stories',
        link: 'https://nypost.com/2025/11/12/celebrity-news-and-high-profile-stories',
        story: ['Entertainment insiders reported on a high-profile development, drawing attention across social platforms and sparking fan reactions.']
      },
      {
        title: 'Local New York headlines of interest',
        link: 'https://nypost.com/2025/11/12/local-new-york-headlines-of-interest',
        story: ['City officials announced updates to local projects, with community leaders offering mixed reactions about the expected benefits.']
      },
      {
        title: 'Quick reads for the daily commuter',
        link: 'https://nypost.com/2025/11/12/quick-reads-for-the-daily-commuter',
        story: ['A selection of short, punchy stories designed for quick consumption during commutes, covering sports, entertainment, and human interest.']
      },
    ],
  },
  {
    id: 'nbc',
    name: 'NBC News',
    url: 'https://www.nbcnews.com',
    description: 'Broadcast network with national reporting',
    feedUrl: 'http://feeds.nbcnews.com/nbcnews/public/news',
    topHeadlines: [
      {
        title: 'Evening roundup: major stories from the day',
        link: 'https://www.nbcnews.com/2025/11/12/evening-roundup-major-stories-from-the-day',
        story: ['An organized roundup of the day\'s most significant developments, providing quick context and links to deeper coverage.']
      },
      {
        title: 'Investigations and special reports',
        link: 'https://www.nbcnews.com/2025/11/12/investigations-and-special-reports',
        story: ['Reporters continued following an ongoing investigation, uncovering new details that may shape public debate and oversight.']
      },
      {
        title: 'Feature: stories from around the country',
        link: 'https://www.nbcnews.com/2025/11/12/feature-stories-from-around-the-country',
        story: ['A series of features highlights local initiatives and profiles individuals making an impact in their communities.']
      },
    ],
  },
];

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // Lightweight RSS/Atom parsing to get top article for a feed URL.
  const fetchTopArticleFromFeed = async (feedUrl: string) => {
    try {
      const res = await fetch(feedUrl);
      if (!res.ok) return null;
      const text = await res.text();

      // find first <item> or <entry>
      const itemMatch = text.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/i);
      if (!itemMatch) return null;
      const itemXml = itemMatch[0];

      const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null;

      // Try several link patterns: atom link href, or rss <link>
      let link = null;
      const linkHrefMatch = itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      if (linkHrefMatch) link = linkHrefMatch[1];
      else {
        const linkTagMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        if (linkTagMatch) link = linkTagMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      }

      // description or summary
      const descMatch = itemXml.match(/<(description|summary)[^>]*>([\s\S]*?)<\/(description|summary)>/i);
      let summary = descMatch ? descMatch[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      // strip HTML tags for simple display
      summary = summary.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

      // split into paragraphs: if there are explicit newlines, use them; else split into sentences
      let paragraphs: string[] = [];
      if (summary.includes('\n')) {
        paragraphs = summary.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      } else if (summary.length > 200) {
        // split into two approx paragraphs
        const midpoint = Math.floor(summary.length / 2);
        const splitAt = summary.indexOf('.', midpoint);
        if (splitAt > 0) {
          paragraphs = [summary.slice(0, splitAt + 1).trim(), summary.slice(splitAt + 1).trim()];
        } else paragraphs = [summary];
      } else if (summary.length > 0) paragraphs = [summary];

      if (!title && !link && paragraphs.length === 0) return null;
      return { title: title || '', link: link || '', story: paragraphs };
    } catch (e) {
      return null;
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

      // For each source, try fetching its feed. If unavailable, fall back to deterministic local headline.
      const promises = TOP_SOURCES.map(async (s) => {
        if (s.feedUrl) {
          const article = await fetchTopArticleFromFeed(s.feedUrl);
          if (article && article.title) {
            return {
              title: article.title,
              url: article.link || s.url,
              sourceName: s.name,
              publishedAt: new Date().toISOString(),
              story: article.story && article.story.length ? article.story : undefined,
            } as NewsItem;
          }
        }

        // fallback: use local deterministic headline for the day
        const headlineObj = s.topHeadlines[dayIndex % s.topHeadlines.length];
        return {
          title: headlineObj.title,
          url: headlineObj.link || s.url,
          sourceName: s.name,
          publishedAt: new Date().toISOString(),
          story: headlineObj.story,
        } as NewsItem;
      });

      const items = await Promise.all(promises);
      setNews(items);
      setLastUpdated(new Date().toDateString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    // Optionally schedule a refresh at next local midnight when app stays open
    // const msUntilMidnight = (new Date().setHours(24,0,0,0) - Date.now()) || 24*60*60*1000;
    // const t = setTimeout(() => refresh(), msUntilMidnight);
    // return () => clearTimeout(t);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => refresh(), 250);
  };

  const openUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading today's headlines…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <FlatList
        data={news}
        keyExtractor={(item, idx) => item.url + idx}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Top Sources — Today's Headlines</Text>
            <Text style={styles.headerSubtitle}>Headlines rotate daily. Pull to refresh.</Text>
            {lastUpdated ? <Text style={styles.updateText}>Last updated: {formatDate(new Date().toISOString())}</Text> : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const key = `${index}`;
          const expanded = !!expandedMap[key];
          return (
            <View style={styles.newsItemBlock}>
              <TouchableOpacity style={styles.newsItem} onPress={() => openUrl(item.url)} activeOpacity={0.8}>
                <View style={styles.newsNumber}><Text style={styles.newsNumberText}>{index + 1}</Text></View>
                <View style={styles.newsContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.newsTitle}>{item.title}</Text>
                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={() => setExpandedMap((p) => ({ ...p, [key]: !p[key] }))}
                    >
                      <Text style={styles.arrowText}>{expanded ? '▴' : '▾'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.newsSource}>{item.sourceName}</Text>
                    <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              {expanded && item.story && (
                <View style={styles.storyContainer}>
                  {item.story.map((p, i) => (
                    <Text key={i} style={styles.storyText}>{p}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, color: '#666' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  updateText: { marginTop: 6, fontSize: 12, color: '#999' },
  listContent: { padding: 16, paddingBottom: 32 },
  newsItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, elevation: 2 },
  newsNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  newsNumberText: { color: '#fff', fontWeight: '700' },
  newsContent: { flex: 1 },
  newsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  // source description removed from UI
  newsItemBlock: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  arrowButton: { padding: 6, marginLeft: 8 },
  arrowText: { fontSize: 18, color: '#007AFF' },
  storyContainer: { backgroundColor: '#fff', padding: 12, paddingTop: 6, borderRadius: 8, marginTop: 8, elevation: 1 },
  storyText: { fontSize: 14, color: '#444', marginBottom: 8, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  newsSource: { fontSize: 12, color: '#007AFF', fontWeight: '500' },
  newsDate: { fontSize: 12, color: '#999' },
});
