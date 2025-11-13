import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
    try {
        console.log('[HYBRID-PHOTOS] Iniciando busca de fotos...');

        // Verificar token de autenticação do Firebase
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[HYBRID-PHOTOS] Token não fornecido');
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verificar token do Firebase Admin
        const adminApp = getAdminApp();
        if (!adminApp) {
            console.error('[HYBRID-PHOTOS] Firebase Admin não inicializado');
            return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
        }

        const auth = getAuth(adminApp);
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        console.log('[HYBRID-PHOTOS] Usuário autenticado:', uid);

        // Buscar username do Firestore
        const db = getFirestore(adminApp);
        const twitterAdminDoc = await db.collection('twitter_admins').doc(uid).get();

        if (!twitterAdminDoc.exists) {
            console.error('[HYBRID-PHOTOS] Username não encontrado no Firestore');
            return NextResponse.json({ error: 'Usuário não possui Twitter autenticado. Por favor, autentique na página /admin/integrations' }, { status: 404 });
        }

        const userData = twitterAdminDoc.data() as { username: string; twitterUserId?: string };
        const username = userData.username;
        let userId = userData.twitterUserId;

        console.log('[HYBRID-PHOTOS] Username:', username, '| UserID salvo:', userId);

        // Verificar cache no Firestore
        const cacheDoc = await db.collection('twitter_cache').doc(username).collection('media').doc('photos').get();

        if (cacheDoc.exists) {
            const cacheData = cacheDoc.data();
            const cacheAge = Date.now() - new Date(cacheData!.timestamp).getTime();
            const oneHour = 60 * 60 * 1000;

            if (cacheAge < oneHour && cacheData!.data) {
                console.log('[HYBRID-PHOTOS] ✅ Retornando cache válido');
                return NextResponse.json({
                    success: true,
                    tweets: cacheData!.data,
                    cached: true,
                    username: username
                });
            }
            console.log('[HYBRID-PHOTOS] ⚠️ Cache expirado');
        }

        // Buscar Bearer Token (prioridade: Firestore > .env)
        let bearerToken: string | undefined;

        try {
            const configDoc = await db.collection('twitter_config').doc('bearer_token').get();
            if (configDoc.exists && configDoc.data()?.token) {
                bearerToken = configDoc.data()!.token;
                console.log('[HYBRID-PHOTOS] 🔑 Usando Bearer Token do Firestore');
            }
        } catch (error) {
            console.warn('[HYBRID-PHOTOS] ⚠️ Erro ao buscar token do Firestore:', error);
        }

        // Fallback para .env
        if (!bearerToken) {
            bearerToken = process.env.TWITTER_BEARER_TOKEN;
            console.log('[HYBRID-PHOTOS] 🔑 Usando Bearer Token do .env');
        }

        if (!bearerToken) {
            console.error('[HYBRID-PHOTOS] ❌ Bearer Token não configurado');
            return NextResponse.json({ error: 'Twitter Bearer Token não configurado' }, { status: 500 });
        }

        console.log('[HYBRID-PHOTOS] 🔄 Buscando da API do Twitter...');

        // Se não tiver twitterUserId salvo, buscar da API (apenas uma vez)
        if (!userId) {
            console.log('[HYBRID-PHOTOS] ⚠️ Twitter User ID não salvo, buscando da API...');
            const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                },
            });

            if (!userResponse.ok) {
                console.error('[HYBRID-PHOTOS] ❌ Erro ao buscar usuário:', userResponse.status);
                return NextResponse.json({
                    error: 'Rate limit atingido ou erro ao buscar usuário do Twitter. Aguarde alguns minutos.'
                }, { status: userResponse.status });
            }

            const userDataFromApi = await userResponse.json();
            userId = userDataFromApi.data?.id;

            if (!userId) {
                console.error('[HYBRID-PHOTOS] ❌ ID do usuário não encontrado');
                return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 404 });
            }

            // Salvar o twitterUserId no Firestore para não precisar buscar novamente
            await db.collection('twitter_admins').doc(uid).update({
                twitterUserId: userId
            });
            console.log('[HYBRID-PHOTOS] ✅ Twitter User ID salvo:', userId);
        }

        // Buscar tweets com fotos (excluindo retweets e replies, máximo 25 resultados)
        const tweetsResponse = await fetch(
            `https://api.twitter.com/2/users/${userId}/tweets?max_results=25&exclude=retweets,replies&expansions=attachments.media_keys,author_id&tweet.fields=created_at,text,public_metrics&media.fields=url,preview_image_url,type,media_key,width,height,alt_text&user.fields=profile_image_url,username`,
            {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                },
            }
        );

        if (!tweetsResponse.ok) {
            console.error('[HYBRID-PHOTOS] Erro ao buscar tweets:', tweetsResponse.status);
            return NextResponse.json({ error: 'Erro ao buscar tweets' }, { status: tweetsResponse.status });
        }

        const tweetsData = await tweetsResponse.json();
        const mediaIncludes = tweetsData.includes?.media || [];
        const users = tweetsData.includes?.users || [];

        type TwitterUser = { id: string; username?: string; profile_image_url?: string };
        const userMap = new Map<string, TwitterUser>(
            users.map((u: any) => [u.id, { id: u.id, username: u.username, profile_image_url: u.profile_image_url }])
        );

        const tweetsWithPhotos = (tweetsData.data || []).map((tweet: any) => {
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

        console.log('[HYBRID-PHOTOS] Encontrados', tweetsWithPhotos.length, 'tweets com fotos');

        // Salvar cache no Firestore (máximo 25 tweets)
        const tweetsToCache = tweetsWithPhotos.slice(0, 25);
        await db.collection('twitter_cache').doc(username).collection('media').doc('photos').set({
            data: tweetsToCache,
            timestamp: new Date().toISOString(),
        });

        console.log('[HYBRID-PHOTOS] Cache salvo no Firestore'); return NextResponse.json({
            success: true,
            tweets: tweetsToCache,
            cached: false,
            username: username
        });

    } catch (error) {
        console.error('[HYBRID-PHOTOS] Erro:', error);
        return NextResponse.json({
            success: false,
            error: 'Erro ao buscar fotos',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}