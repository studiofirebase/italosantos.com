/**
 * API Route: Verificar token do reCAPTCHA Enterprise
 * POST /api/recaptcha/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRecaptchaAssessment, getScoreRecommendation } from '@/lib/recaptcha-enterprise';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, action } = body;

        console.log(`[reCAPTCHA API] Verificando token para ação: ${action}`);

        // Validar campos obrigatórios
        if (!token || !action) {
            return NextResponse.json(
                { error: 'token e action são obrigatórios' },
                { status: 400 }
            );
        }

        // Criar avaliação
        const assessment = await createRecaptchaAssessment({
            token,
            action,
        });

        // Obter recomendação
        const recommendation = getScoreRecommendation(assessment.score);

        console.log(`[reCAPTCHA API] Resultado:`, {
            valid: assessment.valid,
            score: assessment.score,
            recommendation: recommendation.action,
        });

        return NextResponse.json({
            success: assessment.success,
            valid: assessment.valid,
            score: assessment.score,
            action: assessment.action,
            reasons: assessment.reasons,
            recommendation: recommendation,
            invalidReason: assessment.invalidReason,
        });

    } catch (error) {
        console.error('[reCAPTCHA API] Erro:', error);

        return NextResponse.json(
            {
                error: 'Erro ao verificar reCAPTCHA',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
            },
            { status: 500 }
        );
    }
}
