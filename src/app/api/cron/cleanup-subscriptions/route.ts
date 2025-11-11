import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSubscriptionsInternal } from '@/lib/subscription-check';

export async function GET(request: NextRequest) {
    try {
        // Verificar se a requisição tem autorização (opcional)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Executar limpeza de assinaturas expiradas
        const result = await cleanupExpiredSubscriptionsInternal();
        
        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Limpeza concluída. ${result.cleanupCount} assinaturas foram expiradas.`,
                cleanupCount: result.cleanupCount,
                timestamp: new Date().toISOString()
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Erro no cron de limpeza:', error);
        return NextResponse.json({
            success: false,
            error: 'Erro interno do servidor'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // Permitir POST também para compatibilidade com diferentes cron services
    return GET(request);
}
