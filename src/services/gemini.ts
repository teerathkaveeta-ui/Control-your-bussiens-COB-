import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const parseBusinessInput = async (input: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `You are an AI business partner named COB. 
    Analyze the following input from a shopkeeper. 
    The shopkeeper can either be RECORDING something (income, expense, debt) or ASKING A QUESTION about their business history.
    
    Urdu/Roman Urdu Phrase Mapping:
    - "Kamai" / "Sale" / "کمائی" = income
    - "Kharcha" / "Expense" / "خرچہ" = expense
    - "Udhaar" / "Udhari" / "Baqi" / "ادھار" = debt
    - "Jama" / "Paisa mil gaya" / "Wapsi" / "جمع" = payment
    - "Dukan ki itni kamai" -> income
    - "Aaj itna kharcha hua" -> expense
    - "Itni udhari likh lo" -> debt
    
    SUPPORTED NUMBER FORMATS:
    - Digits: 100, 500, 1000
    - Roman Urdu words: "sau" (100), "pachaas" (50), "hazaar" (1000), "das" (10), "bees" (20)
    - Urdu words: "سو", "پچاس", "ہزار"
    
    STRICT RULE: If the user says a single number like "100", "₹500", "sau rupee", or "سو روپے", treat it as an RECORDING of "income" with description "Sale".
    
    STRICT RULE: If the user says something like "Kamai 500", "500 kamai", "Kharcha 200", "200 kharcha", "Udhari 100", "100 udhari", treat these as CLEAR RECORDINGS.
    
    STRICT RULE: The user might record MULTIPLE things in one go. You MUST return an array of actions.

    Input: "${input}"

    Rules:
    1. If the user is recording transactions:
       - Return a JSON object with: { intent: "record", actions: [ { amount, type, description, customerName }, ... ] }
       - type must be "income", "expense", "debt", or "payment".
       - "payment" (Jama) is when a CUSTOMER GIVES YOU money they owed. Phrases: "paisay mil gaye", "udhar wapis kiya", "Jama karlo", "Ahmed ne 200 diye" (if its from a borrower).
       - "debt" (Udhaar/Udhari/Baqiya) is when YOU GIVE items/money to a customer on credit. Phrases: "udhar diya", "khata me likh lo", "Ahmed ko 200 ki cheez di", "Itni udhari", "100 udhari".
       - "income" (Kamai/Sale) is general sales. Phrases: "itni kamai", "itne ki sell hui", "Kamai 500".
       - "expense" (Kharcha) is shop expenses (e.g., buying stock, paying electric bill). Phrases: "itna kharcha hua", "bijli ka bill diya", "200 kharcha".
       - EXAMPLE: "Ahmed ne 100 diye aur Sahil ko 50 ki cheeni di" -> { "intent": "record", "actions": [ { "amount": 100, "type": "payment", "customerName": "Ahmed", "description": "Payment (Ahmed)" }, { "amount": 50, "type": "debt", "customerName": "Sahil", "description": "Sugar (Sahil)" } ] }
       - EXAMPLE: "500 kamai likho" -> { "intent": "record", "actions": [ { "amount": 500, "type": "income", "description": "Sale" } ] }
       - EXAMPLE: "Kamai five hundred" -> { "intent": "record", "actions": [ { "amount": 500, "type": "income", "description": "Sale" } ] }
       - EXAMPLE: "two hundred kharcha" -> { "intent": "record", "actions": [ { "amount": 200, "type": "expense", "description": "Shop Expense" } ] }
       - EXAMPLE: "Sajid ki udhari 1000" -> { "intent": "record", "actions": [ { "amount": 1000, "type": "debt", "customerName": "Sajid", "description": "Udhaar (Sajid)" } ] }
       - IMPORTANT: If the user just says a number or "₹100" without context, default to type "income" and description "Sale".
       - IMPORTANT: For "debt" or "payment", ALWAYS include the customer's name in the description field like "Item Name (Customer Name)". 
       - If the user says "clear the debt" or "hisab clear kar do" without a number, return amount: -1.
    2. If the user is asking a question (e.g., "Ahmed ka udhar kitna hai?"):
       - Return a JSON object with: { intent: "query", question: "The summarized question" }

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

  return JSON.parse(response.text);
};

export const answerBusinessQuestion = async (question: string, context: string, products: any[] = [], coins: number = 0, shopSize: string = 'Small') => {
  const productContext = products.length > 0 
    ? `Available Products and Rates:\n${products.map(p => `- ${p.name}: Rs. ${p.price} (${p.description})`).join('\n')}`
    : "No product rate list available.";

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
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
