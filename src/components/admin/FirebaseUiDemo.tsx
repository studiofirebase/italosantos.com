"use client";

import { useEffect, useRef, useState } from "react";
import { getAuth, EmailAuthProvider, GoogleAuthProvider, PhoneAuthProvider } from "firebase/auth";
import { app, isLocalhost } from "@/lib/firebase";

// Define interface for FirebaseUI types (optional since package may not be installed)
interface FirebaseUIAuthUI {
    start(element: Element, config: any): void;
    delete(): Promise<void>;
    reset(): void;
}

interface FirebaseUIModule {
    auth: {
        AuthUI: {
            new(auth: any): FirebaseUIAuthUI;
            getInstance(): FirebaseUIAuthUI | null;
        };
    };
}

// Lightweight, safe FirebaseUI demo for Next.js (client-only)
// - Dynamically imports firebaseui to avoid SSR issues
// - Injects FirebaseUI stylesheet via CDN link to avoid global CSS import constraints
// - Cleans up UI instance on unmount

// Load FirebaseUI from CDN at runtime to avoid npm peer dependency conflicts
function loadFirebaseUiFromCdn(): Promise<any> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") return reject(new Error("No window"));
        const w = window as any;
        if (w.firebaseui && w.firebaseui.auth) return resolve(w.firebaseui);

        const script = document.createElement("script");
        script.src = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.js";
        script.async = true;
        script.onload = () => {
            const ui = (window as any).firebaseui;
            if (ui && ui.auth) resolve(ui);
            else reject(new Error("firebaseui not available after script load"));
        };
        script.onerror = () => reject(new Error("Failed to load firebaseui script"));
        document.head.appendChild(script);
    });
}

export default function FirebaseUiDemo() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isFirebaseUIAvailable, setIsFirebaseUIAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ui: FirebaseUIAuthUI | null = null;
        let linkEl: HTMLLinkElement | null = null;
        let isCancelled = false;

        async function setup() {
            try {
                // Inject CSS (avoid importing global CSS in component) with dedupe
                const cssHref = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css";
                const existingLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                    .find(l => (l as HTMLLinkElement).href === cssHref) as HTMLLinkElement | undefined;
                if (!existingLink) {
                    linkEl = document.createElement("link");
                    linkEl.rel = "stylesheet";
                    linkEl.href = cssHref;
                    document.head.appendChild(linkEl);
                }

                // Try to load firebaseui from CDN to avoid npm install requirement
                let firebaseui: any;
                try {
                    firebaseui = await loadFirebaseUiFromCdn();
                    setIsFirebaseUIAvailable(true);
                } catch (importError) {
                    setIsFirebaseUIAvailable(false);
                    setError("Não foi possível carregar FirebaseUI do CDN.");
                    return;
                }

                const auth = getAuth(app);

                // Facilita testes em localhost com emulador (dispensa verificação em app)
                try {
                    if (isLocalhost && (auth as any).settings) {
                        (auth as any).settings.appVerificationDisabledForTesting = true;
                    }
                } catch { }

                // Reuse instance if exists
                const AuthUI = firebaseui.auth.AuthUI;
                ui = AuthUI.getInstance() || new AuthUI(auth);

                const config = {
                    signInFlow: "popup",
                    signInOptions: [
                        // Apple (abre via popup)
                        { provider: 'apple.com' },
                        // Outros provedores populares (deixe habilitados no Console do Firebase)
                        { provider: 'facebook.com' },
                        { provider: 'twitter.com' },
                        { provider: 'github.com' },
                        { provider: 'microsoft.com' },
                        // Google / Email / Telefone (SMS)
                        GoogleAuthProvider.PROVIDER_ID,
                        EmailAuthProvider.PROVIDER_ID,
                        PhoneAuthProvider.PROVIDER_ID,
                    ],
                    tosUrl: "/termos-condicoes",
                    privacyPolicyUrl: "/politica-de-privacidade",
                    callbacks: {
                        signInSuccessWithAuthResult: () => {
                            // Evita redirect automático; manter na mesma página.
                            return false;
                        },
                    },
                } as any;

                if (!isCancelled && containerRef.current && ui) {
                    ui.start(containerRef.current, config);
                }
            } catch (err) {
                console.error("[FirebaseUiDemo] Failed to load FirebaseUI:", err);
                setError(`Failed to initialize FirebaseUI: ${err instanceof Error ? err.message : 'Unknown error'}`);
                setIsFirebaseUIAvailable(false);
            }
        }

        if (typeof window !== "undefined") setup();

        return () => {
            isCancelled = true;
            try {
                if (ui) {
                    // Prefer delete() to fully cleanup. If it rejects (already deleted), ignore.
                    if (typeof ui.delete === "function") {
                        ui.delete().catch(() => { });
                    } else if (typeof ui.reset === "function") {
                        ui.reset();
                    }
                }
            } catch { }
            if (linkEl && linkEl.parentNode) {
                linkEl.parentNode.removeChild(linkEl);
            }
        };
    }, []);

    // Show loading state or error message when FirebaseUI is not available
    if (isFirebaseUIAvailable === false) {
        return (
            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
                <h3 className="font-semibold text-yellow-800">FirebaseUI Not Available</h3>
                <p className="text-sm text-yellow-700 mt-1">{error}</p>
                <p className="text-sm text-yellow-600 mt-2">
                    Verifique sua rede e permita o domínio do CDN: <code className="bg-yellow-200 px-1 rounded">www.gstatic.com</code>.
                    Caso prefira, posso migrar para dependência npm com ajuste de versões do Firebase.
                </p>
            </div>
        );
    }

    if (isFirebaseUIAvailable === null) {
        return (
            <div className="p-4 text-center">
                <p>Loading authentication...</p>
            </div>
        );
    }

    return (
        <div>
            <div ref={containerRef} />
        </div>
    );
}
