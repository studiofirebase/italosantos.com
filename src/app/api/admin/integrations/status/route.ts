import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const servicesParam = url.searchParams.get('services');
        const services: Integration[] = servicesParam
            ? (servicesParam.split(',').map(s => s.trim()) as Integration[])
            : ['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago'];

        const adminApp = getAdminApp();
        if (!adminApp) {
            return NextResponse.json({ ok: false, error: 'Admin app not initialized' }, { status: 500 });
        }
        const db = getDatabase(adminApp);
        const ref = db.ref('admin/integrations');
        const snapshot = await ref.once('value');
        const data = snapshot.val() || {};

        const result: Record<string, any> = {};
        for (const s of services) {
            const v = data[s];
            if (s === 'twitter' && v && typeof v === 'object') {
                result[s] = { connected: !!v.connected, screen_name: v.screen_name };
            } else if (typeof v === 'object') {
                result[s] = !!v.connected;
            } else {
                result[s] = !!v;
            }
        }

        return NextResponse.json({ ok: true, status: result });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch status' }, { status: 500 });
    }
}
