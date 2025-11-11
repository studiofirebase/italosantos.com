import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const platform: Integration = body.platform;
        if (!platform) return NextResponse.json({ success: false, message: 'Missing platform' }, { status: 400 });

        const adminApp = getAdminApp();
        if (!adminApp) return NextResponse.json({ success: false, message: 'Admin app not initialized' }, { status: 500 });

        const db = getDatabase(adminApp);
        const ref = db.ref('admin/integrations').child(platform);
        const updateValue = (platform === 'twitter' || platform === 'mercadopago' || platform === 'paypal') ? null : false;
        await ref.set(updateValue);

        return NextResponse.json({ success: true, message: `${platform} disconnected successfully.` });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || 'Failed to disconnect' }, { status: 500 });
    }
}
