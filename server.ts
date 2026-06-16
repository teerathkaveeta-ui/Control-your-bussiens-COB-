import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini AI Processing Endpoint
  app.post("/api/gemini/process", async (req, res) => {
    try {
      const { userInput, customers = [], recentTransactions = [], geminiApiKey } = req.body;
      if (!userInput) {
        return res.status(400).json({ error: "userInput is required" });
      }

      const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not configured. Falling back to simple matching.");
        return res.json({
          intent: "general_chat",
          response: "Please configure your GEMINI_API_KEY in the app's keys panel to enable smart voice bookkeeping!"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Special intercept for Omegle-style merchant-to-merchant chat roleplay
      if (userInput.startsWith("[OMEGLE_CHAT]")) {
        const omeglePrompt = `
You are playing the role of an anonymous South Asian shopkeeper participating in an anonymous text chat room (like Omegle for merchants).
Details of your persona:
- Adopt a natural, colloquial name and town (e.g. Sajid from Lahore, Kabir from Old Delhi, Farooq from Peshawar).
- Keep conversations ultra-natural, friendly, written in Roman Urdu / Hindi (Urdu written in English script) or Urdu. Say things like "Aao bhai kaise ho? Aaj to mandi chal rahi hai...", "Mehngai ne bura haal kar diya..." etc.
- React directly and conversationally to the user's message.
- Talk about merchant topics: rates of flour, sugar, oil, annoying customers who don't pay dues (udhar), electricity bills, margins, or today's business.
- Keep the response short, conversational, and matching a real human chat (1-3 sentences max). NEVER sound like an AI assistant.

Message details and chat history: ${userInput}
`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: omeglePrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: { type: Type.STRING },
                response: { type: Type.STRING, description: "Colloquial anonymous merchant response." }
              },
              required: ["intent", "response"]
            }
          }
        });
        const responseText = response.text || "{}";
        const resultObj = JSON.parse(responseText.trim());
        resultObj.intent = "general_chat";
        return res.json(resultObj);
      }

      const prompt = `
You are the AI brain of "COB" (Control Your Business), a smart voice-enabled business ledger application for India/Pakistan shopkeepers.
The user interacts via voice transcriptions or text commands in Roman Urdu (Urdu written in English script like "Sahil ke ₹50 biscuit hai vo udhar hai"), pure Urdu, Hindi, or English.

Current Date & Time: ${new Date().toISOString()}

Context Data from Database:
- Customers List: ${JSON.stringify(customers)}
- Recent Transactions: ${JSON.stringify(recentTransactions)}

Analyze the user's input: "${userInput}" and deduce their intent.

CRITICAL INTENT RULES:
1. "query_info": If the user is asking a question (e.g. asking who owes money, whose udhar is pending, what is the ledger balance, who are the debtors, "batao ye udhar kiski hai?", "udhar kis kis ki hai?", "Sahil ka kya balance hai?"), you MUST output "intent": "query_info".
   - DO NOT confuse existing context data in "Context Data from Database" as requests to record them. The context is only for referencing.
   - Set "response" to a friendly Urdu/Roman Urdu answer summarizing the specific database details. For example: "Abhi Sahil ka Rs. 50 aur Ali ka Rs. 100 udhar outstanding hai."
   - Never output a "transaction" object for "query_info".

2. "record_transaction": ONLY use when the user's current input explicitly wants to record a NEW transaction right now.
   - Must contain a clear transaction action (paying, buying, lending, borrowing) and usually an amount or description.
   - If the user just says "yaar ye udhar kiski hai" or "batao ye kis ka udhar hai", this is NOT recording a transaction! This is asking a question! Set intent to "query_info".
   - Types of transactions:
     - "income": sales/earnings (e.g., "500 ki sale ho gyi")
     - "expense": expenditure/bills/purchases (e.g., "chai pe 50 kharch")
     - "debt": active credit/udhar being given (e.g., "sahil ke 50 biscuit udhar hai", "Sohail ne ₹50 ki cheeze udhar li")
     - "payment": payment/dues received (e.g., "sahil ne ₹50 jama karwaye", "Sohail ne ₹200 wapis kiye")
   - NOTE: Extract 'customerName' and normalize it to match existing customer names if they look similar.

3. "general_chat": Conversational greetings, chit-chat, or general questions about how the app works.

Your response must strictly follow the requested JSON Schema. All numbers should be float/integer as expected.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description: "Intent of the user input. Must be 'record_transaction', 'query_info', or 'general_chat'."
              },
              transaction: {
                type: Type.OBJECT,
                description: "Details of the transaction, only populated if intent is 'record_transaction'",
                properties: {
                  amount: { type: Type.NUMBER, description: "The amount in numbers. Mandatory for 'record_transaction'." },
                  type: { 
                    type: Type.STRING, 
                    description: "The type of transaction. Must be 'income', 'expense', 'debt', or 'payment'." 
                  },
                  customerName: { type: Type.STRING, description: "Name of the customer if mentioned, otherwise null." },
                  description: { type: Type.STRING, description: "Item name, service description or details of the transaction." },
                  phone: { type: Type.STRING, description: "Phone number of the customer if mentioned, otherwise null." }
                }
              },
              response: {
                type: Type.STRING,
                description: "Concise response answering user's query or confirming the transaction recorded. Use Urdu / Roman Urdu if requested in Urdu, otherwise English."
              }
            },
            required: ["intent", "response"]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText.trim());
      res.json(resultObj);

    } catch (err: any) {
      console.error("Gemini API Error in backend:", err);
      res.status(500).json({ error: err.message || "Failed to process request through Gemini" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
