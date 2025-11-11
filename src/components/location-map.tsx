"use client";

import { useProfileSettings } from '@/hooks/use-profile-settings';

const LocationMap = () => {
    const { settings: adminSettings } = useProfileSettings();

    // Só renderiza se houver endereço configurado
    if (!adminSettings?.address) {
        return null;
    }

    const getGoogleMapsUrl = (address: string) => {
        const encodedAddress = encodeURIComponent(address);
        return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    };

    return (
        <div className="w-full py-8 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold text-foreground mb-2">📍 Localização</h3>
                    <p className="text-muted-foreground">Me encontre no mapa</p>
                </div>
                
                <div className="w-full max-w-4xl mx-auto">
                    <div className="relative w-full h-0 pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
                        <iframe
                            src={getGoogleMapsUrl(adminSettings.address)}
                            className="absolute top-0 left-0 w-full h-full"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Localização"
                        />
                    </div>
                    
                    {/* Endereço em texto */}
                    <div className="mt-4 text-center">
                        <p className="text-muted-foreground">
                            <span className="font-medium">Endereço:</span> {adminSettings.address}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationMap;
