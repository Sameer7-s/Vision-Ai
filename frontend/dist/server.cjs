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
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, type } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(200).json({
          success: false,
          warning: "Gemini API key is not configured yet. To enable live AI-Powered code generation, please configure your GEMINI_API_KEY inside the 'Settings > Secrets' panel of AI Studio.",
          code: `// Simulated high-fidelity enterprise-grade code template for:
// "${prompt}"

const express = require('express');
const database = require('./db');
const app = express();

// Middleware
app.use(express.json());
app.use('/auth', require('./routes/auth'));

// AI-Optimized Database Sink
app.post('/api/sink', async (req, res) => {
  const { payload } = req.body;
  try {
    const response = await database.storeAndVerify(payload);
    res.status(200).json({ status: "success", transactionId: response.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Service active on Port 3000"));`
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const systemInstruction = type === "schema" ? "You are an enterprise system database architect. Generate a highly professional database schema definition (e.g., PostgreSQL, Prisma, MongoDB, or SQL DDL) based on the input description. Return ONLY valid syntax or clean code comments. No markdown files or long intros." : "You are a senior-grade backend developer. Generate a clean, complete production-quality API route or controller file in Node.js, Express, TypeScript, Python, or Go as requested. Ensure proper error handling, logging, and security headers. Clean formatted code only.";
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2
          // low temperature for precise code generation
        }
      });
      const generatedText = response.text || "";
      res.json({
        success: true,
        code: generatedText
      });
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate backend architecture"
      });
    }
  });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server", err);
});
//# sourceMappingURL=server.cjs.map
