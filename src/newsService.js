import Parser from 'rss-parser';

const parser = new Parser();

/**
 * Builds the query parameter string for language and country selection.
 * @param {string} lang - Language code (e.g., 'en')
 * @param {string} country - Country code (e.g., 'US')
 * @returns {string} - Formatted query params
 */
function getQueryParams(lang = 'en', country = 'US') {
  const cleanLang = lang.toLowerCase();
  const cleanCountry = country.toUpperCase();
  // Standard format Google News expects: hl=en-US&gl=US&ceid=US:en
  const hl = `${cleanLang}-${cleanCountry}`;
  return `hl=${hl}&gl=${cleanCountry}&ceid=${cleanCountry}:${cleanLang}`;
}

/**
 * Extracts the news source from the RSS item or from the title string.
 * @param {object} item - RSS item object
 * @returns {string} - The source name
 */
function getSource(item) {
  if (item.source && item.source._) {
    return item.source._;
  }
  
  // Fallback: Parse from title which typically ends with " - Source Name"
  const title = item.title || '';
  const match = title.match(/(.*) - ([^-]+)$/);
  if (match) {
    return match[2].trim();
  }
  return 'Google News';
}

/**
 * Cleans the title by removing the source suffix " - Source Name"
 * @param {string} title - The raw article title
 * @returns {string} - Cleaned article title
 */
function getCleanTitle(title) {
  if (!title) return '';
  const match = title.match(/(.*) - ([^-]+)$/);
  if (match) {
    return match[1].trim();
  }
  return title;
}

/**
 * Fetches and parses an RSS feed URL from Google News.
 * @param {string} url - The Google News RSS URL
 * @param {number} limit - Maximum number of items to return
 * @returns {Promise<Array>} - List of articles
 */
async function fetchFeed(url, limit = 10) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    
    return items.slice(0, limit).map(item => ({
      title: getCleanTitle(item.title),
      rawTitle: item.title,
      link: item.link,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: getSource(item),
      snippet: item.contentSnippet || item.content || ''
    }));
  } catch (error) {
    throw new Error(`Failed to fetch or parse news: ${error.message}`);
  }
}

/**
 * Fetches the top headlines from Google News.
 */
export async function fetchTopHeadlines({ lang = 'en', country = 'US', limit = 10 } = {}) {
  const params = getQueryParams(lang, country);
  const url = `https://news.google.com/rss?${params}`;
  return fetchFeed(url, limit);
}

/**
 * Searches articles in Google News.
 */
export async function fetchSearch({ query, lang = 'en', country = 'US', limit = 10 }) {
  if (!query) {
    throw new Error('Search query is required.');
  }
  const params = getQueryParams(lang, country);
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${params}`;
  return fetchFeed(url, limit);
}

/**
 * Fetches articles for a specific Google News topic section.
 * Supported topics include: WORLD, NATION, BUSINESS, TECHNOLOGY, ENTERTAINMENT, SPORTS, SCIENCE, HEALTH
 */
export async function fetchTopic({ topic, lang = 'en', country = 'US', limit = 10 }) {
  if (!topic) {
    throw new Error('Topic is required.');
  }
  const params = getQueryParams(lang, country);
  const formattedTopic = topic.toUpperCase();
  const url = `https://news.google.com/rss/headlines/section/topic/${formattedTopic}?${params}`;
  return fetchFeed(url, limit);
}

export const TOPICS = {
  WORLD: 'World',
  NATION: 'Nation/Local',
  BUSINESS: 'Business',
  TECHNOLOGY: 'Technology',
  ENTERTAINMENT: 'Entertainment',
  SPORTS: 'Sports',
  SCIENCE: 'Science',
  HEALTH: 'Health'
};
