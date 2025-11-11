"use client";

import Link from 'next/link';
import { Twitter, Instagram, Youtube, Facebook, Send, MessageCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { useProfileSettings } from '@/hooks/use-profile-settings';

declare global {
  interface Window {
    FB: any;
  }
}

const MainFooter = () => {
    const { settings: adminSettings } = useProfileSettings();

    useEffect(() => {
        if (typeof window !== 'undefined' && window.FB) {
            window.FB.XFBML.parse();
        }
    }, []);

    return (
        <footer className="w-full p-4 text-center text-sm text-muted-foreground">
            <Separator className="mb-4 bg-gray-400" />
            
            {/* Facebook Like Button */}
            <div className="my-4 flex justify-center">
                <div
                    className="fb-like"
                    data-share="true"
                    data-width="450"
                    data-show-faces="true"
                >
                </div>
            </div>
            
            {/* Copyright */}
            <p>Copyrights © Italo Santos 2019 - Todos os direitos reservados</p>
            
            {/* Ícones dinâmicos das redes sociais baseados nas configurações do footer */}
            <div className="flex justify-center gap-4 my-4">
                {adminSettings?.footerSettings?.showTwitter && adminSettings.footerSettings.twitterUrl && (
                    <Link 
                        href={adminSettings.footerSettings.twitterUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Twitter"
                        className="hover:scale-110 transition-transform"
                    >
                        <Twitter className="h-5 w-5 text-white hover:text-gray-400" />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showInstagram && adminSettings.footerSettings.instagramUrl && (
                    <Link 
                        href={adminSettings.footerSettings.instagramUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="hover:scale-110 transition-transform"
                    >
                        <Instagram className="h-5 w-5 text-white hover:text-gray-400" />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showYoutube && adminSettings.footerSettings.youtubeUrl && (
                    <Link 
                        href={adminSettings.footerSettings.youtubeUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="YouTube"
                        className="hover:scale-110 transition-transform"
                    >
                        <Youtube className="h-5 w-5 text-white hover:text-gray-400" />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showWhatsapp && adminSettings.footerSettings.whatsappUrl && (
                    <Link 
                        href={adminSettings.footerSettings.whatsappUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                        className="hover:scale-110 transition-transform"
                    >
                        <MessageCircle className="h-5 w-5 text-white hover:text-gray-400" />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showTelegram && adminSettings.footerSettings.telegramUrl && (
                    <Link 
                        href={adminSettings.footerSettings.telegramUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Telegram"
                        className="hover:scale-110 transition-transform"
                    >
                        <Send className="h-5 w-5 text-white hover:text-gray-400" />
                    </Link>
                )}

                {adminSettings?.footerSettings?.showFacebook && adminSettings.footerSettings.facebookUrl && (
                    <Link 
                        href={adminSettings.footerSettings.facebookUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="hover:scale-110 transition-transform"
                    >
                        <Facebook className="h-5 w-5 text-white hover:text-gray-400" />
                    </Link>
                )}

                {/* Fallback: Se não há configurações do footer, mostrar ícones padrão */}
                {(!adminSettings?.footerSettings || 
                  (!adminSettings.footerSettings.showTwitter && 
                   !adminSettings.footerSettings.showInstagram && 
                   !adminSettings.footerSettings.showYoutube && 
                   !adminSettings.footerSettings.showWhatsapp && 
                   !adminSettings.footerSettings.showTelegram && 
                   !adminSettings.footerSettings.showFacebook)) && (
                    <>
                        <Link href="https://twitter.com/italosantos" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                            <Twitter className="h-5 w-5 text-white hover:text-gray-400" />
                        </Link>
                        <Link href="https://instagram.com/italosantos" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <Instagram className="h-5 w-5 text-white hover:text-gray-400" />
                        </Link>
                        <Link href="https://youtube.com/@ItaloProfissional" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                            <Youtube className="h-5 w-5 text-white hover:text-gray-400" />
                        </Link>
                        <Link href="https://wa.me/5521990479104" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                            <MessageCircle className="h-5 w-5 text-white hover:text-gray-400" />
                        </Link>
                    </>
                )}
            </div>
            
            {/* Links Legais */}
            <p>
                <Link href="/termos-condicoes" className="underline hover:text-white transition-colors">
                    Termos & Condições
                </Link> 
                {' | '} 
                <Link href="/politica-de-privacidade" className="underline hover:text-white transition-colors">
                    Política de Privacidade
                </Link>
            </p>
            
            {/* Disclaimer */}
            <p className="mt-2">Este site inclui conteúdo protegido por direitos autorais, é proibida reprodução total ou parcial deste conteúdo sem autorização prévia do proprietário do site.</p>
        </footer>
    );
};

export default MainFooter;