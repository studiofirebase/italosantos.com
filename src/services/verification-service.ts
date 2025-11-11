// NOTE: Client-side service; keep it framework-agnostic and configurable via env
const VERIFICATION_ENDPOINT =
  process.env.NEXT_PUBLIC_VERIFICATION_ENDPOINT ||
  'https://sms-email-code-479719049222.europe-west1.run.app';

interface VerificationResponse {
  success: boolean;
  message: string;
}

/**
 * Envia um código de verificação para um e-mail ou número de telefone.
 * @param type 'email' ou 'sms'
 * @param recipient O endereço de e-mail ou número de telefone.
 * @returns Promise<VerificationResponse>
 */
export const sendVerificationCode = async (type: 'email' | 'sms', recipient: string): Promise<VerificationResponse> => {
  console.log(`[VerificationService] Enviando código do tipo '${type}' para '${recipient}'...`);
  try {
    const formData = new URLSearchParams();
    formData.append('type', type);
    formData.append('recipient', recipient);

    const response = await fetch(VERIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Tratamento específico para erro 400
      if (response.status === 400) {
        console.error('[VerificationService] ❌ Erro 400 - Requisição inválida:', errorText);
        throw new Error('Requisição inválida. Verifique se o email/telefone está correto.');
      }

      // Tratamento específico para erro 401
      if (response.status === 401) {
        console.error('[VerificationService] ❌ Erro 401 - Não autorizado. Verifique a configuração da API.');
        throw new Error('Não autorizado. Verifique a configuração do serviço de verificação.');
      }

      throw new Error(`Erro na API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[VerificationService] Resposta da API de envio:', result);
    return result;

  } catch (error: any) {
    console.error(`[VerificationService] Falha ao enviar código para ${recipient}:`, error);
    return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
  }
};

/**
 * Verifica um código recebido por e-mail ou SMS.
 * @param recipient O endereço de e-mail ou número de telefone que recebeu o código.
 * @param code O código a ser verificado.
 * @returns Promise<VerificationResponse>
 */
export const verifyCode = async (recipient: string, code: string): Promise<VerificationResponse> => {
  console.log(`[VerificationService] Verificando código '${code}' para '${recipient}'...`);
  try {
    const formData = new URLSearchParams();
    formData.append('action', 'verify'); // Assumindo que a ação de verificação é 'verify'
    formData.append('recipient', recipient);
    formData.append('code', code);

    const response = await fetch(VERIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API de verificação: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[VerificationService] Resposta da API de verificação:', result);
    return result;

  } catch (error: any) {
    console.error(`[VerificationService] Falha ao verificar o código para ${recipient}:`, error);
    return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
  }
};
