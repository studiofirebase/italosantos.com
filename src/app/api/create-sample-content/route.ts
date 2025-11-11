import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'adminDb não disponível'
      }, { status: 500 });
    }

    const exclusiveContentRef = adminDb.collection('exclusiveContent');
    const existingContent = await exclusiveContentRef.get();

    if (!existingContent.empty) {
      return NextResponse.json({
        success: true,
        message: `Já existem ${existingContent.size} itens de conteúdo. Use o painel admin para gerenciar.`,
        existingCount: existingContent.size
      });
    }

    const sampleContent = [
      {
        title: 'Foto Exclusiva 1 - Paisagem Natural',
        description: 'Uma foto incrível de paisagem natural exclusiva para assinantes',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        tags: ['natureza', 'paisagem', 'exclusivo'],
        viewCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Foto Exclusiva 2 - Floresta Verde',
        description: 'Outra foto espetacular de floresta para nossos assinantes',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
        tags: ['floresta', 'verde', 'exclusivo'],
        viewCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Foto Exclusiva 3 - Montanhas',
        description: 'Foto impressionante de montanhas para assinantes',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&crop=entropy',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=entropy',
        tags: ['montanhas', 'natureza', 'exclusivo'],
        viewCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Vídeo Exclusivo 1 - Natureza',
        description: 'Um vídeo incrível de natureza exclusivo para assinantes',
        type: 'video',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        tags: ['vídeo', 'natureza', 'exclusivo'],
        viewCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Vídeo Exclusivo 2 - Paisagem',
        description: 'Vídeo espetacular de paisagem para assinantes',
        type: 'video',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
        tags: ['vídeo', 'paisagem', 'exclusivo'],
        viewCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Vídeo Exclusivo 3 - Aventura',
        description: 'Vídeo de aventura exclusivo para assinantes',
        type: 'video',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=entropy',
        tags: ['vídeo', 'aventura', 'exclusivo'],
        viewCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const batch = adminDb.batch();
    const createdIds: string[] = [];

    sampleContent.forEach((item) => {
      const docRef = exclusiveContentRef.doc();
      batch.set(docRef, item);
      createdIds.push(docRef.id);
    });

    await batch.commit();

    console.log(`[Create Sample Content] ${sampleContent.length} itens de conteúdo criados com sucesso`);

    return NextResponse.json({
      success: true,
      message: `${sampleContent.length} itens de conteúdo exclusivo criados com sucesso`,
      createdIds,
      content: sampleContent
    });

  } catch (error) {
    console.error('[Create Sample Content] Erro:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar conteúdo de exemplo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
