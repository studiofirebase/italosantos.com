import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';

// Force Node.js runtime para suporte a Buffer/stream
export const runtime = 'nodejs';
// POST method for upload
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀🚀🚀 [NOVA VERSÃO] Upload SEM base64 - V2.0 🚀🚀🚀');
    }
    
          if (process.env.NODE_ENV === 'development') {
        console.log('✅ [NOVA VERSÃO] Firebase Storage ATIVO!');
      }
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'general';
    const title = formData.get('title') as string || '';
    const visibility = formData.get('visibility') as string || 'public';

    console.log('📋 [UPLOAD OTIMIZADO] Dados recebidos:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      folder: folder,
      title: title,
      visibility: visibility
    });

    if (!file) {
      console.error('❌ [UPLOAD OTIMIZADO] Nenhum arquivo enviado');
      return NextResponse.json({ 
        success: false,
        message: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }
    
    // Validar tamanho do arquivo (máximo 100MB para Storage)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      console.error('❌ [UPLOAD OTIMIZADO] Arquivo muito grande:', file.size);
      return NextResponse.json({ 
        success: false,
        message: 'Arquivo muito grande. Máximo 100MB'
      }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/', 'video/'];
    const isValidType = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isValidType) {
      console.error('❌ [UPLOAD OTIMIZADO] Tipo não permitido:', file.type);
      return NextResponse.json({ 
        success: false,
        message: 'Tipo de arquivo não permitido. Apenas imagens e vídeos'
      }, { status: 400 });
    }

    console.log('✅ [UPLOAD OTIMIZADO] Validações OK - Iniciando upload direto...');
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${timestamp}_${randomId}.${fileExtension}`;
    const storagePath = `uploads/${folder}/${fileName}`;

    console.log('📁 [UPLOAD OTIMIZADO] Caminho Storage:', storagePath);

    // ⚡ UPLOAD DIRETO VIA BUFFER - SEM BASE64! ⚡
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log('⚡ [UPLOAD OTIMIZADO] Buffer criado - ZERO base64!');
    
    // Upload para Firebase Storage
    const adminStorage = getAdminStorage();
    
    if (!adminStorage) {
      console.error('[Admin] Firebase Storage não inicializado');
      return NextResponse.json({
        success: false,
        error: 'Firebase Storage não inicializado'
      }, { status: 500 });
    }
    
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);
    
    // Upload do arquivo
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedBy: 'admin',
          folder: folder
        }
      }
    });

    console.log('🔓 [UPLOAD OTIMIZADO] Tornando arquivo público...');
    // Tornar arquivo público
    await fileRef.makePublic();
    
    // Obter URL pública
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    console.log('🌐 [UPLOAD OTIMIZADO] URL pública gerada:', publicUrl);

    // Determinar coleção baseada no tipo de arquivo
    const collection = file.type.startsWith('image/') ? 'photos' : 'videos';
    const documentId = `${folder}_${timestamp}_${randomId}`;

    // Dados do documento para Firestore (apenas metadados!)
    const documentData = {
      id: documentId,
      fileName: fileName,
      originalName: file.name,
      title: title || file.name,
      type: file.type,
      size: file.size,
      folder: folder,
      visibility: visibility,
      url: publicUrl,
      downloadURL: publicUrl,
      path: storagePath,
      storageType: 'firebase-storage',
      uploadedBy: 'admin',
      uploadDate: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 [UPLOAD OTIMIZADO] Salvando metadados no Firestore...');

    // Salvar metadados no Firestore
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin DB não inicializado');
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin DB não inicializado'
      }, { status: 500 });
    }
    
    await adminDb.collection(collection).doc(documentId).set(documentData);

    console.log('🎉 [UPLOAD OTIMIZADO] Upload completo! Performance máxima!');
    
    return NextResponse.json({
      success: true,
      message: 'Arquivo enviado com sucesso via Storage direto!',
      url: publicUrl,
      data: documentData
    });
    
  } catch (error) {
    console.error('💥 [UPLOAD OTIMIZADO] Erro:', error);
    return NextResponse.json({ 
      success: false,
      message: `Erro durante o upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }, { status: 500 });
  }
}
