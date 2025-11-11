import { NextRequest, NextResponse } from 'next/server';
import { HybridCacheService } from '@/services/hybrid-cache';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obtendo estatísticas do cache...');
    
    const stats = await HybridCacheService.getCacheStats();
    
    return NextResponse.json({ 
      success: true, 
      stats: {
        ...stats,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas do cache:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro ao obter estatísticas do cache.' 
    }, { status: 500 });
  }
}
