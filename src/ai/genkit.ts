/**
 * Genkit Configuration - Studio Italo Santos
 * 
 * Configuração central do Genkit com Google AI (Gemini)
 * Usado em toda a aplicação para features de IA
 */

// Genkit integration with safe guard to avoid importing node-only libs during Next.js build / SSG
// To disable Genkit at build-time, set DISABLE_GENKIT=true in the environment used by the builder.
const DISABLE = process.env.DISABLE_GENKIT === 'true' || process.env.NEXT_DISABLE_GENKIT === 'true';

let ai: any = null;
let gemini15Flash: any = null;
let gemini15Pro: any = null;
let generate: any = null;
let defineFlow: any = null;
let definePrompt: any = null;

if (DISABLE) {
  // Lightweight stub used during static build to avoid pulling genkit/opentelemetry into the bundle.
  const noop = async () => ({ text: 'genkit-disabled' });

  ai = {
    generate: noop,
    defineFlow: (_cfg: any) => ({ run: noop }),
    definePrompt: (_p: any) => _p,
  } as any;

  gemini15Flash = null;
  gemini15Pro = null;

  generate = ai.generate;
  defineFlow = ai.defineFlow;
  definePrompt = ai.definePrompt;

} else {
  // When not disabled, import and initialize genkit normally at runtime.
  // Use require so bundlers won't pull these at build-time when DISABLE is true.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { genkit } = require('genkit');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const googleai = require('@genkit-ai/googleai');

  gemini15Flash = googleai.gemini15Flash;
  gemini15Pro = googleai.gemini15Pro;

  ai = genkit({
    plugins: [
      googleai.googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY }),
    ],
    model: gemini15Flash,
  });

  generate = ai.generate;
  defineFlow = ai.defineFlow;
  definePrompt = ai.definePrompt;
}

// Export named bindings (stable shape for imports)
export { ai, gemini15Flash, gemini15Pro, generate, defineFlow, definePrompt };
