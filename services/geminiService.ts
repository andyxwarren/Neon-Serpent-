
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "../constants";

const apiKey = process.env.API_KEY;
// Initialize safely, allowing the app to run even if the key is missing (graceful degradation)
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Circuit breaker for 429 errors
let isRateLimited = false;
let rateLimitResetTime = 0;

export const generateCommentary = async (event: 'start' | 'kill' | 'die' | 'boost', playerName: string, score: number): Promise<string> => {
  if (!ai) return "";

  // Check circuit breaker
  if (isRateLimited) {
    if (Date.now() > rateLimitResetTime) {
      isRateLimited = false; // Reset after cooldown
    } else {
      return ""; // Silently fail during cooldown
    }
  }

  let prompt = "";
  switch (event) {
    case 'start':
      prompt = `You are a hype-man for a neon snake battle game. The player "${playerName}" just started. Give a short, 1-sentence energetic welcome.`;
      break;
    case 'kill':
      prompt = `You are a sarcastic game announcer. The player "${playerName}" just eliminated an opponent. Score is ${score}. Give a short, 1-sentence gloating remark or roast.`;
      break;
    case 'die':
      prompt = `You are a sympathetic but slightly mocking game announcer. The player "${playerName}" died with a score of ${score}. Give a short, 1-sentence condolence or funny roast.`;
      break;
    case 'boost':
      return ""; 
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    // Check for 429 or other quota errors
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      console.warn("Gemini API Rate Limit Hit. Pausing requests for 60 seconds.");
      isRateLimited = true;
      rateLimitResetTime = Date.now() + 60000; // 1 minute cooldown
    } else {
      console.error("Gemini API Error:", error);
    }
    return "";
  }
};
