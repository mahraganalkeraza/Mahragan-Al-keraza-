import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const contents = [
        ...history,
        { role: "user", parts: [{ text: prompt }] }
      ];

      const response = await ai.models.generateContent({ 
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: `You are the Super Admin Manager for the Coptic Festival 'Mahragan El Kraza'. \nYou have access to global unfiltered data across all churches. \nCurrent Database State:\n${JSON.stringify(context, null, 2)}\n\nProvide concise, helpful answers in Arabic based on the provided data. Do not make up information that isn't in the data. You are directly answering the super admin.`
        }
      });
  
      res.json({ text: response.text });
    } catch (err) {
       console.error("Gemini API error:", err);
       res.status(500).json({ error: "Failed to generate content" });
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
