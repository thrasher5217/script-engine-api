# Script Engine

A full-stack app that searches viral TikTok videos, analyzes their patterns, and generates UGC scripts tailored to your client's ICP.

## How it works

1. **Search** — Enter a keyword, find viral TikToks with real engagement data
2. **Filter & Sort** — By time (24h/3d/7d/30d), min views (10K/100K/1M), sort by views/likes/viral ratio
3. **Select** — Pick videos to use as references
4. **Transcribe** — Auto-transcribes selected videos
5. **Analyze** — Claude identifies hooks, structures, emotional arcs, CTAs, and viral patterns
6. **Generate** — Enter your client's ICP, get 5 tailored viral scripts

## Tech Stack

- **Backend**: Express.js (serves API + frontend)
- **TikTok Data**: ScrapeCreators API
- **Transcription**: ScrapeCreators + Supadata (fallback)
- **AI Analysis & Scripts**: Claude API (Anthropic)
- **Frontend**: Vanilla HTML/CSS/JS (single file, no build step)

## Deploy to Railway

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Script Engine"
git remote add origin https://github.com/YOUR_USER/script-engine.git
git push -u origin main
```

### 2. Deploy on Railway
- Go to [railway.app](https://railway.app)
- New Project → Deploy from GitHub → select the repo
- Railway auto-detects Node.js and deploys

### 3. Set environment variables
In Railway dashboard → Variables:

```
SCRAPECREATORS_API_KEY=your_key_here
SUPADATA_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

Get your keys:
- **ScrapeCreators**: [scrapecreators.com](https://scrapecreators.com) — free credits on signup
- **Supadata**: [supadata.ai](https://supadata.ai) — 100 free/month
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) — pay-as-you-go

### 4. Done
Railway gives you a URL. Open it. Everything works.

## Project Structure

```
script-engine/
├── server.js          # Express server (API routes + serves frontend)
├── package.json       # Dependencies
├── public/
│   └── index.html     # Complete frontend (single file)
└── README.md
```

## API Endpoints

| Route | Method | Description |
|---|---|---|
| `/api/search?query=keyword` | GET | Search TikTok by keyword |
| `/api/search/hashtag?hashtag=tag` | GET | Search by hashtag |
| `/api/trending` | GET | Get trending feed |
| `/api/transcript?url=tiktok_url` | GET | Get video transcript |
| `/api/video?url=tiktok_url` | GET | Get video metadata |
| `/api/analyze` | POST | Analyze transcripts (Claude) |
| `/api/generate` | POST | Generate scripts (Claude) |
| `/health` | GET | Health check |

## Monthly Cost

| Service | Cost |
|---|---|
| Railway | Free tier or ~$5/mo |
| ScrapeCreators | ~$10-30/mo depending on usage |
| Supadata | Free (100/mo) or $9/mo |
| Claude API | ~$15-20/mo at 500 videos |
| **Total** | **~$30-55/month** |
