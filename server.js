const express = require("express");
const cors = require("cors");
const app = express();

// Allow all origins for CORS
app.use(cors({ origin: "*" }));
app.use(express.json());

const SCRAPECREATORS_KEY = process.env.SCRAPECREATORS_API_KEY;
const SUPADATA_KEY = process.env.SUPADATA_API_KEY;

// Root route
app.get("/", (req, res) => {
  res.json({
    status: "running",
    keys: {
      scrapecreators: SCRAPECREATORS_KEY ? "set (" + SCRAPECREATORS_KEY.substring(0, 4) + "...)" : "NOT SET",
      supadata: SUPADATA_KEY ? "set (" + SUPADATA_KEY.substring(0, 4) + "...)" : "NOT SET",
    },
    endpoints: ["/api/search", "/api/search/hashtag", "/api/trending", "/api/transcript", "/api/video", "/health"],
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── TikTok keyword search ──
app.get("/api/search", async (req, res) => {
  const { query, cursor } = req.query;
  if (!query) return res.status(400).json({ error: "query parameter is required" });
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not configured" });

  try {
    const url = `https://api.scrapecreators.com/v1/tiktok/search/keyword?query=${encodeURIComponent(query)}${cursor ? `&cursor=${cursor}` : ""}`;
    console.log("[search] Fetching:", url);

    const resp = await fetch(url, {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });

    const text = await resp.text();
    console.log("[search] Status:", resp.status, "Body length:", text.length);

    if (!resp.ok) {
      return res.status(resp.status).json({ error: `ScrapeCreators returned ${resp.status}`, detail: text.substring(0, 500) });
    }

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch {
      res.status(500).json({ error: "Invalid JSON from ScrapeCreators", detail: text.substring(0, 500) });
    }
  } catch (err) {
    console.error("[search] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── TikTok hashtag search ──
app.get("/api/search/hashtag", async (req, res) => {
  const { hashtag, cursor } = req.query;
  if (!hashtag) return res.status(400).json({ error: "hashtag parameter is required" });
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not configured" });

  try {
    const url = `https://api.scrapecreators.com/v1/tiktok/search/hashtag?hashtag=${encodeURIComponent(hashtag)}${cursor ? `&cursor=${cursor}` : ""}`;
    const resp = await fetch(url, {
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
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not configured" });

  try {
    const resp = await fetch("https://api.scrapecreators.com/v1/tiktok/get-trending-feed", {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Video transcript ──
app.get("/api/transcript", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url parameter is required" });

  // Try ScrapeCreators first
  if (SCRAPECREATORS_KEY) {
    try {
      const apiUrl = `https://api.scrapecreators.com/v1/tiktok/video/transcript?url=${encodeURIComponent(url)}`;
      console.log("[transcript] Trying ScrapeCreators:", apiUrl);

      const resp = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPECREATORS_KEY },
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log("[transcript] ScrapeCreators success");
        return res.json(data);
      }
      console.log("[transcript] ScrapeCreators failed:", resp.status);
    } catch (err) {
      console.log("[transcript] ScrapeCreators error:", err.message);
    }
  }

  // Fallback to Supadata
  if (SUPADATA_KEY) {
    try {
      const supaUrl = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true`;
      console.log("[transcript] Trying Supadata:", supaUrl);

      const resp = await fetch(supaUrl, {
        headers: { "x-api-key": SUPADATA_KEY },
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log("[transcript] Supadata success");
        return res.json(data);
      }
      console.log("[transcript] Supadata failed:", resp.status);
    } catch (err) {
      console.log("[transcript] Supadata error:", err.message);
    }
  }

  res.status(500).json({ error: "Both transcript services failed" });
});

// ── Video info ──
app.get("/api/video", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url parameter is required" });
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not configured" });

  try {
    const apiUrl = `https://api.scrapecreators.com/v2/tiktok/video?url=${encodeURIComponent(url)}`;
    const resp = await fetch(apiUrl, {
      headers: { "x-api-key": SCRAPECREATORS_KEY },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Script Engine API running on port ${PORT}`);
  console.log(`ScrapeCreators key: ${SCRAPECREATORS_KEY ? "configured" : "MISSING"}`);
  console.log(`Supadata key: ${SUPADATA_KEY ? "configured" : "MISSING"}`);
});
