import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/generate-ideas", async (req, res) => {
  try {
    const { keywords, mood } = req.body;
    
    const prompt = `Generate 3 creative and unique project ideas based on the following keywords: ${keywords}. 
    The mood should be: ${mood}. 
    Return the result as a JSON array of objects, each with 'title', 'description', and 'difficulty' (Easy, Medium, Hard).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
            },
            required: ["title", "description", "difficulty"]
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/blueprint", async (req, res) => {
  try {
    const { idea } = req.body;
    
    const prompt = `Create a detailed project blueprint for the following idea: "${idea.title} - ${idea.description}".
    Include:
    1. A list of key features.
    2. Recommended tech stack.
    3. A 3-step milestones plan.
    Return as a JSON object with keys: 'features', 'techStack', 'milestones'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            features: { type: Type.ARRAY, items: { type: Type.STRING } },
            techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
            milestones: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["features", "techStack", "milestones"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
