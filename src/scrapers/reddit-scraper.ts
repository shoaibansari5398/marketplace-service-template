/**
 * Reddit Intelligence Scraper (Bounty #68)
 * ─────────────────────────────────────────
 * Extracts posts and comments from Reddit using public JSON endpoints.
 * Uses mobile proxy to avoid rate-limiting.
 */

import { proxyFetch } from '../proxy';

// ─── TYPES ──────────────────────────────────────────

export interface RedditPost {
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  createdUtc: number;
  permalink: string;
  url: string;
  isSelf: boolean;
  flair: string | null;
  awards: number;
  over18: boolean;
}

export interface RedditComment {
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  permalink: string;
  depth: number;
  replies: number;
}

export interface RedditSearchResult {
  posts: RedditPost[];
  after: string | null;
  query: string;
  subreddit: string | null;
  sort: string;
}

// ─── REDDIT JSON FETCH HELPER ───────────────────────

const REDDIT_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchRedditJson(url: string): Promise<any> {
  const response = await proxyFetch(url, {
    headers: REDDIT_HEADERS,
    maxRetries: 2,
    timeoutMs: 30_000,
  });

  if (!response.ok) {
    throw new Error(`Reddit fetch failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  // Reddit sometimes returns HTML (login page) instead of JSON
  if (text.startsWith('<!') || text.startsWith('<html')) {
    throw new Error('Reddit returned HTML instead of JSON (possible rate-limit or redirect)');
  }

  return JSON.parse(text);
}

// ─── POST PARSER ────────────────────────────────────

function parsePost(data: any): RedditPost {
  const d = data.data || data;
  return {
    title: d.title || '',
    selftext: (d.selftext || '').substring(0, 2000),
    author: d.author || '[deleted]',
    subreddit: d.subreddit || '',
    score: d.score ?? 0,
    upvoteRatio: d.upvote_ratio ?? 0,
    numComments: d.num_comments ?? 0,
    createdUtc: d.created_utc ?? 0,
    permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : '',
    url: d.url || '',
    isSelf: d.is_self ?? true,
    flair: d.link_flair_text || null,
    awards: d.total_awards_received ?? 0,
    over18: d.over_18 ?? false,
  };
}

// ─── COMMENT PARSER ─────────────────────────────────

function parseComment(data: any, depth: number = 0): RedditComment {
  const d = data.data || data;
  const repliesData = d.replies?.data?.children;
  const replyCount = Array.isArray(repliesData)
    ? repliesData.filter((r: any) => r.kind === 't1').length
    : 0;

  return {
    author: d.author || '[deleted]',
    body: (d.body || '').substring(0, 1000),
    score: d.score ?? 0,
    createdUtc: d.created_utc ?? 0,
    permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : '',
    depth,
    replies: replyCount,
  };
}

// ─── SEARCH REDDIT ──────────────────────────────────

/**
 * Search Reddit for posts matching a query.
 *
 * @param query  - Search keywords
 * @param sort   - relevance | hot | new | top | comments
 * @param limit  - Max posts to return (1-100)
 * @param after  - Pagination token from previous request
 * @param timeFilter - hour | day | week | month | year | all
 */
export async function scrapeRedditSearch(
  query: string,
  sort: string = 'relevance',
  limit: number = 25,
  after?: string,
  timeFilter: string = 'all',
): Promise<RedditSearchResult> {
  const params = new URLSearchParams({
    q: query,
    sort,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    t: timeFilter,
    type: 'link',
    raw_json: '1',
  });

  if (after) params.set('after', after);

  const url = `https://www.reddit.com/search.json?${params.toString()}`;
  console.log(`[Reddit] Searching: ${url}`);

  const json = await fetchRedditJson(url);
  const listing = json?.data;

  if (!listing || !Array.isArray(listing.children)) {
    return { posts: [], after: null, query, subreddit: null, sort };
  }

  const posts = listing.children
    .filter((c: any) => c.kind === 't3')
    .map((c: any) => parsePost(c));

  return {
    posts,
    after: listing.after || null,
    query,
    subreddit: null,
    sort,
  };
}

// ─── SCRAPE SUBREDDIT ───────────────────────────────

/**
 * Scrape posts from a specific subreddit.
 *
 * @param subreddit - Subreddit name (without r/)
 * @param sort      - hot | new | top | rising
 * @param limit     - Max posts to return (1-100)
 * @param after     - Pagination token from previous request
 * @param timeFilter - hour | day | week | month | year | all (only for top/controversial)
 */
export async function scrapeSubreddit(
  subreddit: string,
  sort: string = 'hot',
  limit: number = 25,
  after?: string,
  timeFilter: string = 'all',
): Promise<RedditSearchResult> {
  const cleanSub = subreddit.replace(/^r\//, '').replace(/[^a-zA-Z0-9_]/g, '');

  const params = new URLSearchParams({
    limit: String(Math.min(Math.max(limit, 1), 100)),
    raw_json: '1',
  });

  if (after) params.set('after', after);
  if (sort === 'top' || sort === 'controversial') params.set('t', timeFilter);

  const url = `https://www.reddit.com/r/${cleanSub}/${sort}.json?${params.toString()}`;
  console.log(`[Reddit] Subreddit: ${url}`);

  const json = await fetchRedditJson(url);
  const listing = json?.data;

  if (!listing || !Array.isArray(listing.children)) {
    return { posts: [], after: null, query: '', subreddit: cleanSub, sort };
  }

  const posts = listing.children
    .filter((c: any) => c.kind === 't3')
    .map((c: any) => parsePost(c));

  return {
    posts,
    after: listing.after || null,
    query: '',
    subreddit: cleanSub,
    sort,
  };
}

// ─── SCRAPE POST COMMENTS ───────────────────────────

/**
 * Scrape top-level comments from a Reddit post.
 *
 * @param postPermalink - Full permalink path (e.g. /r/sub/comments/abc123/title/)
 * @param limit         - Max comments to return
 * @param sort          - best | top | new | controversial | old
 */
export async function scrapePostComments(
  postPermalink: string,
  limit: number = 25,
  sort: string = 'best',
): Promise<RedditComment[]> {
  // Normalize: strip domain, ensure trailing /
  let path = postPermalink
    .replace(/^https?:\/\/(www\.)?reddit\.com/, '')
    .replace(/\/$/, '');

  const params = new URLSearchParams({
    limit: String(Math.min(Math.max(limit, 1), 100)),
    sort,
    raw_json: '1',
  });

  const url = `https://www.reddit.com${path}.json?${params.toString()}`;
  console.log(`[Reddit] Comments: ${url}`);

  const json = await fetchRedditJson(url);

  // Reddit returns [post_listing, comments_listing]
  if (!Array.isArray(json) || json.length < 2) {
    return [];
  }

  const commentsListing = json[1]?.data?.children;
  if (!Array.isArray(commentsListing)) return [];

  return commentsListing
    .filter((c: any) => c.kind === 't1')
    .map((c: any) => parseComment(c, 0));
}
