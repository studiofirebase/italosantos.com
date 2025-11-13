
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, User, Phone, Mail, MapPin, Image as ImageIcon, Loader2, RefreshCw, ExternalLink, CreditCard, Instagram, Twitter, Youtube, MessageCircle, Star, Camera, Eye, EyeOff, Facebook, Send, X } from "lucide-react";
import { getProfileSettings, saveProfileSettings, type ProfileSettings } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import dynamic from 'next/dynamic';

const TipTapEditor = dynamic(() => import('@/components/tiptap-editor'), {
    ssr: false,
    loading: () => <p>Carregando editor...</p>
});

export default function AdminSettingsPage() {
    const { toast } = useToast();

    const [settings, setSettings] = useState<ProfileSettings>({
        name: "Italo Santos",
        phone: "5521990479104",
        email: "pix@italosantos.com",
        address: "Avenida Paulista, São Paulo, SP, Brasil",
        description: "Criador de conteúdo profissional e especialista em relacionamento.",
        profilePictureUrl: "https://placehold.co/150x150.png",
        coverPhotoUrl: "https://placehold.co/1200x400.png",
        galleryPhotos: Array(7).fill({ url: "https://placehold.co/400x600.png" }),
        galleryNames: ["ACOMPANHANTE MASCULINO", "SENSUALIDADE", "PRAZER", "BDSM", "FETISH", "FANTASIA", "IS"],
        adultWorkLabel: "+18 ADULT WORK",
        socialMedia: {
            instagram: "@italosantos",
            twitter: "@italosantos",
            youtube: "ItaloProfissional",
            whatsapp: "5521990479104",
            telegram: "@italosantos"
        },
        reviewSettings: {
            showReviews: true,
            moderateReviews: true,
            defaultReviewMessage: "Muito obrigado pela sua avaliação! Seu feedback é muito importante para mim. 💕"
        },
        paymentSettings: {
            pixValue: 99.00,
            pixKey: "pix@italosantos.com",
            pixKeyType: "email"
        },
        footerSettings: {
            showTwitter: true,
            twitterUrl: "https://twitter.com/italosantos",
            showInstagram: true,
            instagramUrl: "https://instagram.com/italosantos",
            showYoutube: true,
            youtubeUrl: "https://youtube.com/@ItaloProfissional",
            showWhatsapp: true,
            whatsappUrl: "https://wa.me/5521990479104",
            showTelegram: false,
            telegramUrl: "https://t.me/italosantos",
            showFacebook: false,
            facebookUrl: "https://facebook.com/italosantos"
        }
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [isValidatingAddress, setIsValidatingAddress] = useState(false);
    const [addressValidation, setAddressValidation] = useState<{ valid: boolean; message: string } | null>(null);

    useEffect(() => {
        async function loadSettings() {
            setIsLoading(true);
            try {
                const loadedSettings = await getProfileSettings();
                if (loadedSettings) {
                    // Ensure galleryPhotos has 7 items, padding with placeholders if needed
                    const gallery = loadedSettings.galleryPhotos || [];
                    while (gallery.length < 7) {
                        gallery.push({ url: "https://placehold.co/400x600.png" });
                    }
                    loadedSettings.galleryPhotos = gallery.slice(0, 7);

                    // Merge com dados padrão para garantir que todos os campos existam
                    setSettings(prev => ({
                        ...prev,
                        ...loadedSettings,
                        socialMedia: {
                            instagram: loadedSettings.socialMedia?.instagram || prev.socialMedia?.instagram || '',
                            twitter: loadedSettings.socialMedia?.twitter || prev.socialMedia?.twitter || '',
                            youtube: loadedSettings.socialMedia?.youtube || prev.socialMedia?.youtube || '',
                            whatsapp: loadedSettings.socialMedia?.whatsapp || prev.socialMedia?.whatsapp || '',
                            telegram: loadedSettings.socialMedia?.telegram || prev.socialMedia?.telegram || ''
                        },
                        reviewSettings: {
                            showReviews: loadedSettings.reviewSettings?.showReviews ?? prev.reviewSettings?.showReviews ?? true,
                            moderateReviews: loadedSettings.reviewSettings?.moderateReviews ?? prev.reviewSettings?.moderateReviews ?? true,
                            defaultReviewMessage: loadedSettings.reviewSettings?.defaultReviewMessage || prev.reviewSettings?.defaultReviewMessage || ''
                        },
                        paymentSettings: {
                            pixValue: loadedSettings.paymentSettings?.pixValue ?? prev.paymentSettings?.pixValue ?? 99.00,
                            pixKey: loadedSettings.paymentSettings?.pixKey || prev.paymentSettings?.pixKey || 'pix@italosantos.com',
                            pixKeyType: loadedSettings.paymentSettings?.pixKeyType || prev.paymentSettings?.pixKeyType || 'email'
                        },
                        footerSettings: {
                            showTwitter: loadedSettings.footerSettings?.showTwitter ?? prev.footerSettings?.showTwitter ?? true,
                            twitterUrl: loadedSettings.footerSettings?.twitterUrl || prev.footerSettings?.twitterUrl || 'https://twitter.com/italosantos',
                            showInstagram: loadedSettings.footerSettings?.showInstagram ?? prev.footerSettings?.showInstagram ?? true,
                            instagramUrl: loadedSettings.footerSettings?.instagramUrl || prev.footerSettings?.instagramUrl || 'https://instagram.com/italosantos',
                            showYoutube: loadedSettings.footerSettings?.showYoutube ?? prev.footerSettings?.showYoutube ?? true,
                            youtubeUrl: loadedSettings.footerSettings?.youtubeUrl || prev.footerSettings?.youtubeUrl || 'https://youtube.com/@ItaloProfissional',
                            showWhatsapp: loadedSettings.footerSettings?.showWhatsapp ?? prev.footerSettings?.showWhatsapp ?? true,
                            whatsappUrl: loadedSettings.footerSettings?.whatsappUrl || prev.footerSettings?.whatsappUrl || 'https://wa.me/5521990479104',
                            showTelegram: loadedSettings.footerSettings?.showTelegram ?? prev.footerSettings?.showTelegram ?? false,
                            telegramUrl: loadedSettings.footerSettings?.telegramUrl || prev.footerSettings?.telegramUrl || 'https://t.me/italosantos',
                            showFacebook: loadedSettings.footerSettings?.showFacebook ?? prev.footerSettings?.showFacebook ?? false,
                            facebookUrl: loadedSettings.footerSettings?.facebookUrl || prev.footerSettings?.facebookUrl || 'https://facebook.com/italosantos'
                        }
                    }));
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar configurações",
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, [toast]);



    const handleInputChange = (field: keyof ProfileSettings, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // Endereços populares pré-definidos
    const popularAddresses = [
        "Copacabana, Rio de Janeiro, RJ, Brasil",
        "Ipanema, Rio de Janeiro, RJ, Brasil",
        "Avenida Paulista, São Paulo, SP, Brasil",
        "Vila Madalena, São Paulo, SP, Brasil",
        "Savassi, Belo Horizonte, MG, Brasil",
        "Asa Norte, Brasília, DF, Brasil",
        "Pelourinho, Salvador, BA, Brasil",
        "Boa Viagem, Recife, PE, Brasil"
    ];

    // Função para buscar sugestões de endereço
    const searchAddressSuggestions = async (query: string) => {
        if (query.length < 2) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        try {
            let suggestions: string[] = [];

            if (query.length < 3) {
                // Para queries curtas, mostrar endereços populares
                suggestions = popularAddresses.filter(addr =>
                    addr.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5);
            } else {
                // Para queries mais longas, gerar sugestões baseadas na query
                const baseSuggestions = [
                    `${query}, São Paulo, SP, Brasil`,
                    `${query}, Rio de Janeiro, RJ, Brasil`,
                    `${query}, Belo Horizonte, MG, Brasil`,
                    `${query}, Brasília, DF, Brasil`,
                    `${query}, Salvador, BA, Brasil`
                ];

                // Combinar com endereços populares que fazem match
                const popularMatches = popularAddresses.filter(addr =>
                    addr.toLowerCase().includes(query.toLowerCase())
                );

                suggestions = [...popularMatches, ...baseSuggestions].slice(0, 5);
            }

            setAddressSuggestions(suggestions);
            setShowAddressSuggestions(suggestions.length > 0);
        } catch (error) {
            console.error('Erro ao buscar sugestões:', error);
        }
    };

    // Função para validar endereço
    const validateAddress = async (address: string) => {
        if (!address) {
            setAddressValidation(null);
            return;
        }

        setIsValidatingAddress(true);

        try {
            // Simular validação (em produção, usar Google Geocoding API)
            await new Promise(resolve => setTimeout(resolve, 1000));

            const isValid = address.length > 10 && (
                address.toLowerCase().includes('brasil') ||
                address.toLowerCase().includes('brazil') ||
                address.includes('SP') ||
                address.includes('RJ') ||
                address.includes('MG')
            );

            setAddressValidation({
                valid: isValid,
                message: isValid
                    ? '✅ Endereço válido - O mapa será atualizado'
                    : '⚠️ Endereço pode não ser encontrado no mapa'
            });
        } catch (error) {
            setAddressValidation({
                valid: false,
                message: '❌ Erro ao validar endereço'
            });
        } finally {
            setIsValidatingAddress(false);
        }
    };

    // Função para lidar com mudanças no endereço
    const handleAddressChange = (value: string) => {
        handleInputChange('address', value);
        setShowAddressSuggestions(false);

        // Buscar sugestões com debounce
        const timeoutId = setTimeout(() => {
            searchAddressSuggestions(value);
            validateAddress(value);
        }, 500);

        return () => clearTimeout(timeoutId);
    };

    // Função para gerar URL do Google Maps - IGUAL à usada no footer do cliente
    const getGoogleMapsUrl = (address: string) => {
        if (!address) {
            // Fallback para endereço padrão se não houver endereço configurado
            return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.145944983025!2d-46.656539084476!3d-23.56306366754635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59c8da0aa315%3A0x2665c5b4e7b6a4b!2sAv.%20Paulista%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%20Brasil!5e0!3m2!1spt-BR!2sus!4v1625845012345!5m2!1spt-BR!2sus";
        }

        // Encode o endereço para uso na URL
        const encodedAddress = encodeURIComponent(address);

        // Usar a URL simples do Google Maps que não requer API key
        // Esta abordagem gera um iframe baseado na busca do endereço
        return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    };

    const handleNestedChange = (section: 'bankAccount' | 'socialMedia' | 'reviewSettings' | 'paymentSettings' | 'footerSettings', field: string, value: string | boolean | number) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleGalleryChange = (index: number, value: string) => {
        setSettings(prev => {
            const newGallery = [...(prev.galleryPhotos || [])];
            newGallery[index] = { ...newGallery[index], url: value };
            return { ...prev, galleryPhotos: newGallery };
        });
    };

    const handleGalleryNameChange = (index: number, value: string) => {
        setSettings(prev => {
            const newGalleryNames = [...(prev.galleryNames || [])];
            newGalleryNames[index] = value;
            return { ...prev, galleryNames: newGalleryNames };
        });
    };

    const loadExampleTemplate = () => {

        const exampleTemplate = `<h1>Características Físicas</h1>

<p><strong>1,69m de altura e 70kg</strong> com cabelo castanho claro, corpo atlético magro definido, um dote de <strong>20cm</strong>.</p>

<p><strong>Fetichista elite.</strong> Costumo dizer isso pois para meus servos o cachê que pagam é indiferente em suas vidas. Independentemente do status social, trato todos igualmente, mesmo aqueles que só possam ter o prazer de desfrutar da minha companhia uma vez ao mês.</p>

<p>Sou <strong>cordial e autoritário</strong>, o acompanhante ideal para te iniciar em suas maiores fantasias sexuais.</p>

<hr>

<h1>Durante as sessões</h1>

<p>Gosto de proporcionar experiências únicas libertando os desejos mais obscuros e reprimidos. Realizo vários fetiches, sendo minhas práticas com mais experiência:</p>

<ul>
<li><strong>D/s</strong> (Dominação/Submissão)</li>
<li><strong>Fisting</strong></li>
<li><strong>Pet-play</strong></li>
<li><strong>Pissing</strong></li>
<li><strong>Spit</strong></li>
<li><strong>Leather</strong></li>
<li><strong>Anal play</strong></li>
<li><strong>Nipple play</strong></li>
<li><strong>Ass play</strong></li>
<li><strong>Spanking</strong></li>
<li><strong>Humilhação</strong></li>
<li><strong>CBT</strong></li>
<li><strong>Wax</strong></li>
<li><strong>Sissificação</strong></li>
<li><strong>E-stim</strong></li>
<li><strong>Bondage</strong></li>
<li><strong>Asfixia</strong></li>
</ul>

<p>Disponho de acessórios e brinquedos para aquecer a relação.</p>

<blockquote>⚠️ <strong>Para aqueles que não têm fantasias e fetiches</strong>, podemos ter uma relação sexual normal sem práticas.</blockquote>

<hr>

<h2>Ambiente</h2>

<p>Tudo à disposição em um ambiente <strong>climatizado, seguro e confortável</strong>, com:</p>
<ul>
<li>Chuveiro quente</li>
<li>Toalha limpa</li>
<li>Sabonete</li>
<li>Álcool gel</li>
<li>Camisinha</li>
<li>Lubrificante</li>
</ul>

<p><strong>Contrate-me no WhatsApp</strong> e me encontre aqui no meu local.</p>`;

        handleInputChange('description', exampleTemplate);

        toast({
            title: "Template carregado!",
            description: "Um exemplo de descrição com HTML foi carregado. Edite conforme necessário.",
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            // Validar dados obrigatórios
            if (!settings.name || !settings.email || !settings.phone) {
                throw new Error('Nome, email e telefone são obrigatórios');
            }

            await saveProfileSettings(settings);

            // Forçar limpeza do cache para garantir que as mudanças sejam refletidas
            localStorage.removeItem('profileSettings');

            toast({
                title: "Configurações Salvas!",
                description: "Suas informações foram atualizadas com sucesso.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: error instanceof Error ? error.message : "Não foi possível salvar as configurações.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2 text-muted-foreground">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="w-full sm:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Configurações do Perfil</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Gerencie todas as suas informações pessoais e configurações
                    </p>
                </div>
                <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full sm:w-auto text-sm">
                    {isSaving ? <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Save className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>

            <Tabs defaultValue="contact" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 h-auto">
                    <TabsTrigger value="contact" className="text-xs sm:text-sm px-2 py-2">Contato</TabsTrigger>
                    <TabsTrigger value="general" className="text-xs sm:text-sm px-2 py-2">Geral</TabsTrigger>
                    <TabsTrigger value="images" className="text-xs sm:text-sm px-2 py-2">Imagens</TabsTrigger>
                    <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2 py-2">Avaliações</TabsTrigger>
                    <TabsTrigger value="payment" className="text-xs sm:text-sm px-2 py-2">Pagamento</TabsTrigger>
                </TabsList>

                <TabsContent value="contact" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Informações de Contato
                            </CardTitle>
                            <CardDescription>Estes dados serão exibidos publicamente no seu site.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="flex items-center gap-2"><User /> Nome de Exibição</Label>
                                    <Input id="name" value={settings.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2"><Mail /> Email de Contato</Label>
                                    <Input id="email" type="email" value={settings.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2"><Phone /> Telefone (WhatsApp)</Label>
                                    <Input id="phone" placeholder="Ex: 5521999998888" value={settings.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                </div>
                                <div className="space-y-3 relative p-4 bg-card/50 rounded-xl border border-border">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="address" className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 rounded-full">
                                                <MapPin className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-semibold text-foreground">Endereço (para o mapa)</span>
                                            {isValidatingAddress && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                        </Label>
                                        {settings.address && addressValidation?.valid && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                <span className="text-xs font-medium text-green-400">Configurado</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="address"
                                            value={settings.address}
                                            onChange={(e) => handleAddressChange(e.target.value)}
                                            onFocus={() => {
                                                if (settings.address.length < 2) {
                                                    // Mostrar endereços populares quando foca no campo vazio
                                                    setAddressSuggestions(popularAddresses.slice(0, 5));
                                                    setShowAddressSuggestions(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                // Delay para permitir clique nas sugestões
                                                setTimeout(() => setShowAddressSuggestions(false), 200);
                                            }}
                                            placeholder="Ex: Rua das Flores, 123, Copacabana, Rio de Janeiro, RJ, Brasil"
                                            className={`pr-10 transition-all duration-200 ${showAddressSuggestions ? 'border-primary/50 ring-2 ring-primary/10' : ''
                                                }`}
                                            autoComplete="off"
                                        />
                                        {settings.address && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                                onClick={() => {
                                                    handleInputChange('address', '');
                                                    setAddressValidation(null);
                                                    setShowAddressSuggestions(false);
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Sugestões de endereço */}
                                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            <div className="py-1">
                                                {addressSuggestions.map((suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-primary/10 text-sm text-foreground border-b border-border last:border-b-0 transition-colors duration-150 focus:outline-none focus:bg-primary/10"
                                                        onClick={() => {
                                                            handleInputChange('address', suggestion);
                                                            setShowAddressSuggestions(false);
                                                            validateAddress(suggestion);
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-foreground">
                                                                    {suggestion.split(',')[0]}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                                    {suggestion.split(',').slice(1).join(',').trim()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="px-4 py-2 bg-card/50 border-t border-border">
                                                <p className="text-xs text-primary flex items-center gap-2 font-medium">
                                                    <span className="text-primary">📍</span>
                                                    {addressSuggestions.length} endereço{addressSuggestions.length !== 1 ? 's' : ''} encontrado{addressSuggestions.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Validação do endereço */}
                                    {addressValidation && (
                                        <div className={`text-sm p-2 rounded-md ${addressValidation.valid
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            }`}>
                                            {addressValidation.message}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            💡 Dica: Use endereços completos com cidade, estado e país para melhor precisão no mapa
                                        </p>
                                        {!settings.address && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setAddressSuggestions(popularAddresses);
                                                    setShowAddressSuggestions(true);
                                                }}
                                                className="text-xs h-7 px-2"
                                            >
                                                <MapPin className="h-3 w-3 mr-1" />
                                                Ver locais populares
                                            </Button>
                                        )}
                                    </div>

                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="description" className="flex items-center gap-2">
                                        <Camera className="h-4 w-4" />
                                        Descrição Profissional (Editor Visual - HTML)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={loadExampleTemplate}
                                            className="flex items-center gap-2"
                                        >
                                            📝 Carregar Template
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleInputChange('description', '');
                                                toast({
                                                    title: "Descrição limpa!",
                                                    description: "O conteúdo foi removido do editor.",
                                                });
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            🗑️ Limpar
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <TipTapEditor
                                        value={settings.description || ''}
                                        onChange={(content) => handleInputChange('description', content)}
                                        placeholder="Digite sua descrição profissional aqui..."
                                    />
                                </div>

                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p><strong>Como usar o Editor TipTap:</strong></p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>✅ <strong>Selecione o texto</strong> e clique nos botões da toolbar</li>
                                        <li>✅ <strong>H1, H2, H3</strong> = Títulos</li>
                                        <li>✅ <strong>B</strong> = <strong>Negrito</strong></li>
                                        <li>✅ <em>I</em> = <em>Itálico</em></li>
                                        <li>✅ <u>U</u> = <u>Sublinhado</u></li>
                                        <li>✅ <s>S</s> = <s>Tachado</s></li>
                                        <li>✅ <strong>📋</strong> = Listas (ordenadas e não ordenadas)</li>
                                        <li>✅ <strong>↔️</strong> = Alinhamento (esquerda, centro, direita)</li>
                                        <li>✅ <strong>🔗</strong> = Links</li>
                                        <li>✅ <strong>🖼️</strong> = Imagens</li>
                                        <li>✅ <strong>&quot;</strong> = Citações</li>
                                        <li>✅ <strong>&lt;/&gt;</strong> = Blocos de código</li>
                                        <li>✅ <strong>🧹</strong> = Limpar formatação</li>
                                        <li>✅ <strong>Totalmente responsivo</strong> - funciona em PC e celular!</li>
                                        <li>⚠️ <strong>Não digite Markdown</strong> - use os botões visuais!</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                Configurações Gerais do Site
                            </CardTitle>
                            <CardDescription>
                                Configure textos, elementos gerais e ícones do footer que aparecem no site
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Controle de Exibição de Conteúdo Adulto */}
                            <div className="space-y-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="showAdultContent" className="flex items-center gap-2 text-base font-semibold">
                                            <Eye className="h-5 w-5 text-primary" />
                                            Exibir Conteúdo Adulto
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Controla a exibição do aviso de conteúdo adulto ao abrir o site e o menu FETISH & BDSM no hambúrguer.
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id="showAdultContent"
                                            checked={settings.showAdultContent ?? true}
                                            onChange={(e) => handleInputChange('showAdultContent', e.target.checked)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <Label htmlFor="showAdultContent" className="text-sm font-medium cursor-pointer">
                                            {settings.showAdultContent ?? true ? '✅ Sim' : '❌ Não'}
                                        </Label>
                                    </div>
                                </div>

                                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">📋 O que será afetado:</p>
                                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                        <li>• <strong>Se SIM:</strong> Aviso adulto aparece ao abrir o site + Menu FETISH & BDSM visível</li>
                                        <li>• <strong>Se NÃO:</strong> Aviso adulto não aparece + Menu FETISH & BDSM oculto</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adultWorkLabel" className="flex items-center gap-2">
                                    <EyeOff className="h-4 w-4" />
                                    Texto do Aviso de Conteúdo Adulto
                                </Label>
                                <Input
                                    id="adultWorkLabel"
                                    value={settings.adultWorkLabel || "+18 ADULT WORK"}
                                    onChange={(e) => handleInputChange('adultWorkLabel', e.target.value)}
                                    placeholder="+18 ADULT WORK"
                                    className="font-bold"
                                    disabled={!settings.showAdultContent}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este texto aparece no menu lateral do site como aviso de conteúdo adulto.
                                    {!settings.showAdultContent && ' (Desabilitado - ative "Exibir Conteúdo Adulto" acima)'}
                                </p>
                            </div>

                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">💡 Exemplos de textos:</h4>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', '+18 ADULT WORK')}
                                            className="text-xs"
                                        >
                                            +18 ADULT WORK
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'CONTEÚDO ADULTO +18')}
                                            className="text-xs"
                                        >
                                            CONTEÚDO ADULTO +18
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'APENAS ADULTOS +18')}
                                            className="text-xs"
                                        >
                                            APENAS ADULTOS +18
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'MATURE CONTENT')}
                                            className="text-xs"
                                        >
                                            MATURE CONTENT
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'ADULT ONLY')}
                                            className="text-xs"
                                        >
                                            ADULT ONLY
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
                                    Clique em qualquer exemplo acima para usar, ou digite seu próprio texto personalizado.
                                </p>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">📍 Onde aparece:</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• No menu lateral (sidebar) do site</li>
                                    <li>• Como aviso de que o conteúdo é destinado a adultos</li>
                                    <li>• Visível para todos os visitantes do site</li>
                                    <li>• As mudanças são aplicadas imediatamente após salvar</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações do Footer */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ExternalLink className="h-5 w-5" />
                                Configurações do Footer
                            </CardTitle>
                            <CardDescription>
                                Configure quais ícones de redes sociais aparecem no footer e seus respectivos links
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Twitter */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Twitter className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Twitter / X</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showTwitter"
                                            checked={settings.footerSettings?.showTwitter || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showTwitter', e.target.checked)}
                                        />
                                        <Label htmlFor="showTwitter" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitterUrl">URL do Twitter</Label>
                                    <Input
                                        id="twitterUrl"
                                        value={settings.footerSettings?.twitterUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'twitterUrl', e.target.value)}
                                        placeholder="https://twitter.com/seuusuario"
                                        disabled={!settings.footerSettings?.showTwitter}
                                    />
                                </div>
                            </div>

                            {/* Instagram */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Instagram className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Instagram</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showInstagram"
                                            checked={settings.footerSettings?.showInstagram || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showInstagram', e.target.checked)}
                                        />
                                        <Label htmlFor="showInstagram" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagramUrl">URL do Instagram</Label>
                                    <Input
                                        id="instagramUrl"
                                        value={settings.footerSettings?.instagramUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'instagramUrl', e.target.value)}
                                        placeholder="https://instagram.com/seuusuario"
                                        disabled={!settings.footerSettings?.showInstagram}
                                    />
                                </div>
                            </div>

                            {/* YouTube */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Youtube className="h-5 w-5" />
                                        <Label className="text-base font-semibold">YouTube</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showYoutube"
                                            checked={settings.footerSettings?.showYoutube || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showYoutube', e.target.checked)}
                                        />
                                        <Label htmlFor="showYoutube" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtubeUrl">URL do YouTube</Label>
                                    <Input
                                        id="youtubeUrl"
                                        value={settings.footerSettings?.youtubeUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'youtubeUrl', e.target.value)}
                                        placeholder="https://youtube.com/@seucanal"
                                        disabled={!settings.footerSettings?.showYoutube}
                                    />
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5" />
                                        <Label className="text-base font-semibold">WhatsApp</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showWhatsapp"
                                            checked={settings.footerSettings?.showWhatsapp || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showWhatsapp', e.target.checked)}
                                        />
                                        <Label htmlFor="showWhatsapp" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsappUrl">URL do WhatsApp</Label>
                                    <Input
                                        id="whatsappUrl"
                                        value={settings.footerSettings?.whatsappUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'whatsappUrl', e.target.value)}
                                        placeholder="https://wa.me/5521999999999"
                                        disabled={!settings.footerSettings?.showWhatsapp}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Dica: Use o formato https://wa.me/NUMERO (ex: https://wa.me/5521990479104)
                                    </p>
                                </div>
                            </div>

                            {/* Telegram */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Send className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Telegram</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showTelegram"
                                            checked={settings.footerSettings?.showTelegram || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showTelegram', e.target.checked)}
                                        />
                                        <Label htmlFor="showTelegram" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telegramUrl">URL do Telegram</Label>
                                    <Input
                                        id="telegramUrl"
                                        value={settings.footerSettings?.telegramUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'telegramUrl', e.target.value)}
                                        placeholder="https://t.me/seuusuario"
                                        disabled={!settings.footerSettings?.showTelegram}
                                    />
                                </div>
                            </div>

                            {/* Facebook */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Facebook className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Facebook</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showFacebook"
                                            checked={settings.footerSettings?.showFacebook || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showFacebook', e.target.checked)}
                                        />
                                        <Label htmlFor="showFacebook" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="facebookUrl">URL do Facebook</Label>
                                    <Input
                                        id="facebookUrl"
                                        value={settings.footerSettings?.facebookUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'facebookUrl', e.target.value)}
                                        placeholder="https://facebook.com/seuusuario"
                                        disabled={!settings.footerSettings?.showFacebook}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">🔗 Configurações do Footer:</h4>
                                <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                                    <li>• Marque as caixas para mostrar os ícones no footer do site</li>
                                    <li>• Configure as URLs para onde os ícones devem redirecionar</li>
                                    <li>• Apenas ícones marcados como &quot;Mostrar no footer&quot; aparecerão</li>
                                    <li>• As mudanças são aplicadas imediatamente após salvar</li>
                                    <li>• URLs inválidas podem quebrar os links - teste sempre!</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* <TabsContent value="social" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Instagram className="h-5 w-5" />
                                Redes Sociais
                            </CardTitle>
                            <CardDescription>
                                Links e usuários das suas redes sociais
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    💡 <strong>Dica:</strong> Clique nos campos abaixo para editar os links das suas redes sociais. 
                                    As mudanças serão salvas quando você clicar em "Salvar Alterações".
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="instagram" className="flex items-center gap-2">
                                        <Instagram className="h-4 w-4" />
                                        Instagram
                                    </Label>
                                    <Input
                                        id="instagram"
                                        value={settings.socialMedia?.instagram || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'instagram', e.target.value)}
                                        placeholder="@seuusuario"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: @italosantos</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitter" className="flex items-center gap-2">
                                        <Twitter className="h-4 w-4" />
                                        Twitter/X
                                    </Label>
                                    <Input
                                        id="twitter"
                                        value={settings.socialMedia?.twitter || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'twitter', e.target.value)}
                                        placeholder="@seuusuario"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: @italosantos</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtube" className="flex items-center gap-2">
                                        <Youtube className="h-4 w-4" />
                                        YouTube
                                    </Label>
                                    <Input
                                        id="youtube"
                                        value={settings.socialMedia?.youtube || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'youtube', e.target.value)}
                                        placeholder="Nome do canal"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: ItaloProfissional</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsappSocial" className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4" />
                                        WhatsApp
                                    </Label>
                                    <Input
                                        id="whatsappSocial"
                                        value={settings.socialMedia?.whatsapp || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'whatsapp', e.target.value)}
                                        placeholder="5521999999999"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: 5521990479104</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telegram" className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4" />
                                        Telegram
                                    </Label>
                                    <Input
                                        id="telegram"
                                        value={settings.socialMedia?.telegram || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'telegram', e.target.value)}
                                        placeholder="@seuusuario"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: @italosantos</p>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-green-800 dark:text-green-200">
                                        ✅ <strong>Status:</strong> Todos os campos estão funcionando corretamente. 
                                        Você pode editar qualquer campo acima e clicar em "Salvar Alterações" para aplicar as mudanças.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            toast({
                                                title: "Estado das Redes Sociais",
                                                description: `Instagram: ${settings.socialMedia?.instagram || 'não configurado'}\nTwitter: ${settings.socialMedia?.twitter || 'não configurado'}\nYouTube: ${settings.socialMedia?.youtube || 'não configurado'}\nWhatsApp: ${settings.socialMedia?.whatsapp || 'não configurado'}\nTelegram: ${settings.socialMedia?.telegram || 'não configurado'}`,
                                            });
                                        }}
                                        className="text-xs"
                                    >
                                        🔍 Ver Estado Atual
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent> */}

                <TabsContent value="images" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Imagens do Perfil</CardTitle>
                            <CardDescription>Atualize a foto de perfil e a imagem de capa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="profilePicture" className="flex items-center gap-2"><ImageIcon /> URL da Foto de Perfil</Label>
                                <Input id="profilePicture" placeholder="https://.../sua-foto.jpg" value={settings.profilePictureUrl} onChange={(e) => handleInputChange('profilePictureUrl', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="coverPhoto" className="flex items-center gap-2"><ImageIcon /> URL da Foto de Capa</Label>
                                <Input id="coverPhoto" placeholder="https://.../sua-capa.jpg" value={settings.coverPhotoUrl} onChange={(e) => handleInputChange('coverPhotoUrl', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" />
                                        Galerias da Página Inicial
                                    </CardTitle>
                                    <CardDescription>
                                        Gerencie as 7 galerias de fotos que aparecem no rodapé da página inicial.
                                        Apenas galerias com fotos configuradas serão exibidas.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                    asChild
                                >
                                    <a href="/" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                        Ver no Site
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {settings.galleryPhotos.map((photo, index) => {
                                const galleryName = settings.galleryNames?.[index] || `Galeria ${index + 1}`;

                                return (
                                    <div key={`gallery-${index}`} className="space-y-3 p-4 border rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={`gallery-${index}`} className="text-sm font-medium">
                                                Galeria {index + 1}: {galleryName}
                                            </Label>
                                            {photo.url && photo.url !== 'https://placehold.co/400x600.png' && (
                                                <span className="text-xs text-green-600 font-medium">✓ Configurada</span>
                                            )}
                                        </div>

                                        {/* Campo para editar o nome da galeria */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`gallery-name-${index}`} className="text-xs text-muted-foreground">
                                                Nome da Galeria
                                            </Label>
                                            <Input
                                                id={`gallery-name-${index}`}
                                                placeholder="Nome da galeria"
                                                value={galleryName}
                                                onChange={(e) => handleGalleryNameChange(index, e.target.value)}
                                                className="text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`gallery-${index}`} className="text-xs text-muted-foreground">
                                                URL da Imagem
                                            </Label>
                                            <Input
                                                id={`gallery-${index}`}
                                                placeholder={`URL da imagem para "${galleryName}"`}
                                                value={photo.url}
                                                onChange={(e) => handleGalleryChange(index, e.target.value)}
                                            />
                                        </div>

                                        {/* Preview da imagem */}
                                        {photo.url && photo.url !== 'https://placehold.co/400x600.png' && (
                                            <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                                                <img
                                                    src={photo.url}
                                                    alt={`Preview Galeria ${index + 1}`}
                                                    className="w-16 h-24 object-cover rounded border"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    <p>Preview da imagem</p>
                                                    <p className="text-green-600">✓ URL válida</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Dicas:</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Use URLs de imagens hospedadas (Firebase Storage, CDN, etc.)</li>
                                    <li>• Formato recomendado: 400x800px (9:16) para melhor visualização</li>
                                    <li>• Apenas galerias com fotos válidas aparecerão no site</li>
                                    <li>• As mudanças aparecem automaticamente na página inicial</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Configurações de Avaliações
                            </CardTitle>
                            <CardDescription>
                                Gerencie como as avaliações são exibidas e moderadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="showReviews"
                                    checked={settings.reviewSettings?.showReviews || false}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'showReviews', e.target.checked)}
                                />
                                <Label htmlFor="showReviews">Exibir avaliações publicamente</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="moderateReviews"
                                    checked={settings.reviewSettings?.moderateReviews || false}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'moderateReviews', e.target.checked)}
                                />
                                <Label htmlFor="moderateReviews">Moderar avaliações antes de publicar</Label>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="defaultReviewMessage">Mensagem padrão de resposta</Label>
                                <Textarea
                                    id="defaultReviewMessage"
                                    value={settings.reviewSettings?.defaultReviewMessage || ''}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'defaultReviewMessage', e.target.value)}
                                    placeholder="Mensagem automática enviada após avaliação..."
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Configurações de Pagamento PIX
                            </CardTitle>
                            <CardDescription>
                                Configure o valor para pagamentos PIX via Mercado Pago
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    <Label htmlFor="pixValue" className="text-base font-semibold">
                                        Valor do PIX (R$)
                                    </Label>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-lg font-medium">R$</span>
                                    </div>
                                    <Input
                                        id="pixValue"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max="10000"
                                        value={settings.paymentSettings?.pixValue || 99.00}
                                        onChange={(e) => handleNestedChange('paymentSettings', 'pixValue', parseFloat(e.target.value) || 99.00)}
                                        placeholder="99.00"
                                        className="pl-12 text-lg font-medium h-12 border-2 focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Valor padrão para pagamentos PIX via Mercado Pago</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNestedChange('paymentSettings', 'pixValue', 49.90)}
                                        className="text-xs"
                                    >
                                        R$ 49,90
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNestedChange('paymentSettings', 'pixValue', 99.00)}
                                        className="text-xs"
                                    >
                                        R$ 99,00
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNestedChange('paymentSettings', 'pixValue', 199.00)}
                                        className="text-xs"
                                    >
                                        R$ 199,00
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">💡 Informações:</h4>
                                <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                                    <li>• O valor do PIX será usado em todos os pagamentos</li>
                                    <li>• Os pagamentos são processados pelo Mercado Pago</li>
                                    <li>• As mudanças são aplicadas imediatamente</li>
                                    <li>• Teste sempre após alterar as configurações</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PayPal Configuration Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Configurações do PayPal
                            </CardTitle>
                            <CardDescription>
                                Configure suas credenciais do PayPal para receber pagamentos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="paypalEmail" className="text-base font-semibold">
                                        Email do PayPal
                                    </Label>
                                </div>
                                <Input
                                    id="paypalEmail"
                                    type="email"
                                    value={settings.paymentSettings?.paypalEmail || ''}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'paypalEmail', e.target.value)}
                                    placeholder="seu-email@paypal.com"
                                    className="h-12 border-2 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="paypalClientId" className="text-base font-semibold">
                                        Client ID
                                    </Label>
                                </div>
                                <Input
                                    id="paypalClientId"
                                    type="text"
                                    value={settings.paymentSettings?.paypalClientId || ''}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'paypalClientId', e.target.value)}
                                    placeholder="Digite o Client ID do PayPal"
                                    className="h-12 border-2 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="paypalClientSecret" className="text-base font-semibold">
                                        Client Secret
                                    </Label>
                                </div>
                                <Input
                                    id="paypalClientSecret"
                                    type="password"
                                    value={settings.paymentSettings?.paypalClientSecret || ''}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'paypalClientSecret', e.target.value)}
                                    placeholder="Digite o Client Secret do PayPal"
                                    className="h-12 border-2 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="paypalSandboxMode"
                                    checked={settings.paymentSettings?.paypalSandboxMode ?? false}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'paypalSandboxMode', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <Label htmlFor="paypalSandboxMode" className="text-sm cursor-pointer">
                                    Usar modo Sandbox (teste)
                                </Label>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Como obter credenciais:</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Acesse o <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="underline">PayPal Developer Dashboard</a></li>
                                    <li>• Crie um aplicativo e copie o Client ID e Secret</li>
                                    <li>• Use Sandbox para testes e Production para pagamentos reais</li>
                                    <li>• Mantenha o Client Secret seguro e nunca o compartilhe</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* MercadoPago Configuration Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Configurações do Mercado Pago
                            </CardTitle>
                            <CardDescription>
                                Configure suas credenciais do Mercado Pago para receber pagamentos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="mercadoPagoEmail" className="text-base font-semibold">
                                        Email do Mercado Pago
                                    </Label>
                                </div>
                                <Input
                                    id="mercadoPagoEmail"
                                    type="email"
                                    value={settings.paymentSettings?.mercadoPagoEmail || ''}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'mercadoPagoEmail', e.target.value)}
                                    placeholder="seu-email@mercadopago.com"
                                    className="h-12 border-2 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="mercadoPagoPublicKey" className="text-base font-semibold">
                                        Public Key
                                    </Label>
                                </div>
                                <Input
                                    id="mercadoPagoPublicKey"
                                    type="text"
                                    value={settings.paymentSettings?.mercadoPagoPublicKey || ''}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'mercadoPagoPublicKey', e.target.value)}
                                    placeholder="Digite a Public Key do Mercado Pago"
                                    className="h-12 border-2 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="mercadoPagoAccessToken" className="text-base font-semibold">
                                        Access Token
                                    </Label>
                                </div>
                                <Input
                                    id="mercadoPagoAccessToken"
                                    type="password"
                                    value={settings.paymentSettings?.mercadoPagoAccessToken || ''}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'mercadoPagoAccessToken', e.target.value)}
                                    placeholder="Digite o Access Token do Mercado Pago"
                                    className="h-12 border-2 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="mercadoPagoSandboxMode"
                                    checked={settings.paymentSettings?.mercadoPagoSandboxMode ?? false}
                                    onChange={(e) => handleNestedChange('paymentSettings', 'mercadoPagoSandboxMode', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <Label htmlFor="mercadoPagoSandboxMode" className="text-sm cursor-pointer">
                                    Usar modo Sandbox (teste)
                                </Label>
                            </div>

                            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">💡 Como obter credenciais:</h4>
                                <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                                    <li>• Acesse o <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="underline">Mercado Pago Developer</a></li>
                                    <li>• Crie uma aplicação e copie a Public Key e Access Token</li>
                                    <li>• Use credenciais de teste para desenvolvimento</li>
                                    <li>• Mantenha o Access Token seguro e nunca o compartilhe</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Twitter Feed Configuration Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Twitter className="h-5 w-5" />
                                Configurações do Twitter Feed
                            </CardTitle>
                            <CardDescription>
                                Gerencie o cache e a exibição de fotos e vídeos do Twitter
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">📊 Informações sobre o Feed:</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• O sistema busca suas fotos e vídeos do Twitter automaticamente</li>
                                    <li>• Usa Inteligência Artificial (Gemini) para filtrar conteúdo pessoal</li>
                                    <li>• Limite máximo: 25 fotos e 25 vídeos</li>
                                    <li>• Cache é atualizado apenas quando necessário para economizar API</li>
                                    <li>• Configure sua conta Twitter em <a href="/admin/integrations" className="underline">Integrações</a></li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base font-semibold">Cache do Twitter</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Limpe o cache para forçar nova busca de fotos e vídeos
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                const { getAuth } = await import('firebase/auth');
                                                const { auth } = await import('@/lib/firebase');
                                                const user = getAuth(auth).currentUser;
                                                
                                                if (!user) {
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Erro',
                                                        description: 'Você precisa estar autenticado'
                                                    });
                                                    return;
                                                }

                                                const token = await user.getIdToken();
                                                const response = await fetch('/api/twitter/admin/clear-cache', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`
                                                    }
                                                });

                                                const data = await response.json();

                                                if (data.success) {
                                                    toast({
                                                        title: 'Cache Limpo!',
                                                        description: `Cache do Twitter limpo para @${data.username}. Próximo acesso irá buscar novos dados.`
                                                    });
                                                } else {
                                                    throw new Error(data.error || 'Erro ao limpar cache');
                                                }
                                            } catch (error: any) {
                                                toast({
                                                    variant: 'destructive',
                                                    title: 'Erro ao limpar cache',
                                                    description: error.message
                                                });
                                            }
                                        }}
                                        className="gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Limpar Cache
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">🤖 Como funciona o filtro AI:</h4>
                                <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                                    <li>• Busca seus tweets mais recentes do Twitter</li>
                                    <li>• Remove replies, retweets e conteúdo de terceiros</li>
                                    <li>• Usa Gemini AI para identificar conteúdo pessoal (selfies, vídeos onde você aparece)</li>
                                    <li>• Prioriza fotos e vídeos onde você está presente</li>
                                    <li>• Exclui memes, capturas de tela e fotos de eventos genéricos</li>
                                    <li>• Seleciona os melhores 25 itens de cada tipo</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
