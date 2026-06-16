import prompts from 'prompts';
import open from 'open';
import ora from 'ora';
import pc from 'picocolors';
import { exec } from 'child_process';
import { fetchTopHeadlines, fetchSearch, fetchTopic, TOPICS } from './newsService.js';
import { renderHeader, renderArticleDetail, formatRelativeTime } from './formatter.js';

// Custom error to handle quick redirection to main menu from nested menus
class MainMenuRedirect extends Error {
  constructor() {
    super('Redirect to main menu');
    this.name = 'MainMenuRedirect';
  }
}

// Global interactive configuration state
const state = {
  lang: 'en',
  country: 'US',
  limit: 10
};

/**
 * Utility to clear the terminal screen.
 */
function clearScreen() {
  console.clear();
}

/**
 * Cross-platform clipboard copying using native CLI tools.
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    let command;
    if (process.platform === 'darwin') {
      command = 'pbcopy';
    } else if (process.platform === 'win32') {
      command = 'clip';
    } else {
      command = 'xclip -selection clipboard || xsel --clipboard --input';
    }

    const proc = exec(command, (err) => {
      if (err) {
        reject(new Error('Failed to copy to clipboard. Ensure xclip/xsel is installed on Linux.'));
      } else {
        resolve();
      }
    });

    try {
      proc.stdin.write(text);
      proc.stdin.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Starts the interactive command-line interface.
 * @param {object} initialOptions - Default language, country, and limit overrides
 */
export async function startInteractive(initialOptions = {}) {
  if (initialOptions.lang) state.lang = initialOptions.lang;
  if (initialOptions.country) state.country = initialOptions.country;
  if (initialOptions.limit) state.limit = parseInt(initialOptions.limit, 10) || state.limit;

  await mainMenuLoop();
}

/**
 * Main dashboard loop.
 */
async function mainMenuLoop() {
  while (true) {
    clearScreen();
    renderHeader('Google News CLI');
    
    // Status line
    console.log(
      `${pc.gray('Settings:')} Country: ${pc.yellow(state.country.toUpperCase())} | ` +
      `Language: ${pc.yellow(state.lang.toLowerCase())} | ` +
      `Limit: ${pc.yellow(state.limit)}\n`
    );

    const response = await prompts({
      type: 'select',
      name: 'action',
      message: 'Select an option:',
      choices: [
        { title: '📰  Top Headlines', value: 'headlines' },
        { title: '📁  Browse by Topic', value: 'topics' },
        { title: '🔍  Search Articles', value: 'search' },
        { title: '⚙️   Settings', value: 'settings' },
        { title: '❌  Exit', value: 'exit' }
      ]
    });

    if (!response.action || response.action === 'exit') {
      console.log(pc.yellow('\nGoodbye! Have a nice day! 👋\n'));
      process.exit(0);
    }

    try {
      if (response.action === 'headlines') {
        await handleHeadlines();
      } else if (response.action === 'topics') {
        await handleTopics();
      } else if (response.action === 'search') {
        await handleSearch();
      } else if (response.action === 'settings') {
        await handleSettings();
      }
    } catch (err) {
      if (err instanceof MainMenuRedirect) {
        // Silently catch the redirect to return to the top-level main menu
        continue;
      }
      
      console.log(pc.red(`\nError: ${err.message}`));
      await prompts({
        type: 'text',
        name: 'pressEnter',
        message: 'Press Enter to continue...'
      });
    }
  }
}

/**
 * Fetches and displays top headlines.
 */
async function handleHeadlines() {
  const spinner = ora('Fetching latest headlines...').start();
  try {
    const articles = await fetchTopHeadlines({
      lang: state.lang,
      country: state.country,
      limit: state.limit
    });
    spinner.succeed(`Fetched ${articles.length} headlines.`);
    await displayArticleList(articles, 'Top Headlines');
  } catch (err) {
    spinner.fail(`Failed to fetch headlines: ${err.message}`);
    throw err;
  }
}

/**
 * Topic browsing menu.
 */
async function handleTopics() {
  const topicChoices = Object.entries(TOPICS).map(([key, name]) => ({
    title: name,
    value: key
  }));
  topicChoices.push({ title: pc.cyan('⬅️  Back to Main Menu'), value: 'back' });

  const response = await prompts({
    type: 'select',
    name: 'topic',
    message: 'Choose a news topic:',
    choices: topicChoices
  });

  if (!response.topic || response.topic === 'back') {
    return;
  }

  const topicName = TOPICS[response.topic];
  const spinner = ora(`Fetching ${topicName} news...`).start();
  try {
    const articles = await fetchTopic({
      topic: response.topic,
      lang: state.lang,
      country: state.country,
      limit: state.limit
    });
    spinner.succeed(`Fetched ${articles.length} articles.`);
    await displayArticleList(articles, `${topicName} News`);
  } catch (err) {
    spinner.fail(`Failed to fetch topic: ${err.message}`);
    throw err;
  }
}

/**
 * Keyword-based news search.
 */
async function handleSearch() {
  const response = await prompts({
    type: 'text',
    name: 'query',
    message: 'Enter search query:',
    validate: val => val.trim().length > 0 ? true : 'Please enter a search query.'
  });

  if (!response.query) return;

  const query = response.query.trim();
  const spinner = ora(`Searching for "${query}"...`).start();
  try {
    const articles = await fetchSearch({
      query,
      lang: state.lang,
      country: state.country,
      limit: state.limit
    });
    spinner.succeed(`Found ${articles.length} articles.`);
    await displayArticleList(articles, `Search: "${query}"`);
  } catch (err) {
    spinner.fail(`Search failed: ${err.message}`);
    throw err;
  }
}

/**
 * Settings configuration menu.
 */
