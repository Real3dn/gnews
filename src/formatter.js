import pc from 'picocolors';

/**
 * Formats a Date object into a relative time string (e.g., "5m ago", "2h ago", "Yesterday").
 * @param {Date} date - The date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return 'unknown time';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHrs < 24) {
    return `${diffHrs}h ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Draws a stylized box header in the terminal.
 * @param {string} title - Header title text
 */
export function renderHeader(title) {
  const cleanTitle = title.toUpperCase();
  const width = Math.max(cleanTitle.length + 10, 50);
  const border = '═'.repeat(width);
  const padLeft = Math.floor((width - cleanTitle.length) / 2);
  const padRight = width - cleanTitle.length - padLeft;
  
  console.log(pc.cyan(`╔${border}╗`));
  console.log(
    pc.cyan('║') + 
    ' '.repeat(padLeft) + 
    pc.bold(pc.yellow(cleanTitle)) + 
    ' '.repeat(padRight) + 
    pc.cyan('║')
  );
  console.log(pc.cyan(`╚${border}╝`));
  console.log('');
}

/**
 * Returns a styled single-line representation of an article for lists.
 * @param {number} index - Article index (1-based)
 * @param {object} article - Article data
 * @returns {string} - Styled line
 */
export function renderArticleLine(index, article) {
  const indexStr = pc.yellow(`[${index}]`);
  const titleStr = pc.bold(pc.white(article.title));
  const sourceStr = pc.green(`[${article.source}]`);
  const dateStr = pc.gray(`(${formatRelativeTime(article.pubDate)})`);
  
  return `${indexStr} ${titleStr} ${sourceStr} ${dateStr}`;
}

/**
 * Renders a detailed information card for a specific article.
 * @param {object} article - Article data
 */
export function renderArticleDetail(article) {
  const termWidth = process.stdout.columns || 80;
  const cardWidth = Math.max(Math.min(termWidth - 4, 76), 40);
  const border = '─'.repeat(cardWidth);

  console.log(pc.magenta(`┌${border}┐`));
  
  // Title wrapping (8 chars for prefix "TITLE:  ")
  const wrappedTitle = wrapText(article.title, cardWidth - 10);
  wrappedTitle.forEach((line, i) => {
    const styledPrefix = i === 0 ? pc.bold('TITLE:  ') : '        ';
    const padding = ' '.repeat(Math.max(0, cardWidth - 10 - line.length));
    console.log(pc.magenta('│ ') + styledPrefix + pc.bold(pc.white(line)) + padding + pc.magenta(' │'));
  });

  console.log(pc.magenta(`├${border}┤`));
  
  // Source & Date (defensive formatting to prevent negative padding)
  const sourceLimit = cardWidth - 10;
  const safeSource = article.source.length > sourceLimit ? article.source.slice(0, sourceLimit - 3) + '...' : article.source;
  const sourcePadding = ' '.repeat(Math.max(0, cardWidth - 10 - safeSource.length));
  console.log(pc.magenta('│ ') + pc.bold('SOURCE: ') + pc.green(safeSource) + sourcePadding + pc.magenta(' │'));

  const dateStr = article.pubDate.toLocaleString();
  const dateLimit = cardWidth - 10;
  const safeDate = dateStr.length > dateLimit ? dateStr.slice(0, dateLimit - 3) + '...' : dateStr;
  const datePadding = ' '.repeat(Math.max(0, cardWidth - 10 - safeDate.length));
  console.log(pc.magenta('│ ') + pc.bold('DATE:   ') + pc.yellow(safeDate) + datePadding + pc.magenta(' │'));
  
  // Link wrapping (8 chars for prefix "LINK:   ")
  console.log(pc.magenta(`├${border}┤`));
  const wrappedLink = wrapText(article.link, cardWidth - 10);
  wrappedLink.forEach((line, i) => {
    const styledPrefix = i === 0 ? pc.bold('LINK:   ') : '        ';
    const padding = ' '.repeat(Math.max(0, cardWidth - 10 - line.length));
    console.log(pc.magenta('│ ') + styledPrefix + pc.blue(line) + padding + pc.magenta(' │'));
  });

  // Snippet/Content
  if (article.snippet && article.snippet.trim() !== '') {
    console.log(pc.magenta(`├${border}┤`));
    // Remove HTML tags from snippets
    const cleanSnippet = article.snippet.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const wrappedSnippet = wrapText(cleanSnippet, cardWidth - 4);
    wrappedSnippet.forEach(line => {
      const padding = ' '.repeat(Math.max(0, cardWidth - 4 - line.length));
      console.log(pc.magenta('│ ') + ' ' + pc.gray(line) + padding + ' ' + pc.magenta('│'));
    });
  }

  console.log(pc.magenta(`└${border}┘`));
  console.log('');
}

/**
 * Splits text into lines of a maximum length, trying to break at space characters.
 * @param {string} text - The input text
 * @param {number} limit - Max characters per line
 * @returns {Array<string>} - Array of lines
 */
function wrapText(text, limit) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > limit) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      // If a single word is longer than limit, split it
      if (word.length > limit) {
        let remainingWord = word;
        while (remainingWord.length > limit) {
          lines.push(remainingWord.slice(0, limit));
          remainingWord = remainingWord.slice(limit);
        }
        currentLine = remainingWord + ' ';
      } else {
        currentLine = word + ' ';
      }
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}
