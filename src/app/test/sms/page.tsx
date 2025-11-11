"use client";

import { useState } from "react";
import { sendPhoneVerificationCode, verifyPhoneCode } from "@/lib/firebase-phone-auth";

export default function SmsTestPage() {
    const [phone, setPhone] = useState("+55");
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<string>("");
    const [confirmation, setConfirmation] = useState<any>(null);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    async function handleSend() {
        try {
            setSending(true);
            setStatus("Enviando SMS...");
            const conf = await sendPhoneVerificationCode(phone, "recaptcha-container");
            setConfirmation(conf);
            setStatus("SMS enviado. Confira seu telefone.");
        } catch (e: any) {
            setStatus(`Erro ao enviar SMS: ${e?.message ?? "falha"}`);
        } finally {
            setSending(false);
        }
    }

    async function handleVerify() {
        if (!confirmation) return setStatus("Envie o SMS primeiro.");
        try {
            setVerifying(true);
            setStatus("Validando código...");
            const res = await verifyPhoneCode(confirmation, code);
            setStatus(res.success ? "Código válido. Autenticado!" : `Falha: ${res.error}`);
        } catch (e: any) {
            setStatus(`Erro na verificação: ${e?.message ?? "falha"}`);
        } finally {
            setVerifying(false);
        }
    }

    return (
        <main style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
            <h2>Teste SMS (Firebase Phone Auth)</h2>
            <div id="recaptcha-container" />
            <label>Telefone (E.164):</label>
            <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55DDDNUMERO"
                style={{ width: "100%", padding: 8, margin: "8px 0" }}
            />
            <button onClick={handleSend} disabled={sending} style={{ padding: 8 }}>
                {sending ? "Enviando..." : "Enviar SMS"}
            </button>

            <hr style={{ margin: "16px 0" }} />

            <label>Código recebido:</label>
            <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                style={{ width: "100%", padding: 8, margin: "8px 0" }}
            />
            <button onClick={handleVerify} disabled={verifying} style={{ padding: 8 }}>
                {verifying ? "Verificando..." : "Verificar"}
            </button>

            <p style={{ marginTop: 12 }}>{status}</p>
        </main>
    );
}