async function handleSettings() {
  clearScreen();
  renderHeader('Settings');

  // Country setting
  const countryResponse = await prompts({
    type: 'select',
    name: 'country',
    message: 'Select Region/Country:',
    choices: [
      { title: '🇺🇸  United States (US)', value: 'US' },
      { title: '🇬🇧  United Kingdom (GB)', value: 'GB' },
      { title: '🇨🇦  Canada (CA)', value: 'CA' },
      { title: '🇦🇺  Australia (AU)', value: 'AU' },
      { title: '🇮🇳  India (IN)', value: 'IN' },
      { title: '🇫🇷  France (FR)', value: 'FR' },
      { title: '🇩🇪  Germany (DE)', value: 'DE' },
      { title: '🇯🇵  Japan (JP)', value: 'JP' },
      { title: '🇧🇷  Brazil (BR)', value: 'BR' },
      { title: '✏️   Enter custom country code...', value: 'custom' }
    ]
  });

  if (!countryResponse.country) return;

  let country = countryResponse.country;
  if (country === 'custom') {
    const customCountry = await prompts({
      type: 'text',
      name: 'code',
      message: 'Enter 2-letter country code (e.g. MX, ZA):',
      validate: val => val.trim().length === 2 ? true : 'Country code must be exactly 2 letters.'
    });
    if (!customCountry.code) return;
    country = customCountry.code.toUpperCase();
  }

  // Language setting
  const langResponse = await prompts({
    type: 'select',
    name: 'lang',
    message: 'Select Language:',
    choices: [
      { title: '🇺🇸  English (en)', value: 'en' },
      { title: '🇫🇷  French (fr)', value: 'fr' },
      { title: '🇩🇪  German (de)', value: 'de' },
      { title: '🇯🇵  Japanese (ja)', value: 'ja' },
      { title: '🇧🇷  Portuguese (pt)', value: 'pt' },
      { title: '🇮🇳  Hindi (hi)', value: 'hi' },
      { title: '🇪🇸  Spanish (es)', value: 'es' },
      { title: '✏️   Enter custom language code...', value: 'custom' }
    ]
  });

  if (!langResponse.lang) return;

  let lang = langResponse.lang;
  if (lang === 'custom') {
    const customLang = await prompts({
      type: 'text',
      name: 'code',
      message: 'Enter 2-letter language code (e.g. es, it):',
      validate: val => val.trim().length === 2 ? true : 'Language code must be exactly 2 letters.'
    });
    if (!customLang.code) return;
    lang = customLang.code.toLowerCase();
  }

  // Articles Limit setting
  const limitResponse = await prompts({
    type: 'number',
    name: 'limit',
    message: 'Articles to display per list (5-50):',
    initial: state.limit,
    min: 5,
    max: 50
  });

  if (limitResponse.limit === undefined) return;

  // Save back to state
  state.country = country;
  state.lang = lang;
  state.limit = limitResponse.limit;

  console.log(pc.green('\nSettings updated successfully!'));
  await prompts({
    type: 'text',
    name: 'pressEnter',
    message: 'Press Enter to return to main menu...'
  });
}

/**
 * Renders the article list in a select prompt.
 */
async function displayArticleList(articles, categoryTitle) {
  if (articles.length === 0) {
    console.log(pc.yellow('\nNo articles found.'));
    await prompts({
      type: 'text',
      name: 'pressEnter',
      message: 'Press Enter to return to main menu...'
    });
    return;
  }

  while (true) {
    clearScreen();
    renderHeader(categoryTitle);

    const choices = articles.map((art, index) => {
      const timeStr = formatRelativeTime(art.pubDate);
      const title = `${pc.yellow(`[${index + 1}]`)} ${pc.bold(art.title)} ${pc.green(`[${art.source}]`)} ${pc.gray(`(${timeStr})`)}`;
      return {
        title,
        value: index
      };
    });

    choices.push({ title: pc.cyan('⬅️  Back to Main Menu'), value: 'back' });

    const response = await prompts({
      type: 'select',
      name: 'articleIndex',
      message: 'Select an article to view details:',
      choices,
      maxPerPage: 12
    });

    if (response.articleIndex === undefined || response.articleIndex === 'back') {
      return;
    }

    await displayArticleDetail(articles[response.articleIndex]);
  }
}

/**
 * Displays article details and sub-menu actions.
 */
async function displayArticleDetail(article) {
  while (true) {
    clearScreen();
    renderHeader('Article Viewer');
    
    renderArticleDetail(article);

    const response = await prompts({
      type: 'select',
      name: 'action',
      message: 'Select an action:',
      choices: [
        { title: '🔗  Open in Web Browser', value: 'open' },
        { title: '📋  Copy Link to Clipboard', value: 'copy' },
        { title: '⬅️  Back to List', value: 'back' },
        { title: '🏠  Back to Main Menu', value: 'main' }
      ]
    });

    if (!response.action || response.action === 'back') {
      return;
    }

    if (response.action === 'main') {
      throw new MainMenuRedirect();
    }

    if (response.action === 'open') {
      const spinner = ora('Opening URL in browser...').start();
      try {
        await open(article.link);
        spinner.succeed('Article opened in browser.');
      } catch (err) {
        spinner.fail(`Failed to open browser: ${err.message}`);
      }
      await prompts({
        type: 'text',
        name: 'pressEnter',
        message: 'Press Enter to continue...'
      });
    } else if (response.action === 'copy') {
      const spinner = ora('Copying to clipboard...').start();
      try {
        await copyToClipboard(article.link);
        spinner.succeed('Link copied to clipboard!');
      } catch (err) {
        spinner.fail(err.message);
      }
      await prompts({
        type: 'text',
        name: 'pressEnter',
        message: 'Press Enter to continue...'
      });
    }
  }
}
