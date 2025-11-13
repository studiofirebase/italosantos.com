import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { filterPersonalMedia } from '@/lib/twitter-media-filter';

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

        if (cacheDoc.exists && cacheDoc.data()?.data) {
            console.log('[HYBRID-PHOTOS] ✅ Retornando cache (válido até logout)');
            return NextResponse.json({
                success: true,
                tweets: cacheDoc.data()!.data,
                cached: true,
                username: username
            });
        }

        console.log('[HYBRID-PHOTOS] ⚠️ Cache não encontrado, buscando da API...');

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

        // Buscar tweets do usuário (max_results=100 para ter conteúdo suficiente)
        // API v2: exclude=retweets,replies garante apenas conteúdo original
        // Com 100 requisições/mês no free tier, cada busca conta como 1 requisição
        const tweetsResponse = await fetch(
            `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&exclude=retweets,replies&expansions=attachments.media_keys,author_id&tweet.fields=created_at,text,public_metrics&media.fields=url,preview_image_url,type,media_key,width,height,alt_text,variants&user.fields=profile_image_url,username`,
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

        console.log('[HYBRID-PHOTOS] 📊 Total de tweets recebidos:', tweetsData.data?.length || 0);
        console.log('[HYBRID-PHOTOS] 📊 Total de mídias incluídas:', mediaIncludes.length);
        console.log('[HYBRID-PHOTOS] 📊 Tipos de mídia:', mediaIncludes.map((m: any) => m.type).join(', '));

        type TwitterUser = { id: string; username?: string; profile_image_url?: string };
        const userMap = new Map<string, TwitterUser>(
            users.map((u: any) => [u.id, { id: u.id, username: u.username, profile_image_url: u.profile_image_url }])
        );

        // Preparar todos os tweets com mídia para análise do Gemini
        const allTweetsWithMedia = (tweetsData.data || []).map((tweet: any) => {
            const author = userMap.get(tweet.author_id);
            return {
                id: tweet.id,
                text: tweet.text,
                created_at: tweet.created_at,
                username: author?.username || 'unknown',
                profile_image_url: author?.profile_image_url || '',
                media: (tweet.attachments?.media_keys || []).map((key: string) => {
                    const mediaFile = mediaIncludes.find((m: any) => m.media_key === key);
                    if (!mediaFile) return null;
                    return { 
                        ...mediaFile, 
                        url: mediaFile.url || mediaFile.preview_image_url 
                    };
                }).filter(Boolean),
            };
        }).filter((tweet: any) => tweet.media.length > 0);

        console.log('[HYBRID-PHOTOS] 📊 Total de tweets com mídia:', allTweetsWithMedia.length);

        // Usar Gemini para filtrar inteligentemente 25 fotos pessoais
        console.log('[HYBRID-PHOTOS] 🤖 Usando Gemini para filtrar fotos pessoais...');
        const { photos, reasoning } = await filterPersonalMedia(allTweetsWithMedia, username);
        
        console.log('[HYBRID-PHOTOS] ✅ Gemini filtrou', photos.length, 'fotos pessoais');
        console.log('[HYBRID-PHOTOS] 💡 Raciocínio:', reasoning);

        // Salvar cache no Firestore (fotos filtradas pelo Gemini)
        const tweetsToCache = photos;
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