/**
 * reCAPTCHA Enterprise - Server-side verification
 * 
 * Verifica tokens do reCAPTCHA e retorna pontuação de risco
 */

import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'facepass-afhid';
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LchOQosAAAAAJHtFnbWvP4xhePZaVhg4NRd2cEj';

// Cache do cliente para reutilização
let cachedClient: RecaptchaEnterpriseServiceClient | null = null;

function getRecaptchaClient(): RecaptchaEnterpriseServiceClient {
    if (!cachedClient) {
        cachedClient = new RecaptchaEnterpriseServiceClient();
    }
    return cachedClient;
}

export interface RecaptchaAssessmentOptions {
    token: string;
    action: string;
    projectID?: string;
    recaptchaKey?: string;
}

export interface RecaptchaAssessmentResult {
    success: boolean;
    score: number | null;
    reasons: string[];
    action: string;
    valid: boolean;
    invalidReason?: string;
}

/**
 * Cria uma avaliação para analisar o risco de uma ação da interface
 * 
 * @param options - Opções de avaliação
 * @returns Resultado da avaliação com pontuação de risco
 */
export async function createRecaptchaAssessment(
    options: RecaptchaAssessmentOptions
): Promise<RecaptchaAssessmentResult> {
    const {
        token,
        action,
        projectID = PROJECT_ID,
        recaptchaKey = RECAPTCHA_SITE_KEY,
    } = options;

    try {
        console.log(`[reCAPTCHA] Criando avaliação para ação: ${action}`);

        const client = getRecaptchaClient();
        const projectPath = client.projectPath(projectID);

        // Criar solicitação de avaliação
        const request = {
            assessment: {
                event: {
                    token: token,
                    siteKey: recaptchaKey,
                },
            },
            parent: projectPath,
        };

        const [response] = await client.createAssessment(request);

        // Verificar se o token é válido
        if (!response.tokenProperties?.valid) {
            const invalidReason = response.tokenProperties?.invalidReason || 'UNKNOWN';
            console.error(`[reCAPTCHA] Token inválido: ${invalidReason}`);

            return {
                success: false,
                score: null,
                reasons: [],
                action: action,
                valid: false,
                invalidReason: String(invalidReason),
            };
        }

        // Verificar se a ação esperada foi executada
        if (response.tokenProperties.action !== action) {
            console.error(
                `[reCAPTCHA] Ação não corresponde. Esperado: ${action}, Recebido: ${response.tokenProperties.action}`
            );

            return {
                success: false,
                score: null,
                reasons: ['ACTION_MISMATCH'],
                action: response.tokenProperties.action || '',
                valid: true,
                invalidReason: 'Ação não corresponde',
            };
        }

        // Obter pontuação e motivos
        const score = response.riskAnalysis?.score || 0;
        const reasons = response.riskAnalysis?.reasons || [];

        console.log(`[reCAPTCHA] Pontuação: ${score}`);
        if (reasons.length > 0) {
            console.log(`[reCAPTCHA] Motivos:`, reasons);
        }

        return {
            success: true,
            score: score,
            reasons: reasons.map(String),
            action: action,
            valid: true,
        };

    } catch (error) {
        console.error('[reCAPTCHA] Erro ao criar avaliação:', error);

        return {
            success: false,
            score: null,
            reasons: ['ERROR'],
            action: action,
            valid: false,
            invalidReason: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

/**
 * Verifica se a pontuação do reCAPTCHA é aceitável
 * 
 * @param score - Pontuação do reCAPTCHA (0.0 a 1.0)
 * @param threshold - Limite mínimo aceitável (padrão: 0.5)
 * @returns true se a pontuação for aceitável
 */
export function isScoreAcceptable(score: number | null, threshold: number = 0.5): boolean {
    if (score === null) return false;
    return score >= threshold;
}

/**
 * Obtém recomendação de ação baseada na pontuação
 * 
 * @param score - Pontuação do reCAPTCHA (0.0 a 1.0)
 * @returns Recomendação de ação
 */
export function getScoreRecommendation(score: number | null): {
    action: 'allow' | 'challenge' | 'block';
    message: string;
} {
    if (score === null) {
        return {
            action: 'block',
            message: 'Token inválido ou avaliação falhou',
        };
    }

    if (score >= 0.7) {
        return {
            action: 'allow',
            message: 'Interação muito provavelmente legítima',
        };
    }

    if (score >= 0.5) {
        return {
            action: 'allow',
            message: 'Interação provavelmente legítima',
        };
    }

    if (score >= 0.3) {
        return {
            action: 'challenge',
            message: 'Interação suspeita - considere desafio adicional',
        };
    }

    return {
        action: 'block',
        message: 'Interação muito provavelmente suspeita',
    };
}
