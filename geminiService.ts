
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
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: `O colaborador ${employeeName} tem uma carga horária contratual de ${workShift}. 
Analise rigorosamente as seguintes marcações de ponto e determine:
1. SALDO DE HORAS: O colaborador está com horas faltando ou fazendo horas extras? Calcule aproximadamente.
2. INTERVALOS: Os intervalos de descanso (mínimo 1h) foram respeitados?
3. RISCOS CLT: Há irregularidades como falta de descanso interjornada (11h) ou jornadas excessivas?

Marcações:
${records.join('\n')}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING, description: "Baixo, Médio ou Alto" },
          summary: { type: Type.STRING, description: "Resumo detalhado focando em saldo de horas e conformidade." },
          balanceInfo: { type: Type.STRING, description: "Texto específico sobre horas faltantes ou extras detectadas." },
          alerts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de irregularidades ou avisos específicos." }
        },
        required: ["riskLevel", "summary", "balanceInfo", "alerts"]
      },
      systemInstruction: "Você é um auditor trabalhista sênior. Sua prioridade é identificar se o colaborador está cumprindo a jornada, se deve horas à empresa ou se a empresa deve horas extras. Seja preciso nos cálculos baseados nas marcações fornecidas.",
    }
  });
  
  try {
    return JSON.parse(response.text?.trim() || "{}");
  } catch {
    return { 
      riskLevel: "Erro", 
      summary: "Não foi possível processar a auditoria no momento.", 
      balanceInfo: "Cálculo indisponível.",
      alerts: ["Erro na resposta da IA"] 
    };
  }
};

export const generateDailyBriefingAudio = async (summaryText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Leia este resumo de RH de forma profissional e encorajadora: ${summaryText}` }] }],
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
