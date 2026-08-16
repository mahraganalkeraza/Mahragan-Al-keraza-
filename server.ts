import express from "express";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Initialize Server-Side Supabase Client
const supabaseUrl = "https://nrigdgdiqjdzieryjjod.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWdkZ2RpcWpkemllcnlqam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg3MTIsImV4cCI6MjA5NjM0NDcxMn0.9YMt8Vxy4lJ_7RBpjvBd9Gv9TB-AFv88U6pDoH9A3Fo";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SHA-256 Hashing helper
function getSHA256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function startServer() {
  const app = express();
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  
  // Health check endpoint to verify network fetches
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get current active version of auth / security settings
  app.get("/api/auth-version", async (req, res) => {
    try {
      // 1. Fetch live admin_password from system_settings row id = '1'
      const { data: sysRow, error: sysError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', '1')
        .maybeSingle();

      if (sysError) throw sysError;

      const dbPassword = sysRow?.admin_password || '111155';

      // 2. Fetch the auth_version tracking row from system_settings row id = 'auth_version'
      const { data: versionRow, error: versionError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'auth_version')
        .maybeSingle();

      let currentVersion = 1;
      let lastPasswordCached = dbPassword;

      if (!versionRow) {
        // Initialize version tracking row in database
        const initialContent = JSON.stringify({ version: 1, last_password: dbPassword });
        await supabase
          .from('system_settings')
          .upsert({ id: 'auth_version', content: initialContent });
      } else {
        try {
          const parsed = JSON.parse(versionRow.content || "{}");
          currentVersion = Number(parsed.version) || 1;
          lastPasswordCached = parsed.last_password || '';

          // If the admin password in DB row 1 doesn't match our cached password,
          // it means the owner changed the password. Increment auth_version!
          if (dbPassword !== lastPasswordCached) {
            currentVersion += 1;
            console.log(`[Security Alert] Password change detected. Incrementing auth_version to ${currentVersion}`);
            const updatedContent = JSON.stringify({ version: currentVersion, last_password: dbPassword });
            await supabase
              .from('system_settings')
              .upsert({ id: 'auth_version', content: updatedContent });
          }
        } catch (parseErr) {
          console.error("Error parsing auth_version row content:", parseErr);
        }
      }

      res.json({ auth_version: currentVersion });
    } catch (err: any) {
      console.error("Error in /api/auth-version:", err);
      // Fail-safe default fallback version if database connection is disrupted
      res.json({ auth_version: 1, error: err.message });
    }
  });

  // Server-side strict password verification API
  app.post("/api/verify-gate-password", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ success: false, error: "Password input is required" });
      }

      // 1. Fetch live admin_password from system_settings row id = '1'
      const { data: sysRow, error: sysError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', '1')
        .maybeSingle();

      if (sysError) throw sysError;

      const dbPassword = sysRow?.admin_password || '111155';

      // Hash the input password to compare securely
      const inputHash = getSHA256(password);
      let isMatch = false;

      // Handle both plain text or pre-hashed (SHA-256) password values inside DB
      if (dbPassword.length === 64) {
        // DB holds hashed password
        isMatch = (inputHash === dbPassword);
      } else {
        // DB holds plain text password
        isMatch = (password === dbPassword || inputHash === dbPassword);
      }

      if (isMatch) {
        // Fetch current auth version to send back to client for session caching
        let currentVersion = 1;
        const { data: versionRow } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'auth_version')
          .maybeSingle();

        if (versionRow) {
          try {
            const parsed = JSON.parse(versionRow.content || "{}");
            currentVersion = Number(parsed.version) || 1;
          } catch (e) {}
        }

        return res.json({ success: true, auth_version: currentVersion });
      } else {
        return res.json({ success: false, error: "Incorrect password" });
      }
    } catch (err: any) {
      console.error("Error in /api/verify-gate-password:", err);
      return res.status(500).json({ success: false, error: "Server-side verification failed" });
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
