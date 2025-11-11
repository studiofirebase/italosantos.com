
import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function GET(req: NextRequest) {
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Prefer an explicit TWITTER_CALLBACK_URL, otherwise derive from public base
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || new URL('/api/admin/twitter/callback', base).toString();

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
      scope: ['tweet.read', 'users.read', 'offline.access', 'media.read'],
    });

    // Store codeVerifier and state in session or temporary storage
    // For this example, we'll use a simple cookie-based session
    const response = NextResponse.redirect(url);
    response.cookies.set('twitter_code_verifier', codeVerifier, { httpOnly: true, path: '/', maxAge: 60 * 15 });
    response.cookies.set('twitter_state', state, { httpOnly: true, path: '/', maxAge: 60 * 15 });

    return response;
  } catch (error) {
    console.error('Error generating Twitter auth link:', error, {
      TWITTER_CLIENT_ID: !!process.env.TWITTER_CLIENT_ID,
      TWITTER_CALLBACK_URL: process.env.TWITTER_CALLBACK_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      origin: req.nextUrl.origin,
    });
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'twitter');
    url.searchParams.set('error', 'twitter_server_error');
    url.searchParams.set('message', 'Failed to connect with Twitter');
    return NextResponse.redirect(url);
  }
}
