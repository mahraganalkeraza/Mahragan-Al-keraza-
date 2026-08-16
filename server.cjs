var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = "https://nrigdgdiqjdzieryjjod.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWdkZ2RpcWpkemllcnlqam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg3MTIsImV4cCI6MjA5NjM0NDcxMn0.9YMt8Vxy4lJ_7RBpjvBd9Gv9TB-AFv88U6pDoH9A3Fo";
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseAnonKey);
function getSHA256(input) {
  return import_crypto.default.createHash("sha256").update(input).digest("hex");
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use((0, import_compression.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/auth-version", async (req, res) => {
    try {
      const { data: sysRow, error: sysError } = await supabase.from("system_settings").select("*").eq("id", "1").maybeSingle();
      if (sysError) throw sysError;
      const dbPassword = sysRow?.admin_password || "111155";
      const { data: versionRow, error: versionError } = await supabase.from("system_settings").select("*").eq("id", "auth_version").maybeSingle();
      let currentVersion = 1;
      let lastPasswordCached = dbPassword;
      if (!versionRow) {
        const initialContent = JSON.stringify({ version: 1, last_password: dbPassword });
        await supabase.from("system_settings").upsert({ id: "auth_version", content: initialContent });
      } else {
        try {
          const parsed = JSON.parse(versionRow.content || "{}");
          currentVersion = Number(parsed.version) || 1;
          lastPasswordCached = parsed.last_password || "";
          if (dbPassword !== lastPasswordCached) {
            currentVersion += 1;
            console.log(`[Security Alert] Password change detected. Incrementing auth_version to ${currentVersion}`);
            const updatedContent = JSON.stringify({ version: currentVersion, last_password: dbPassword });
            await supabase.from("system_settings").upsert({ id: "auth_version", content: updatedContent });
          }
        } catch (parseErr) {
          console.error("Error parsing auth_version row content:", parseErr);
        }
      }
      res.json({ auth_version: currentVersion });
    } catch (err) {
      console.error("Error in /api/auth-version:", err);
      res.json({ auth_version: 1, error: err.message });
    }
  });
  app.post("/api/verify-gate-password", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ success: false, error: "Password input is required" });
      }
      const { data: sysRow, error: sysError } = await supabase.from("system_settings").select("*").eq("id", "1").maybeSingle();
      if (sysError) throw sysError;
      const dbPassword = sysRow?.admin_password || "111155";
      const inputHash = getSHA256(password);
      let isMatch = false;
      if (dbPassword.length === 64) {
        isMatch = inputHash === dbPassword;
      } else {
        isMatch = password === dbPassword || inputHash === dbPassword;
      }
      if (isMatch) {
        let currentVersion = 1;
        const { data: versionRow } = await supabase.from("system_settings").select("*").eq("id", "auth_version").maybeSingle();
        if (versionRow) {
          try {
            const parsed = JSON.parse(versionRow.content || "{}");
            currentVersion = Number(parsed.version) || 1;
          } catch (e) {
          }
        }
        return res.json({ success: true, auth_version: currentVersion });
      } else {
        return res.json({ success: false, error: "Incorrect password" });
      }
    } catch (err) {
      console.error("Error in /api/verify-gate-password:", err);
      return res.status(500).json({ success: false, error: "Server-side verification failed" });
    }
  });
  const PORT = 3e3;
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
