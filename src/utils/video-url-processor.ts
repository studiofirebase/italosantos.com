/**
 * Utilitário para processar URLs de vídeo de diferentes plataformas
 */

export interface VideoUrlInfo {
  platform: 'youtube' | 'vimeo' | 'dailymotion' | 'direct' | 'unknown';
  embedUrl?: string;
  thumbnailUrl?: string;
  videoId?: string;
  originalUrl: string;
  isEmbeddable: boolean;
  getDirectUrl?: () => Promise<string | null>;
}

/**
 * Extrai ID do vídeo do YouTube de diferentes formatos de URL
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extrai ID do vídeo do Vimeo
 */
export function extractVimeoId(url: string): string | null {
  const pattern = /(?:vimeo\.com\/)(\d+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Extrai ID do vídeo do Dailymotion
 */
export function extractDailymotionId(url: string): string | null {
  const pattern = /(?:dailymotion\.com\/video\/)([^_]+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Verifica se uma URL é um vídeo direto (MP4, AVI, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
  const urlLower = url.toLowerCase();
  
  // Verificar extensões diretas
  if (videoExtensions.some(ext => urlLower.includes(ext))) {
    return true;
  }
  
  // Verificar URLs do Firebase Storage (sempre considerar como vídeo se estiver na pasta videos)
  if (urlLower.includes('storage.googleapis.com') && urlLower.includes('/videos/')) {
    return true;
  }
  
  // Verificar URLs do Google Drive
  if (urlLower.includes('drive.google.com') || urlLower.includes('docs.google.com')) {
    return true;
  }
  
  // Verificar outros serviços de armazenamento
  if (urlLower.includes('firebasestorage.googleapis.com')) {
    return true;
  }
  
  // Verificar URLs de exemplo de vídeo
  if (urlLower.includes('sample-videos.com')) {
    return true;
  }
  
  return false;
}

/**
 * Extrai URL direta do YouTube para uso em HTML5 player
 */
export async function getYouTubeDirectUrl(videoId: string): Promise<string | null> {
  try {
    // Método usando YouTube oEmbed API para obter informações básicas
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    // Como não podemos extrair URLs diretas facilmente devido às restrições do YouTube,
    // vamos usar uma abordagem diferente: tentar URLs de fallback conhecidas
    
    // URLs de teste que às vezes funcionam (qualidade baixa)
    const possibleUrls = [
      `https://www.youtube.com/watch?v=${videoId}`, // URL original como fallback
      `https://youtu.be/${videoId}` // URL curta como fallback
    ];
    
    // Por enquanto, retornamos null para forçar o uso do embed
    // Em produção, você poderia usar serviços como yt-dlp ou APIs especializadas
    return null;
    
  } catch (error) {
    // Silencioso em produção - erro esperado
    if (process.env.NODE_ENV === 'development') {
      console.log('Erro ao extrair URL direta do YouTube:', error);
    }
    return null;
  }
}

/**
 * Processa uma URL de vídeo e retorna informações sobre a plataforma e URLs necessárias
 */
export function processVideoUrl(url: string): VideoUrlInfo {
  const normalizedUrl = url.trim().toLowerCase();

  // YouTube
  if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return {
        platform: 'youtube',
        videoId,
        originalUrl: url,
        embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : 'https://creatorsphere-srajp.web.app'}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        isEmbeddable: true
      };
    }
  }

  // Vimeo
  if (normalizedUrl.includes('vimeo.com')) {
    const videoId = extractVimeoId(url);
    if (videoId) {
      return {
        platform: 'vimeo',
        videoId,
        originalUrl: url,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`,
        isEmbeddable: true
      };
    }
  }

  // Dailymotion
  if (normalizedUrl.includes('dailymotion.com')) {
    const videoId = extractDailymotionId(url);
    if (videoId) {
      return {
        platform: 'dailymotion',
        videoId,
        originalUrl: url,
        embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
        isEmbeddable: true
      };
    }
  }

  // Vídeo direto
  if (isDirectVideoUrl(url)) {
    return {
      platform: 'direct',
      originalUrl: url,
      isEmbeddable: false
    };
  }

  // URL desconhecida - tentar como vídeo direto
  return {
    platform: 'unknown',
    originalUrl: url,
    isEmbeddable: false
  };
}

/**
 * Gera thumbnail para diferentes plataformas
 */
export function generateThumbnailUrl(videoInfo: VideoUrlInfo): string | null {
  switch (videoInfo.platform) {
    case 'youtube':
      return videoInfo.thumbnailUrl || null;
    case 'vimeo':
      return videoInfo.thumbnailUrl || null;
    case 'dailymotion':
      if (videoInfo.videoId) {
        return `https://www.dailymotion.com/thumbnail/video/${videoInfo.videoId}`;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Verifica se uma URL é válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecta automaticamente o tipo de conteúdo baseado na URL
 */
export function detectContentType(url: string): 'photo' | 'video' {
  const normalizedUrl = url.toLowerCase();
  
  // Plataformas de vídeo conhecidas
  const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
  if (videoPlatforms.some(platform => normalizedUrl.includes(platform))) {
    return 'video';
  }

  // Extensões de vídeo
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
  if (videoExtensions.some(ext => normalizedUrl.includes(ext))) {
    return 'video';
  }

  // Extensões de imagem
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  if (imageExtensions.some(ext => normalizedUrl.includes(ext))) {
    return 'photo';
  }

  // Se não conseguir detectar, assume que é foto por padrão
  return 'photo';
}
