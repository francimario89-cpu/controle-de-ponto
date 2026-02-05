
import { GoogleGenAI, Modality, Type } from "@google/genai";

export const getGeminiResponse = async (prompt: string, records: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: `Contexto de Registros de Ponto:\n${records.join('\n\n')}\n\nPergunta do Colaborador: ${prompt}` }
        ]
      }
    ],
    config: {
      systemInstruction: "Você é o assistente virtual da ForTime PRO. Especialista em RH e CLT. Responda dúvidas sobre marcações de ponto, banco de horas e direitos trabalhistas com base nos dados fornecidos e na legislação brasileira. Seja profissional, conciso e acolhedor.",
      temperature: 0.5,
    }
  });

  return response.text || "Desculpe, tive um problema ao processar sua consulta de RH.";
};

export const generateAttendanceSummary = async (records: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Analise este histórico de ponto e crie um resumo executivo:\n${records.join('\n\n')}` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING, description: "Resumo da pontualidade e carga horária." },
          topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alertas (Ex: Atrasos, Horas Extras)." },
          faqs: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                q: { type: Type.STRING, description: "Pergunta comum sobre este cartão." },
                a: { type: Type.STRING, description: "Resposta técnica baseada na CLT." }
              }
            }
          }
        },
        required: ["overview", "topics", "faqs"]
      },
      systemInstruction: "Você é um auditor de folha de pagamento. Identifique inconsistências e resuma a jornada.",
    }
  });
  
  const text = response.text?.trim() || "{}";
  return JSON.parse(text);
};

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
