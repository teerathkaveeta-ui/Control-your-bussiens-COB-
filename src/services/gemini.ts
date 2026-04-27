import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const parseBusinessInput = async (input: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI business partner named COB. 
    Analyze the following input from a shopkeeper. 
    The shopkeeper can either be RECORDING something (income, expense, debt) or ASKING A QUESTION about their business history.

    Input: "${input}"

    Rules:
    1. If the user is recording a transaction:
       - Return a JSON object with: { intent: "record", data: { amount, type, description, customerName } }
       - type must be "income", "expense", "debt", or "payment".
       - "payment" is when a customer returns money they owed (udhar wapis kiya).
    2. If the user is asking a question (e.g., "Ahmed ka udhar kitna hai?"):
       - Return a JSON object with: { intent: "query", question: "The summarized question" }

    Rule: Focus strictly on business context (buying/selling/debt). 
    If you hear something that sounds like "Gheyo" or "Ghee", it's a product.
    If you hear "wapis diye" or "paisa mil gaya" from a borrower, it's a "payment".
    
    Examples:
    - "Ahmed ne 200 rupay wapis kiye" -> { "intent": "record", "data": { "amount": 200, "type": "payment", "customerName": "Ahmed", "description": "Udhar wapsi" } }
    - "Ahmed ko 200 ki cheeni udhar di" -> { "intent": "record", "data": { "amount": 200, "type": "debt", "customerName": "Ahmed", "description": "Sugar (cheeni)" } }
    - "Gheyo ke 500 diye" -> { "intent": "record", "data": { "amount": 500, "type": "expense", "description": "Ghee (Gheyo)" } }
    - "Ajj 500 ki kamai hui" -> { "intent": "record", "data": { "amount": 500, "type": "income", "description": "Daily Kamai" } }
    - "Ahmed ka udhaar kitna hai?" -> { "intent": "query", "question": "Ahmed ka udhaar kitna hai?" }
    - "Kal kitni kamai hui thi?" -> { "intent": "query", "question": "Kal kitni kamai hui thi?" }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, enum: ["record", "query"] },
          data: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["income", "expense", "debt", "payment"] },
              description: { type: Type.STRING },
              customerName: { type: Type.STRING, nullable: true }
            }
          },
          question: { type: Type.STRING }
        },
        required: ["intent"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const answerBusinessQuestion = async (question: string, context: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a helpful business assistant named COB for a shopkeeper in Pakistan. 
    STRRICT RULE: Always respond in Roman Urdu only (e.g., "Ahmed ka udhar 200 rupay hai"). 
    Do NOT use English for the answer. 
    Keep the tone polite and professional (like a business partner).

    ACCOUNTABILITY RULES:
    1. If asked about a loan, always mention the "Customer Name" from the records.
    2. If asked about an expense, mention the "Description".
    3. If asked why income is "decreasing" or low, look at the "expense" entries and "debt" entries today vs yesterday to explain it.
    4. Never say "I don't know" if the data is in the history below.

    Context (Transaction History):
    ${context}
    
    User Question: "${question}"`,
  });

  return response.text;
};
