import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export async function GET(_req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        if (!adminApp) {
            return NextResponse.json({ success: false, message: 'Admin SDK not initialized' }, { status: 500 });
        }

        const db = getDatabase(adminApp);
        const snapshot = await db.ref('admin/integrations/instagram').get();
        if (!snapshot.exists()) {
            return NextResponse.json({ connected: false, hasToken: false });
        }

        const data = snapshot.val() || {};
        const { access_token, refresh_token, ...rest } = data;

        return NextResponse.json({
            connected: !!data.connected,
            hasToken: !!access_token,
            // metadata only, no secrets
            ...rest,
        });
    } catch (error: any) {
        console.error('Instagram token fetch error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
    }
}
