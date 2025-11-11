"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FirebaseAuthDemo() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState<string | null>(null);
    const [user, setUser] = useState(() => auth.currentUser);

    auth.onAuthStateChanged((u) => setUser(u));

    async function handleGoogle() {
        try {
            setLoading("google");
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    async function handleEmailSignUp() {
        try {
            setLoading("signup");
            await createUserWithEmailAndPassword(auth, email, password);
            setEmail("");
            setPassword("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    async function handleEmailSignIn() {
        try {
            setLoading("signin");
            await signInWithEmailAndPassword(auth, email, password);
            setEmail("");
            setPassword("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    async function handleSignOut() {
        try {
            setLoading("signout");
            await signOut(auth);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
                Esta é uma demonstração simples de autenticação Firebase usando Google e Email/Senha (alternativa leve ao FirebaseUI Web).
            </div>

            {user ? (
                <div className="space-y-2">
                    <div className="text-sm">Logado como: <span className="font-medium">{user.email || user.displayName || user.uid}</span></div>
                    <Button variant="secondary" onClick={handleSignOut} disabled={loading === "signout"}>
                        {loading === "signout" ? "Saindo..." : "Sair"}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex gap-2">
                        <Button onClick={handleGoogle} disabled={loading === "google"}>
                            {loading === "google" ? "Conectando..." : "Entrar com Google"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
                        </div>
                        <div>
                            <Label htmlFor="password">Senha</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleEmailSignIn} disabled={loading === "signin"}>
                                {loading === "signin" ? "Entrando..." : "Entrar"}
                            </Button>
                            <Button variant="outline" onClick={handleEmailSignUp} disabled={loading === "signup"}>
                                {loading === "signup" ? "Criando..." : "Criar conta"}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
