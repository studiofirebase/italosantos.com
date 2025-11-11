'use server';

import { NextResponse } from 'next/server';
import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, subject, code, html } = body || {};

        if (!email || !subject) {
            return NextResponse.json(
                { success: false, message: 'Parâmetros inválidos: email e subject são obrigatórios.' },
                { status: 400 }
            );
        }

        // Garante inicialização do Admin SDK (com fallback para ADC em produção)
        const app = getAdminApp();
        if (!app) {
            return NextResponse.json(
                { success: false, message: 'Firebase Admin não inicializado. Verifique as credenciais do Admin SDK.' },
                { status: 500 }
            );
        }

        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { success: false, message: 'Firestore Admin não disponível.' },
                { status: 500 }
            );
        }

        const htmlContent = html ?? `
      <h2>Teste de Envio – Firebase Extension</h2>
      <p>Assunto: <strong>${subject}</strong></p>
      ${code ? `<p>Código: <strong>${code}</strong></p>` : ''}
      <p>Enviado via criação de documento na coleção <code>mail</code>.</p>
    `;

        const mailDoc = {
            to: [email],
            message: {
                subject,
                text: `Assunto: ${subject}${code ? `\nCódigo: ${code}` : ''}`,
                html: htmlContent,
            },
            createdAt: FieldValue.serverTimestamp(),
            metadata: {
                type: 'test-email',
                environment: process.env.NEXT_PUBLIC_ENV_TYPE || process.env.NODE_ENV || 'production',
                source: '/api/test/send-email',
            },
        } as const;

        const ref = await db.collection('mail').add(mailDoc);
        return NextResponse.json({ success: true, message: 'Email enviado com sucesso via Firebase!', documentId: ref.id });
    } catch (error: any) {
        console.error('[API/test/send-email] Erro ao enviar email:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Erro interno no envio.' },
            { status: 500 }
        );
    }
}
