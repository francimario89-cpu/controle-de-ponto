
// @google/genai coding standards: Use Type from @google/genai
import { GoogleGenAI, Type, Modality } from "@google/genai";

export const getGeminiResponse = async (prompt: string, records: string[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: `Contexto de Registros de Ponto (últimos 20):\n${records.join('\n\n')}\n\nPergunta do Colaborador: ${prompt}` }
        ]
      },
      config: {
        systemInstruction: "Você é o assistente virtual do PontoExato. Especialista em RH e CLT. Responda dúvidas sobre marcações de ponto, banco de horas e direitos trabalhistas. Seja extremamente profissional, acolhedor e direto.",
        temperature: 0.4,
      }
    });
    return response.text || "Desculpe, não consegui processar sua dúvida agora.";
  } catch (error) {
    console.error("Erro Gemini Assistant:", error);
    return "Ocorreu um erro ao falar com o assistente. Tente novamente mais tarde.";
  }
};

export const auditCompliance = async (employeeName: string, records: string[], workShift: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const auditPrompt = `
      NOME DO COLABORADOR: ${employeeName}
      CARGA HORÁRIA CONTRATUAL: ${workShift} (Exemplo: 08:00h por dia)
      REGISTROS DE PONTO:
      ${records.join('\n')}

      TAREFA DE AUDITORIA:
      1. Calcule a jornada diária realizada.
      2. Calcule o SALDO TOTAL: Se o colaborador trabalhou menos que ${workShift}, informe as HORAS FALTANTES. Se trabalhou mais, informe as HORAS EXTRAS.
      3. Verifique se o intervalo de repouso (mínimo 1h) foi respeitado.
      4. Verifique inconsistências (batidas ímpares, batidas em horários proibidos).
      5. Defina o NÍVEL DE RISCO (Baixo, Médio, Alto).
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
            riskLevel: { type: Type.STRING, description: "Baixo, Médio ou Alto" },
            summary: { type: Type.STRING, description: "Resumo executivo da jornada e conformidade." },
            balanceInfo: { type: Type.STRING, description: "Relatório detalhado de Horas Extras (+) ou Horas Faltando (-)." },
            alerts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de pontos de atenção." }
          },
          required: ["riskLevel", "summary", "balanceInfo", "alerts"]
        },
        systemInstruction: "Você é um Auditor Sênior de RH. Sua especialidade é calcular saldos de banco de horas com precisão matemática. Identifique claramente débitos e créditos de horas.",
      }
    });
    
    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("Erro Auditoria IA:", error);
    return { 
      riskLevel: "Erro", 
      summary: "Falha na análise técnica da IA.", 
      balanceInfo: "Não foi possível calcular o saldo no momento.",
      alerts: ["Aguarde alguns minutos e tente novamente."] 
    };
  }
};

export const generateDailyBriefingAudio = async (summaryText: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Resumo RH: ${summaryText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Erro TTS:", error);
    return null;
  }
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
