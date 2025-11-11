// src/lib/firebase-admin.ts
/**
 * @fileOverview Initializes and exports the Firebase Admin SDK instance.
 */

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Only load dotenv in development environment
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv');
    const path = require('path');

    // Carregar .env.local (mais específico)
    const envLocalPath = path.resolve(process.cwd(), '.env.local');

    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Admin] Carregando .env.local de:', envLocalPath);
    }

    const envResult = dotenv.config({
      path: envLocalPath,
      override: true
    });

    if (process.env.NODE_ENV === 'development') {
      if (envResult.error) {
        console.log('[Firebase Admin] .env.local não encontrado:', envResult.error.message);
      } else {
        console.log('[Firebase Admin] .env.local carregado com sucesso!');
        console.log('[Firebase Admin] ADMIN_USE_EMULATOR:', process.env.ADMIN_USE_EMULATOR);
        console.log('[Firebase Admin] NEXT_PUBLIC_USE_FIREBASE_EMULATORS:', process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Admin] dotenv não disponível, usando variáveis de ambiente');
    }
  }
}

// Verificar se deve usar emulators
const shouldUseEmulators = () => {
  const useEmulators = process.env.NODE_ENV === 'development' &&
    (process.env.ADMIN_USE_EMULATOR === 'true' ||
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true');

  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Admin] 🔍 Verificando emulators:', {
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_USE_EMULATOR: process.env.ADMIN_USE_EMULATOR,
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
      shouldUseEmulators: useEmulators
    });
  }

  return useEmulators;
};

