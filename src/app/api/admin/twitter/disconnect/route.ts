
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // In a real application, you would invalidate the refresh token with Twitter
    // and remove the tokens from your database.
    // For this example, we'll just clear the access token from the client-side.

    return NextResponse.json({ message: 'Successfully disconnected from Twitter' });
  } catch (error) {
    console.error('Error disconnecting from Twitter:', error);
    return NextResponse.json({ error: 'Failed to disconnect from Twitter' }, { status: 500 });
  }
}
