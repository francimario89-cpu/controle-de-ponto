
// @google/genai coding standards: Use Type from @google/genai
import { GoogleGenAI, Type, Modality } from "@google/genai";

export const getGeminiResponse = async (prompt: string, records: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: `Contexto de Registros de Ponto:\n${records.join('\n\n')}\n\nPergunta: ${prompt}` }
      ]
    },
    config: {
      systemInstruction: "Você é o assistente virtual do PontoExato. Especialista em RH e CLT. Responda dúvidas sobre marcações de ponto, banco de horas e direitos trabalhistas. Seja profissional e direto.",
      temperature: 0.5,
    }
  });
  return response.text || "Desculpe, tive um problema ao processar sua consulta.";
};

export const auditCompliance = async (employeeName: string, records: string[], workShift: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const auditPrompt = `
    Analise o ponto de ${employeeName}.
    Carga Horária Contratual: ${workShift}.
    Registros de Ponto (Data/Hora):
    ${records.join('\n')}

    Instruções:
    1. Calcule o total de horas trabalhadas em cada dia.
    2. Identifique explicitamente HORAS FALTANTES (débito) ou HORAS EXTRAS (crédito) em relação à carga de ${workShift}.
    3. Verifique se houve esquecimento de batida (registros ímpares no dia).
    4. Analise o intervalo de almoço (mínimo 1h).
    5. Avalie o risco trabalhista (Baixo, Médio, Alto).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [{ text: auditPrompt }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING, description: "Nível de risco: Baixo, Médio ou Alto" },
          summary: { type: Type.STRING, description: "Resumo analítico focado em conformidade." },
          balanceInfo: { type: Type.STRING, description: "Cálculo detalhado de Horas Faltando ou Horas Extras encontradas." },
          alerts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de irregularidades específicas." }
        },
        required: ["riskLevel", "summary", "balanceInfo", "alerts"]
      },
      systemInstruction: "Você é um auditor de RH especialista em CLT. Seu objetivo é detectar erros de jornada, saldo de horas (extras/faltas) e riscos jurídicos. Seja extremamente preciso nos cálculos.",
    }
  });
  
  try {
    return JSON.parse(response.text?.trim() || "{}");
  } catch {
    return { 
      riskLevel: "Erro", 
      summary: "Falha na análise da IA.", 
      balanceInfo: "Não foi possível calcular o saldo.",
      alerts: ["A resposta da IA não pôde ser processada."] 
    };
  }
};

export const generateDailyBriefingAudio = async (summaryText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Leia este resumo de RH: ${summaryText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
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
