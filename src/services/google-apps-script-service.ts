'use server';

/**
 * @fileOverview Serviço para integração com Google Apps Script
 * Gerencia cadastro e autenticação de usuários usando planilha do Google Sheets
 */

export interface FaceIDUser {
  nome: string;
  email: string;
  telefone: string;
  image: string;
  video?: string;
  firebaseUid?: string;
}

export interface FaceIDLoginData {
  image: string;
  email?: string;
}

export interface AppsScriptResponse {
  success: boolean;
  message: string;
  isVip?: boolean;
  redirectUrl?: string;
}

// URL do Google Apps Script (substitua pela sua URL real)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxZ3CL2OFZi3zyCv0ZbKiA1Ma0XFM4Ik0TAr6LnmJFXcK2UiIfq9qkBZiviLve9OA3E/exec";

/**
 * Registra um novo usuário no Google Apps Script
 */
// Função utilitária para timeout no fetch
async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 10000) {
  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]);
}

export async function registerUserWithAppsScript(userData: FaceIDUser): Promise<AppsScriptResponse> {
  try {
    // Validação básica dos dados
    if (!userData.nome || !userData.email || !userData.image) {
      return {
        success: false,
        message: 'Campos obrigatórios ausentes: nome, email ou imagem.'
      };
    }
    console.log('[Apps Script] Enviando dados de cadastro para planilha...', {
      nome: userData.nome,
      email: userData.email,
      telefone: userData.telefone,
      hasImage: !!userData.image,
      hasVideo: !!userData.video
    });

    const registrationPayload = {
      action: 'register',
      nome: userData.nome,
      email: userData.email,
      telefone: userData.telefone || '',
      image: userData.image,
      video: userData.video || '',
      firebaseUid: userData.firebaseUid || ''
    };

    const response = await fetchWithTimeout(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationPayload),
    }) as Response;

    console.log('[Apps Script] Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apps Script] Erro HTTP:', response.status, errorText);
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[Apps Script] Resposta do cadastro:', result);

    return result;
  } catch (error) {
    console.error('[Apps Script] Erro no cadastro:', error);
    return {
      success: false,
      message: `Erro ao conectar com o servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Verifica se o usuário existe no Google Apps Script (login)
 */
export async function verifyUserWithAppsScript(loginData: FaceIDLoginData): Promise<AppsScriptResponse> {
  try {
    if (!loginData.image) {
      return {
        success: false,
        message: 'Imagem obrigatória para login.'
      };
    }
    console.log('[Apps Script] Verificando usuário na planilha...', {
      hasImage: !!loginData.image,
      email: loginData.email
    });

    // Tentar primeiro com JSON (mais confiável)
    try {
      const jsonPayload = {
        action: 'login',
        image: loginData.image,
        email: loginData.email || ''
      };

      const jsonResponse = await fetchWithTimeout(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonPayload),
      }) as Response;

      console.log('[Apps Script] Status da resposta JSON login:', jsonResponse.status);

      if (jsonResponse.ok) {
        const result = await jsonResponse.json();
        console.log('[Apps Script] Resposta da verificação JSON:', result);
        return result;
      }
    } catch (jsonError) {
      console.log('[Apps Script] Erro com JSON, tentando form-data:', jsonError);
    }

    // Fallback para form-data
    const formData = new URLSearchParams();
    formData.append('action', 'login');
    formData.append('image', loginData.image);
    if (loginData.email) formData.append('email', loginData.email);

    const response = await fetchWithTimeout(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }) as Response;

    console.log('[Apps Script] Status da resposta form-data login:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Apps Script] Erro HTTP no login:', response.status, errorText);
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[Apps Script] Resposta da verificação form-data:', result);

    return result;
  } catch (error) {
    console.error('[Apps Script] Erro na verificação:', error);
    return {
      success: false,
      message: `Erro ao conectar com o servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Verifica o status de pagamento de um usuário
 */
export async function checkPaymentStatusAppsScript(email: string): Promise<AppsScriptResponse> {
  try {
    if (!email) {
      return {
        success: false,
        message: 'Email obrigatório para verificar pagamento.'
      };
    }
    console.log('[Apps Script] Verificando status de pagamento...');

    // Enviar como form data (URL-encoded) em vez de JSON
    const formData = new URLSearchParams();
    formData.append('action', 'checkPayment');
    formData.append('email', email);

    const response = await fetchWithTimeout(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }) as Response;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[Apps Script] Status de pagamento:', result);

    return result;
  } catch (error) {
    console.error('[Apps Script] Erro ao verificar pagamento:', error);
    return {
      success: false,
      message: `Erro ao verificar status de pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}
