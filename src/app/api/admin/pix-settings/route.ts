import { NextRequest, NextResponse } from 'next/server';
import { getProfileSettings } from '@/app/admin/settings/actions';

export async function GET(request: NextRequest) {
  try {
    const settings = await getProfileSettings();
    
    if (!settings?.paymentSettings) {
      return NextResponse.json({
        pixValue: 99.00
      });
    }

    return NextResponse.json({
      pixValue: settings.paymentSettings.pixValue || 99.00
    });

  } catch (error) {
    console.error('❌ [PIX SETTINGS] Erro ao buscar configurações:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        pixValue: 99.00
      },
      { status: 500 }
    );
  }
}
