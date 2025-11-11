import { z } from 'zod';
import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai/generator';
import { gemini15Flash } from '@genkit-ai/googleai';

export const suggestionFlow = defineFlow(
  {
    name: 'suggestionFlow',
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ suggestions: z.array(z.string()) }),
  },
  async (input) => {
    const { message } = input;

    const prompt = `
      Given the following message, generate 3 reply suggestions.
      Message: ${message}

      Suggestions:
    `;

    const result = await generate({
      model: gemini15Flash,
      prompt,
      config: {
        temperature: 0.7,
      },
    });
    
    const text = result.text();
    const suggestions = text.split('\n').map(s => s.trim()).filter(Boolean);
    
    return { suggestions };
  }
);
