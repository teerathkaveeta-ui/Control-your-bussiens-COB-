export const processWithGemini = async (userInput: string, customers: any[] = [], recentTransactions: any[] = [], geminiApiKey?: string) => {
  const response = await fetch("/api/gemini/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userInput,
      customers,
      recentTransactions,
      geminiApiKey,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Gemini API request failed");
  }

  return response.json();
};

