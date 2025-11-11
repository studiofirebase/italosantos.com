"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, User, X } from 'lucide-react';
import Link from 'next/link';

interface LoginTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginTypeModal({ isOpen, onClose }: LoginTypeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1003] p-4 sm:p-6">
            <Card className="w-full max-w-[450px] mx-4 shadow-xl border-2 border-primary/50 bg-background">
                <CardHeader className="text-center pb-6 pt-8 sm:pb-8 sm:pt-10">
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-primary mb-3 sm:mb-4">
                        Tipo de Acesso
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary"
                    >
                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6 sm:space-y-8 px-6 sm:px-10 pb-8 sm:pb-10">
                    <div className="space-y-8 sm:space-y-12">
                        {/* Login de Usuário Comum */}
                        <Link href="/auth/face" onClick={onClose}>
                            <Button 
                                className="w-full h-16 sm:h-20 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-3 sm:gap-5 text-lg sm:text-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                <User className="h-6 w-6 sm:h-7 sm:w-7" />
                                Acesso de Usuário
                            </Button>
                        </Link>

                        {/* Login Administrativo */}
                        <Link href="/admin" onClick={onClose}>
                            <Button 
                                variant="outline"
                                className="w-full h-16 sm:h-20 border-2 border-primary/50 text-primary hover:text-white hover:bg-primary/10 hover:border-primary/50 flex items-center justify-center gap-3 sm:gap-5 text-lg sm:text-xl font-medium"
                            >
                                <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
                                Acesso Administrativo
                            </Button>
                        </Link>
                    </div>

                    <div className="text-center text-muted-foreground text-sm sm:text-base pt-4 sm:pt-6 border-t border-border">
                        <p>Selecione o tipo de acesso desejado</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
