const express = require("express");
const cors = require("cors");
const path = require("path");
const Anthropic = require("anthropic").default;

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
Generate 5 unique scripts using DIFFERENT hook/structure combos.
Respond ONLY in valid JSON (no markdown, no backticks):
{"scripts":[{"title":"...","hook_type":"...","structure":"...","script":"...","direction":"...","estimated_length":"..."}]}`;

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
        content: `VIRAL PATTERNS:\n${JSON.stringify(analysis)}\n\nICP:\n- Audience: ${icp.audience}\n- Product: ${icp.product}\n- Pain Points: ${icp.painPoints}\n- Tone: ${icp.tone}\n- Style: ${icp.videoStyle}\n\nGenerate 5 scripts.`,
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
