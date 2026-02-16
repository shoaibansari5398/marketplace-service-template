# Reddit Intelligence API — Documentation

**Bounty #68** · `GET /api/reddit` · **$0.005 USDC per request**

Scrape Reddit posts, subreddit feeds, and post comments via Proxies.sx mobile proxies (real 4G/5G carrier IPs), protected by an x402 (USDC) payment gate.

---

## Endpoint

```
GET /api/reddit
```

## Three Modes

| Mode | Trigger | Description |
|------|---------|-------------|
| **Search** | `?query=...` | Search Reddit posts by keyword |
| **Subreddit** | `?subreddit=...` | Browse a specific subreddit |
| **Comments** | `?comments=...` | Fetch comments for a specific post |

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Search term (required for search mode) |
| `subreddit` | string | — | Subreddit name to browse (e.g., `programming`) |
| `sort` | string | `relevance` / `hot` | Sort order: `relevance`, `hot`, `new`, `top`, `rising`, `comments` |
| `time` | string | `all` | Time filter: `hour`, `day`, `week`, `month`, `year`, `all` |
| `limit` | number | `25` | Results per page (max: 100) |
| `after` | string | — | Pagination token from previous response |
| `comments` | string | — | Post permalink to fetch comments for |
| `comment_sort` | string | `best` | Comment sort: `best`, `top`, `new`, `controversial`, `old` |

---

## Example Requests

### 1. Search Reddit

```bash
curl "https://marketplace-service-template-cwgj.onrender.com/api/reddit?query=AI+agents&sort=relevance&time=week&limit=10" \
  -H "X-Payment-Signature: <payment_signature>" \
  -H "X-Payment-Network: solana"
```

### 2. Browse Subreddit

```bash
curl "https://marketplace-service-template-cwgj.onrender.com/api/reddit?subreddit=programming&sort=hot&limit=25" \
  -H "X-Payment-Signature: <payment_signature>" \
  -H "X-Payment-Network: solana"
```

### 3. Fetch Post Comments

```bash
curl "https://marketplace-service-template-cwgj.onrender.com/api/reddit?comments=/r/programming/comments/abc123/title/&limit=50" \
  -H "X-Payment-Signature: <payment_signature>" \
  -H "X-Payment-Network: solana"
```

---

## Response Format

### Search / Subreddit Response

```json
{
  "posts": [
    {
      "title": "Post title",
      "selftext": "Post body text",
      "author": "username",
      "subreddit": "programming",
      "score": 1234,
      "upvoteRatio": 0.95,
      "numComments": 89,
      "createdUtc": 1708100000,
      "permalink": "/r/programming/comments/abc123/post_title/",
      "url": "https://example.com",
      "isSelf": true,
      "flair": "Discussion",
      "awards": 2,
      "over18": false
    }
  ],
  "after": "t3_xyz789",
  "meta": {
    "query": "AI agents",
    "sort": "relevance",
    "limit": 10,
    "proxy": {
      "ip": "203.0.113.42",
      "country": "US",
      "host": "proxy.proxies.sx",
      "type": "mobile"
    }
  },
  "payment": {
    "txHash": "5abc...",
    "network": "solana",
    "amount": 0.005,
    "settled": true
  }
}
```

### Comments Response

```json
{
  "comments": [
    {
      "author": "commenter",
      "body": "Comment text...",
      "score": 42,
      "createdUtc": 1708101000,
      "replies": []
    }
  ],
  "meta": {
    "permalink": "/r/programming/comments/abc123/title/",
    "limit": 50,
    "proxy": {
      "ip": "203.0.113.42",
      "country": "US",
      "host": "proxy.proxies.sx",
      "type": "mobile"
    }
  },
  "payment": {
    "txHash": "5abc...",
    "network": "solana",
    "amount": 0.005,
    "settled": true
  }
}
```

---

## Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Post title |
| `selftext` | string | Post body (text posts only) |
| `author` | string | Reddit username |
| `subreddit` | string | Subreddit name |
| `score` | number | Net upvotes |
| `upvoteRatio` | number | Upvote ratio (0–1) |
| `numComments` | number | Total comment count |
| `createdUtc` | number | Unix timestamp |
| `permalink` | string | Reddit permalink |
| `url` | string | Post URL (or link URL) |
| `isSelf` | boolean | True if text post |
| `flair` | string | Post flair text |
| `awards` | number | Award count |
| `over18` | boolean | NSFW flag |

---

## Payment (x402)

All requests require a valid USDC payment via the x402 protocol.

- **Price**: $0.005 USDC per request
- **Networks**: Solana, Base (L2)
- Without payment, the API returns a `402` response with payment instructions

### Wallet Addresses

| Network | Recipient |
|---------|-----------|
| Solana | `6eUdVwsPArTxwVqEARYGCh4S2qwW2zCs7jSEDRpxydnv` |
| Base | `0xF8cD900794245fc36CBE65be9afc23CDF5103042` |

---

## Error Responses

| Code | Meaning |
|------|---------|
| `400` | Missing required parameter |
| `402` | Payment required (includes payment instructions) |
| `429` | Rate limit exceeded |
| `502` | Reddit scrape failed |

---

## Deployment

### Prerequisites

- [Bun](https://bun.sh) runtime
- Proxies.sx proxy credentials (set in `.env`)

### Local Development

```bash
# Clone and install
git clone https://github.com/shoaibansari5398/marketplace-service-template.git
cd marketplace-service-template
bun install

# Configure environment
cp .env.example .env
# Edit .env with your proxy credentials

# Run
bun run dev

# Test (returns 402 without payment)
curl http://localhost:3000/api/reddit?query=test
```

### Production Deployment (Railway)

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Set environment variables from `.env.example`
4. Deploy — Railway detects Bun automatically

---

## Files

| File | Description |
|------|-------------|
| `src/scrapers/reddit-scraper.ts` | Reddit scraper (search, subreddit, comments) |
| `src/service.ts` | Route handler with x402 payment gate |
| `src/index.ts` | Server entry point with discovery docs |
| `listings/reddit-intelligence.json` | Marketplace listing metadata |
