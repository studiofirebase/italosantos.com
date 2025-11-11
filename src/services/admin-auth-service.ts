
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User,
  getAuth
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Helper to set up RecaptchaVerifier
const setupRecaptcha = (containerId: string) => {
  const authInstance = getAuth();
  if (typeof window !== 'undefined') {
    // Ensure the container is empty before rendering a new one
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    return new RecaptchaVerifier(authInstance, containerId, {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }
  return null;
};


// Admin Registration
export const registerAdmin = async (email: string, password: string, name: string, phone: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Send email verification
  await sendEmailVerification(user);

  // Store additional admin details in Firestore
  await setDoc(doc(db, "admins", user.uid), {
    uid: user.uid,
    name: name,
    email: email,
    phone: phone,
    createdAt: new Date(),
    role: 'admin'
  });

  return user;
};

// Send Phone Verification Code
export const sendPhoneVerificationCode = async (phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
  const recaptchaVerifier = setupRecaptcha(recaptchaContainerId);
  if (!recaptchaVerifier) {
    throw new Error("Recaptcha verifier not available.");
  }
  return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};

// Verify Phone Code
export const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
  return await confirmationResult.confirm(code);
};

// Forgot Password
export const sendAdminPasswordResetEmail = async (email: string) => {
  try {
    console.log('[Admin Auth Service] 🔄 Enviando email de recuperação para:', email);
    await sendPasswordResetEmail(auth, email);
    console.log('[Admin Auth Service] ✅ Email de recuperação enviado com sucesso para:', email);
  } catch (error: any) {
    console.error('[Admin Auth Service] ❌ Erro ao enviar email de recuperação:', {
      code: error.code,
      message: error.message,
      customData: error.customData,
      email: email
    });

    // Tratamento específico de erros do Firebase
    if (error.code === 'auth/user-not-found') {
      throw new Error('Nenhuma conta encontrada com este email.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Formato de email inválido.');
    } else if (error.code === 'auth/missing-email') {
      throw new Error('Email é obrigatório.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domínio não autorizado. Adicione este domínio no Firebase Console.');
    } else if (error.code === 'auth/invalid-api-key') {
      throw new Error('API Key inválida. Verifique a configuração do Firebase.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Erro de rede. Verifique sua conexão com a internet.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    } else if (error.message && error.message.includes('400')) {
      throw new Error('Requisição inválida. Verifique se o email está correto e cadastrado no sistema.');
    }

    throw error;
  }
};

// Ensure Admin document exists for the current user (used when account is created via FirebaseUI)
export const ensureAdminDoc = async (user: User, name: string, phone?: string) => {
  await setDoc(doc(db, "admins", user.uid), {
    uid: user.uid,
    name: name,
    email: user.email || null,
    phone: phone ?? user.phoneNumber ?? null,
    createdAt: new Date(),
    role: 'admin'
  }, { merge: true });
};
