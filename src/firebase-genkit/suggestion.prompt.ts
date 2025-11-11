import { z } from 'zod';
import { defineFlow, type FlowConfig } from '@genkit-ai/core';
import { gemini15Flash } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

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
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ suggestions: z.array(z.string()) }),
  },
  async (input: { message: string }) => {
    const { message } = input;

    const prompt = `
      Given the following message, generate 3 reply suggestions.
      Message: ${message}

      Suggestions:
    `;

    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt,
      config: {
        temperature: 0.7,
      },
    });
    
    const suggestions = text.split('\n').map((s: string) => s.trim()).filter(Boolean);
    
    return { suggestions };
  }
);
