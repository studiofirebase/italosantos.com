import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

let recaptchaVerifier: RecaptchaVerifier | null = null;

export async function sendPhoneVerificationCode(phoneNumber: string, containerId: string = 'recaptcha-container'): Promise<ConfirmationResult> {
    const auth = getAuth();

    if (!recaptchaVerifier) {
        recaptchaVerifier = new RecaptchaVerifier(
            auth,
            containerId,
            {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA resolved
                },
            }
        );
    }

    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

export async function verifyPhoneCode(confirmationResult: ConfirmationResult, code: string) {
    try {
        const result = await confirmationResult.confirm(code);
        return { success: true, user: result.user };
    } catch (err) {
        return { success: false, error: 'Código inválido' };
    }
}
