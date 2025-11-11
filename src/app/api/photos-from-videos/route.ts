import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

// Force Node.js runtime for file system operations in Firebase
export const runtime = 'nodejs';
// Esta API extrai fotos reais de posts que estão no cache de vídeos
export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ success: false, message: 'Username é obrigatório.' }, { status: 400 });
    }

    console.log(`📸 Extraindo fotos reais do cache para @${username}`);

    // Tentar carregar cache de vídeos que tem dados mais completos
    const cacheDir = path.join(process.cwd(), 'cache', 'twitter');
    const videoCacheFile = path.join(cacheDir, `${username.toLowerCase()}-videos-100.json`);

    try {
      const videoCacheData = JSON.parse(readFileSync(videoCacheFile, 'utf8'));
      const tweets = videoCacheData.data.tweets || [];

      console.log(`📋 Processando ${tweets.length} tweets do cache de vídeos`);

      // Extrair apenas tweets que tenham fotos reais (não apenas vídeos)
      const photoTweets = tweets.filter((tweet: any) => {
        return tweet.media && tweet.media.some((m: any) => m.type === 'photo');
      });

      console.log(`📸 Encontrados ${photoTweets.length} tweets com fotos reais`);

      // Criar resposta no formato esperado
      const result = {
        tweets: photoTweets,
        totalCount: photoTweets.length,
        source: 'Extracted from video cache'
      };

      // Salvar como cache de fotos
      const photoCacheFile = path.join(cacheDir, `${username.toLowerCase()}-photos-100.json`);
      const photoCacheData = {
        data: result,
        timestamp: Date.now(),
        username: username,
        mediaType: 'photos',
        maxResults: 100
      };

      require('fs').writeFileSync(photoCacheFile, JSON.stringify(photoCacheData, null, 2));

      console.log(`✅ Cache de fotos criado com ${result.totalCount} tweets`);

      return NextResponse.json({ 
        success: true, 
        message: `${result.totalCount} fotos encontradas no cache`, 
        tweetsCount: result.totalCount,
        data: result
      });

    } catch (fileError) {
      console.log(`❌ Erro ao ler cache de vídeos: ${fileError}`);
      return NextResponse.json({ 
        success: false, 
        message: 'Cache de vídeos não encontrado. Atualize os vídeos primeiro.' 
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error('❌ Erro na API photos-from-videos:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro ao extrair fotos.' 
    }, { status: 500 });
  }
}