// Usar variáveis de ambiente quando disponíveis, com fallback para ADC em produção
const getServiceAccountFromEnv = () => {
  // 1) Suporte a JSON completo via variável (mais robusto em ambientes gerenciados)
  const jsonCandidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT,
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    process.env.FIREBASE_CREDENTIALS_JSON,
  ].filter(Boolean) as string[];

  for (const json of jsonCandidates) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.private_key && parsed.client_email) {
        // Garantir que a chave tenha quebras de linha corretas
        parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
        if (process.env.NODE_ENV === 'development') {
          console.log('[Firebase Admin] Credenciais via JSON em variável detectadas.');
        }
        return parsed;
      }
    } catch (e) {
      // ignorar e tentar próxima opção
    }
  }

  // 2) Suporte a chave privada em Base64
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const base64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (!privateKey && base64) {
    try {
      privateKey = Buffer.from(base64, 'base64').toString('utf8');
    } catch (e) {
      console.error('[Firebase Admin] Falha ao decodificar FIREBASE_PRIVATE_KEY_BASE64');
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    // Sem credenciais em variáveis: permitir fallback para ADC
    if (process.env.NODE_ENV !== 'development') {
      console.log('[Firebase Admin] Variáveis de serviço ausentes. Tentando Application Default Credentials (ADC).');
    }
    return null;
  }

  // Processar a chave privada (remover escapes)
  let processedPrivateKey = privateKey;
  if (processedPrivateKey.includes('\\n')) {
    processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Admin] 🔧 Chave privada processada. BEGIN:', processedPrivateKey.includes('-----BEGIN PRIVATE KEY-----'), 'END:', processedPrivateKey.includes('-----END PRIVATE KEY-----'));
  }

  return {
    type: 'service_account',
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: processedPrivateKey,
    client_email: clientEmail,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${clientEmail}`,
    universe_domain: 'googleapis.com',
  };
};

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 * This function handles creating a single instance of the Firebase Admin App.
 *
 * @returns {App | null} The initialized Firebase Admin App instance or null if initialization fails.
 */
export function initializeFirebaseAdmin() {
  try {
    // Verificar se já existe uma instância
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log('[Firebase Admin] App already exists, returning existing instance');
      return existingApps[0];
    }

    // Resolver databaseURL de forma robusta
    const dbUrl = (
      process.env.FIREBASE_DATABASE_URL ||
      process.env.REALTIME_DB_URL ||
      process.env.NEXT_PUBLIC_REALTIME_DB_URL ||
      (process.env.FIREBASE_PROJECT_ID ? `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` : undefined) ||
      (process.env.FIREBASE_PROJECT_ID ? `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` : undefined)
    );

    let app;

    // 🔹 PRIORIDADE 1: Em desenvolvimento, sempre tentar arquivo local primeiro
    if (process.env.NODE_ENV === 'development') {
      try {
        const fs = require('fs');
        const path = require('path');
        const serviceAccountPath = path.join(process.cwd(), 'service_account.json');

        if (fs.existsSync(serviceAccountPath)) {
          console.log('[Firebase Admin] 📄 Usando service_account.json local');
          const localServiceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          app = initializeApp({
            credential: cert(localServiceAccount),
            databaseURL: dbUrl,
            projectId: localServiceAccount.project_id
          });
          console.log('[Firebase Admin] ✅ Firebase Admin SDK initialized successfully');
          return app;
        } else {
          console.log('[Firebase Admin] ℹ️ service_account.json não encontrado. Tentando variáveis de ambiente...');
        }
      } catch (error) {
        console.error('[Firebase Admin] ❌ Erro ao carregar service_account.json:', error);
      }
    }

    // 🔹 PRIORIDADE 2: Tentar credenciais de variáveis de ambiente
    const serviceAccount = getServiceAccountFromEnv();

    if (serviceAccount) {
      if (serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----') &&
        serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
        console.log('[Firebase Admin] � Usando credenciais de variáveis de ambiente');
        app = initializeApp({
          credential: cert(serviceAccount as any),
          databaseURL: dbUrl,
          projectId: serviceAccount.project_id
        });
      } else {
        console.error('[Firebase Admin] ❌ Chave privada incompleta/inválida nas variáveis.');
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Firebase Admin] ⚠️ Firebase Admin desabilitado em desenvolvimento.');
          return null;
        }
      }
    }

    // 🔹 PRIORIDADE 3: Em produção (Cloud Run, Firebase Hosting), usar ADC
    if (!app && process.env.NODE_ENV !== 'development') {
      console.log('[Firebase Admin] 🔐 Usando Application Default Credentials em produção');
      app = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
        databaseURL: dbUrl,
      } as any);
    }

    // Se chegou aqui sem app, falhou
    if (!app) {
      console.warn('[Firebase Admin] ⚠️ Nenhuma credencial válida encontrada. Firebase Admin desabilitado.');
      return null;
    }

    console.log('[Firebase Admin] ✅ Firebase Admin SDK initialized successfully');

    return app;
  } catch (error) {
    console.error('[Admin SDK] Error during Firebase Admin initialization:', error);
    return null;
  }
}

/**
 * Gets the Firebase Admin App instance, initializing it if necessary.
 *
 * @returns {App | null} The Firebase Admin App instance or null if initialization fails.
 */
export function getAdminApp() {
  try {
    return initializeFirebaseAdmin();
  } catch (error) {
    console.error('[Admin SDK] Error getting admin app:', error);
    return null;
  }
}

/**
 * Gets the Firestore instance from the Firebase Admin App.
 *
 * @returns {Firestore | null} The Firestore instance or null if the app is not initialized.
 */
export function getAdminDb() {
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[Admin SDK] Cannot get Firestore: Admin app not initialized');
      return null;
    }
    return getFirestore(app);
  } catch (error) {
    console.error('[Admin SDK] Error getting admin database:', error);
    return null;
  }
}

/**
 * Gets the Storage instance from the Firebase Admin App.
 *
 * @returns {Storage | null} The Storage instance or null if the app is not initialized.
 */
export function getAdminStorage() {
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[Admin SDK] Cannot get Storage: Admin app not initialized');
      return null;
    }
    return getStorage(app);
  } catch (error) {
    console.error('[Admin SDK] Error getting admin storage:', error);
    return null;
  }
}

/**
 * Gets the Auth instance from the Firebase Admin App.
 *
 * @returns {Auth | null} The Auth instance or null if the app is not initialized.
 */
export function getAdminAuth() {
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[Admin SDK] Cannot get Auth: Admin app not initialized');
      return null;
    }
    return getAuth(app);
  } catch (error) {
    console.error('[Admin SDK] Error getting admin auth:', error);
    return null;
  }
}

// Inicializar automaticamente
let adminApp: any = null;
let adminDb: any = null;
let adminStorage: any = null;
let adminAuth: any = null;

try {
  adminApp = getAdminApp();
  adminDb = getAdminDb();
  adminStorage = getAdminStorage();
  adminAuth = getAdminAuth();
} catch (error) {
  console.error('[Admin SDK] Firebase Admin SDK initialization failed.');
}

// Exportações principais
export { adminApp, adminDb, adminStorage, adminAuth };

// Exportação de auth como default para compatibilidade
export const auth = adminAuth;

// Exportação default
export default adminApp;
