#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import pc from 'picocolors';
import { fetchTopHeadlines, fetchSearch, fetchTopic, TOPICS } from './newsService.js';
import { renderArticleLine } from './formatter.js';
import { startInteractive } from './interactive.js';

const program = new Command();

program
  .name('gnews')
  .description('Fetch and display Google News headlines in the terminal')
  .version('1.0.0')
  .option('-t, --top', 'Fetch top headlines')
  .option('-s, --search <query>', 'Search news articles for a keyword')
  .option('-o, --topic <topic>', 'Fetch news for a specific topic (e.g. WORLD, TECHNOLOGY, BUSINESS)')
  .option('-l, --limit <number>', 'Number of articles to fetch', '10')
  .option('-g, --lang <lang>', 'Language code (e.g. en, fr)', 'en')
  .option('-c, --country <country>', 'Country code (e.g. US, GB)', 'US')
  .option('-i, --interactive', 'Start interactive mode (default if no direct query flags are provided)');

program.parse(process.argv);

const options = program.opts();

async function runDirectMode() {
  const limit = parseInt(options.limit, 10) || 10;
  const lang = options.lang;
  const country = options.country;
  
  if (options.top) {
    const spinner = ora('Fetching top headlines...').start();
    try {
      const articles = await fetchTopHeadlines({ lang, country, limit });
      spinner.succeed(`Latest Headlines (${country.toUpperCase()} - ${lang.toLowerCase()}):\n`);
      printArticles(articles);
    } catch (err) {
      spinner.fail(`Failed to fetch headlines: ${err.message}`);
      process.exit(1);
    }
  } else if (options.search) {
    const spinner = ora(`Searching for "${options.search}"...`).start();
    try {
      const articles = await fetchSearch({ query: options.search, lang, country, limit });
      spinner.succeed(`Search results for "${options.search}":\n`);
      printArticles(articles);
    } catch (err) {
      spinner.fail(`Search failed: ${err.message}`);
      process.exit(1);
    }
  } else if (options.topic) {
    const topicUpper = options.topic.toUpperCase();
    if (!TOPICS[topicUpper]) {
      console.log(pc.red(`Error: Unsupported topic "${options.topic}".`));
      console.log(`Supported topics are: ${pc.yellow(Object.keys(TOPICS).join(', '))}`);
      process.exit(1);
    }
    const spinner = ora(`Fetching ${TOPICS[topicUpper]} news...`).start();
    try {
      const articles = await fetchTopic({ topic: topicUpper, lang, country, limit });
      spinner.succeed(`${TOPICS[topicUpper]} Headlines:\n`);
      printArticles(articles);
    } catch (err) {
      spinner.fail(`Failed to fetch topic news: ${err.message}`);
      process.exit(1);
    }
  }
}

function printArticles(articles) {
  if (articles.length === 0) {
    console.log(pc.yellow('No articles found.'));
    return;
  }
  articles.forEach((art, index) => {
    console.log(renderArticleLine(index + 1, art));
    console.log(pc.dim(art.link));
    console.log('');
  });
}

// Check if direct execution options (top, search, or topic) are specified
const hasDirectCommand = options.top || options.search || options.topic;

if (hasDirectCommand && !options.interactive) {
  runDirectMode();
} else {
  // Default to interactive mode
  startInteractive({
    lang: options.lang,
    country: options.country,
    limit: options.limit
  }).catch(err => {
    console.error(pc.red(`Interactive mode error: ${err.message}`));
    process.exit(1);
  });
}
