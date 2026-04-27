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
       - "payment" (Jama) is when a CUSTOMER GIVES YOU money they owed. Phrases: "paisay mil gaye", "udhar wapis kiya", "Ahmed ne 200 diye" (if its from a borrower).
       - "debt" (Udhaar) is when YOU GIVE items/money to a customer on credit. Phrases: "udhar diya", "khata me likh lo", "Ahmed ko 200 ki cheez di".
       - "income" (Kamai) is general sales.
       - "expense" (Kharcha) is shop expenses (e.g., buying stock, paying electric bill).
       - IMPORTANT: If the user just says a number or "₹100" without context, default to type "income" and description "Sale".
       - IMPORTANT: If the user says they "returned goods" or "received a refund" for an expense (e.g., "5000 ka maal wapis kar diya"), use type "expense" but make the amount NEGATIVE (e.g., amount: -5000).
       - IMPORTANT: If a customer returns a sale (refund), use type "income" but make the amount NEGATIVE.
       - IMPORTANT: For "debt" or "payment", ALWAYS include the customer's name in the description field like "Item Name (Customer Name)". 
         Example: "Biscuit (Sahil)" or "Udhar Wapsi (Ahmed)".
       - IMPORTANT: Only set "amount" if the user EXPLICITLY mentions a number. 
       - If the user says "clear the debt" or "hisab clear kar do" without a number, return amount: -1.
    2. If the user is asking a question (e.g., "Ahmed ka udhar kitna hai?"):
       - Return a JSON object with: { intent: "query", question: "The summarized question" }

    Rule: Focus strictly on business context (buying/selling/debt). 
    If you hear something that sounds like "Gheyo" or "Ghee", it's a product.
    If you hear "wapis diye" or "paisa mil gaya" from a borrower, it's a "payment".
    
    Examples:
    - "Ahmed ne 200 rupay wapis kiye" -> { "intent": "record", "data": { "amount": 200, "type": "payment", "customerName": "Ahmed", "description": "Udhar Wapsi (Ahmed)" } }
    - "Ahmed ne 200 diye" -> { "intent": "record", "data": { "amount": 200, "type": "payment", "customerName": "Ahmed", "description": "Payment (Ahmed)" } }
    - "Ahmed ne saara udhaar wapis kar diya" -> { "intent": "record", "data": { "amount": -1, "type": "payment", "customerName": "Ahmed", "description": "Settlement (Ahmed)" } }
    - "Ahmed ko 200 ki cheeni udhar di" -> { "intent": "record", "data": { "amount": 200, "type": "debt", "customerName": "Ahmed", "description": "Sugar (Ahmed)" } }
    - "Sahil ne 50 ka biscuit liya udhar" -> { "intent": "record", "data": { "amount": 50, "type": "debt", "customerName": "Sahil", "description": "Biscuit (Sahil)" } }
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
              amount: { type: Type.NUMBER, description: "The amount recorded. Use -1 if full clearing of debt is requested without a value." },
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

export const answerBusinessQuestion = async (question: string, context: string, products: any[] = [], coins: number = 0, shopSize: string = 'Small') => {
  const productContext = products.length > 0 
    ? `Available Products and Rates:\n${products.map(p => `- ${p.name}: Rs. ${p.price} (${p.description})`).join('\n')}`
    : "No product rate list available.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a helpful business assistant named COB (Control Our Business) for a shopkeeper in Pakistan. 
    STRRICT RULE: Always respond in Roman Urdu only (e.g., "Ahmed ka udhar 200 rupay hai"). 
    Do NOT use English for the answer except for names/numbers.
    Keep the tone polite and professional.

    Shop Status:
    - Current Coins: ${coins}
    - Shop Size: ${shopSize} (Levels: Small -> Medium -> Large -> Palatial)

    Instructions for Game/Shop Actions:
    1. If the user asks to "Increase shop size" or "Upgrade shop" (Dukan bari karni hai):
       - If current coins are >= 1000: Reply that it's done and append "UPGRADE_SUCCESS" at the END of your Urdu response.
       - If current coins are < 1000: Reply that they need more coins (e.g., "Sain, upgrade ke liye 1000 coins chahiye, abhi sirf ${coins} hain.").
    2. If the user asks about "Watch Ad" or "Get coins" (Ad dekho, coins chahiye):
       - Politely explain that ads are currently disabled to provide a better experience for the shopkeeper.
    3. If asked "Do I have enough coins?" (Kya coins kafi hain?):
       - Tell them their current balance and how much needed for upgrade (1000).

    Product/Price Information (Rate List):
    ${productContext}

    Context (Transaction History):
    ${context}
    
    Instructions for Product Requests (WhatsApp Auto-Reply Logic):
    1. If the user asks about an item (e.g., "Toothpaste hai?", "Chini ka rate?"):
       - Check if the item exists in the "Rate List" above.
       - IF FOUND: Mention the price from the list clearly.
       - IF NOT FOUND: 
         a) Tell the OWNER (the current user) that this item is missing from the list (e.g., "Sain, ye cheez rate list mein nahi hai, baraye maharbani add kar dein").
         b) Also provide a message for the WhatsApp customer: "Ye cheez abhi available nahi hai."
    
    Other Instructions:
    2. If asked about balances or history, use "Transaction History".
    3. If asked about a loan, always mention the "Customer Name" from the records.
    4. Never say "I don't know" if the data is in the history or list below.

    User Question: "${question}"`,
  });

  return response.text;
};
