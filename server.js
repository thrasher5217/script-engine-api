const express = require("express");
const cors = require("cors");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk").default;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SCRAPECREATORS_KEY = process.env.SCRAPECREATORS_API_KEY;
const SUPADATA_KEY = process.env.SUPADATA_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ── PROMPTS ──
const ANALYZE_PROMPT = `You are an expert TikTok content strategist. Analyze the following TikTok video transcripts and extract viral patterns.
For each transcript, identify:
1. HOOK - Opening line/first 3 seconds. Type: curiosity gap, bold claim, question, controversy, relatability, shock
2. STRUCTURE - problem-agitate-solve, story arc, listicle, tutorial, rant, transformation, myth-busting
3. EMOTIONAL ARC - emotional journey
4. CTA - call to action type and placement
5. PACING - Fast/medium/slow, pattern breaks
6. KEY PHRASES - engagement-driving phrases
Then provide OVERALL PATTERN SUMMARY.
Respond ONLY in valid JSON (no markdown, no backticks):
{"analyses":[{"transcript_number":1,"hook":{"text":"...","type":"..."},"structure":"...","emotional_arc":"...","cta":"...","pacing":"...","key_phrases":["..."]}],"pattern_summary":{"common_hooks":"...","dominant_structure":"...","emotional_patterns":"...","what_makes_them_viral":"..."}}`;

const GENERATE_PROMPT = `You are an elite UGC scriptwriter for TikTok. Using viral patterns from reference videos, generate scripts for the given ICP.
Each script must:
- Open with a proven hook pattern
- Follow a proven structure from the analysis
- Match the emotional arc that drives engagement
- Use language appropriate for the ICP
- Include a natural CTA
- Be 30-60 seconds spoken aloud
- Feel authentic UGC, NOT scripted or salesy
- IMPORTANT: Use the specified VIDEO STYLES. Each script should use a DIFFERENT video style from the provided list. Match the script format to the style (e.g. a "Screen Recording" script should describe what's on screen, a "POV" script should set the scene, a "GRWM" should be conversational while getting ready, a "Skit" should have character dialogue, etc.)
Generate 5 unique scripts using DIFFERENT hook/structure/style combos.
Respond ONLY in valid JSON (no markdown, no backticks):
{"scripts":[{"title":"...","hook_type":"...","structure":"...","video_style":"...","script":"...","direction":"...","estimated_length":"..."}]}`;

// ── HEALTH / ROOT ──
app.get("/health", (req, res) => {
  res.json({
    status: "running",
    keys: {
      scrapecreators: SCRAPECREATORS_KEY ? "configured" : "MISSING",
      supadata: SUPADATA_KEY ? "configured" : "MISSING",
      anthropic: ANTHROPIC_KEY ? "configured" : "MISSING",
    },
  });
});

