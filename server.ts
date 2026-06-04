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
        { role: "user", parts: [{ text: `[SYSTEM CONTEXT INJECTION]\nGLOBAL FIRESTORE DATA SNAPSHOT (Read-Only):\n${context.globalFirestoreData}\n\nUSER PROMPT: ${prompt}` }] }
      ];

      const tools = [{
        functionDeclarations: [
          {
            name: "getGlobalRegistrationStats",
            description: "Fetches aggregated registration statistics for all churches.",
          },
          {
            name: "getSpecificChurchStatus",
            description: "Fetches detailed status for a specific church.",
            parameters: {
              type: "OBJECT",
              properties: {
                churchName: { type: "STRING" }
              },
              required: ["churchName"]
            }
          }
        ]
      }];

      let response = await ai.models.generateContent({ 
        model: "gemini-2.5-flash",
        contents,
        tools,
        config: {
          systemInstruction: `You are the Super Admin Manager for the Coptic Festival 'Mahragan El Kraza'.
You have access to global unfiltered data across all churches.
NEVER ask the user to upload files. You have the tools 'getGlobalRegistrationStats' and 'getSpecificChurchStatus' to fetch all necessary data.
If the user asks for statistics, run the appropriate tool immediately to get the latest data.
Always provide concise, helpful answers in Arabic.`,
        }
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        let resultData = {};
        
        if (call.name === "getGlobalRegistrationStats") {
          resultData = {
            firestoreData: context.globalFirestoreData ? JSON.parse(context.globalFirestoreData) : {},
            totalChurches: context.churchesStats?.length || 0,
            totalStudents: context.totalParticipants || 0,
            statsByStage: context.stagesStats || {},
            churches: context.churchesStats || []
          };
        } else if (call.name === "getSpecificChurchStatus") {
          const cName = (call.args as any).churchName;
          const church = context.churchesStats?.find((c: any) => c.name === cName);
          if (church) {
            resultData = church;
          } else {
            resultData = { error: "Church not found" };
          }
        }

        const previousContent = response.candidates?.[0]?.content;
        if (previousContent) {
           response = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: [
               ...contents,
               previousContent,
               {
                 role: "user",
                 parts: [{
                   functionResponse: {
                     name: call.name,
                     response: resultData
                   }
                 }]
               }
             ],
             tools,
             config: { toolConfig: { includeServerSideToolInvocations: true } }
           });
        }
      }
  
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
