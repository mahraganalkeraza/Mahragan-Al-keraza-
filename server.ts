import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  
  // Health check endpoint to verify network fetches
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
  
    const { prompt, history = [], context = {} } = req.body;
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    try {
      let totalResultsRecorded = 0;
      try {
        if (context.globalFirestoreData) {
          const parsed = JSON.parse(context.globalFirestoreData);
          totalResultsRecorded = parsed.totalResultsRecorded || 0;
        }
      } catch (e) {
        console.warn("Could not parse globalFirestoreData:", e);
      }

      const lightweightSummary = `Total Registered Students: ${context.totalParticipants || 0}
Total Registered Churches: ${context.churchesStats?.length || 0}
Total Online Results Recorded: ${totalResultsRecorded}

Database Stats & Details:
- Registration by Stage: ${JSON.stringify(context.stagesStats || {})}
- Churches and subscribers count:
${(context.churchesStats || []).map((c: any) => `- كنيسة ${c.name}: عدد المشتركين ${c.subscribers}`).join('\n')}
`;

      const contents = [
        ...history,
        { role: "user", parts: [{ text: `[SYSTEM CONTEXT]\n${lightweightSummary}\n\nUSER PROMPT: ${prompt}` }] }
      ];

      const response = await ai.models.generateContent({ 
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: `You are the Super Admin Manager for the Coptic Festival 'Mahragan El Kraza' in District 18 (المنطقة 18).
You have access to the global unfiltered statistics (e.g., student counts, stages, and church subscribers) provided in the [SYSTEM CONTEXT].
Always answer accurately, using the given data counts, and explain clearly.
Write your responses in helpful, concise Arabic. Do not invent any numbers that are not in the context.`,
        }
      });
  
      res.json({ text: response.text });
    } catch (err: any) {
       console.error("Gemini API error:", err);
       res.status(500).json({ error: err?.message || "Failed to generate content" });
    }
  });

  // Strict enforcement of port 3000 under any condition to prevent port conflicts
  // The infrastructure dynamically routes externally to 3000.
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files from dist
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
