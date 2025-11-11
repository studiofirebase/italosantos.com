import { NextResponse } from 'next/server';

/**
 * API Route: Connect Platform Integration
 */
export async function POST(
    request: Request,
    { params }: { params: { platform: string } }
) {
    const { platform } = params;

    return NextResponse.json(
        { error: `Integração com ${platform} não implementada` },
        { status: 501 }
    );
}

export async function GET() {
    return NextResponse.json(
        { error: 'Método não permitido. Use POST.' },
        { status: 405 }
    );
}
