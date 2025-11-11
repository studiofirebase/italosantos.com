import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT - Alternar status do conteúdo exclusivo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    if (!adminDb) {
      throw new Error("Firebase Admin DB não inicializado");
    }
    const docRef = adminDb.collection('exclusiveContent').doc(id);
    
    // Verificar se o documento existe
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Conteúdo não encontrado'
      }, { status: 404 });
    }
    
    const currentData = doc.data();
    const newStatus = currentData?.status === 'active' ? 'inactive' : 'active';
    
    await docRef.update({
      status: newStatus,
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: `Status alterado para ${newStatus}`,
      status: newStatus
    });
    
  } catch (error) {
    console.error('Erro ao alternar status:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao alternar status'
    }, { status: 500 });
  }
}
