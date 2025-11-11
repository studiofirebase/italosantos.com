

import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { z } from 'zod';

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
});

export const suggestionFlow = ai.defineFlow(
  {
    name: 'suggestionFlow',
    inputSchema: z.object({
      message: z.string().describe('A mensagem para gerar sugestões'),
    }),
    outputSchema: z.object({
      suggestions: z.array(z.string()).describe('Array com 3 sugestões de resposta'),
    }),
  },
  async (input) => {
    const { message } = input;

    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt: `Você é um assistente prestativo. Dada a seguinte mensagem, gere 3 sugestões de resposta curtas e naturais em português.

Mensagem: "${message}"

Sugestões (uma por linha):`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 200,
      },
    });

    const suggestions = text
      .split('\n')
      .map((s: string) => s.replace(/^\d+\.\s*/, '').trim()) 
      .filter(Boolean)
      .slice(0, 3); 

    return { suggestions };
  }
);

export const sentimentAnalysisFlow = ai.defineFlow(
  {
    name: 'sentimentAnalysis',
    inputSchema: z.object({
      text: z.string().describe('Texto para análise de sentimento'),
    }),
    outputSchema: z.object({
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      confidence: z.number().min(0).max(1),
      explanation: z.string(),
    }),
  },
  async (input) => {
    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt: `Analise o sentimento do seguinte texto e responda no formato JSON:

Texto: "${input.text}"

Formato de resposta:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "explanation": "breve explicação"
}`,
      config: {
        temperature: 0.3,
      },
    });

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
      return {
        sentiment: 'neutral' as const,
        confidence: 0.5,
        explanation: 'Não foi possível analisar o sentimento',
      };
    }
  }
);

export const contentGenerationFlow = ai.defineFlow(
  {
    name: 'contentGeneration',
    inputSchema: z.object({
      topic: z.string().describe('Tópico para geração de conteúdo'),
      type: z.enum(['post', 'caption', 'description']).describe('Tipo de conteúdo'),
      maxLength: z.number().optional().default(200),
    }),
    outputSchema: z.object({
      content: z.string(),
    }),
  },
  async (input) => {
    const prompts: Record<string, string> = {
      post: `Escreva um post de rede social sobre: ${input.topic}`,
      caption: `Escreva uma legenda criativa para: ${input.topic}`,
      description: `Escreva uma descrição profissional sobre: ${input.topic}`,
    };

    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt: prompts[input.type],
      config: {
        temperature: 0.9,
        maxOutputTokens: input.maxLength,
      },
    });

    return { content: text.trim() };
  }
);

export const chatFlow = ai.defineFlow(
  {
    name: 'chat',
    inputSchema: z.object({
      message: z.string().describe('Mensagem do usuário'),
      history: z.array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      ).optional().default([]),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async (input) => {
    const context = input.history
      .map((msg) => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
      .join('\n');

    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt: `Você é um assistente prestativo. Responda em português.

${context ? `Histórico:\n${context}\n\n` : ''}Usuário: ${input.message}

Assistente:`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    return { response: text.trim() };
  }
);

export async function runSuggestions(message: string) {
  return await suggestionFlow({ message });
}

export async function analyzeSentiment(text: string) {
  return await sentimentAnalysisFlow({ text });
}

export async function generateContent(
  topic: string,
  type: 'post' | 'caption' | 'description',
  maxLength?: number
) {
  return await contentGenerationFlow({ topic, type, maxLength: maxLength || 200 });
}

export async function chat(message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) {
  return await chatFlow({ message, history: history || [] });
}
