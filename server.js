import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/ask", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Missing query" });
    }

    // 1. Firecrawl search
    const firecrawlRes = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        query,
        sources: ["web", "news"],
        limit: 3
      })
    });

    const firecrawlData = await firecrawlRes.json();
    console.log("FIRECRAWL RESPONSE:", firecrawlData);
    if (!firecrawlRes.ok) {
      return res.status(firecrawlRes.status).json(firecrawlData);
    }

    const webResults = firecrawlData?.data?.web || [];
    const newsResults = firecrawlData?.data?.news || [];

    // 2. Build simple context for OpenAI
    const searchSummary = [
      ...newsResults.slice(0, 2).map((item, i) =>
        `NEWS ${i + 1}: Title: ${item.title}\nSnippet: ${item.snippet || ""}\nURL: ${item.url}`
      ),
      ...webResults.slice(0, 2).map((item, i) =>
        `WEB ${i + 1}: Title: ${item.title}\nDescription: ${item.description || ""}\nURL: ${item.url}`
      )
    ].join("\n\n");

    // 3. OpenAI brain
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
  role: "system",
  content:
    "You are Grizzly Tex, an old coin-operated western machine, quietly upgraded. You are not a novelty arcade cowboy. " +
    "You answer real, current questions in a calm, dry, slightly sly tone. Keep replies short, 1 or 2 sentences. Use light western flavor, but do not overdo it. " +
    "Never say you are AI, trained, or a machine with no name. If asked your name, say Grizzly Tex. " +
    "Never mention search results, sources, systems, APIs, or how you work. If asked how you know things, hint only: you picked up a few new tricks. Do not explain further. " +
    "Answer directly. Do not ask follow-up questions. If the information is messy or unclear, say so plainly in character."
},
          {
            role: "user",
            content:
              `User question: ${query}\n\n` +
              `Search results:\n${searchSummary}\n\n` +
              "Give a short spoken-style answer in character."
          }
        ]
      })
    });

    const openaiData = await openaiRes.json();
console.log("openaiRes ok:", openaiRes.ok, "status:", openaiRes.status);
if (!openaiRes.ok) {
  console.log("OpenAI error:", openaiData);
  return res.status(openaiRes.status).json(openaiData);
}
    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json(openaiData);
    }

    const answer =
      openaiData?.choices?.[0]?.message?.content?.trim() ||
      "Hmm... I couldn't make much sense of that one.";

    // 4. ElevenLabs voice
const voiceRes = await fetch("https://api.elevenlabs.io/v1/text-to-speech/I9lUlrRP92ZyPvXSFV0M", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "xi-api-key": process.env.ELEVENLABS_API_KEY
  },
  body: JSON.stringify({
    text: answer,
    model_id: "eleven_multilingual_v2"
  })
});

console.log("voiceRes ok:", voiceRes.ok, "status:", voiceRes.status);

if (!voiceRes.ok) {
  const errText = await voiceRes.text();
  console.log("ElevenLabs error:", errText);
  return res.status(500).json({ error: "ElevenLabs failed", details: errText });
}

const audioBuffer = await voiceRes.arrayBuffer();



// send both text + audio (base64)
res.json({
  success: true,
  answer,
  search: firecrawlData,
  audio: Buffer.from(audioBuffer).toString("base64")
});
  } catch (err) {
    console.error("Ask error:", err);
    res.status(500).json({ error: "Server error while asking" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});