
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/token-utils';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

async function getUserIdByUsername(username: string, accessToken: string): Promise<string | null> {
    const url = `${TWITTER_API_BASE}/users/by/username/${username}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        console.error("Error fetching user ID:", await response.text());
        return null;
    }
    const { data } = await response.json();
    return data?.id || null;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const paginationToken = searchParams.get('pagination_token') || undefined;
    const maxResultsParam = searchParams.get('max_results');
    const maxResults = Math.max(10, Math.min(Number(maxResultsParam) || 100, 100));

    if (!username) {
        return NextResponse.json({ success: false, message: 'Nome de usuário não fornecido.' }, { status: 400 });
    }

    try {
        const accessToken = await getToken('twitter', req.cookies);

        if (!accessToken) {
            return NextResponse.json({ success: false, message: 'Não autenticado com o Twitter.' }, { status: 401 });
        }

        const userId = await getUserIdByUsername(username, accessToken);
        if (!userId) {
            return NextResponse.json({ success: false, message: `Usuário @${username} não encontrado.` }, { status: 404 });
        }

        const url = `${TWITTER_API_BASE}/users/${userId}/tweets`;
        const params = new URLSearchParams({
            'max_results': String(maxResults),
            'expansions': 'attachments.media_keys,author_id',
            'tweet.fields': 'created_at,text,public_metrics',
            'media.fields': 'url,preview_image_url,type,media_key,width,height,alt_text',
            'user.fields': 'profile_image_url,username',
        });
        if (paginationToken) params.set('pagination_token', paginationToken);

        const twitterResponse = await fetch(`${url}?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!twitterResponse.ok) {
            const errorBody = await twitterResponse.text();
            console.error("Twitter API error:", errorBody);
            return NextResponse.json({ success: false, message: 'Falha ao buscar tweets.', error: errorBody }, { status: 500 });
        }

        const data = await twitterResponse.json();
        const mediaIncludes = data.includes?.media || [];
        const users = data.includes?.users || [];
        type TwitterUser = { id: string; username?: string; profile_image_url?: string };
        const userMap = new Map<string, TwitterUser>(
            users.map((u: any) => [u.id, { id: u.id, username: u.username, profile_image_url: u.profile_image_url }])
        );

        const tweetsWithPhotos = (data.data || []).map((tweet: any) => {
            const author = userMap.get(tweet.author_id);
            return {
                id: tweet.id,
                text: tweet.text,
                created_at: tweet.created_at,
                username: author?.username || 'unknown',
                profile_image_url: author?.profile_image_url || '',
                media: (tweet.attachments?.media_keys || []).map((key: string) => {
                    const mediaFile = mediaIncludes.find((m: any) => m.media_key === key && m.type === 'photo');
                    return mediaFile ? { ...mediaFile, url: mediaFile.url || mediaFile.preview_image_url } : null;
                }).filter(Boolean),
            };
        }).filter((tweet: any) => tweet.media.length > 0);

        const nextToken = data.meta?.next_token;
        return NextResponse.json({ success: true, tweets: tweetsWithPhotos, next_token: nextToken });

    } catch (error: any) {
        console.error("Server-side error fetching photos:", error);
        return NextResponse.json({ success: false, message: 'Erro interno do servidor.', error: error.message }, { status: 500 });
    }
}
