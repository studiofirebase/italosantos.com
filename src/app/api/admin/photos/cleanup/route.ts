import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { detectContentType } from '@/utils/video-url-processor';

export const runtime = 'nodejs';

// Endpoint para limpar fotos que são na verdade vídeos
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({ 
        error: 'Firebase Admin não inicializado' 
      }, { status: 500 });
    }
    
    const photosRef = adminDb.collection('photos');
    const snapshot = await photosRef.get();

    const videoPhotos: any[] = [];
    const validPhotos: any[] = [];

    // Verificar cada foto
    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const detectedType = detectContentType(data.imageUrl || '');
      
      if (detectedType === 'video') {
        videoPhotos.push({
          id: doc.id,
          title: data.title,
          url: data.imageUrl
        });
      } else {
        validPhotos.push({
          id: doc.id,
          title: data.title,
          url: data.imageUrl
        });
      }
    });

    // Se não há vídeos misturados, retornar status
    if (videoPhotos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma URL de vídeo encontrada na galeria de fotos',
        stats: {
          totalPhotos: snapshot.docs.length,
          validPhotos: validPhotos.length,
          videoUrls: 0
        }
      });
    }

    // Remover URLs de vídeo da galeria de fotos
    const batch = adminDb.batch();
    videoPhotos.forEach((video) => {
      const docRef = photosRef.doc(video.id);
      batch.delete(docRef);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${videoPhotos.length} URLs de vídeo removidas da galeria de fotos`,
      stats: {
        totalPhotos: snapshot.docs.length,
        validPhotos: validPhotos.length,
        videoUrlsRemoved: videoPhotos.length
      },
      removedItems: videoPhotos.map(v => ({
        title: v.title,
        url: v.url
      }))
    });

  } catch (error) {
    console.error('Erro ao limpar galeria de fotos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao limpar galeria de fotos'
    }, { status: 500 });
  }
}
