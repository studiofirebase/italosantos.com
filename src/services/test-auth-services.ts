
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendSignInLinkToEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// --- Phone Verification ---
// Helper to set up RecaptchaVerifier
const setupRecaptcha = (containerId: string): RecaptchaVerifier | null => {
  if (typeof window === 'undefined') return null;
  const authInstance = getAuth();
  
  // Clear the container in case a verifier already exists
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  return new RecaptchaVerifier(authInstance, containerId, {
    'size': 'invisible',
    'callback': (response: any) => {
      // reCAPTCHA solved.
      console.log('reCAPTCHA solved, ready to send phone code.');
    }
  });
};

export const sendPhoneVerification = async (phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
  const recaptchaVerifier = setupRecaptcha(recaptchaContainerId);
  if (!recaptchaVerifier) {
    throw new Error("Recaptcha Verifier could not be created.");
  }
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};

export const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
  return confirmationResult.confirm(code);
};


// --- Email Verification (Passwordless) ---
export const sendEmailLink = async (email: string) => {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth-test`, // URL to redirect back to
    handleCodeInApp: true,
  };
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
};


// --- OAuth Services (Simulated) ---
// In a real app, these would redirect to the provider's login page.
// Here, we simulate the start of that flow.

export const initiateFacebookAuth = () => {
  console.log("Simulating Facebook OAuth flow...");
  alert("Iniciando fluxo de autenticação com Facebook (simulado). Verifique o console.");
  // Real implementation would use:
  // const provider = new FacebookAuthProvider();
  // signInWithRedirect(auth, provider);
};

export const initiateInstagramAuth = () => {
  console.log("Simulating Instagram OAuth flow...");
  alert("Iniciando fluxo de autenticação com Instagram (simulado). Verifique o console.");
  // Instagram auth is more complex, often done via Facebook's API
};

export const initiateTwitterAuth = () => {
  console.log("Simulating Twitter OAuth flow...");
  alert("Iniciando fluxo de autenticação com Twitter (simulado). Verifique o console.");
  // Real implementation would use:
  // const provider = new TwitterAuthProvider();
  // signInWithRedirect(auth, provider);
};

export const initiatePayPalAuth = () => {
  console.log("Simulating PayPal OAuth flow...");
  alert("Iniciando fluxo de autenticação com PayPal (simulado). Verifique o console.");
  // PayPal is not a direct Firebase provider and requires custom backend handling.
};

export const initiateMercadoPagoAuth = () => {
  console.log("Simulating Mercado Pago OAuth flow...");
  alert("Iniciando fluxo de autenticação com Mercado Pago (simulado). Verifique o console.");
  // Mercado Pago requires custom backend handling.
};
