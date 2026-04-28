import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const parseBusinessInput = async (input: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an AI business partner named COB. 
    Analyze the following input from a shopkeeper. 
    The shopkeeper can either be RECORDING something (income, expense, debt) or ASKING A QUESTION about their business history.
    
    SUPPORTED LANGUAGES: 
    - The user can speak in ROMAN URDU (e.g., "Mera 500 ka sale hua", "Ahmed ke 200 baqi"), URDU script, HINDI, ENGLISH, or a mix.
    - "Jama" can mean Income (Sale) OR Payment (returning debt). Use context. 
    - If a person's name is mentioned with "Jama" or "diye", it's usually a PAYMENT.
    
    Category Mapping:
    - INCOME (Sale/Kamai/Jama/Bikri/Income): Money from selling goods.
    - EXPENSE (Kharcha/Expense/Bijli Bill/Rent): Money going out.
    - DEBT (Udhaar/Udhari/Baqi/Baqiya/Credit/Khata): Customer owes YOU money now.
    - PAYMENT (Udhar Wapsi/Paisa mil gaya/Wapis diye/Hisab chukaya): Customer is paying back their debt.
    
    NUMBER DETECTION:
    - Support digits (100, 500) and written numbers (five hundred, sau, hazaar, ek sau bees).
    
    STRICT RULE: If the user says a single number like "100", "₹500", or "five hundred", treat it as an RECORDING of "income" with description "Sale".
    
    STRICT RULE: The user might record MULTIPLE things in one go. You MUST return an array of actions.
    
    STRICT RULE: If the user says "clear the debt" or "hisab khatam kar do" for a person, return amount: -1 for that customer.

    Input: "${input}"

    Rules:
    1. If the user is recording transactions:
       - Return a JSON object with: { intent: "record", actions: [ { amount, type, description, customerName }, ... ] }
       - type must be "income", "expense", "debt", or "payment".
       - EXAMPLE (Mixed Language): "Ahmed ne 100 diye and Sahil took sugar on credit worth 50" -> { "intent": "record", "actions": [ { "amount": 100, "type": "payment", "customerName": "Ahmed", "description": "Payment (Ahmed)" }, { "amount": 50, "type": "debt", "customerName": "Sahil", "description": "Sugar (Sahil)" } ] }
       - EXAMPLE (English): "Income five hundred" -> { "intent": "record", "actions": [ { "amount": 500, "type": "income", "description": "Sale" } ] }
       - EXAMPLE (Plain Number): "500" -> { "intent": "record", "actions": [ { "amount": 500, "type": "income", "description": "Sale" } ] }
       - IMPORTANT: For "debt" or "payment", ALWAYS include the customer's name in the description field like "Item Name (Customer Name)". 
    2. If the user is asking a question:
       - Return a JSON object with: { intent: "query", question: "Summarized question" }
    
    Rule: Focus strictly on business context (buying/selling/debt). 
    
    SPECIAL CASE: If a user says someone "took items and didn't pay" or "left without paying" (Le ke chala gaya, paisay nahi diye), that is a DEBT transaction.
    
    Examples:
    - "Ahmed ne 200 rupay wapis kiye" -> { "intent": "record", "actions": [ { "amount": 200, "type": "payment", "customerName": "Ahmed", "description": "Udhar Wapsi (Ahmed)" } ] }
    - "Usne 50 ki cheeni li par paisay nahi diye" -> { "intent": "record", "actions": [ { "amount": 50, "type": "debt", "description": "Sugar (Baqi)" } ] }
    - "Ahmed ka udhaar kitna hai?" -> { "intent": "query", "question": "Ahmed ka udhaar kitna hai?" }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, enum: ["record", "query"] },
          actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["income", "expense", "debt", "payment"] },
                description: { type: Type.STRING },
                customerName: { type: Type.STRING, nullable: true }
              }
            }
          },
          question: { type: Type.STRING }
        },
        required: ["intent"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const answerBusinessQuestion = async (question: string, context: string, products: any[] = [], coins: number = 0, shopSize: string = 'Small') => {
  const productContext = products.length > 0 
    ? `Available Products and Rates:\n${products.map(p => `- ${p.name}: Rs. ${p.price} (${p.description})`).join('\n')}`
    : "No product rate list available.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a helpful business assistant named COB (Control Our Business). 
    The user can speak in any language (Urdu, Hindi, English, etc). 
    
    PRIMARY RULES:
    1. Always respond in clear Roman Urdu/Hindi mixed with English (e.g., "Sain! Ahmed ka udhar 200 rupay hai").
    2. If the user says "Hello", "Assalam o Alaikum", or "Kaisa ha Hal chal", reply warmly in Urdu (e.g., "Walaikum Assalam! Main theek hoon, aap kaisay hain? Business kaisa chal raha hai?").
    3. Keep the tone very polite, helpful, and "Sain" style (respectful).
    4. If the processing seems complex, you can occasionally start with "Thora sabar karein, main check kar raha hoon..."
    5. No captions or code blocks in the response. Only plain text.

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

  return response.text || "Sain, samajh nahi aaya. Thora saaf batayein (e.g., 'Ahmed ko 500 diye' ya '100 ka kharcha').";
};