// ── TIKTOK SEARCH BY KEYWORD ──
app.get("/api/search", async (req, res) => {
  const { query, cursor } = req.query;
  if (!query) return res.status(400).json({ error: "query is required" });
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not set" });

  try {
    const url = `https://api.scrapecreators.com/v1/tiktok/search/keyword?query=${encodeURIComponent(query)}${cursor ? `&cursor=${cursor}` : ""}`;
    const resp = await fetch(url, { headers: { "x-api-key": SCRAPECREATORS_KEY } });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `ScrapeCreators ${resp.status}`, detail: text.substring(0, 300) });
    }
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TIKTOK SEARCH BY HASHTAG ──
app.get("/api/search/hashtag", async (req, res) => {
  const { hashtag, cursor } = req.query;
  if (!hashtag) return res.status(400).json({ error: "hashtag is required" });
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not set" });

  try {
    const url = `https://api.scrapecreators.com/v1/tiktok/search/hashtag?hashtag=${encodeURIComponent(hashtag)}${cursor ? `&cursor=${cursor}` : ""}`;
    const resp = await fetch(url, { headers: { "x-api-key": SCRAPECREATORS_KEY } });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRENDING FEED ──
app.get("/api/trending", async (req, res) => {
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not set" });

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

// ── VIDEO TRANSCRIPT ──
app.get("/api/transcript", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });

  // Try ScrapeCreators
  if (SCRAPECREATORS_KEY) {
    try {
      const apiUrl = `https://api.scrapecreators.com/v1/tiktok/video/transcript?url=${encodeURIComponent(url)}`;
      const resp = await fetch(apiUrl, { headers: { "x-api-key": SCRAPECREATORS_KEY } });
      if (resp.ok) return res.json(await resp.json());
    } catch {}
  }

  // Fallback to Supadata
  if (SUPADATA_KEY) {
    try {
      const apiUrl = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true`;
      const resp = await fetch(apiUrl, { headers: { "x-api-key": SUPADATA_KEY } });
      if (resp.ok) return res.json(await resp.json());
    } catch {}
  }

  res.status(500).json({ error: "Transcript services failed" });
});

// ── VIDEO INFO ──
app.get("/api/video", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });
  if (!SCRAPECREATORS_KEY) return res.status(500).json({ error: "SCRAPECREATORS_API_KEY not set" });

  try {
    const apiUrl = `https://api.scrapecreators.com/v2/tiktok/video?url=${encodeURIComponent(url)}`;
    const resp = await fetch(apiUrl, { headers: { "x-api-key": SCRAPECREATORS_KEY } });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PARSE APP STORE / PLAY STORE LINK ──
app.post("/api/parse-app", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    let appData = null;

    // Apple App Store
    const appleMatch = url.match(/\/id(\d+)/);
    if (appleMatch) {
      const appId = appleMatch[1];
      const resp = await fetch(`https://itunes.apple.com/lookup?id=${appId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results[0]) {
          const app = data.results[0];
          appData = {
            name: app.trackName,
            developer: app.artistName,
            description: app.description,
            category: app.primaryGenreName,
            price: app.formattedPrice,
            rating: app.averageUserRating,
            ratingCount: app.userRatingCount,
            url: app.trackViewUrl,
          };
        }
      }
    }

    // Google Play Store — fetch page and extract what we can
    if (!appData && url.includes("play.google.com")) {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      if (resp.ok) {
        const html = await resp.text();
        // Extract title from <title> tag
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
        const descMatch = html.match(/content="([^"]{50,300})"/);
        appData = {
          name: titleMatch ? titleMatch[1].replace(" - Apps on Google Play", "").trim() : "Unknown App",
          description: descMatch ? descMatch[1] : "",
          source: "Google Play",
          url: url,
        };
      }
    }

    if (!appData) {
      // Fallback: just send the URL to Claude
      appData = { url: url, name: "Unknown", description: "URL provided: " + url };
    }

    // Use Claude to generate ICP from app data
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Analyze this app and generate a TikTok UGC marketing profile. App data:\n${JSON.stringify(appData, null, 2)}\n\nRespond ONLY in valid JSON (no markdown, no backticks):\n{"appName":"...","audience":"...","product":"one-sentence description of what the app does and key selling points","painPoints":"3-4 pain points the target audience has that this app solves","tone":"recommended brand voice/tone for TikTok UGC","suggestedStyles":["list of 3-5 best video styles from: Talking Head, GRWM, POV, Storytime, Voiceover, Tutorial, Before/After, Unboxing, Day in Life, Screen Recording, Green Screen, Skit"]}`
      }]
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*"appName"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.rawAppData = appData;
      res.json(parsed);
    } else {
      res.status(500).json({ error: "Could not parse app analysis", raw: text.substring(0, 500) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TIKTOK OEMBED PROXY ──
app.get("/api/oembed", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const resp = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (resp.ok) {
      const data = await resp.json();
      res.json(data);
    } else {
      res.status(resp.status).json({ error: "oEmbed failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ANALYZE TRANSCRIPTS (Claude) ──
app.post("/api/analyze", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { transcripts } = req.body;
  if (!transcripts || !transcripts.length) return res.status(400).json({ error: "transcripts array required" });

  const transcriptText = transcripts
    .map((t, i) => `--- TRANSCRIPT ${i + 1} (@${t.username}, ${t.views} views) ---\n${t.transcript}`)
    .join("\n\n");

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: ANALYZE_PROMPT,
      messages: [{ role: "user", content: `Analyze these ${transcripts.length} viral TikTok transcripts:\n\n${transcriptText}` }],
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*"analyses"[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(500).json({ error: "Could not parse analysis", raw: text.substring(0, 500) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GENERATE SCRIPTS (Claude) ──
app.post("/api/generate", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { analysis, icp } = req.body;
  if (!analysis || !icp) return res.status(400).json({ error: "analysis and icp required" });

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: GENERATE_PROMPT,
      messages: [{
        role: "user",
        content: `VIRAL PATTERNS:\n${JSON.stringify(analysis)}\n\nICP:\n- App/Product: ${icp.appName || icp.product}\n- Audience: ${icp.audience}\n- Product Description: ${icp.product}\n- Pain Points: ${icp.painPoints}\n- Tone: ${icp.tone}\n- VIDEO STYLES TO USE (generate one script per style): ${Array.isArray(icp.videoStyles) ? icp.videoStyles.join(", ") : icp.videoStyle || "Talking Head, POV, Storytime"}\n\nGenerate 5 scripts. Each script MUST use a different video style from the list above. Adapt the script format to match each style.`,
      }],
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*"scripts"[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(500).json({ error: "Could not parse scripts", raw: text.substring(0, 500) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SERVE FRONTEND FOR ALL OTHER ROUTES ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Script Engine running on port ${PORT}`);
  console.log(`Keys: SC=${SCRAPECREATORS_KEY ? "✓" : "✗"} SD=${SUPADATA_KEY ? "✓" : "✗"} CL=${ANTHROPIC_KEY ? "✓" : "✗"}`);
});
