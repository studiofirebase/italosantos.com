/**
 * PayPal v6 Payment Buttons Component
 * Supports: PayPal, Pay Later, Credit, Google Pay, Apple Pay
 */

'use client';

import { useEffect, useState } from 'react';
import { paypalSDKv6, CreateOrderOptions } from '@/services/paypal-sdk-v6';
import { Loader2 } from 'lucide-react';

interface PayPalV6ButtonsProps {
    amount: number;
    currency?: string;
    description: string;
    isSubscription?: boolean;
    onSuccess: (data: any) => void;
    onError: (error: any) => void;
    className?: string;
}

export default function PayPalV6Buttons({
    amount,
    currency = 'USD',
    description,
    isSubscription = false,
    onSuccess,
    onError,
    className = '',
}: PayPalV6ButtonsProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [eligibility, setEligibility] = useState<{
        paypal: boolean;
        paylater: boolean;
        credit: boolean;
        googlepay: boolean;
        applepay: boolean;
    }>({
        paypal: false,
        paylater: false,
        credit: false,
        googlepay: false,
        applepay: false,
    });

    useEffect(() => {
        const initializePayments = async () => {
            try {
                setIsLoading(true);
                console.log('[PayPal V6 Buttons] Initializing...');

                // Check eligibility for all payment methods
                const eligible = await paypalSDKv6.checkEligibility(currency);
                console.log('[PayPal V6 Buttons] Eligibility:', eligible);
                setEligibility(eligible);

                const createOrderOptions: CreateOrderOptions = {
                    amount,
                    currency,
                    description,
                    isSubscription,
                };

                // Setup PayPal button
                if (eligible.paypal) {
                    await paypalSDKv6.setupPayPalButton(
                        'paypal-button-v6',
                        createOrderOptions,
                        onSuccess,
                        onError
                    );
                }

                // Setup Pay Later button
                if (eligible.paylater && eligible.details.paylater) {
                    await paypalSDKv6.setupPayLaterButton(
                        'paylater-button-v6',
                        createOrderOptions,
                        eligible.details.paylater,
                        onSuccess,
                        onError
                    );
                }

                // Setup Credit button
                if (eligible.credit && eligible.details.credit) {
                    await paypalSDKv6.setupCreditButton(
                        'credit-button-v6',
                        createOrderOptions,
                        eligible.details.credit,
                        onSuccess,
                        onError
                    );
                }

                // Setup Google Pay button
                if (eligible.googlepay) {
                    await paypalSDKv6.setupGooglePayButton(
                        'googlepay-button-v6',
                        createOrderOptions,
                        onSuccess,
                        onError
                    );
                }

                // Setup Apple Pay button
                if (eligible.applepay) {
                    await paypalSDKv6.setupApplePayButton(
                        'applepay-button-v6',
                        createOrderOptions,
                        onSuccess,
                        onError
                    );
                }

                setIsLoading(false);
            } catch (error) {
                console.error('[PayPal V6 Buttons] Initialization error:', error);
                setIsLoading(false);
                onError(error);
            }
        };

        initializePayments();
    }, [amount, currency, description, isSubscription]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Carregando métodos de pagamento...</span>
            </div>
        );
    }

    const hasAnyMethod = Object.values(eligibility).some(v => v);

    if (!hasAnyMethod) {
        return (
            <div className={`text-center p-8 ${className}`}>
                <p className="text-muted-foreground">Nenhum método de pagamento disponível no momento.</p>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* PayPal Button */}
            {eligibility.paypal && (
                <button
                    id="paypal-button-v6"
                    className="w-full h-14 bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    hidden
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.679l-.022.11-.582 3.665-.016.106a.397.397 0 01-.392.335H8.29a.404.404 0 01-.399-.457l.02-.146.957-6.03.024-.144a.805.805 0 01.794-.68h1.647c3.242 0 5.777-1.315 6.518-5.122.266-1.363.185-2.538-.344-3.475a3.067 3.067 0 00-.564-.667C18.063 3.616 19.388 5.357 20.067 8.478z" />
                        <path opacity=".7" d="M17.098 6.71a7.526 7.526 0 00-.977-.18 10.28 10.28 0 00-1.572-.096h-4.138a.805.805 0 00-.794.68l-1.163 7.338-.034.206a.805.805 0 01.794-.679h1.647c3.242 0 5.777-1.315 6.518-5.122.266-1.363.185-2.538-.344-3.475a3.067 3.067 0 00-.564-.667c.218.233.407.495.564.667z" />
                    </svg>
                    PayPal
                </button>
            )}

            {/* Pay Later Button */}
            {eligibility.paylater && (
                <button
                    id="paylater-button-v6"
                    className="w-full h-14 bg-[#009CDE] hover:bg-[#0088cc] text-white rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    hidden
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42z" />
                    </svg>
                    Pay Later
                </button>
            )}

            {/* Credit Button */}
            {eligibility.credit && (
                <button
                    id="credit-button-v6"
                    className="w-full h-14 bg-[#2C2E2F] hover:bg-[#1a1b1c] text-white rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    hidden
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                    PayPal Credit
                </button>
            )}

            {/* Google Pay Button */}
            {eligibility.googlepay && (
                <button
                    id="googlepay-button-v6"
                    className="w-full h-14 bg-white hover:bg-gray-50 text-black rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg border border-gray-200"
                    hidden
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                    Google Pay
                </button>
            )}

            {/* Apple Pay Button */}
            {eligibility.applepay && (
                <button
                    id="applepay-button-v6"
                    className="w-full h-14 bg-black hover:bg-gray-900 text-white rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    hidden
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Apple Pay
                </button>
            )}
        </div>
    );
}
