import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { platform, connected, access_token, user_id, user_name, username, screen_name } = body;

        if (!platform) {
            return NextResponse.json({ ok: false, error: 'Platform is required' }, { status: 400 });
        }

        const adminApp = getAdminApp();
        if (!adminApp) {
            return NextResponse.json({ ok: false, error: 'Admin app not initialized' }, { status: 500 });
        }

        const db = getDatabase(adminApp);
        const ref = db.ref(`admin/integrations/${platform}`);

        const dataToSave: any = {
            connected: connected !== false,
            updated_at: new Date().toISOString(),
        };

        if (access_token) dataToSave.access_token = access_token;
        if (user_id) dataToSave.user_id = user_id;
        if (user_name) dataToSave.user_name = user_name;
        if (username) dataToSave.username = username;
        if (screen_name) dataToSave.screen_name = screen_name;

        await ref.set(dataToSave);

        return NextResponse.json({ ok: true, message: `${platform} integration saved successfully` });
    } catch (e: any) {
        console.error('Error saving integration:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to save integration' }, { status: 500 });
    }
}
