
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Use process.env.API_KEY directly in initialization as per guidelines.

export const getGeminiResponse = async (prompt: string, sources: string[]) => {
  // Always create a new instance before use to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: `Contexto das Fontes:\n${sources.join('\n\n')}\n\nPergunta: ${prompt}` }
        ]
      }
    ],
    config: {
      systemInstruction: "Você é o assistente do NotebookLM. Responda APENAS com base nas fontes fornecidas. Se não souber, diga que a informação não está nas fontes. Use markdown para formatação.",
      temperature: 0.4,
    }
  });

  // Fixed: Use .text property instead of method.
  return response.text || "";
};

export const generateNotebookGuide = async (sources: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Analise estas fontes e crie um guia estruturado:\n${sources.join('\n\n')}` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING, description: "Um resumo geral de 3 parágrafos sobre as fontes." },
          topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 5 tópicos principais abordados." },
          faqs: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                q: { type: Type.STRING },
                a: { type: Type.STRING }
              }
            }
          }
        },
        required: ["overview", "topics", "faqs"]
      },
      systemInstruction: "Você é um analista de documentos. Extraia a essência do material fornecido.",
    }
  });
  
  const text = response.text?.trim() || "{}";
  return JSON.parse(text);
};

export const generatePodcastScript = async (sources: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Crie um roteiro de podcast estilo 'Deep Dive' sobre estas fontes entre Alex e Sam:\n${sources.join('\n\n')}` }] }],
    config: {
      systemInstruction: "O roteiro deve ser natural, amigável e em Português. Formato: 'Alex: [texto]' e 'Sam: [texto]'.",
    }
  });
  return response.text || "";
};

// Fixed: Manual implementation of audio decoding as required by guidelines.
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

// Fixed: Manual implementation of base64 decoding following provided example.
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const generateAudioOverview = async (script: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Sam', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
          ]
        }
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};
