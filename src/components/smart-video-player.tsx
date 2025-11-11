'use client'

import { useState, useEffect } from 'react'
import { Play, AlertCircle, ExternalLink } from 'lucide-react'
import { processVideoUrl, VideoUrlInfo } from '@/utils/video-url-processor'
import FirebaseVideoPlayer from './firebase-video-player'
import { useEnvironment, shouldUseEmbed } from '@/hooks/use-environment'
import SmartImage from './smart-image'

interface SmartVideoPlayerProps {
  url: string
  title?: string
  className?: string
  showControls?: boolean
  autoplay?: boolean
  muted?: boolean
  poster?: string
  onError?: (error: string) => void
}

export default function SmartVideoPlayer({
  url,
  title = 'Vídeo',
  className = '',
  showControls = true,
  autoplay = false,
  muted = true,
  poster,
  onError
}: SmartVideoPlayerProps) {
  const [videoInfo, setVideoInfo] = useState<VideoUrlInfo | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const environment = useEnvironment()

  useEffect(() => {
    if (!url) {
      setHasError(true)
      setIsLoading(false)
      return
    }

    try {
      const info = processVideoUrl(url)
      setVideoInfo(info)
      setHasError(false)
    } catch (error) {
      setHasError(true)
      onError?.('Erro ao processar URL do vídeo')
    } finally {
      setIsLoading(false)
    }
  }, [url, onError])

  const handleIframeError = () => {

    setHasError(true)
    onError?.('Embed falhou, usando fallback')
  }

  const handleVideoError = () => {
    setHasError(true)
    onError?.('Erro ao carregar vídeo direto')
  }

  if (isLoading) {
    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (hasError || !videoInfo) {
    // Se houve erro no embed, mostrar fallback inteligente
    if (videoInfo) {
      const platformColors = {
        youtube: 'bg-red-600',
        vimeo: 'bg-blue-600', 
        dailymotion: 'bg-orange-600',
        direct: 'bg-gray-700',
        unknown: 'bg-gray-600'
      }
      
      const platformNames = {
        youtube: 'YouTube',
        vimeo: 'Vimeo', 
        dailymotion: 'Dailymotion',
        direct: 'Vídeo Direto',
        unknown: 'Vídeo'
      }

      const colorClass = platformColors[videoInfo.platform as keyof typeof platformColors] || 'bg-gray-600'
      const platformName = platformNames[videoInfo.platform as keyof typeof platformNames] || 'Vídeo'

      return (
        <div className={`relative ${colorClass} rounded-lg overflow-hidden flex items-center justify-center cursor-pointer ${className}`}>
          <div className="text-center p-4">
            <ExternalLink className="w-12 h-12 text-white mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-white mb-2">{platformName}</h3>
            <p className="text-sm text-white/80 mb-4">
              Embed não disponível em localhost
            </p>
            <a
              href={videoInfo.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no {platformName}
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Erro ao carregar vídeo</p>
          <p className="text-xs text-gray-500 mt-1">Verifique se a URL está correta</p>
        </div>
      </div>
    )
  }

  // Renderizar embed para plataformas suportadas
  if (videoInfo.isEmbeddable && videoInfo.embedUrl) {
    const useEmbed = shouldUseEmbed(videoInfo.platform, environment)

    // Se não deve usar embed, mostrar link direto
    if (!useEmbed) {
      const platformColors = {
        youtube: 'bg-red-600 hover:bg-red-700',
        vimeo: 'bg-blue-600 hover:bg-blue-700',
        dailymotion: 'bg-orange-600 hover:bg-orange-700'
      }
      
      const platformNames = {
        youtube: 'YouTube',
        vimeo: 'Vimeo',
        dailymotion: 'Dailymotion'
      }

      const colorClass = platformColors[videoInfo.platform as keyof typeof platformColors] || 'bg-gray-600 hover:bg-gray-700'
      const platformName = platformNames[videoInfo.platform as keyof typeof platformNames] || 'Vídeo'

      return (
        <div className={`relative rounded-lg overflow-hidden ${className} bg-gray-100`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div className={`${colorClass.split(' ')[0]} rounded-full p-4 mb-4`}>
              <ExternalLink className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{platformName}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {environment.isLocalhost ? 'Em localhost, clique para abrir externamente' : 'Clique para abrir no site original'}
            </p>
            <a
              href={videoInfo.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colorClass} text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2`}
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no {platformName}
            </a>
          </div>
          {videoInfo.thumbnailUrl && (
            <div className="absolute inset-0 opacity-20">
              <SmartImage
                src={videoInfo.thumbnailUrl}
                alt={title}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      )
    }

    // Tentar embed primeiro, com fallback automático se falhar
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <iframe
          src={videoInfo.embedUrl}
          title={title}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={handleIframeError}
          onLoad={() => {}}
        />
      </div>
    )
  }

  // Renderizar player nativo para vídeos diretos
  if (videoInfo.platform === 'direct') {
    // Se for URL do Firebase Storage, usar player especializado
    if (videoInfo.originalUrl.includes('storage.googleapis.com') || 
        videoInfo.originalUrl.includes('firebasestorage.googleapis.com')) {
      return (
        <FirebaseVideoPlayer
          url={videoInfo.originalUrl}
          title={title}
          className={className}
          showControls={showControls}
          autoplay={autoplay}
          muted={muted}
          poster={poster || videoInfo.thumbnailUrl}
          onError={onError}
        />
      )
    }
    
    // Player padrão para outros vídeos diretos
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <video
          src={videoInfo.originalUrl}
          className="w-full h-full object-cover"
          controls={showControls}
          autoPlay={autoplay}
          muted={muted}
          poster={poster || videoInfo.thumbnailUrl}
          onError={handleVideoError}
          preload="metadata"
          crossOrigin="anonymous"
          playsInline
        >
          <source src={videoInfo.originalUrl} type="video/mp4" />
          <source src={videoInfo.originalUrl} type="video/webm" />
          <source src={videoInfo.originalUrl} type="video/ogg" />
          Seu navegador não suporta o elemento de vídeo.
        </video>
      </div>
    )
  }

  // Fallback para URLs desconhecidas - tentar como vídeo direto
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <video
        src={videoInfo.originalUrl}
        className="w-full h-full object-cover"
        controls={showControls}
        autoPlay={autoplay}
        muted={muted}
        poster={poster}
        onError={handleVideoError}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
      >
        <source src={videoInfo.originalUrl} type="video/mp4" />
        <source src={videoInfo.originalUrl} type="video/webm" />
        <source src={videoInfo.originalUrl} type="video/ogg" />
        Seu navegador não suporta o elemento de vídeo.
      </video>
      
      {/* Overlay informativo */}
      {!showControls && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="text-center p-4">
            <Play className="w-12 h-12 text-white mx-auto mb-2" />
            <p className="text-sm text-white">Clique para reproduzir</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para thumbnail inteligente
interface SmartVideoThumbnailProps {
  url: string
  title?: string
  className?: string
  onClick?: () => void
}

export function SmartVideoThumbnail({
  url,
  title = 'Vídeo',
  className = '',
  onClick
}: SmartVideoThumbnailProps) {
  const [videoInfo, setVideoInfo] = useState<VideoUrlInfo | null>(null)
  const [thumbnailError, setThumbnailError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (url) {
      try {
        const info = processVideoUrl(url)
        setVideoInfo(info)
        setIsLoading(false)
        

      } catch (error) {
        setVideoInfo({ 
          platform: 'unknown', 
          originalUrl: url, 
          isEmbeddable: false 
        })
        setIsLoading(false)
      }
    }
  }, [url])



  // Definir cores e ícones das plataformas
  const getPlatformInfo = (platform: string) => {
    const platformData = {
      youtube: { color: 'bg-red-600', icon: '📺' },
      vimeo: { color: 'bg-blue-600', icon: '🎬' },
      dailymotion: { color: 'bg-orange-600', icon: '📹' },
      direct: { color: 'bg-gray-700', icon: '🎥' },
      unknown: { color: 'bg-gray-600', icon: '🎬' }
    }
    return platformData[platform as keyof typeof platformData] || platformData.unknown
  }

  const platformInfo = getPlatformInfo(videoInfo?.platform || 'unknown')
  const isDirectVideo = videoInfo?.platform === 'direct' || url.includes('firebasestorage.googleapis.com')

  if (isLoading) {
    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Para vídeos diretos (Firebase Storage), usar elemento video nativo como thumbnail
  if (isDirectVideo && !thumbnailError) {
    return (
      <div 
        className={`relative rounded-lg overflow-hidden cursor-pointer group ${className}`}
        onClick={onClick}
      >
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          onError={() => {
            setThumbnailError(true)
          }}
          style={{ pointerEvents: 'none' }}
        />
        

        

      </div>
    )
  }

  // Para plataformas externas, tentar usar thumbnail da API
  const thumbnailUrl = videoInfo?.thumbnailUrl
  if (thumbnailUrl && !thumbnailError) {
    return (
      <div 
        className={`relative rounded-lg overflow-hidden cursor-pointer group ${className}`}
        onClick={onClick}
      >
        <SmartImage
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover"
          onError={() => {

            setThumbnailError(true)
          }}
          fallbackSrc="/placeholder-video.svg"
        />
        

        

      </div>
    )
  }

  // Fallback: card colorido por plataforma
  return (
    <div 
      className={`relative ${platformInfo.color} rounded-lg overflow-hidden flex items-center justify-center cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="text-center p-4 w-full">
        <Play className="w-12 h-12 text-white mx-auto mb-2" />
        <p className="text-xs text-white/80 truncate">{title}</p>
      </div>
      
      {/* Badge no canto */}
      <div className="absolute top-2 right-2">
        <div className="bg-black/30 text-white text-xs px-2 py-1 rounded">
          {platformInfo.icon}
        </div>
      </div>
    </div>
  )
}
