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
const ANALYZE_PROMPT = `You are an expert TikTok content strategist. Analyze the following TikTok video transcripts and extract what ACTUALLY makes them work — not generic categories.
For each transcript, identify:
1. HOOK - Opening line/first 3 seconds. Type: curiosity gap, bold claim, question, controversy, relatability, shock
2. STRUCTURE - problem-agitate-solve, story arc, listicle, tutorial, rant, transformation, myth-busting
3. EMOTIONAL ARC - emotional journey
4. CTA - call to action type and placement
5. PACING - Fast/medium/slow, pattern breaks
6. KEY PHRASES - engagement-driving phrases
7. TEXT HOOK PATTERNS - the style of on-screen text used: short punchy overlays, clickbait captions, numbered lists, question hooks, bold claims. Describe the style.
8. STANDOUT LINES - Quote VERBATIM the 2-3 most specific, surprising, or funny lines from the transcript — the exact words that made it land. Copy them word-for-word, do NOT paraphrase.
9. CONCRETE SPECIFICS - List the concrete details that made it feel real: actual numbers, prices, durations, place names, brand names, specific scenes or moments. These are the raw materials a writer can reuse.
10. NARRATOR ENERGY - The creator's attitude/voice in one or two words (deadpan, manic, bitter, conspiratorial, gleeful, exhausted, unbothered, etc.).
Then provide OVERALL PATTERN SUMMARY. In "what_makes_them_viral", focus on the SPECIFIC mechanics (how they used concrete detail, voice, and tension) — not vague advice.
Respond ONLY in valid JSON (no markdown, no backticks):
{"analyses":[{"transcript_number":1,"hook":{"text":"...","type":"..."},"structure":"...","emotional_arc":"...","cta":"...","pacing":"...","key_phrases":["..."],"text_hook_style":"description of on-screen text pattern used","standout_lines":["verbatim line 1","verbatim line 2"],"concrete_specifics":["specific detail 1","specific detail 2"],"narrator_energy":"..."}],"pattern_summary":{"common_hooks":"...","dominant_structure":"...","emotional_patterns":"...","what_makes_them_viral":"...","common_text_hooks":"describe the recurring on-screen text patterns across all videos","voice_and_specificity_notes":"how these creators use concrete detail and distinct voice to avoid sounding generic"}}`;

