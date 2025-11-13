#!/usr/bin/env node
/**
 * Script standalone para limpar o cache do Twitter no Firestore
 * Útil quando o filtro foi atualizado e precisa reprocessar os tweets
 */

const FIREBASE_PROJECT_ID = 'facepass-afhid';
const USERNAME = 'severepics'; // Altere para o username que deseja limpar

async function clearCache() {
  console.log('\n🧹 LIMPANDO CACHE DO TWITTER');
  console.log('━'.repeat(50));
  console.log(`📍 Projeto: ${FIREBASE_PROJECT_ID}`);
  console.log(`👤 Username: @${USERNAME}\n`);

  // Importar Firebase Admin
  const admin = require('firebase-admin');
  
  try {
    // Verificar se já foi inicializado
    if (!admin.apps.length) {
      const serviceAccount = require('./service_account.json');
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID,
        databaseURL: `https://${FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      
      console.log('✅ Firebase Admin inicializado');
    }

    const db = admin.firestore();

    // Limpar cache de fotos
    console.log('\n🗑️  Deletando cache de fotos...');
    const photosRef = db.collection('twitter_cache')
      .doc(USERNAME)
      .collection('media')
      .doc('photos');
    
    const photosSnap = await photosRef.get();
    if (photosSnap.exists) {
      await photosRef.delete();
      console.log('✅ Cache de fotos deletado');
    } else {
      console.log('ℹ️  Cache de fotos não existe');
    }

    // Limpar cache de vídeos
    console.log('\n🗑️  Deletando cache de vídeos...');
    const videosRef = db.collection('twitter_cache')
      .doc(USERNAME)
      .collection('media')
      .doc('videos');
    
    const videosSnap = await videosRef.get();
    if (videosSnap.exists) {
      await videosRef.delete();
      console.log('✅ Cache de vídeos deletado');
    } else {
      console.log('ℹ️  Cache de vídeos não existe');
    }

    console.log('\n' + '━'.repeat(50));
    console.log('🎉 CACHE LIMPO COM SUCESSO!');
    console.log('━'.repeat(50));
    console.log('\n💡 Próximo acesso às páginas /fotos e /videos irá:');
    console.log('   1️⃣  Buscar novos tweets da API do Twitter');
    console.log('   2️⃣  Aplicar o novo filtro (pré-filtro + Gemini)');
    console.log('   3️⃣  Salvar novo cache filtrado');
    console.log('\n✨ Teste acessando: http://localhost:3000/fotos\n');

  } catch (error) {
    console.error('\n❌ Erro ao limpar cache:', error.message);
    console.error(error);
    process.exit(1);
  }

  // Fechar app e sair
  await admin.app().delete();
  process.exit(0);
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  clearCache();
}
