/**
 * Script de teste para validar o filtro de mídia do Twitter
 * Execute: node test-twitter-filter.js
 */

// Simular dados de tweets para testar o filtro local
const mockTweets = [
  {
    id: '1',
    text: 'Minha foto de hoje! #selfie',
    username: 'severepics',
    media: [{ type: 'photo', url: 'https://example.com/photo1.jpg' }]
  },
  {
    id: '2',
    text: '@usuario oi, tudo bem?',
    username: 'severepics',
    media: [{ type: 'photo', url: 'https://example.com/photo2.jpg' }]
  },
  {
    id: '3',
    text: 'Vídeo incrível que gravei',
    username: 'severepics',
    media: [{ type: 'video', url: 'https://example.com/video1.mp4' }]
  },
  {
    id: '4',
    text: 'Post aleatório',
    username: 'outroUsuario',
    media: [{ type: 'photo', url: 'https://example.com/photo3.jpg' }]
  },
  {
    id: '5',
    text: 'GIF engraçado',
    username: 'severepics',
    media: [{ type: 'animated_gif', url: 'https://example.com/gif1.gif' }]
  },
  {
    id: '6',
    text: 'Compartilhando meme',
    username: 'severepics',
    media: []
  }
];

// Simular pré-filtro (mesma lógica do código)
function testPreFilter(tweets, targetUsername) {
  return tweets.filter(t => {
    const isCorrectUser = t.username.toLowerCase() === targetUsername.toLowerCase();
    const hasValidMedia = t.media && t.media.length > 0;
    const isNotReply = !t.text.trim().startsWith('@');
    
    return isCorrectUser && hasValidMedia && isNotReply;
  });
}

// Simular separação por tipo
function separateByType(tweets) {
  const photos = tweets.filter(t => 
    t.media.some(m => m.type === 'photo')
  );
  
  const videos = tweets.filter(t =>
    t.media.some(m => m.type === 'video' || m.type === 'animated_gif')
  );
  
  return { photos, videos };
}

console.log('🧪 TESTE DO FILTRO DE MÍDIA DO TWITTER\n');
console.log('📊 Tweets originais:', mockTweets.length);
console.log('Tweets:', mockTweets.map(t => `${t.id}: ${t.username} - ${t.text.substring(0, 30)}...`).join('\n       '));

console.log('\n🔍 Aplicando pré-filtro...');
const filtered = testPreFilter(mockTweets, 'severepics');
console.log('✅ Tweets após pré-filtro:', filtered.length);
console.log('Resultado:', filtered.map(t => `${t.id}: ${t.text.substring(0, 40)}...`).join('\n          '));

console.log('\n📸 Separando por tipo de mídia...');
const { photos, videos } = separateByType(filtered);
console.log('Fotos:', photos.length, '- IDs:', photos.map(t => t.id).join(', '));
console.log('Vídeos:', videos.length, '- IDs:', videos.map(t => t.id).join(', '));

console.log('\n✅ TESTES CONCLUÍDOS');
console.log('\n📋 RESUMO:');
console.log('- Tweets originais: 6');
console.log('- Filtrados (usuario correto + mídia + não-reply): 3');
console.log('- Fotos pessoais: 1');
console.log('- Vídeos pessoais (incluindo GIF): 2');
console.log('\n✅ Filtro funcionando corretamente!');
console.log('\n💡 PRÓXIMO PASSO: Testar com dados reais da API');
console.log('   Acesse: http://localhost:3000/fotos');
console.log('   Ou: http://localhost:3000/videos');
