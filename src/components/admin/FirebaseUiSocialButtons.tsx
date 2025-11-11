"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

type ProviderKey = 'facebook' | 'twitter';

// Load FirebaseUI from CDN at runtime (reuse logic style from FirebaseUiDemo)
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

function ensureFirebaseUiCss() {
    const cssHref = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css";
    const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => (l as HTMLLinkElement).href === cssHref);
    if (!exists) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssHref;
        document.head.appendChild(link);
    }
}

export default function FirebaseUiSocialButtons() {
    const [open, setOpen] = useState(false);
    const [provider, setProvider] = useState<ProviderKey | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ui: any = null;
        let cancelled = false;

        async function startUi(pk: ProviderKey) {
            try {
                setLoading(true);
                setError(null);
                ensureFirebaseUiCss();
                const firebaseui = await loadFirebaseUiFromCdn();
                const AuthUI = firebaseui.auth.AuthUI;
                const auth = getAuth(app);
                ui = AuthUI.getInstance() || new AuthUI(auth);

                const map: Record<ProviderKey, string> = {
                    facebook: 'facebook.com',
                    twitter: 'twitter.com',
                };

                const config: any = {
                    signInFlow: 'popup',
                    signInOptions: [{ provider: map[pk] }],
                    callbacks: {
                        signInSuccessWithAuthResult: () => {
                            // Close dialog on success
                            setOpen(false);
                            return false;
                        }
                    }
                };

                if (!cancelled && containerRef.current) {
                    ui.start(containerRef.current, config);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Falha ao iniciar FirebaseUI');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        if (open && provider) {
            startUi(provider);
        }

        return () => {
            cancelled = true;
            try { ui?.delete?.().catch(() => { }); } catch { }
        };
    }, [open, provider]);

    const openProvider = (pk: ProviderKey) => {
        setProvider(pk);
        setOpen(true);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Button className="flex-1" onClick={() => openProvider('facebook')}>Entrar com Facebook</Button>
                <Button className="flex-1" variant="secondary" onClick={() => openProvider('twitter')}>Entrar com Twitter</Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Login Social</DialogTitle>
                        <DialogDescription>
                            Autenticação via FirebaseUI Web ({provider === 'facebook' ? 'Facebook' : provider === 'twitter' ? 'Twitter' : ''})
                        </DialogDescription>
                    </DialogHeader>
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    <div ref={containerRef} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
