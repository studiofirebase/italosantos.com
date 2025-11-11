import { NextRequest, NextResponse } from 'next/server';
import { ai, gemini15Flash } from '@/ai/genkit';

/**
 * POST /api/ai/generate
 * 
 * Gera texto usando Gemini AI
 * 
 * Body:
 * {
 *   "prompt": "string",
 *   "temperature"?: number (0-1),
 *   "maxTokens"?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, temperature = 0.7, maxTokens = 500 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se GEMINI_API_KEY está configurada
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no .env.local' },
        { status: 500 }
      );
    }

    // Gerar resposta com Gemini
    const { text } = await ai.generate({
      model: gemini15Flash,
      prompt,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    return NextResponse.json({
      success: true,
      text,
      model: 'gemini-1.5-flash',
      config: {
        temperature,
        maxTokens,
      },
    });

  } catch (error: any) {
    console.error('Erro ao gerar texto:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao gerar texto',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/generate
 * 
 * Health check
 */
export async function GET() {
  const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  
  return NextResponse.json({
    status: 'ok',
    service: 'Genkit AI',
    model: 'gemini-1.5-flash',
    configured: hasApiKey,
    message: hasApiKey 
      ? 'Genkit configurado e pronto para uso' 
      : 'GEMINI_API_KEY não configurada',
  });
}
