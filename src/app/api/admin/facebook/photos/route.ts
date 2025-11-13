import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photos, userInfo } = body;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma foto fornecida'
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }

    const photosCollection = adminDb.collection('photos');
    const savedPhotos: string[] = [];
    const errors: string[] = [];

    // Salvar cada foto no Firestore
    for (const photo of photos) {
      try {
        // Verificar se a foto já existe pelo facebookId
        if (photo.facebookId) {
          const existingPhotos = await photosCollection
            .where('facebookId', '==', photo.facebookId)
            .limit(1)
            .get();

          if (!existingPhotos.empty) {
            console.log(`[Facebook Photos] Foto ${photo.facebookId} já existe, pulando...`);
            continue;
          }
        }

        const photoData = {
          title: photo.title || 'Foto do Facebook',
          description: photo.description || '',
          photoUrl: photo.photoUrl,
          facebookId: photo.facebookId || null,
          albumName: photo.albumName || null,
          storageType: 'facebook',
          createdAt: photo.createdAt ? new Date(photo.createdAt) : new Date(),
          updatedAt: new Date(),
          facebookUser: {
            id: userInfo?.id || null,
            name: userInfo?.name || null,
            email: userInfo?.email || null
          }
        };

        const docRef = await photosCollection.add(photoData);
        savedPhotos.push(docRef.id);
        console.log(`[Facebook Photos] Foto ${docRef.id} salva com sucesso`);
      } catch (error) {
        console.error(`[Facebook Photos] Erro ao salvar foto:`, error);
        errors.push(photo.facebookId || 'unknown');
      }
    }

    // Retornar resultado
    return NextResponse.json({
      success: true,
      message: `${savedPhotos.length} fotos importadas com sucesso`,
      savedCount: savedPhotos.length,
      errorCount: errors.length,
      savedPhotos,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Facebook Photos] Erro ao processar fotos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar fotos do Facebook',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
