
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { useProfileConfig } from '@/hooks/use-profile-config';


export default function AboutSection() {
    const { settings, loading, refreshSettings } = useProfileConfig();
    
    // Texto padrão caso não haja configurações (com Markdown)
    const defaultDescription = `# Características Físicas

**1,69m de altura e 70kg** com cabelo castanho claro, corpo atlético magro definido, um dote de **20cm**.

**Fetichista elite.** Costumo dizer isso pois para meus servos o cachê que pagam é indiferente em suas vidas. Independentemente do status social, trato todos igualmente, mesmo aqueles que só possam ter o prazer de desfrutar da minha companhia uma vez ao mês.

Sou **cordial e autoritário**, o acompanhante ideal para te iniciar em suas maiores fantasias sexuais.

---

# Durante as sessões

Gosto de proporcionar experiências únicas libertando os desejos mais obscuros e reprimidos. Realizo vários fetiches, sendo minhas práticas com mais experiência:

- **D/s** (Dominação/Submissão)
- **Fisting**
- **Pet-play**
- **Pissing**
- **Spit**
- **Leather**
- **Anal play**
- **Nipple play**
- **Ass play**
- **Spanking**
- **Humilhação**
- **CBT**
- **Wax**
- **Sissificação**
- **E-stim**
- **Bondage**
- **Asfixia**

Disponho de acessórios e brinquedos para aquecer a relação.

> ⚠️ **Para aqueles que não têm fantasias e fetiches**, podemos ter uma relação sexual normal sem práticas.

---

## Ambiente

Tudo à disposição em um ambiente **climatizado, seguro e confortável**, com:
- Chuveiro quente
- Toalha limpa
- Sabonete
- Álcool gel
- Camisinha
- Lubrificante

**Contrate-me no WhatsApp** e me encontre aqui no meu local.`;

    // Usar a descrição do painel admin ou o texto padrão
    const description = settings?.description || defaultDescription;

    return (
        <Card className="w-full max-w-4xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl my-8">
            <CardHeader className="text-center">
                <CardTitle className="text-6xl text-primary text-shadow-neon-red-light text-center uppercase">
                    SOBRE
                </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-base space-y-6">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Carregando informações...</p>
                    </div>
                ) : (
                    <div 
                        className="prose prose-invert prose-red max-w-none"
                        dangerouslySetInnerHTML={{ __html: description }}
                        style={{
                            color: 'hsl(var(--muted-foreground))',
                            lineHeight: '1.6'
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