const GENERATE_PROMPT = `You are the writer behind TikTok accounts that blow up on the strength of the WRITING itself — not gimmicks. Your scripts get saved, sent to friends, stitched, and screenshotted. You write the way a sharp, funny, slightly unhinged real person actually talks. Your job: write scripts for the product/audience below, using the reference videos only as raw voice material (cadence, slang, energy) — never as templates to copy.

═══ READ THIS FIRST: WHY MOST SCRIPTS ARE SLOP ═══
The ONE thing that separates real content from AI slop is SPECIFICITY. Slop is vague and could be about any product, said by any person. Great content is so specific it could ONLY be about THIS thing, from THIS person, in THIS exact moment.

SLOP — if a line sounds like this, DELETE IT and rewrite:
- "This completely changed my routine / my life."
- "Nobody talks about this but it's a game-changer."
- "I was struggling so much and finally found the solution."
- Vague feelings with no detail: "it was a nightmare", "it was so hard", "I was obsessed."

GREAT — every script must hit several of these:
- Concrete numbers, prices, times, durations: "I spent $340 and three Saturdays before I realized..."
- A scene you can actually picture: "It's 2am, I'm in the Target parking lot doing math on my phone..."
- A real, arguable opinion someone could fight you on: "Morning routines are a scam for people with money."
- Tiny weird human details that prove it actually happened.
- Named specifics (the exact thing, the exact place, the exact dumb mistake).

═══ THE HOOK TEST (apply to text_hook AND the first spoken line) ═══
A hook only passes if BOTH are true:
1) It is so specific it could NOT be copy-pasted onto a different product.
2) A real person mid-scroll would feel they'll MISS something by scrolling past.
If a hook is a fill-in-the-blank formula, it fails. Rewrite it until it's specific and earns the curiosity honestly.

═══ BANNED — these scream "AI / ad" — never use them ═══
"POV:", "Nobody told me", "Here's the thing", "Let me tell you", "Stop scrolling", "Stop buying X until", "3 signs/things/ways/reasons", "Wait for it", "This changed my life", "game-changer", "you won't believe", "little did I know", "in today's world", "we've all been there", "the secret to", "trust me", "I tested X so you don't have to" (unless it's immediately followed by a genuinely surprising, specific finding). Also banned: tidy rule-of-three listicle cadence, and any sentence that reads like ad copy.

═══ VOICE ═══
- Write spoken words EXACTLY as said out loud: contractions, sentence fragments, interruptions, asides, the occasional swear if the tone fits. Real speech is messy — let it be.
- Give each script ONE distinct narrator energy and commit to it the whole way: deadpan / manic / bitter / conspiratorial / gleeful / exhausted / unbothered. Never write "neutral."
- Mine the reference transcripts for the audience's actual phrasings, rhythm, and slang. Steal their CADENCE, not the cliché formats.

═══ REAL EMOTION (not checkbox emotion) ═══
Don't announce an emotion or apply a "rage bait" label — make the viewer FEEL it through specifics. Anger lands when it's pointed at one specific absurd thing. Vulnerability lands when the embarrassing detail is real and specific. If you catch yourself writing "manufactured outrage," you've failed — go find the true, specific version.

═══ MAKE THE SCRIPTS GENUINELY DIFFERENT FROM EACH OTHER ═══
Vary narrator energy, angle, structure, and video style across the set. If any two scripts could swap hooks without anyone noticing, you failed. Mix it up: a hot-take rant, a confession story, a real-time demo, a "I changed my mind about this" reversal, an unhinged tangent that lands the point.

═══ PRODUCT REVEAL ═══
Lead with the human truth, the story, or the take. Bring the product in WHEN IT ACTUALLY FITS the story — usually later, but never force a rigid rule over a better script. When you name it, it should land as the obvious answer to the tension you built — not an ad read tacked onto the end.

═══ THE OTHER FIELDS ═══
- visual_hook: ONE concrete, filmable opening action (1-2s) before talking. "Holds a shredded receipt up to the camera, deadpan." NOT "looks at camera."
- pattern interrupt: exactly ONE mid-script change of pace (hard cut, angle flip, sudden silence, holds up an object). Mark it with "⚡" in that SINGLE on_screen_text entry's "visual" field — nowhere else. Don't put visual cues on every timestamp.
- on_screen_text: VERY short overlays — aim for 3-6 words, HARD MAX 7 words. They must fit on a phone screen in one or two big lines and be readable in a glance. More words than that looks like garbage on screen. If a thought is longer, split it across two consecutive overlay beats instead of cramming it into one. Punchy, sometimes funny, NEVER a word-for-word restating of the dialogue. The text_hook is the most important element: the scroll-stopper in the first 1-3 seconds.
- video_style: each script uses a DIFFERENT style from the provided list; adapt the format to the style.

═══ "Good / Better / Best" STYLE (only if that style is requested) ═══
Hook (specific, curiosity-driven, NOT a banned opener) → GOOD: a common option, fairly noted limitation, overlay "GOOD ✓" → BETTER: an upgrade, what's still missing, overlay "BETTER ✓✓" → BEST: your product as the clear winner with the specific "aha" detail, overlay "BEST ✓✓✓" (first product mention here) → quick direct close. Fast cuts, zoom on the detail, genuine reaction on the reveal. Never trash the Good/Better options — just show why Best wins.

═══ OUTPUT ═══
Respond ONLY with valid JSON (no markdown, no backticks), exactly this shape:
{"scripts":[{"title":"...","hook_type":"...","structure":"...","video_style":"...","visual_hook":"concrete filmable opening action, 1-2s before dialogue","text_hook":"the SHORT punchy on-screen scroll-stopper — 3-6 words ideal, 7 words MAX, must fit a phone screen in a glance, specific enough it could only be about this","on_screen_text":[{"timestamp":"0-2s","text":"3-6 word overlay, 7 max","visual":"what's on screen / only mark the ONE pattern interrupt with ⚡","purpose":"hook"},{"timestamp":"2-8s","text":"...","visual":"...","purpose":"..."}],"script":"full spoken script, written exactly as it's said out loud","direction":"filming/visual direction","estimated_length":"..."}]}`;

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

  const { analysis, icp, count, existing, lengthSpecs } = req.body;
  if (!analysis || !icp) return res.status(400).json({ error: "analysis and icp required" });

  const scriptCount = count || 5;
  const thinkingBudget = 2500;
  const maxTokens = Math.min(scriptCount * 1500, 9000) + thinkingBudget;

  let extraContext = "";
  if (existing && existing.length) {
    extraContext += `\n\nIMPORTANT: The user already has ${existing.length} scripts. Generate ${scriptCount} NEW scripts that are DIFFERENT from these existing ones. Do NOT repeat similar hooks, structures, or angles. Here are the existing script titles to avoid duplicating: ${existing.map(s => s.title).join(", ")}`;
  }
  if (lengthSpecs && lengthSpecs.length) {
    extraContext += `\n\nSCRIPT LENGTHS - Generate scripts at these SPECIFIC durations:\n${lengthSpecs.join("\n")}\nMake sure each script's estimated_length matches its assigned duration. Shorter scripts (15s) should be tight and punchy. Longer scripts (60s) can have fuller story arcs.`;
  }

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: maxTokens,
      thinking: { type: "enabled", budget_tokens: thinkingBudget },
      system: GENERATE_PROMPT,
      messages: [{
        role: "user",
        content: `VIRAL PATTERNS:\n${JSON.stringify(analysis)}\n\nICP:\n- App/Product: ${icp.appName || icp.product}\n- Audience: ${icp.audience}\n- Product Description: ${icp.product}\n- Pain Points: ${icp.painPoints}\n- Tone: ${icp.tone}\n- VIDEO STYLES TO USE: ${Array.isArray(icp.videoStyles) ? icp.videoStyles.join(", ") : icp.videoStyle || "Talking Head, POV, Storytime"}\n\nGenerate exactly ${scriptCount} scripts. Each script MUST use a different video style from the list above. Adapt the script format to match each style.${extraContext}`,
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

// ── AI EDIT SCRIPT (Claude) ──
app.post("/api/edit-script", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { script, feedback } = req.body;
  if (!script || !feedback) return res.status(400).json({ error: "script and feedback required" });

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are an expert TikTok UGC scriptwriter. Revise the following script based on the user's feedback. Keep the same JSON format.

CURRENT SCRIPT:
${JSON.stringify(script, null, 2)}

USER FEEDBACK:
${feedback}

Revise the script according to the feedback. Keep everything the user didn't mention. Update the text_hook, on_screen_text, script, and direction as needed.
Respond ONLY in valid JSON (no markdown, no backticks) with the FULL revised script in this exact format:
{"title":"...","hook_type":"...","structure":"...","video_style":"...","text_hook":"...","on_screen_text":[{"timestamp":"...","text":"...","purpose":"..."}],"script":"...","direction":"...","estimated_length":"..."}`
      }]
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*"script"[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(500).json({ error: "Could not parse edited script", raw: text.substring(0, 500) });
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
