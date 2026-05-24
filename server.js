const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const SCRAPECREATORS_KEY = process.env.SCRAPECREATORS_API_KEY;
const SUPADATA_KEY = process.env.SUPADATA_API_KEY;

// ── TikTok keyword search ──
app.get("/api/search", async (req, res) => {
  const { query, cursor } = req.query;
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    const url = new URL("https://api.scrapecreators.com/v1/tiktok/search/keyword");
    url.searchParams.set("query", query);
    if (cursor) url.searchParams.set("cursor", cursor);

    const resp = await fetch(url.toString(), {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TikTok hashtag search ──
app.get("/api/search/hashtag", async (req, res) => {
  const { hashtag, cursor } = req.query;
  if (!hashtag) return res.status(400).json({ error: "hashtag is required" });

  try {
    const url = new URL("https://api.scrapecreators.com/v1/tiktok/search/hashtag");
    url.searchParams.set("hashtag", hashtag);
    if (cursor) url.searchParams.set("cursor", cursor);

    const resp = await fetch(url.toString(), {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TikTok trending feed ──
app.get("/api/trending", async (req, res) => {
  try {
    const resp = await fetch(
      "https://api.scrapecreators.com/v1/tiktok/get-trending-feed",
      { headers: { "x-api-key": SCRAPECREATORS_KEY } }
    );
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Video transcript (ScrapeCreators) ──
app.get("/api/transcript", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const apiUrl = new URL("https://api.scrapecreators.com/v1/tiktok/video/transcript");
    apiUrl.searchParams.set("url", url);

    const resp = await fetch(apiUrl.toString(), {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    // Fallback to Supadata if ScrapeCreators transcript fails
    if (SUPADATA_KEY) {
      try {
        const supaUrl = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true`;
        const resp = await fetch(supaUrl, {
          headers: { "x-api-key": SUPADATA_KEY },
        });
        const data = await resp.json();
        res.json(data);
      } catch (err2) {
        res.status(500).json({ error: err2.message });
      }
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Video info ──
app.get("/api/video", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const apiUrl = new URL("https://api.scrapecreators.com/v2/tiktok/video");
    apiUrl.searchParams.set("url", url);

    const resp = await fetch(apiUrl.toString(), {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Root route ──
app.get("/", (req, res) => {
  res.json({
    name: "Script Engine API",
    status: "running",
    endpoints: {
      search: "GET /api/search?query=keyword",
      hashtag: "GET /api/search/hashtag?hashtag=keyword",
      trending: "GET /api/trending",
      transcript: "GET /api/transcript?url=tiktok_url",
      video: "GET /api/video?url=tiktok_url",
      health: "GET /health",
    },
  });
});

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Script Engine API running on port ${PORT}`);
});
