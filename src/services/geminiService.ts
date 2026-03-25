import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { TelemetryData, HealthStatus, DriverBehavior } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Generates context-aware suggestions for the driver.
 */
export async function getAISuggestions(
  data: TelemetryData,
  behavior: DriverBehavior,
  health: HealthStatus
): Promise<string> {
  const prompt = `
    You are a smart vehicle assistant. Analyze the following telemetry and health data:
    - RPM: ${data.rpm}
    - Speed: ${data.vss} km/h
    - Throttle: ${data.throttle}%
    - Driver Behavior: ${behavior}
    - Vehicle Health Score: ${health.score}
    - Health Status: ${health.status}
    - Predicted Failures: ${health.predictions.join(", ")}
    - Fault Codes: ${data.dtcs.join(", ")}

    Based on this, provide 2-3 short, actionable suggestions for the driver in a friendly but professional tone.
    Focus on fuel efficiency, safety, and maintenance.
    Keep it concise (max 100 words).
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No suggestions available at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to fetch AI suggestions. Please check your connection.";
  }
}

/**
 * Performs a deep ML-based health analysis using high thinking mode.
 */
export async function performDeepAnalysis(
  data: TelemetryData,
  history: TelemetryData[]
): Promise<string> {
  const prompt = `
    Perform a deep technical analysis of the vehicle's health based on the following telemetry history:
    ${JSON.stringify(history.slice(-10))}
    
    Current Data:
    ${JSON.stringify(data)}

    Identify potential long-term issues, component wear patterns, and provide a detailed predictive maintenance schedule.
    Use your high reasoning capabilities to correlate multiple sensors (e.g., fuel trim vs O2 voltage vs engine load).
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text || "Deep analysis failed to generate content.";
  } catch (error) {
    console.error("Deep Analysis Error:", error);
    return "Deep analysis unavailable. Please check your API quota.";
  }
}

export async function getChatResponse(message: string, telemetry: TelemetryData): Promise<string> {
  const prompt = `
    User Message: ${message}
    
    Current Vehicle Telemetry Context:
    - RPM: ${telemetry.rpm}
    - Speed: ${telemetry.vss} km/h
    - Engine Load: ${telemetry.engineLoad}%
    - Coolant Temp: ${telemetry.coolantTemp}°C
    - Active Fault Codes: ${telemetry.dtcs.length > 0 ? telemetry.dtcs.join(", ") : "None"}

    Provide a helpful, concise response to the user's message, taking the current vehicle telemetry into account if relevant.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
}

/**
 * Multi-turn chat for vehicle diagnostics.
 */
export function createDiagnosticChat() {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are an expert vehicle diagnostic assistant. You help users understand OBD-II codes, maintenance schedules, and vehicle health. Be technical but explain things simply.",
    },
  });
}
