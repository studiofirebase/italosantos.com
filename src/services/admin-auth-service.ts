
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
  await sendPasswordResetEmail(auth, email);
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
