"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Declaração de tipos para o Google Translate
declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

interface GoogleTranslateProps {
  className?: string;
}

const GoogleTranslate = ({ className = "" }: GoogleTranslateProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Verificar se o Google Translate já está carregado
    if (window.google && window.google.translate) {
      setIsLoaded(true);
      return;
    }

    // Função de inicialização do Google Translate
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'pt',
            includedLanguages: 'pt,en,es,fr,de,it,ja,ko,zh-CN,ru,ar',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          'google_translate_element'
        );
        setIsLoaded(true);
      }
    };

    // Carregar o script do Google Translate
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const changeLanguage = (langCode: string) => {
    const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = langCode;
      selectElement.dispatchEvent(new Event('change'));
    }
  };

  const languages = [
    { code: '', label: 'Português (Original)' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'zh-CN', label: '中文' },
    { code: 'ru', label: 'Русский' },
    { code: 'ar', label: 'العربية' },
  ];

  return (
    <>
      {/* Elemento oculto para o Google Translate */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      
      {/* Botão customizado com dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`text-muted-foreground hover:text-white hover:bg-gray-800 !shadow-none ${className}`}
            title="Traduzir página"
          >
            <Languages className="h-5 w-5" />
            <span className="sr-only">Traduzir página</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="cursor-pointer"
            >
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Estilos para customizar o widget do Google Translate */}
      <style jsx global>{`
        /* Ocultar o banner do Google Translate */
        .goog-te-banner-frame.skiptranslate {
          display: none !important;
        }
        
        body {
          top: 0 !important;
        }
        
        /* Ocultar elementos desnecessários */
        .goog-te-gadget {
          display: none !important;
        }
        
        /* Customizar o widget se visível */
        #google_translate_element .goog-te-gadget-simple {
          background-color: transparent;
          border: none;
          font-size: 10pt;
          display: inline-block;
          cursor: pointer;
          zoom: 1;
        }
        
        #google_translate_element .goog-te-gadget-icon {
          display: none;
        }
        
        /* Remover bordas indesejadas */
        .goog-te-menu-value span {
          border: none !important;
        }
        
        /* Ajustar altura do frame */
        iframe.goog-te-menu-frame {
          max-height: 400px !important;
          overflow-y: auto !important;
        }
      `}</style>
    </>
  );
};

export default GoogleTranslate;
