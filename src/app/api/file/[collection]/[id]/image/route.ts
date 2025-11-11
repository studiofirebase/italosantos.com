import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface RouteParams {
  params: {
    collection: string;
    id: string;
  };
}

// GET - Servir imagem diretamente (para base64)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = params;
    
    if (!collection || !id) {
      return new NextResponse('Collection e ID são obrigatórios', { status: 400 });
    }
    
    const adminDb = getAdminDb();
    if (!adminDb) {
      return new NextResponse('Erro de configuração do banco de dados', { status: 500 });
    }
    
    const docRef = adminDb.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return new NextResponse('Arquivo não encontrado', { status: 404 });
    }
    
    const data = doc.data();
    
    // Se for base64, servir como imagem
    if (data?.storageType === 'firestore-base64' && data?.fileData) {
      const buffer = Buffer.from(data.fileData, 'base64');
      const contentType = data.fileType || 'image/jpeg';
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': buffer.length.toString(),
        },
      });
    }
    
    // Se for Firebase Storage, redirecionar
    if (data?.storageType === 'firebase-storage' && data?.url) {
      return NextResponse.redirect(data.url);
    }
    
    // Se for URL externa, redirecionar
    if (data?.imageUrl) {
      return NextResponse.redirect(data.imageUrl);
    }
    
    return new NextResponse('Imagem não encontrada', { status: 404 });
    
  } catch (error) {
    console.error('Erro ao servir imagem:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}
