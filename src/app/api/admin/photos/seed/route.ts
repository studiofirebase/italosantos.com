import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// Endpoint para criar dados de exemplo de fotos
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

    // Dados de exemplo com URLs de imagens válidas
    const samplePhotos = [
      {
        title: 'Paisagem do Por do Sol',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop',
        storagePath: 'external',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Arquitetura Moderna',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=500&fit=crop',
        storagePath: 'external',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Natureza Verde',
        imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=500&fit=crop',
        storagePath: 'external',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Retrato Artístico',
        imageUrl: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=500&h=500&fit=crop',
        storagePath: 'external',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Verificar se já existem fotos
    const existingPhotos = await photosRef.limit(1).get();
    if (!existingPhotos.empty) {
      return NextResponse.json({
        success: false,
        message: 'Já existem fotos na galeria. Use o endpoint de limpeza primeiro se necessário.'
      });
    }

    // Adicionar fotos de exemplo
    const batch = adminDb.batch();
    samplePhotos.forEach((photo) => {
      const docRef = photosRef.doc();
      batch.set(docRef, photo);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${samplePhotos.length} fotos de exemplo criadas com sucesso`,
      count: samplePhotos.length
    });

  } catch (error) {
    console.error('Erro ao criar fotos de exemplo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar fotos de exemplo'
    }, { status: 500 });
  }
}
