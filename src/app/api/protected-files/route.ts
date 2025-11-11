import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { checkUserSubscriptionInternal } from '@/lib/subscription-check';

// Force Node.js runtime for Firebase compatibility
export const runtime = 'nodejs';

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use searchParams directly from request to avoid request.url issues
    const { searchParams } = request.nextUrl || new URL(request.url);
    const userId = searchParams.get('userId');
    const folderPath = searchParams.get('folderPath') || 'general-uploads';
    const mediaType = searchParams.get('mediaType') || 'all'; // 'all', 'images', 'videos'

    // Verificar se o usuário tem assinatura ativa
    let hasActiveSubscription = false;
    if (userId) {
      const subscriptionResult = await checkUserSubscriptionInternal(userId);
      hasActiveSubscription = subscriptionResult.success && (subscriptionResult.isActive || false);
    }

    // Verificar se adminApp foi inicializado
    const adminApp = getAdminApp();
    if (!adminApp) {
      throw new Error('Firebase Admin não foi inicializado');
    }

    // Obter lista de arquivos do Firebase Storage
    const storage = getStorage(adminApp);
    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`);
    
    const [files] = await bucket.getFiles({
      prefix: folderPath + '/',
      delimiter: '/'
    });

    const filteredFiles = [];

    for (const file of files) {
      // Pular pastas
      if (file.name.endsWith('/')) continue;

      try {
        const [metadata] = await file.getMetadata();
        const [exists] = await file.exists();
        
        if (!exists) continue;

        const fileType = metadata.contentType || 'application/octet-stream';
        
        // Filtrar por tipo de mídia
        if (mediaType === 'images' && !fileType.startsWith('image/')) continue;
        if (mediaType === 'videos' && !fileType.startsWith('video/')) continue;
        if (mediaType === 'all' && !fileType.startsWith('image/') && !fileType.startsWith('video/')) continue;

        // Verificar visibilidade
        const visibility = metadata.metadata?.visibility || 'public';
        
        // Se for conteúdo para assinantes e o usuário não tem assinatura ativa, pular
        if (visibility === 'subscribers' && !hasActiveSubscription) {
          continue;
        }

        // Gerar URL assinada (válida por 1 hora)
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000 // 1 hora
        });

        filteredFiles.push({
          name: file.name.split('/').pop(),
          fullPath: file.name,
          url: signedUrl,
          type: fileType,
          size: typeof metadata.size === 'string' ? parseInt(metadata.size) : (metadata.size || 0),
          createdAt: metadata.timeCreated || new Date().toISOString(),
          metadata: {
            visibility,
            customMetadata: metadata.metadata
          }
        });
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, error);
      }
    }

    // Ordenar por data de criação (mais recente primeiro)
    filteredFiles.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      files: filteredFiles,
      userAccess: {
        hasActiveSubscription,
        userId
      }
    });

  } catch (error) {
    console.error('Erro na API de arquivos protegidos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        files: []
      },
      { status: 500 }
    );
  }
}
