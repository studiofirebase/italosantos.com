import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';

interface ExclusiveContent {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
}

interface UseExclusiveContentReturn {
  content: ExclusiveContent[];
  loading: boolean;
  error: string | null;
  isSubscriber: boolean;
  requiresSubscription: boolean;
  refreshContent: () => Promise<void>;
  recordView: (contentId: string) => Promise<void>;
}

export function useExclusiveContent(type?: 'photo' | 'video'): UseExclusiveContentReturn {
  const { user } = useAuth();
  const [content, setContent] = useState<ExclusiveContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [requiresSubscription, setRequiresSubscription] = useState(false);

  const fetchContent = async () => {
    if (!user?.uid) {

      setLoading(false);
      setError('Usuário não autenticado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Usar email do usuário se disponível, senão usar UID
      const userIdentifier = user.email || user.uid;
      


      const params = new URLSearchParams({
        userId: userIdentifier
      });

      if (type) {
        params.append('type', type);
      }

      const response = await fetch(`/api/exclusive-content?${params}`);
      const data = await response.json();
      
      

      if (data.success) {
        setContent(data.content || []);
        setIsSubscriber(data.isSubscriber || false);
        setRequiresSubscription(false);
        
      } else {
        
        setError(data.message || 'Erro ao carregar conteúdo');
        setIsSubscriber(false);
        setRequiresSubscription(data.requiresSubscription || false);
        setContent([]);
      }
    } catch (err) {
      
      setError('Erro ao carregar conteúdo exclusivo');
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async (contentId: string) => {
    if (!user?.uid) return;

    try {
      const userIdentifier = user.email || user.uid;
      
      await fetch('/api/exclusive-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          userId: userIdentifier,
        }),
      });
    } catch (err) {

    }
  };

  const refreshContent = async () => {
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [user?.uid, type]);

  return {
    content,
    loading,
    error,
    isSubscriber,
    requiresSubscription,
    refreshContent,
    recordView,
  };
}

// Hook específico para fotos
export function useExclusivePhotos() {
  return useExclusiveContent('photo');
}

// Hook específico para vídeos
export function useExclusiveVideos() {
  return useExclusiveContent('video');
}
