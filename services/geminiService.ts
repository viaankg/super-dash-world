
import { GoogleGenAI } from "@google/genai";

export async function getVictoryMessage(playerName: string, timeTaken: number, score: number): Promise<string> {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The player ${playerName} just finished a racing game called Super Dash World. 
      Their time was ${timeTaken.toFixed(2)} seconds and their final score was ${score}. 
      Generate a short, super enthusiastic, kid-friendly victory message (max 2 sentences).`,
      config: {
        temperature: 0.9,
      }
    });
    return response.text || "Awesome job, champion! You're a racing superstar!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Great driving! You zoomed across the finish line like a pro!";
  }
}
