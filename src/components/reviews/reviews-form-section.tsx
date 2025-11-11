"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import ReviewsSection from '@/components/reviews/reviews-section';

const ReviewsFormSection = () => {
    const { toast } = useToast();
    const [newReviewAuthor, setNewReviewAuthor] = useState('');
    const [newReviewText, setNewReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const handleAddReview = async () => {
        if (!newReviewAuthor || !newReviewText) {
            toast({ variant: 'destructive', title: 'Por favor, preencha nome e comentário.' });
            return;
        }
        setIsSubmittingReview(true);
        try {
            await addDoc(collection(db, "reviews"), {
                author: newReviewAuthor,
                text: newReviewText,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            toast({ title: 'Comentário enviado para moderação!' });
            setNewReviewAuthor('');
            setNewReviewText('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar comentário.' });
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <div className="px-4 md:px-8 py-12 bg-background flex flex-col items-center">
            <div className="max-w-4xl w-full mx-auto">
                {/* Fontes das Avaliações */}
                <div className="text-center mb-8 p-4 bg-muted/20 rounded-lg border border-muted/30">
                    <p className="text-sm font-medium mb-3 text-foreground">
                        ✅ Avaliações verificadas de clientes reais
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 text-sm">
                        <span className="flex items-center gap-2 text-foreground/80">
                            <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                            <strong>Garoto Com Local</strong>
                        </span>
                        <span className="flex items-center gap-2 text-foreground/80">
                            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                            <strong>Portal do Cliente</strong>
                        </span>
                        <span className="flex items-center gap-2 text-foreground/80">
                            <div className="w-3 h-3 bg-orange-500 rounded-full shadow-sm"></div>
                            <strong>Avaliações Diretas</strong>
                        </span>
                    </div>
                </div>
                
                <Card className="w-full max-w-2xl p-6 bg-card/50 backdrop-blur-sm border-gray-700 mb-6 mx-auto">
                    <h3 className="text-lg font-semibold mb-4">Deixe sua avaliação</h3>
                    <div className="space-y-4">
                        <Input 
                            placeholder="Seu nome"
                            value={newReviewAuthor}
                            onChange={(e) => setNewReviewAuthor(e.target.value)}
                        />
                        <Textarea 
                            placeholder="Escreva seu comentário aqui..."
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                        />
                        <Button onClick={handleAddReview} disabled={isSubmittingReview}>
                            {isSubmittingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enviar Comentário
                        </Button>
                    </div>
                </Card>
                
                <ReviewsSection title="O que dizem sobre mim" />
            </div>
        </div>
    );
};

export default ReviewsFormSection;
