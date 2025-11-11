
import { NextResponse } from 'next/server';

let tempToken: string | null = null;

export async function GET() {
  // In a real app, you'd fetch this from a secure store.
  return NextResponse.json({ accessToken: tempToken });
}

export async function POST(request: Request) {
  const { token } = await request.json();
  tempToken = token;
  return NextResponse.json({ success: true });
}
