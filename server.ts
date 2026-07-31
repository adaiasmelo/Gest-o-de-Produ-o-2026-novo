import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as admin from 'firebase-admin';
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini AI
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Initialize Firebase Admin if configuration exists
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount: any = null;
      const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

      // Attempt 1: direct JSON parse
      try {
        serviceAccount = JSON.parse(rawEnv);
      } catch {}

      // Attempt 2: base64 decode if string
      if (!serviceAccount) {
        try {
          const decoded = Buffer.from(rawEnv, 'base64').toString('utf-8');
          if (decoded.trim().startsWith('{')) {
            serviceAccount = JSON.parse(decoded);
          }
        } catch {}
      }

      // Attempt 3: unwrap wrapping quotes
      if (!serviceAccount && ((rawEnv.startsWith('"') && rawEnv.endsWith('"')) || (rawEnv.startsWith("'") && rawEnv.endsWith("'")))) {
        try {
          const inner = rawEnv.slice(1, -1);
          serviceAccount = JSON.parse(inner);
        } catch {}
      }

      // Attempt 4: replace unescaped newlines in JSON string
      if (!serviceAccount) {
        try {
          const fixedNewlines = rawEnv.replace(/\r?\n/g, '\\n');
          serviceAccount = JSON.parse(fixedNewlines);
        } catch {}
      }

      if (serviceAccount && typeof serviceAccount === 'object') {
        if (typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log("Firebase Admin initialized successfully");
        }
      } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT exists but could not be parsed as a valid JSON object.");
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
    }
  } catch (error) {
    console.warn("Firebase Admin setup warning:", error instanceof Error ? error.message : String(error));
  }

  // API Routes
  app.post("/api/extract-production", async (req, res) => {
    try {
      const { base64Image } = req.body;
      if (!base64Image) return res.status(400).json({ error: "Image is required" });

      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          },
          "Extraia os dados de produção desta imagem. Retorne JSON."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              operator: { type: Type.STRING },
              machine: { type: Type.STRING },
              shift: { type: Type.STRING },
              grossWeight: { type: Type.NUMBER },
              tara: { type: Type.NUMBER },
              netWeight: { type: Type.NUMBER },
              volumes: { type: Type.NUMBER },
              tubetes: { type: Type.NUMBER },
              ecoA: { type: Type.NUMBER },
              ecoBP: { type: Type.NUMBER },
              ecoBM: { type: Type.NUMBER },
              borraTotal: { type: Type.NUMBER },
              manutencaoMin: { type: Type.NUMBER },
              manutencaoMotivo: { type: Type.STRING },
              processoMin: { type: Type.NUMBER },
              processoMotivo: { type: Type.STRING },
              outrosMin: { type: Type.NUMBER },
              outrosMotivo: { type: Type.STRING },
            }
          }
        }
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Gemini extraction error:", error);
      res.status(500).json({ error: "Failed to extract production data" });
    }
  });

  app.post("/api/polish-cause", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Melhore o seguinte texto de descrição de uma causa/problema de manutenção industrial para torná-lo altamente profissional, claro, técnico e objetivo (em português brasileiro). Corrija ortografia e gramática, mantendo exatamente o mesmo sentido original.

Retorne APENAS o texto aprimorado final, sem explicações, sem introduções e sem aspas.

Texto original:
"${text}"`,
        config: {
          systemInstruction: "Você é um assistente especialista em manutenção industrial. Sua única função é reescrever descrições de falhas, problemas ou causas de manutenção fornecidas pelos operadores de forma profissional, clara, técnica e concisa em português brasileiro. Não adicione saudações, conclusões, comentários ou formatações extras. Retorne apenas o texto limpo."
        }
      });

      const polishedText = response.text?.trim() || text;
      res.json({ polishedText });
    } catch (error) {
      console.error("Gemini polish-cause error:", error);
      res.status(500).json({ error: "Failed to polish text" });
    }
  });

  app.post("/api/send-notification", async (req, res) => {
    const { token, title, body } = req.body;

    if (!token) {
       return res.status(400).json({ error: "Token is required" });
    }

    try {
      if (admin.apps.length > 0) {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            id: Math.random().toString(36).substring(7),
            title,
            body,
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              priority: 'high',
              visibility: 'public',
              channelId: 'high_importance_channel',
              color: '#1e3a8a',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                'content-available': 1,
                alert: {
                  title,
                  body
                }
              },
            },
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              title,
              body,
              icon: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              badge: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              vibrate: [200, 100, 200, 100, 200],
              requireInteraction: true,
              silent: false,
              actions: [
                {
                  action: 'open',
                  title: 'Ver Produção'
                },
                {
                  action: 'dismiss',
                  title: 'Ignorar'
                }
              ]
            },
            fcmOptions: {
              link: '/'
            }
          }
        });
        res.json({ success: true });
      } else {
        // Fallback for when admin is not fully configured - log for debugging
        console.log("Push notification simulation:", { title, body });
        res.json({ success: true, simulated: true });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
