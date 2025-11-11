import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * Usado pelo App Engine para verificar se a aplicação está funcionando
 * 
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  });
}
