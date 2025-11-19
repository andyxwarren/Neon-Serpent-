import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "../constants";

const apiKey = process.env.API_KEY;
// Initialize safely, allowing the app to run even if the key is missing (graceful degradation)
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateCommentary = async (event: 'start' | 'kill' | 'die' | 'boost', playerName: string, score: number): Promise<string> => {
  if (!ai) return "";

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
      // Keep boost frequent calls rare or local to avoid rate limits, but for completeness:
      return ""; 
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "";
  }
};
