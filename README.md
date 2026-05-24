# Script Engine — Railway Backend

A lightweight API proxy that lets your frontend app call ScrapeCreators and Supadata APIs without CORS issues.

## What it does

Your frontend app calls YOUR Railway URL → this server forwards the request to ScrapeCreators/Supadata → returns the response to your frontend. That's it.

## Endpoints

| Endpoint | What it does |
|---|---|
| `GET /api/search?query=skincare` | Search TikTok videos by keyword |
| `GET /api/search/hashtag?hashtag=skincare` | Search by hashtag |
| `GET /api/trending` | Get trending TikTok feed |
| `GET /api/transcript?url=https://tiktok.com/...` | Get video transcript |
| `GET /api/video?url=https://tiktok.com/...` | Get video details/metadata |
| `GET /health` | Health check |

## Deploy to Railway (5 minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Script Engine backend"
git remote add origin https://github.com/YOUR_USER/script-engine-api.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repo
4. Railway auto-detects Node.js and deploys

### Step 3: Add environment variables
In your Railway project dashboard, go to **Variables** and add:

```
SCRAPECREATORS_API_KEY=your_key_here
SUPADATA_API_KEY=your_key_here
```

Get your keys:
- **ScrapeCreators**: [scrapecreators.com](https://scrapecreators.com) — free credits on signup
- **Supadata**: [supadata.ai](https://supadata.ai) — 100 free transcriptions/month

### Step 4: Get your URL
Railway gives you a public URL like `https://script-engine-api-production.up.railway.app`

### Step 5: Update your frontend
In your React app, change the API base URL to your Railway URL:
```javascript
const API_BASE = "https://your-app.up.railway.app";

// Then all API calls become:
fetch(`${API_BASE}/api/search?query=${query}`)
```

## Cost

Railway free tier: 500 hours/month of compute + $5 credit — more than enough for this. Paid plan is $5/month for unlimited.
