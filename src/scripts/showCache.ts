import { adminDb } from '../lib/firebase-admin.ts';

async function showCacheContent() {
  try {
    console.log('📄 Conteúdo do cache migrado:');
    
    const doc = await adminDb.collection('twitterCache').doc('Severepics-photos-100').get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log(`\n📊 Documento: ${doc.id}`);
      console.log(`📅 Data: ${data?.timestamp?.toDate?.() || data?.timestamp}`);
      console.log(`👤 Username: ${data?.username}`);
      console.log(`🎬 Tipo: ${data?.mediaType}`);
      console.log(`🔢 Resultados: ${data?.maxResults}`);
      console.log(`📦 Total de itens: ${data?.data?.length || 0}`);
      
      if (data?.data && data.data.length > 0) {
        console.log(`\n🎯 Primeiro item:`, {
          id: data.data[0].id_str || data.data[0].id,
          text: data.data[0].full_text?.substring(0, 100) + '...' || 'N/A'
        });
      }
    } else {
      console.log('❌ Documento não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

showCacheContent();
