import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export async function GET(req: NextRequest) {
    try {
        const adminApp = getAdminApp();
        if (!adminApp) {
            return NextResponse.json({ success: false, message: 'Admin SDK not initialized' }, { status: 500 });
        }

        const db = getDatabase(adminApp);
        const ref = db.ref('admin/integrations/facebook');

        // Clear sensitive fields and mark as disconnected
        await ref.set({
            connected: false,
            disconnected_at: new Date().toISOString(),
        });

        const url = new URL(req.url);
        const isPopup = url.searchParams.get('popup') === '1';

        if (isPopup) {
            const html = `<!DOCTYPE html>
<html>
<head><title>Facebook Disconnected</title></head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({ success: true, action: 'disconnect', platform: 'facebook' }, window.location.origin);
      window.close();
    }
  </script>
  <p>Facebook disconnected. You can close this window.</p>
</body>
</html>`;
            return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Facebook disconnect error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
    }
}
